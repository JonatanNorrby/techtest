# Techtest — The Ember Arena

A browser-based Babylon.js 3D movement demo restyled as a **warm, low-poly fantasy arena**, inspired by a top-down dungeon encounter reference. It is a graphical style study, **not a combat game**.

## What's in the demo

- High three-quarter **orthographic** following camera, with wheel zoom.
- An irregular, faceted brown arena with chunky stones, pillars, torches and ambient lighting.
- A walkable purple Mage with a low-poly hood, robe, staff, colored selection ring and floating nameplate.
- Decorative NPC party members (Priest, Warrior and Shaman) and a large non-hostile stone sentinel.
- Dark fantasy UI: party roster, decorative sentinel bar, ornate movement hotbar and live coordinates/FPS.
- Procedurally created meshes and materials: no third-party model or texture files.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D or arrow keys | Move |
| Shift | Sprint |
| Space | Jump |
| R | Reset to spawn |
| Mouse wheel | Camera zoom |

All party/health bars and the sentinel are **decorative**, and the hotbar labels represent movement controls only. Combat, character switching and multiplayer are not implemented.

## Play online

Once GitHub Pages is configured under **Settings → Pages → Build and deployment → GitHub Actions**, the included workflow publishes the static game on pushes to main:

**https://jonatannorrby.github.io/techtest/**

If it looks cached after a new deployment, use a hard refresh. Startup or render errors are surfaced in the page rather than leaving an apparently static screen.

## Run locally

Serve via HTTP so JavaScript modules work:

    python -m http.server 8000

Open http://localhost:8000. Babylon.js is loaded from the official CDN; internet access is needed.

## Files

    index.html                  Game canvas, visible errors and fantasy HUD
    styles.css                  Dark fantasy HUD and ability-like control tiles
    src/actors.js               Shared low-poly character and sentinel meshes
    src/world.js                Arena mesh, props, lighting and decorative NPCs
    src/player.js               Playable Mage, movement, jumping and collisions
    src/main.js                 Babylon startup, input and camera follow
    .github/workflows/deploy.yml   Automatic GitHub Pages publishing

To change the visual style, start with the color/material definitions in src/world.js and src/actors.js. The scene is built from Babylon primitives to keep this test easy to modify. For production projects, consider bundling or self-hosting Babylon.js instead of the public experiment CDN.
