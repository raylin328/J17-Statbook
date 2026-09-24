const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}
function boot(seed, key) {
  return new JSDOM(html, {
    runScripts: "dangerously", url: "https://x.test/",
    beforeParse(w) { if (seed) w.localStorage.setItem(key || "j17.statbook.v2", JSON.stringify(seed)); }
  });
}
const mk = dom => {
  const d = dom.window.document;
  return {
    d, w: dom.window,
    $: s => d.querySelector(s),
    $$: s => Array.from(d.querySelectorAll(s)),
    click: e => e.dispatchEvent(new dom.window.Event("click", { bubbles: true })),
    type(el, v) { el.value = v; el.dispatchEvent(new dom.window.Event("input", { bubbles: true })); },
    byText(sel, t) { return Array.from(d.querySelectorAll(sel)).find(e => e.textContent.trim().startsWith(t)); },
    nav(i) { this.click(Array.from(d.querySelectorAll("#nav button"))[i]); }
  };
};

// ============ 1. cold start ============
let A = mk(boot(null));
A.w.eval("S.prefs.gameView = 'tiles'; save();");  // this suite drives the tile workflow
ok("boots clean", !!A.$("#view"));
ok("seven tabs", A.$$("#nav button").length === 7, A.$$("#nav button").length + "");
ok("asks for players first", /No players yet/.test(A.$("#view").textContent));

// add three players
A.nav(4);
ok("players tab", /Add a player/.test(A.$("#view").textContent));
function addPlayer(H, name, desc, aliases) {
  const card = H.$(".card");
  const field = ph => Array.from(card.querySelectorAll("input")).find(i => i.placeholder.startsWith(ph));
  H.type(field("Name"), name);
  if (desc) H.type(field("Descriptor"), desc);
  if (aliases) H.type(field("Aliases"), aliases);
  H.click(H.byText("button", "Add player"));
}
addPlayer(A, "Riley Park", "black shirt");
addPlayer(A, "Dana Ortiz", "");
addPlayer(A, "Casey Lin", "", "Cass Lin, Cass");
ok("three players registered", A.w.eval("S.players.length") === 3);
ok("aliases stored", A.w.eval("S.players[2].aliases.join('|')") === "Cass Lin|Cass");
ok("ids are unique", A.w.eval("new Set(S.players.map(p=>p.id)).size") === 3);
ok("player survives save", JSON.parse(A.w.localStorage.getItem("j17.statbook.v2")).players.length === 3);

// ============ 2. game workflow ============
A.nav(0);
ok("new session screen", /New session/.test(A.$("#view").textContent));
let chips = A.$$(".chip");
// team 1 picks Riley, team 2 picks Dana + Casey
const pickIn = (card, name) => A.click(Array.from(card.querySelectorAll(".chip")).find(c => c.textContent.indexOf(name) > -1));
let cards = A.$$(".card");
pickIn(cards[0], "Riley Park");
pickIn(cards[1], "Dana Ortiz");
pickIn(cards[1], "Casey Lin");
A.click(A.byText("button", "Start game"));
ok("game started", A.w.eval("activeSession().kind") === "game");
ok("teams populated", A.w.eval("activeSession().teams[1].playerIds.length") === 2);

// record a scoring run for Riley
A.click(A.$$(".plr")[0]);
ok("player selected", A.$$(".plr")[0].getAttribute("aria-pressed") === "true");
A.click(A.byText(".act", "+3"));
A.click(A.byText(".act", "+2"));
A.click(A.byText(".act", "+1"));
ok("scoreboard adds 3/2/1", A.$(".tscore").textContent === "6", A.$(".tscore").textContent);
A.click(A.byText(".act", "Rebound"));
A.click(A.byText(".act", "Block"));
A.click(A.byText(".act", "Foul"));
ok("non-scoring stats don't score", A.$(".tscore").textContent === "6");
ok("tile shows the line", A.$$(".plr")[0].textContent.indexOf("6 · 1 · 0 · 0 · 1 · 1") > -1,
  A.$$(".plr")[0].textContent);

// other team
A.click(A.$$(".teamtab")[1]);
ok("switched roster", A.$$(".plr").length === 2);
A.click(A.$$(".plr")[0]);
A.click(A.byText(".act", "+2"));
ok("away scores separately", A.$$(".tscore")[1].textContent === "2");
A.click(A.byText(".btn", "Undo last"));
ok("undo removes it", A.$$(".tscore")[1].textContent === "0");

