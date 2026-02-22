# SpineViz — AI-Powered MRI Spine Viewer

Interactive 3D spine visualization that uses Claude AI to parse MRI reports and highlight affected vertebrae.

## Tech Stack
- **Vite + React** — fast dev/build
- **Three.js / React Three Fiber / Drei** — 3D rendering with real GLB model
- **Claude API (Sonnet)** — parses MRI impression text into structured findings
- **Vercel** — deployment

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## Deploy to Vercel

### Option A: Vercel CLI
```bash
npm i -g vercel
vercel
```

### Option B: GitHub → Vercel
1. Push this folder to a new GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Framework: Vite (auto-detected)
5. Deploy

No env vars needed — the API key is entered client-side at runtime.

## Usage
1. Click **🔑 API Key** in the header and paste your Anthropic API key
2. Paste an MRI Impression section (or click **Sample**)
3. Click **Analyze Report**
4. Interact: drag to orbit, scroll to zoom, click vertebrae for details

## Project Structure
```
spineviz-app/
├── public/
│   └── models/
│       └── vertebra_hq.glb      # Converted Blender model
├── src/
│   ├── components/
│   │   ├── SpineViewer.jsx       # 3D scene (R3F + Drei)
│   │   ├── Panel.jsx             # Left sidebar (input/findings)
│   │   ├── LevelRail.jsx         # Right level indicator
│   │   └── Overlays.jsx          # HUD, detail overlay, hints
│   ├── api.js                    # Claude API integration
│   ├── data.js                   # Spine levels, severity config
│   ├── App.jsx                   # Main app shell
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## Model
The GLB was converted from a Blender `.blend` file (Pozvonok48) with:
- Non-mesh objects stripped (cameras, lights, armatures)
- Moderate decimation for web performance (~422KB)
- Materials preserved from original

To swap in a different model, replace `public/models/vertebra_hq.glb` and adjust scales in `data.js`.
