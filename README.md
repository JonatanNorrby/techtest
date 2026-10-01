# The Little Outpost — Babylon.js 3D demo

A tiny browser-based 3D walking playground. No build tools, backend, npm dependencies, downloaded models or game engine setup needed. Babylon.js is loaded from its official CDN; every object in the demo is created in JavaScript from primitive meshes.

## Play

Once GitHub Pages is enabled, visit **https://jonatannorrby.github.io/techtest/**.

| Input | Action |
| --- | --- |
| W A S D or arrow keys | Walk |
| Hold Shift | Sprint |
| Space | Jump |
| R | Reset to spawn |
| Mouse wheel | Camera zoom |

The camera follows the character at a fixed angle. Scenery has simple circular collision, and movement slides along objects. The random test environment uses a fixed seed, so it is reproducible.

## Run locally

Serve this folder using any static HTTP server (ES modules usually cannot be loaded directly from a file:// URL):

    python -m http.server 8000

Open **http://localhost:8000**. An internet connection is required for the Babylon.js CDN.

## Deploy to GitHub Pages

This repository contains an automated Pages workflow at .github/workflows/deploy.yml.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to main or run the **Deploy playground** workflow under the **Actions** tab.
4. Open **https://jonatannorrby.github.io/techtest/** once the workflow succeeds.

## Structure

    index.html                    Canvas and HUD
    styles.css                    Responsive HUD and visual polish
    src/main.js                   Babylon engine, input and follow camera
    src/player.js                 Mesh-based character, movement, jump and collision
    src/world.js                  Terrain, procedural scenery, lights and portal
    .github/workflows/deploy.yml  Publish static files to GitHub Pages

Edit src/world.js to add meshes or change the fixed random seed. Edit src/player.js for movement or character appearance. The portal is a decorative test model rather than a working teleport system.

**Note:** The official Babylon.js CDN is intended for learning and small experiments like this demo. For a production game, bundle or self-host Babylon.js.