// box score + reconciliation
A.nav(1);
ok("two box tables", A.$$("table").length === 2);
const cells = tr => Array.from(tr.children).map(td => td.textContent.replace(/\s+/g, " ").trim());
const head = cells(A.$$("table")[0].querySelector("thead tr"));
ok("box columns from catalog", head.join("|") === "Player|PTS|2P|3P|1P|REB|AST|STL|BLK|PF", head.join("|"));
ok("Riley line correct", cells(A.$$("table")[0].querySelector("tbody tr")).join("|")
  === "Riley Park|6|1|1|1|1|0|0|1|1", cells(A.$$("table")[0].querySelector("tbody tr")).join("|"));
const scoreInputs = A.$$("#view input[type=number]");
A.type(scoreInputs[0], "10");
A.type(scoreInputs[1], "8");
ok("capture rate computed", /Tracked 6 of 18 points \(33%\)/.test(A.$("#recon").textContent),
  A.$("#recon").textContent);
ok("per-team delta shown", /-4/.test(A.$("#recon").textContent), A.$("#recon").textContent);

// CSV
const csv = A.w.eval("sessionCSV(activeSession())");
ok("CSV names both teams", csv.indexOf("Riley Park") > -1 && csv.indexOf("Casey Lin") > -1);
ok("CSV carries official score", csv.indexOf("official 10") > -1, csv.split("\n")[4]);

// ============ 3. practice workflow ============
A.nav(3);
A.click(A.byText("button", "New session"));
A.click(A.byText(".chip", "Practice"));
let pcard = A.$(".card");
A.type(pcard.querySelector("input"), "Combine testing");
pickIn(pcard, "Riley Park");
pickIn(pcard, "Dana Ortiz");
A.click(A.byText("button", "Start practice"));
ok("practice started", A.w.eval("activeSession().kind") === "practice");
ok("scoreboard shows title", A.$(".board-title").textContent === "Combine testing");
ok("drill chips listed", A.$$(".chip").length === 5, A.$$(".chip").length + "");

// a measure drill (vertical jump) — default first drill
ok("default drill is vertical", A.w.eval("stType(statByKey(UI.drill || statsIn('practice',true)[0].key))") === "float");
A.click(A.$$(".plr")[0]);
A.type(A.$("#pracIn"), "22");
A.click(A.byText(".btn", "Record"));
ok("measure recorded", A.w.eval("activeSession().events.length") === 1);
ok("tile shows best", A.$$(".plr")[0].textContent.indexOf("22 in") > -1, A.$$(".plr")[0].textContent);
ok("player stays selected after recording", A.$$(".plr")[0].getAttribute("aria-pressed") === "true");
A.type(A.$("#pracIn"), "25");
A.click(A.byText(".btn", "Record"));
ok("best takes the higher jump", A.$$(".plr")[0].textContent.indexOf("25 in") > -1, A.$$(".plr")[0].textContent);

// a time drill — lower is better
A.click(A.byText(".chip", "Full court sprint"));
ok("stopwatch appears", !!A.$("#swFace"));
A.w.eval("UI.sel = S.players[0].id; swElapsed = 3400; render();");
ok("record button offers the time", /Record 3.40s/.test(A.$("#view").textContent), A.$("#view").textContent.slice(0,200));
A.click(A.byText(".btn", "Record 3.40s"));
A.w.eval("UI.sel = S.players[0].id; swElapsed = 3120; render();");
A.click(A.byText(".btn", "Record 3.12s"));
ok("two sprint times stored", A.w.eval("activeSession().events.filter(e=>e.key==='SPRFC').length") === 2);
ok("best sprint is the lower", A.w.eval(
  "var m=totalsFor(activeSession())[S.players[0].id]; bestOf(statByKey('SPRFC'), m.SPRFC)") === 3.12);

// practice results table
A.nav(1);
ok("practice results render", /Practice results/.test(A.$("#view").textContent));
const prow = cells(A.$$("table")[0].querySelector("tbody tr"));
ok("results show bests", prow.join("|") === "Riley Park|25 in|3.12 s|—|—|—", prow.join("|"));

// ============ 4. report card ============
A.nav(6);
ok("report card renders", /Report card/.test(A.$("#view").textContent));
const rcTables = A.$$("#view table");
ok("games and practice sections", rcTables.length === 2, rcTables.length + " tables");
const ptsRow = Array.from(rcTables[0].querySelectorAll("tbody tr"))
  .find(r => r.textContent.indexOf("Points") > -1);
ok("career points on card", cells(ptsRow).join("|") === "Points|6|6.0", cells(ptsRow).join("|"));
const sprRow = Array.from(rcTables[1].querySelectorAll("tbody tr"))
  .find(r => r.textContent.indexOf("sprint") > -1);
ok("sprint improvement flagged better", /better/.test(sprRow.textContent), sprRow.textContent.trim());
const card = A.w.eval("cardCSV(S.players[0].id)");
ok("card CSV has both halves", card.indexOf("Games played,1") > -1 && card.indexOf("Full court sprint") > -1);

