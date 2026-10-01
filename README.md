# Techtest — Ashen Warden Lair

A browser-based Babylon.js, high-detail **isometric fantasy visual prototype**. This is a free-roam scene (not a combat implementation) inspired by stylized dungeon-raid art direction. All scenery, actor models, the stone texture, and visual spell effects are created procedurally — no external art files or model downloads.

## Visual upgrade (v4)

- A 1024px generated sandstone texture, hundreds of individually shaded concentric pavers, inlaid brass arena rings, chips, fissures and patterned ruins.
- Raised temple pillars, burgundy banners, torch embers and edge foliage.
- Armored molten stone boss with lava seams, face glow, spikes, floating rubble and idle animation.
- More detailed chibi fantasy party with shoulder armor, accessories, runic rings and floating nameplates.
- Layered animated magic beams (healing, lightning, arcane), warning circles and an example cone telegraph.
- Orthographic follow camera, optional post-processing bloom/FXAA/glow and soft shadows with safe fallback.
- Dark, ornamented fantasy HUD, decorative party/boss panels and movement-key action bar.

The party/boss health bars, spell beams and warning markers demonstrate the *visual style only*; there is no implemented combat, damage or ability casting.

## Controls

| Input | Action |
| --- | --- |
| W/A/S/D or arrow keys | Move |
| Shift | Sprint |
| Space | Jump |
| R | Reset |
| Mouse wheel | Camera zoom |

A live status, coordinates (X/Y/Z), FPS and startup errors are shown in the UI.

## Run and publish

GitHub Pages URL (when the deployment workflow has succeeded): **https://jonatannorrby.github.io/techtest/**

Go to Settings → Pages → Source → GitHub Actions if this is the first deployment. The included `.github/workflows/deploy.yml` deploys each push to `main`. A hard refresh will bypass any older CSS/JS cache.

Locally: run `python -m http.server 8000` in the repository root and visit http://localhost:8000. The official Babylon.js CDN requires internet. The CDN is convenient for this experiment; bundle/self-host it for production.

## Code layout

- `index.html` / `styles.css` — canvas, errors and HUD
- `src/main.js` — Babylon startup, high-res post processing and camera/input
- `src/world.js` — arena, lighting, NPCs, interactive collision boundaries and spell previews
- `src/detail.js` — detailed stonework, procedural texture, ruins, banners and magical ground effects
- `src/actors.js` — character and molten boss models
- `src/player.js` — walking, collision, jump, sprint and reset
