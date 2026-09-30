const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra ? " -> " + extra : "")); }
  else console.log("pass  " + label);
}
function boot(seed) {
  return new JSDOM(html, {
    runScripts: "dangerously", url: "https://x.test/",
    beforeParse(w) { if (seed) w.localStorage.setItem("j17.statbook.v2", JSON.stringify(seed)); }
  });
}
function w(dom) { return dom.window; }

const seed = {
  v: 2, prefs: { gameView: "grid" },
  players: [
    { id: "p1", name: "Riley Park", desc: "", aliases: [], notes: "", active: true },
    { id: "p2", name: "Dana Ortiz", desc: "", aliases: [], notes: "", active: true }
  ],
  stats: null,
  sessions: [],
  activeId: null
};

const A = boot(seed);
const aw = w(A);

// ---------- default drills ----------
const defaultDrills = aw.eval("statsIn('practice', true)");
ok("default practice drills exist", defaultDrills.length > 0, defaultDrills.length + "");
ok("vertical jump in defaults", aw.eval("statsIn('practice', true).some(s => s.key === 'VERT')"));
ok("full court sprint in defaults", aw.eval("statsIn('practice', true).some(s => s.key === 'SPRFC')"));
ok("full court with ball in defaults", aw.eval("statsIn('practice', true).some(s => s.key === 'SPRFCB')"));
ok("no 3/4 sprint anymore", !aw.eval("S.stats.some(s => s.key === 'SPR34')"));

// ---------- add a custom stat ----------
aw.eval("UI.tab = 'stats'; render();");
const form = aw.window.document.querySelector(".card:last-child");
const inputs = form.querySelectorAll("input");
const selects = form.querySelectorAll("select");

// label
const labelInput = inputs[0];
labelInput.value = "Agility ladder";
labelInput.dispatchEvent(new aw.Event("input", { bubbles: true }));

// scope (practice)
selects[0].value = "practice";

// kind (time - lower is better for a drill)
selects[1].value = "time";

// unit
inputs[1].value = "s";
inputs[1].dispatchEvent(new aw.Event("input", { bubbles: true }));

// add button
const addBtn = form.querySelector("button");
addBtn.dispatchEvent(new aw.Event("click", { bubbles: true }));

ok("custom stat added", aw.eval("S.stats.some(s => s.label === 'Agility ladder')"));
const agility = aw.eval("S.stats.find(s => s.label === 'Agility ladder')");
ok("custom stat has auto-generated key", agility.key && agility.key.length > 0);
ok("custom stat is a time drill", agility.type === "time");
ok("custom stat unit preserved", agility.unit === "s");
ok("custom stat is time-like (lower better)", aw.eval("betterOf(S.stats.find(s => s.label === 'Agility ladder'))") === "lower");
ok("custom stat turned on by default", agility.on === true);

// ---------- custom stat appears in practice ----------
const customKey = agility.key;
aw.eval("UI.tab = 'session'; render();");
aw.eval("UI.setup = { kind: 'practice', title: 'Test', format: '', names: [], picks: [[], []], pracIds: ['p1', 'p2'] };");
aw.eval("S.prefs.gameView = 'grid';");
aw.eval("startSession({ kind: 'practice', title: 'Drills', playerIds: ['p1', 'p2'] });");
aw.eval("UI.tab = 'session'; render();");

const allChips = aw.window.document.querySelectorAll(".chips .chip");
let foundCustom = false;
allChips.forEach(chip => {
  if (chip.textContent.indexOf("Agility") > -1) foundCustom = true;
});
ok("custom stat appears as a drill option", foundCustom, Array.from(allChips).map(c => c.textContent.trim().slice(0, 20)).join(" | "));

// ---------- can record custom stat (as a time drill with stopwatch) ----------
aw.eval("UI.drill = '" + customKey + "'; UI.sel = 'p1'; swElapsed = 12500; render();");
ok("stopwatch shows for time drill", aw.window.document.querySelector("#swFace") !== null);
const recordTimeBtn = aw.window.document.querySelector(".btn.solid");
if (recordTimeBtn) recordTimeBtn.dispatchEvent(new aw.Event("click", { bubbles: true }));

ok("custom stat recorded", aw.eval("activeSession().events.some(e => e.key === '" + customKey + "')"));
ok("custom stat value preserved", aw.eval("activeSession().events.find(e => e.key === '" + customKey + "').v") === 12.5);

// ---------- custom stat shows on player tile ----------
aw.eval("UI.drill = '" + customKey + "'; render();");
const playerTile = aw.window.document.querySelector(".plr");
ok("player tile shows custom stat value", playerTile.textContent.indexOf("12.5") > -1, playerTile.textContent);

// ---------- custom stat exports to CSV ----------
const csv = aw.eval("eventsCSV()");
ok("custom stat in events CSV", csv.indexOf(customKey) > -1);
ok("custom stat value in CSV", csv.indexOf("12.5") > -1);

// ---------- report card includes custom stat ----------
aw.eval("UI.tab = 'card'; UI.card = 'p1'; render();");
const reportCard = aw.window.document.querySelector("#view").textContent;
ok("custom stat appears on report card", reportCard.indexOf("Agility") > -1, reportCard.slice(0, 200));

// ---------- import/export preserves custom stats ----------
const exported = {
  players: aw.eval("playersCSV()"),
  sessions: aw.eval("sessionsCSV()"),
  events: aw.eval("eventsCSV()")
};
const B = boot(null);
const bw = w(B);
bw.eval(`importFromCSVs(${JSON.stringify(exported.players)}, ${JSON.stringify(exported.sessions)}, ${JSON.stringify(exported.events)})`);
ok("custom stat not lost on import", bw.eval("S.sessions[0].events.some(e => e.key === '" + customKey + "')"));
ok("custom stat value preserved through round-trip", bw.eval("S.sessions[0].events.find(e => e.key === '" + customKey + "').v") === 12.5);

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
