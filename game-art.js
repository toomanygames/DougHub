/* DougHub Open Game Art Pack — artwork released under CC0 1.0 */
(() => {
  "use strict";
  const key = (location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
  const games = {
    "bubble-grove": ["Bubble Grove","Games/art/bubble-grove.svg","Original DougHub woodland bubble artwork"],
    "titlebound": ["TITLEBOUND: Realms of Fortune","Games/art/titlebound.svg","Original DougHub cosmic-fortune artwork"],
    "neon-survivor": ["NEON SURVIVOR","Games/art/neon-survivor.svg","Original DougHub neon-energy artwork"],
    "dead-city": ["DEAD CITY: SURVIVAL","Games/art/dead-city.svg","Original DougHub abandoned-city artwork"],
    "starfall-run": ["STARFALL RUN","Games/art/starfall-run.svg","Original DougHub meteor-run artwork"],
    "crystal-breaker": ["CRYSTAL BREAKER","Games/art/crystal-breaker.svg","Original DougHub crystal artwork"],
    "pig-clicker": ["Pig Clicker","Games/art/pig-clicker.svg","Original DougHub pig character artwork"],
    "rebirth-clicker": ["Rebirth Clicker","Games/art/rebirth-clicker.svg","Original DougHub rebirth artwork"],
    "ocean-drive": ["Ocean Drive","Games/art/ocean-drive.svg","Original DougHub coastal artwork"],
    "racing": ["Doug Racing","Games/art/racing.svg","Original DougHub racing artwork"],
    "puzzle": ["Doug Puzzle 2048","Games/art/puzzle.svg","Original DougHub number-tile artwork"],
    "drive-pig": ["Drive Pig","Games/art/drive-pig.svg","Original DougHub pig-car artwork"],
    "drivepig3d": ["Pig Racing3D","Games/art/drive-pig.svg","Original DougHub pig-car artwork"],
    "smack-n-punch": ["Smack 'n Punch","Games/art/smack-n-punch.svg","Original DougHub impact-playground artwork"]
  };
  const game = games[key];
  if (!game || document.getElementById("dhOpenArtDock")) return;
  const [name, art, description] = game;
  const style = document.createElement("style");
  style.textContent = `
    #dhOpenArtDock{position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;gap:9px;padding:7px 10px 7px 7px;border:1px solid rgba(196,181,253,.28);border-radius:14px;background:rgba(8,10,25,.88);color:#f7f5ff;box-shadow:0 10px 35px #0008;backdrop-filter:blur(16px);font:600 11px/1.25 Inter,system-ui,sans-serif}
    #dhOpenArtDock img{width:38px;height:38px;object-fit:cover;border-radius:9px;border:1px solid #ffffff22}
    #dhOpenArtDock .dh-art-copy{display:grid;gap:3px;min-width:0}
    #dhOpenArtDock .dh-art-copy strong{font-size:11px;letter-spacing:.04em}
    #dhOpenArtDock .dh-art-copy span{color:#b8b5d0;font-size:9px}
    #dhOpenArtDock button{border:1px solid #a78bfa66;border-radius:9px;padding:8px 10px;background:linear-gradient(135deg,#6366f1,#9333ea);color:white;font:800 10px Inter,system-ui,sans-serif;cursor:pointer}
    #dhArtCredits{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;padding:18px;background:#03040bd9;backdrop-filter:blur(12px);font:14px/1.55 Inter,system-ui,sans-serif;color:#f8f7ff}
    #dhArtCredits.open{display:flex}
    #dhArtCredits .dh-art-modal{width:min(460px,100%);max-height:min(80vh,650px);overflow:auto;padding:22px;border:1px solid #ffffff20;border-radius:18px;background:#101329;box-shadow:0 24px 80px #000a}
    #dhArtCredits h2{margin:0 0 12px;font-size:20px}
    #dhArtCredits p{color:#c4c2d6;margin:8px 0}
    #dhArtCredits a{color:#c4b5fd;text-decoration:underline}
    #dhArtCredits .dh-license{padding:10px 12px;margin-top:12px;border-radius:10px;background:#ffffff0a;color:#d9d6eb;font-size:12px}
    #dhArtCredits .dh-close{margin-top:16px;padding:9px 14px;border:1px solid #ffffff24;border-radius:9px;background:#ffffff12;color:white;font-weight:700;cursor:pointer}
    @media(max-width:520px){#dhOpenArtDock{left:8px;bottom:8px;gap:7px}#dhOpenArtDock img{width:32px;height:32px}#dhOpenArtDock .dh-art-copy span{display:none}#dhOpenArtDock button{padding:8px}}
  `;
  document.head.appendChild(style);
  const dock = document.createElement("aside");
  dock.id = "dhOpenArtDock";
  dock.innerHTML = `<img src="../${art}" alt=""><div class="dh-art-copy"><strong>${name}</strong><span>OPEN ART · CC0 1.0</span></div><button type="button" id="dhOpenArtCredits">Credits</button>`;
  const modal = document.createElement("div");
  modal.id = "dhArtCredits";
  const codeCredit = key === "puzzle"
    ? '<p><b>Game code:</b> 2048 by Gabriele Cirulli and contributors, licensed under MIT. <a href="https://github.com/gabrielecirulli/2048" target="_blank" rel="noopener noreferrer">View source</a>.</p>'
    : key === "ocean-drive"
      ? '<p><b>Game code:</b> Ocean Drive by StarKnightt, licensed under MIT. <a href="https://github.com/StarKnightt/ocean-drive" target="_blank" rel="noopener noreferrer">View source</a>.</p>'
      : '<p><b>Game code:</b> DougHub game implementation. This artwork credit does not change the game-code license or ownership.</p>';
  modal.innerHTML = `<section class="dh-art-modal" role="dialog" aria-modal="true" aria-labelledby="dhArtTitle"><h2 id="dhArtTitle">Artwork & Credits</h2><p><b>${name}</b></p><p>${description}.</p><p><b>Artist:</b> DougHub Open Game Art Pack.</p><p><b>License:</b> <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0 1.0 Universal</a>. You may copy, modify, distribute, and use this artwork without asking permission.</p>${codeCredit}<div class="dh-license">Artwork file: <code>${art.replace("Games/","")}</code><br>Dedicated to the public domain under CC0 1.0.</div><button class="dh-close" type="button" id="dhCloseArtCredits">Close</button></section>`;
  document.body.append(dock, modal);
  const open = () => modal.classList.add("open");
  const close = () => modal.classList.remove("open");
  document.getElementById("dhOpenArtCredits").addEventListener("click", open);
  document.getElementById("dhCloseArtCredits").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
})();