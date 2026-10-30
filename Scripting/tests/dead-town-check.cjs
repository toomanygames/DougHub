const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const source = fs.readFileSync("Scripting/scripting.js", "utf8");
new vm.Script(source, { filename: "Scripting/scripting.js" });
const marker = source.indexOf(" zombie:{");
const start = source.indexOf("js:`", marker);
const end = source.indexOf("`},\n quiz:{", start);
assert.ok(marker >= 0 && start >= 0 && end > start, "Dead Town starter template boundaries exist");
const game = source.slice(start + 4, end);
new vm.Script(game, { filename: "Dead Town starter JavaScript" });
for (const feature of [
  "function updateHostSimulation(dt)",
  "function hostHandleShot(p)",
  "function hostCollect(p)",
  'roomChannel.on("broadcast",{event:"world"}',
  'roomChannel.on("broadcast",{event:"collect"}',
  "function equipWeapon(kind)",
  'await equipWeapon("pistol")',
  "function buildTownProps()",
  "if(!online){const zx=player.position.x-z.g.position.x",
  "setTimeout(()=>{if(hostId===playerId){spawn("
  "solidBuildings.some",
  "localDowned",
  'id="weaponName"'
]) assert.ok(source.includes(feature), "Missing feature: " + feature);
console.log("Dead Town static checks passed: main script syntax, starter syntax, multiplayer, scavenging, weapons, and world features.");
