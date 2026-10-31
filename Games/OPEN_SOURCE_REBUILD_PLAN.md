# DougHub Open-Source Game Rebuild

This is the migration tracker for replacing the official DougHub games with real open-source game code, art, mechanics, and assets. Each port must preserve its upstream notices and include a Credits & License button. A source is not marked complete until the game page uses its gameplay implementation and the credits identify the creator and exact license.

## Rebuild tracker

| DougHub game | Open-source base / art source | License | Status / direction |
|---|---|---|---|
| Bubble Grove | [mashukui/web-games — Bubble Shooter](https://github.com/mashukui/web-games/tree/main/bubble-shooter) | MIT | **Ported.** Upstream canvas visuals, bubble matching, controls, scoring and game loop are in the DougHub page. |
| TITLEBOUND | [remarkablegames/button-clicker](https://github.com/remarkablegames/button-clicker) | MIT | Planned. Adapt its incremental generator, cost-scaling and persistent progression systems; pair with credited CC0 art. |
| Neon Survivor | [LittleJS engine](https://github.com/KilledByAPixel/LittleJS) | MIT | Planned as a non-combat neon dodge-and-collect survival game, with open-source engine functions and licensed environment art. |
| Dead City: Survival | [StarKnightt/ocean-drive](https://github.com/StarKnightt/ocean-drive) | MIT | Planned as a non-combat abandoned-city exploration/restoration game, reusing the open-source city rendering and movement foundation. |
| Starfall Run | [mashukui/web-games — Dino Run](https://github.com/mashukui/web-games/tree/main/dino-run) | MIT | **Ported.** Upstream runner loop, obstacle logic, controls, scoring and canvas art are in the DougHub page. |
| Crystal Breaker | [mashukui/web-games — Breakout](https://github.com/mashukui/web-games/tree/main/breakout) | MIT | **Ported.** Upstream paddle physics, brick logic, levels, scoring and canvas art are in the DougHub page. |
| Pig Clicker | [remarkablegames/button-clicker](https://github.com/remarkablegames/button-clicker) | MIT | Planned. Adapt generator purchasing, exponential cost scaling, passive production and save logic. |
| Rebirth Clicker | [remarkablegames/button-clicker](https://github.com/remarkablegames/button-clicker) | MIT | Planned. Reuse the open-source incremental foundation with a separate prestige/rebirth progression layer. |
| Ocean Drive | [StarKnightt/ocean-drive](https://github.com/StarKnightt/ocean-drive) | MIT | Existing open-source base. Review and expand its asset credits as the art pass is rebuilt. |
| Doug Racing | [jakesgordon/javascript-racer](https://github.com/jakesgordon/javascript-racer) | MIT | Planned. Adapt its arcade-racing systems; replace its demo sprites with separately licensed Kenney CC0 vehicle art. |
| Doug Puzzle | [gabrielecirulli/2048](https://github.com/gabrielecirulli/2048) | MIT | Existing open-source base. Keep original creator/contributor credits and MIT notice. |
| DougHub Sudoku | [sausi-7/games — Sudoku](https://github.com/sausi-7/games/tree/main/games/puzzle/sudoku) | MIT | **Ported.** Upstream Sudoku board and entry logic adapted; added validated completion, restart, responsive DougHub styling and shared credits. |
| Drive Pig (Classic) | [ryancampbell/kart-royale](https://github.com/ryancampbell/kart-royale) | MIT | Planned. Adapt the arcade-racing foundation with a separately licensed CC0 pig character asset. |
| Pig Racing3D | [ryancampbell/kart-royale](https://github.com/ryancampbell/kart-royale) | MIT | Planned. Adapt the arcade-racing foundation and use separately licensed CC0 vehicle/character art. |
| Smack 'n Punch | [Matter.js](https://github.com/liabru/matter-js) | MIT | Planned as a non-weapon physics playground using open-source rigid-body physics and licensed props. |

## Artwork sources

- [Kenney asset library](https://kenney.nl/assets) — individual packs identify their license; Kenney's support page confirms the asset packs are CC0. Check and retain the specific pack's license file for every pack actually imported.
- [Kenney Animal Pack](https://kenney.nl/assets/animal-pack) — CC0 character art candidate for the pig games.
- [Kenney support: asset licensing](https://kenney.nl/support) — attribution is optional for CC0 assets, but DougHub will credit artists anyway.

## Required rules for each port

1. Prefer original upstream game code and art over a new imitation.
2. Record the exact repository, author, upstream path/commit, and license.
3. Copy required license and notice files into `Games/licenses/`.
4. Keep third-party art, audio, fonts, and code notices separate where their licenses differ.
5. Add a Credits & License button to every game page and a DougHub-styled Back to Games control.
6. Use matching upstream/CC0 artwork for the Games page card, game menus, buttons and in-game visuals.
7. Keep the current DougHub title, save data and navigation where practical, and test each port on desktop and touch devices before marking it complete.

## Current verified upstream license files

- [mashukui/web-games MIT license](https://github.com/mashukui/web-games/blob/main/LICENSE) — copied to `Games/licenses/mashukui-web-games-MIT.txt`.
- [remarkablegames/button-clicker MIT license](https://github.com/remarkablegames/button-clicker/blob/master/LICENSE).
- [jakesgordon/javascript-racer MIT license](https://github.com/jakesgordon/javascript-racer/blob/master/LICENSE) — use code only; do not reuse its demo sprites.
- [LittleJS Arcade MIT license](https://github.com/KilledByAPixel/LittleJSArcade/blob/main/LICENSE).
- [StarKnightt/ocean-drive MIT license](https://github.com/StarKnightt/ocean-drive/blob/main/LICENSE).
- [sausi-7/games MIT license](https://github.com/sausi-7/games/blob/main/LICENSE) — copied to `Games/licenses/sausi-7-games-MIT.txt`.

This tracker is intentionally honest: planned entries are not represented as completed ports.


## Work resumed — October 30, 2026

- Added the complete MIT license text for `remarkablegames/button-clicker` at `Games/licenses/remarkablegames-button-clicker-MIT.txt` so the planned clicker ports can preserve the upstream notice when its code is adapted.
- The shared `game-art.js` currently provides the DougHub-styled Back to Games control and Credits & License dialog. Games without a verified port intentionally show a pending-source notice rather than claiming unadapted code or artwork is third-party work.
- Do not mark a planned game complete until its actual upstream gameplay implementation and correctly attributed assets are integrated and browser-tested.


## Game-page artwork and repair pass — October 30, 2026

- Wired the original CC0 SVG logo pack into all 13 official game cards on `douggames.html`, including the two-in-one Drive Pig selector and built-in Trending cards.
- Added a distinct `drive-pig-racing3d.svg` logo for the 3D racing option.
- Completed the shared credits map for Pig Clicker, Pig Clicker: Space, Rebirth Clicker, Doug Racing, Drive Pig, Pig Racing 3D and TITLEBOUND. Credits distinguish DougHub gameplay code from CC0 logo artwork rather than claiming the artwork license covers game code.
- Fixed TITLEBOUND's duplicate quick-upgrade mount ID. The side dock now receives the same upgrade list as the main panel.
- Added an “Open Game” direct-launch fallback to Ocean Drive in case its external embedded player does not load.
- Static audit: all 16 HTML game pages were checked for missing local `src`/`href` references and duplicate element IDs; none remained after the fixes. All 13 game-card logo paths were verified to exist.
- Browser playtesting has not yet been completed. External services and runtime gameplay still need hands-on verification; empty GitHub commit status output is not a browser test.


## Additional open-source game — October 31, 2026

- Added DougHub Sudoku from [sausi-7/games](https://github.com/sausi-7/games/tree/main/games/puzzle/sudoku), licensed MIT; the full upstream MIT notice is stored in `Games/licenses/sausi-7-games-MIT.txt`.
- Adapted the original single-file Sudoku implementation to DougHub's responsive dark theme and shared Back/Credits controls. Removed its external background/config fetch and unused mobile-wrapper messaging.
- Fixed the upstream completion check so it validates any complete legal Sudoku grid (the upstream hard-coded solution list contained an invalid row), added a working restart button, and bounded the confetti animation.
- Added a matching original SVG card logo and listed the game in the official Games catalog.
- Static source checks passed; browser playtesting on desktop and touch devices remains to be done.
