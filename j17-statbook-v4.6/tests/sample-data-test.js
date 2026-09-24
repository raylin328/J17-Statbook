// A season in miniature, driven through the app's own functions and buttons.
// Fictional players only. Run: node sample-data-test.js   (app-path.js picks the build)
const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync(require("./app-path"), "utf8");

let fails = 0;
function ok(label, cond, info) {
  if (cond) console.log("pass  " + label);
  else { fails++; console.log("FAIL  " + label + (info !== undefined ? "  -> " + info : "")); }
}
const boot = saved => new JSDOM(html, {
  runScripts: "dangerously", url: "https://x.test/",
  beforeParse(w) {
    w.confirm = () => true; w.prompt = () => null;
    if (saved) w.localStorage.setItem("j17.statbook.v2", saved);
  }
}).window;
const w = boot();
const doc = w.document;
const button = t => Array.from(doc.querySelectorAll("button")).find(b => b.textContent.trim().startsWith(t));

console.log("-- roster: one sheet, two categories, no ids");
const roster = [
  "name,jersey number,category,desc",
  "Alex Chen,4,U14 Rep,Guard",
  "Bailey Ruiz,07,U14 Rep,Forward",
  "Casey Park,11,U14 Rep,Center",
  "Devon Moss,0,U14 Rep,Guard",
  "Ellis Grant,00,U14 Rep,Forward",
  "Finley Hart,6,U12 Rep,Guard",
  "Gray Nolan,,U12 Rep,Forward"
].join("\n");
ok("7 players imported", w.importPlayersCSV(roster) === 7 && w.S.players.length === 7);
const id = n => w.S.players.find(p => p.name === n).id;
const inCat = n => w.S.players.filter(p => w.catName(w.catOf(p)) === n).length;
ok("each player got a UUID", w.S.players.every(p => w.UUID_RE.test(p.id)));
ok("0 and 00 are different jerseys", w.player(id("Devon Moss")).num === "0" && w.player(id("Ellis Grant")).num === "00");
ok("U14 Rep has 5, U12 Rep has 2", inCat("U14 Rep") === 5 && inCat("U12 Rep") === 2);
ok("the same sheet imported again adds nobody", w.importPlayersCSV(roster) === 0 && w.S.players.length === 7);

console.log("\n-- practice");
w.startSession({ kind: "practice", title: "Speed and agility", playerIds: ["Alex Chen", "Bailey Ruiz", "Casey Park"].map(id) });
const prac = w.activeSession();
ok("practice is the open session", prac.kind === "practice" && prac.playerIds.length === 3);
w.record("VERT", 24, id("Alex Chen"));
w.record("VERT", 26, id("Casey Park"));
w.record("LANE", 8.5, id("Alex Chen"));
ok("3 results recorded with real timestamps", prac.events.length === 3 && prac.events.every(e => typeof e.t === "number"));

console.log("\n-- game: each team picked with one tap on a category");
w.eval("S.activeId = null; UI.setup = null; UI.tab = 'session'; render();");
const cards = Array.from(doc.querySelectorAll("#view .card"));
const catChip = (card, name) => Array.from(card.querySelectorAll(".chip.grp")).find(c => c.textContent.indexOf(name) > -1);
catChip(cards[0], "U14 Rep").click();
catChip(cards[1], "U12 Rep").click();
button("Start game").click();
const game = w.activeSession();
ok("game started 5 against 2", game.kind === "game" && game.teams[0].playerIds.length === 5 && game.teams[1].playerIds.length === 2);
w.record("2P", undefined, id("Alex Chen"));
w.record("2P", undefined, id("Alex Chen"));
w.record("3P", undefined, id("Bailey Ruiz"));
w.record("2P", undefined, id("Bailey Ruiz"), { miss: true });
w.record("REB", undefined, id("Casey Park"));
w.record("AST", undefined, id("Alex Chen"));
w.record("2P", undefined, id("Finley Hart"));
ok("score is 7-2 (the miss scores nothing)", w.teamScore(game, 0) === 7 && w.teamScore(game, 1) === 2,
   w.teamScore(game, 0) + "-" + w.teamScore(game, 1));

console.log("\n-- export and reload");
const csv = w.playersCSV();
ok("players CSV carries the category", csv.split("\n")[0] === "id,name,jersey number,category,desc,aliases,notes" &&
   csv.indexOf(",Alex Chen,4,U14 Rep,Guard,,") > -1);
w.save();
const w2 = boot(w.localStorage.getItem("j17.statbook.v2"));
ok("reload keeps players, categories and both sessions",
   w2.S.players.length === 7 && w2.S.sessions.length === 2 && w2.catName(w2.catOf(w2.S.players[0])) === "U14 Rep");
ok("reload keeps the score", w2.teamScore(w2.S.sessions.find(s => s.kind === "game"), 0) === 7);

// Substitutions are covered by test-v45.js. They aren't exercised here because the
// v4.5 helpers have no screen yet and minutesPlayed() gives wrong numbers.

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
