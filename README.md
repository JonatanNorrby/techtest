# Techtest — Ashen Warden Lair

A lightweight Babylon.js high-detail isometric **boss-dodging prototype**, hosted as a static site on GitHub Pages. The scene and its assets are generated procedurally.

## Play

Visit **https://jonatannorrby.github.io/techtest/** after the GitHub Actions Pages deployment completes.

The playable Mage has **100 HP**. Ravengar repeats three real, telegraphed attacks:

| Attack | Warning | Damage | How to avoid |
| --- | --- | --- | --- |
| Molten Eruption | Two locked orange circles, 1.9 s | 25 | Move outside both circles before they detonate. |
| Ashen Cleave | Directional orange cone, 1.75 s | 32 | Move out of the cone before it resolves. |
| Seismic Shockwave | Large donut warning ring, 2 s | 35 | Reach the inner safe area, move beyond the outer edge, **or jump over it** (be airborne at impact). |

The boss aims at the player's position **when each telegraph first appears**, giving time to react. There is an approximately one-second recovery between abilities. If HP reaches zero, movement stops and a defeat screen appears. Press **R** to restart at full HP and restart the attack sequence. NPC party frames and boss HP remain decorative: there is no player offense or multiplayer yet.

### Controls

| Key | Action |
| --- | --- |
| W / A / S / D or arrow keys | Walk |
| Shift | Sprint |
| Space | Jump |
| R | Restart / reset position and health |
| Mouse wheel | Zoom |

Your real HP and current cast appear in the fantasy HUD, with hit feedback and a red screen flash when damaged. Actual warning areas appear only while the corresponding attack is charging. Animated NPC spell trails are atmospheric.

## Run locally

Run python -m http.server 8000 in the repo root and open http://localhost:8000. Babylon.js comes from its official CDN; an internet connection is required.

## Deploy

The included .github/workflows/deploy.yml publishes the repository to GitHub Pages on push to main. Under **Settings → Pages**, choose **GitHub Actions** as the source. Check the Actions run to confirm successful deployment. Hard refresh after an update to bypass stale JS/CSS.

## Structure

- src/boss.js: encounter state machine, independent attack hit tests and telegraph meshes.
- src/player.js: movement, HP, damage and death/reset.
- src/main.js: encounter and player updates, camera, rendering and HUD.
- src/world.js, src/detail.js, src/actors.js: visual arena, props and characters.
- index.html, styles.css: HUD, cast bar, damage effects and defeat screen.

The environment has a procedurally drawn 1024-pixel sandstone texture, detailed individual tiles, ruins, banners, lava effects and an armored ash titan. Optional post-processing adds bloom, glow, FXAA and soft shadows, with graceful fallbacks.


## Performance optimization (v6)

The high-detail visual settings (resolution, textures, colors, bloom, glow, FXAA and shadow quality) are retained. To reduce overhead without removing scenery:
- The existing 438 individually modeled paving stones are combined into four draw batches, one per original material.
- Static arena engravings and cracks are grouped into five line-system batches by their exact original colors and paths.
- Spell trails reuse Babylon tube buffers and Vector3 objects; tube geometry updates up to 30 times per second, while spark animations still update every frame.
- Unmoving scenery world matrices are frozen, animated character/embers/boss meshes are not.
- The fixed-angle following camera reuses its vectors, rather than re-aiming every frame.

These are structural/source-level optimizations; actual FPS varies by display, GPU and browser. The FPS counter in-game can be used to compare before and after.
