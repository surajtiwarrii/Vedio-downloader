# VidGrab — Setup Guide (Free + Always-On)

Ye guide phone se hi follow ho sakti hai. PC ki zaroorat nahi.

---

## Kya ban raha hai

Ek website jisme koi bhi banda, kahin se bhi, kisi bhi platform ki video
ka link daale (Instagram, YouTube, TikTok, Twitter, Facebook, Reddit, Pinterest, Vimeo)
aur seedha download kar le. Backend `yt-dlp` use karta hai — wahi engine jo
har bade downloader ke peeche chalta hai.

---

## PART 1 — Code GitHub pe daalo

1. https://github.com pe jaake free account banao.
2. Right top "+" → **New repository**.
3. Naam do `vidgrab`, **Public** rakho, **Create repository** dabao.
4. Repo page pe **"uploading an existing file"** link pe tap karo.
5. Is folder ki saari files upload karo:
   - `server.js`
   - `package.json`
   - `render.yaml`
   - `public/index.html`  (public folder bana ke uske andar daalna)
6. **Commit changes** dabao.

> Tip: Phone se folder structure banane ke liye GitHub website pe
> "Create new file" mein naam likho `public/index.html` — slash apne aap
> folder bana dega.

---

## PART 2 — Render pe deploy karo (free server)

1. https://render.com pe jaao → **GitHub se sign up** karo.
2. Dashboard pe **New +** → **Web Service**.
3. Apna `vidgrab` repo select karo → **Connect**.
4. Settings apne aap bhar jayengi (render.yaml ki wajah se). Agar na ho to:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. **Create Web Service** dabao.
6. 3-5 min wait karo. Ho jaane par upar ek link milega jaise:
   `https://vidgrab-xxxx.onrender.com`

Ye link sabko bhej sakte ho. Website live hai!

---

## PART 3 — "Band na ho" — Always-On banao (FREE)

Render ka free server 15 min koi use na kare to so jaata hai.
Isko jagaye rakhne ke liye UptimeRobot use karenge — ye har 5 min pe
server ko ping karke jagaye rakhta hai. Bilkul free.

1. https://uptimerobot.com pe free account banao.
2. **Add New Monitor** dabao.
3. Settings:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** VidGrab
   - **URL:** `https://vidgrab-xxxx.onrender.com/ping`
     (apna asli Render link daalo, end mein `/ping` zaroor lagao)
   - **Monitoring Interval:** 5 minutes
4. **Create Monitor** dabao.

Bas. Ab server practically kabhi nahi soyega. Website hamesha chalti rahegi.

---

## Maintenance — Mahine mein ek baar

`yt-dlp` ko platforms ke changes ke saath update karte rehna padta hai.
Jab kisi platform pe download band ho jaye:

- Render dashboard pe jaao → apna service → **Manual Deploy** →
  **Clear build cache & deploy**.
- Build dobara latest yt-dlp download kar lega. Theek ho jayega.

---

## Important / Legal

- Sirf **public** videos download karne ke liye use karo.
- Private, copyright ya kisi aur ki content download karna galat hai —
  uski zimmedari use karne wale ki hai.
- Instagram/YouTube ki terms ko respect karo. Ye tool sirf personal,
  legal use ke liye hai.

---

## Agar kuch atke

- Build fail ho → Render logs check karo, `npm run build` line dekho.
- Download fail ho ek hi platform pe → yt-dlp update karo (upar Maintenance).
- Sab fail ho → ho sakta hai Render free RAM kam padti ho. Tab paid plan
  (~₹600/month) sabse aaram ka raasta hai.