// ============ 5. add a stat at any time ============
A.nav(5);
const statForm = A.$$(".card").pop();
const si = statForm.querySelectorAll("input");
const ss = statForm.querySelectorAll("select");
A.type(si[0], "Lane agility 2");
ss[0].value = "practice"; ss[1].value = "time";
A.type(si[1], "s");
A.click(A.byText("button", "Add stat"));
ok("new stat added", A.w.eval("S.stats.some(s=>s.label==='Lane agility 2')"));
ok("new stat is a time", A.w.eval("betterOf(S.stats.find(s=>s.label==='Lane agility 2'))") === "lower");
ok("old sessions unaffected", A.w.eval("activeSession().events.length") === 4);

// toggling a stat off hides it but keeps data
A.w.eval("statByKey('BLK').on = false; save();");
A.w.eval("S.activeId = S.sessions.find(s=>s.kind==='game').id; UI.tab='box'; render();");
const head2 = cells(A.$$("table")[0].querySelector("thead tr"));
ok("switched-off stat leaves the table", head2.indexOf("BLK") === -1, head2.join("|"));
ok("but its events are kept", A.w.eval(
  "activeSession().events.filter(e=>e.key==='BLK').length") === 1);
A.w.eval("statByKey('BLK').on = true; save();");

// ============ 6. migration from v1 ============
const v1 = {
  games: [{
    id: "g1", created: Date.parse("2026-09-02T18:00:00"), format: "quarters", period: "Q4", done: true,
    tracked: ["PTS", "REB", "AST", "STL"],
    teams: [
      { name: "Team 1", players: [{ id: "a", num: "Quinn", name: "black shirt" }] },
      { name: "Team 2", players: [{ id: "b", num: "Devon", name: "" }] }
    ],
    events: [
      { id: "e1", t: 1, p: "Q1", tm: 0, pl: "a", s: "PTS", v: 3 },
      { id: "e2", t: 2, p: "Q1", tm: 0, pl: "a", s: "PTS", v: 2 },
      { id: "e3", t: 3, p: "Q1", tm: 0, pl: "a", s: "PTS", v: 1 },
      { id: "e4", t: 4, p: "Q2", tm: 0, pl: "a", s: "REB", v: 1 },
      { id: "e5", t: 5, p: "Q2", tm: 1, pl: "b", s: "STL", v: 1 }
    ]
  }],
  activeId: "g1"
};
const M = mk(boot(v1, "j17.statbook.v1"));
ok("v1 data migrated", M.w.eval("S.sessions.length") === 1);
ok("players lifted into registry", M.w.eval("S.players.length") === 2, M.w.eval("S.players.map(p=>p.name).join()"));
ok("v1 label became the name", M.w.eval("S.players[0].name") === "Quinn");
ok("v1 descriptor kept", M.w.eval("S.players[0].desc") === "black shirt");
ok("points split into 3P/2P/1P", M.w.eval(
  "var m=totalsFor(activeSession())[S.players[0].id]; [m['3P'],m['2P'],m['1P']].join('|')") === "1|1|1");
ok("score preserved through migration", M.w.eval("teamScore(activeSession(),0)") === 6);
ok("schema stamped", M.w.eval("S.v") === 3);
ok("migration notice shown once", /brought across/.test(M.$("#view").textContent) ||
  M.w.eval("!S.migratedFromV1"));

// ============ 7. forward compatibility ============
const future = { v: 99, players: [], stats: [], sessions: [] };
const F = mk(boot(future));
ok("refuses newer schema", /newer version/.test(F.$("#view").textContent));
ok("and does not overwrite it", JSON.parse(F.w.localStorage.getItem("j17.statbook.v2")).v === 99);

// unknown stat key from a future version
const weird = {
  v: 2, players: [{ id: "p1", name: "X", aliases: [], desc: "", notes: "", active: true }],
  stats: null, sessions: [{
    id: "s1", date: Date.now(), kind: "game", format: "quarters", period: "Q1", done: false,
    teams: [{ name: "A", playerIds: ["p1"] }, { name: "B", playerIds: [] }],
    finalScore: [null, null], events: [{ id: "e", t: 1, sid: "s1", pid: "p1", key: "ZZZ", v: 4 }], notes: ""
  }], activeId: "s1"
};
const W = mk(boot(weird));
ok("unknown stat doesn't crash", !!W.$("#view").textContent);
ok("unknown stat totals cleanly", W.w.eval("totalsFor(activeSession())['p1'].ZZZ") === 4);
ok("missing catalog reseeded", W.w.eval("S.stats.length") > 0);

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
