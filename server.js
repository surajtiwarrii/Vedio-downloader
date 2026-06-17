// VidGrab — Universal Video Downloader Backend
// Uses yt-dlp under the hood to support Instagram, YouTube, TikTok, Twitter/X,
// Facebook, Reddit, Pinterest, Vimeo, and many more.

const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to the yt-dlp binary (downloaded during build — see package.json / build step)
const YTDLP = process.env.YTDLP_PATH || path.join(__dirname, 'bin', 'yt-dlp');

// Optional cookies file (needed for YouTube, which blocks server downloads).
// Place a Netscape-format cookies.txt in the project root, OR set the
// YOUTUBE_COOKIES env var on Render with the file contents.
const fs = require('fs');
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');
if (process.env.YOUTUBE_COOKIES && !fs.existsSync(COOKIES_PATH)) {
  try {
    fs.writeFileSync(COOKIES_PATH, process.env.YOUTUBE_COOKIES);
  } catch (e) {
    console.warn('Could not write cookies file:', e.message);
  }
}
const HAS_COOKIES = fs.existsSync(COOKIES_PATH);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple health check so UptimeRobot can keep the server awake
app.get('/ping', (req, res) => res.json({ status: 'alive', time: Date.now() }));

// Force-download proxy: streams the remote file through our server with a
// Content-Disposition header so the browser saves it instead of playing it.
app.get('/download', async (req, res) => {
  const fileUrl = req.query.url;
  const filename = (req.query.name || 'video').replace(/[^\w.\-]/g, '_');
  if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
    return res.status(400).send('Invalid URL');
  }
  try {
    const upstream = await fetch(fileUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!upstream.ok || !upstream.body) {
      return res.status(502).send('Could not fetch the file.');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/octet-stream'
    );
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    // Stream the response body to the client
    const reader = upstream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) return res.end();
      res.write(Buffer.from(value));
      return pump();
    };
    await pump();
  } catch (e) {
    res.status(500).send('Download failed.');
  }
});

// Helper: run yt-dlp and return parsed JSON metadata
function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    // -J = dump full info as JSON, no download
    const args = [
      '-J',
      '--no-warnings',
      '--no-playlist',
      '--user-agent', UA,
      // Use the android client which is less aggressively bot-checked
      '--extractor-args', 'youtube:player_client=android,web',
    ];
    if (HAS_COOKIES) {
      args.push('--cookies', COOKIES_PATH);
    }
    args.push(url);

    execFile(
      YTDLP,
      args,
      { maxBuffer: 1024 * 1024 * 20, timeout: 60000 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(stderr || err.message || 'yt-dlp failed'));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error('Could not parse video info'));
        }
      }
    );
  });
}

// Main endpoint: takes a URL, returns title, thumbnail, and download options
app.post('/api/fetch', async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid URL.' });
  }

  try {
    const info = await getVideoInfo(url);

    // Build a clean list of download options from available formats
    const formats = (info.formats || [])
      .filter(f => f.url && (f.vcodec !== 'none' || f.acodec !== 'none'))
      .map(f => {
        const isAudioOnly = f.vcodec === 'none' && f.acodec !== 'none';
        const height = f.height ? `${f.height}p` : null;
        const size = f.filesize
          ? `${(f.filesize / 1048576).toFixed(1)} MB`
          : f.filesize_approx
          ? `~${(f.filesize_approx / 1048576).toFixed(1)} MB`
          : '';
        return {
          url: f.url,
          quality: isAudioOnly ? 'Audio' : height || (f.format_note || 'Video'),
          ext: f.ext || (isAudioOnly ? 'm4a' : 'mp4'),
          size,
          type: isAudioOnly ? 'audio' : 'video',
          height: f.height || 0,
          hasAudio: f.acodec !== 'none',
        };
      });

    // Prefer progressive formats (video + audio together) for easy direct download
    const progressive = formats
      .filter(f => f.type === 'video' && f.hasAudio)
      .sort((a, b) => b.height - a.height);

    const audio = formats
      .filter(f => f.type === 'audio')
      .sort((a, b) => (b.size > a.size ? 1 : -1))
      .slice(0, 1);

    // Deduplicate by quality label, keep best
    const seen = new Set();
    const videoOptions = [];
    for (const f of progressive) {
      if (!seen.has(f.quality)) {
        seen.add(f.quality);
        videoOptions.push(f);
      }
    }

    let downloads = [...videoOptions.slice(0, 5), ...audio];

    // Fallback: if no progressive formats, just give the direct URL yt-dlp resolved
    if (downloads.length === 0 && info.url) {
      downloads = [{ url: info.url, quality: 'Best Quality', ext: info.ext || 'mp4', type: 'video', size: '' }];
    }

    if (downloads.length === 0) {
      throw new Error('No downloadable formats found.');
    }

    res.json({
      success: true,
      title: info.title || 'Video',
      thumb: info.thumbnail || null,
      duration: info.duration || null,
      downloads,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message.includes('Private')
        ? 'This video is private or protected and cannot be downloaded.'
        : 'Could not fetch this link. It may be private, region-locked, or unsupported.',
    });
  }
});

app.listen(PORT, () => console.log(`VidGrab running on port ${PORT}`));