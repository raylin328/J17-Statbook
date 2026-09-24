const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}
function boot(seed) {
  return new JSDOM(html, {
    runScripts: "dangerously", url: "https://x.test/",
    beforeParse(w) { if (seed) w.localStorage.setItem("j17.statbook.v2", JSON.stringify(seed)); }
  });
}
function h(dom) {
  const d = dom.window.document;
  return {
    w: dom.window, d,
    $: s => d.querySelector(s),
    $$: s => Array.from(d.querySelectorAll(s)),
    click(e) { e.dispatchEvent(new dom.window.Event("click", { bubbles: true })); },
    cell(pidIdx, key) {
      const pid = dom.window.eval("activeSession().teams[UI.team].playerIds[" + pidIdx + "]");
      return d.querySelector('.cell[data-pid="' + pid + '"][data-key="' + key + '"]');
    }
  };
}

// a live game with two players a side, seeded directly
const P = n => ({ id: "p" + n, name: "Player " + n, aliases: [], desc: n === 1 ? "tall" : "", notes: "", active: true });
const seed = {
  v: 2,
  players: [P(1), P(2), P(3), P(4)],
  stats: null,
  sessions: [{
    id: "g", date: Date.now(), kind: "game", format: "quarters", period: "Q1", done: false,
    teams: [{ name: "Black", playerIds: ["p1", "p2"] }, { name: "White", playerIds: ["p3", "p4"] }],
    playerIds: [], finalScore: [null, null], events: [], notes: ""
  }],
  activeId: "g"
};

// ---------- defaults & compatibility ----------
const A = h(boot(seed));
ok("old v2 file without prefs opens", !!A.$(".tapgrid"));
ok("prefs defaulted in, v2 file migrated to schema 3", A.w.eval("S.v") === 3 && A.w.eval("S.prefs.gameView") === "grid");
ok("view switch present", A.$$(".viewsw .chip").length === 3);  // Tap grid, Tiles, Chart shots

// ---------- layout ----------
const heads = A.$$(".tapgrid thead th").map(t => t.textContent);
ok("grid columns follow the catalog", heads.join("|") === "Player|PTS|2P|3P|1P|REB|AST|STL|BLK|PF", heads.join("|"));
ok("one row per player on this bench", A.$$(".tapgrid tbody tr").length === 2);
ok("descriptor shown under name", A.$(".tapgrid .nmcell small").textContent === "tall");
ok("every stat is a tappable cell", A.$$(".tapgrid .cell").length === 16);
ok("empty cells start at zero", A.$$(".tapgrid .cell").every(c => c.textContent === "0"));

// ---------- one tap records ----------
A.click(A.cell(0, "3P"));
ok("one tap on 3P records a three", A.w.eval("activeSession().events.length") === 1);
ok("scoreboard updates from a single tap", A.$(".tscore").textContent === "3", A.$(".tscore").textContent);
ok("cell shows its new count", A.cell(0, "3P").textContent === "1");
ok("PTS column updates", A.$(".tapgrid .ptscell").textContent === "3");
A.click(A.cell(0, "2P"));
A.click(A.cell(0, "1P"));
A.click(A.cell(0, "REB"));
A.click(A.cell(0, "REB"));
ok("mixed taps total correctly", A.$(".tscore").textContent === "6", A.$(".tscore").textContent);
ok("rebound cell counts to 2", A.cell(0, "REB").textContent === "2");
ok("event goes to the right player", A.w.eval("activeSession().events.every(e => e.pid === 'p1')"));
ok("event is stamped with period and team", A.w.eval("activeSession().events[0].period") === "Q1" &&
  A.w.eval("activeSession().events[0].team") === 0);
ok("no player selection needed", A.w.eval("UI.sel") === null);

// ---------- minus mode ----------
A.click(A.$$(".undo .btn").find(b => b.textContent.indexOf("Minus") === 0));
ok("minus mode turns on", A.w.eval("UI.minus") === true);
ok("grid shows it's in minus mode", A.$(".tapgrid").classList.contains("minus"));
A.click(A.cell(0, "REB"));
ok("minus removes one rebound", A.cell(0, "REB").textContent === "1");
ok("score untouched by removing a rebound", A.$(".tscore").textContent === "6");
A.click(A.cell(0, "3P"));
ok("minus removes the three", A.$(".tscore").textContent === "3", A.$(".tscore").textContent);
const before = A.w.eval("activeSession().events.length");
A.click(A.cell(1, "AST"));
ok("minus on an empty cell removes nothing", A.w.eval("activeSession().events.length") === before);
ok("and says so", /no assist to remove/i.test(A.$(".toast").textContent), A.$(".toast").textContent);

// removes the most recent matching event, not the first
A.click(A.$$(".undo .btn").find(b => b.textContent.indexOf("Minus") === 0));
ok("minus mode turns off", A.w.eval("UI.minus") === false);
A.w.eval("activeSession().period = 'Q2'; save();");
A.click(A.cell(0, "REB"));
A.click(A.$$(".undo .btn").find(b => b.textContent.indexOf("Minus") === 0));
A.click(A.cell(0, "REB"));
ok("minus removes the newest match", A.w.eval(
  "activeSession().events.filter(e=>e.key==='REB').map(e=>e.period).join()") === "Q1",
  A.w.eval("activeSession().events.filter(e=>e.key==='REB').map(e=>e.period).join()"));

// minus is dropped when switching bench, so a correction can't land on the wrong team
ok("minus still on before switching", A.w.eval("UI.minus") === true);
A.click(A.$$(".teamtab")[1]);
ok("switching team turns minus off", A.w.eval("UI.minus") === false);

// ---------- other bench ----------
ok("white bench shows its own players", A.$$(".tapgrid tbody tr")[0].textContent.indexOf("Player 3") > -1);
A.click(A.cell(0, "2P"));
ok("white scores on the right board", A.$$(".tscore")[1].textContent === "2" && A.$(".tscore").textContent === "3");
ok("white event tagged team 1", A.w.eval("activeSession().events.slice(-1)[0].team") === 1);

// ---------- undo still works in grid mode ----------
A.click(A.$$(".undo .btn").find(b => b.textContent === "Undo last"));
ok("undo last works from the grid", A.$$(".tscore")[1].textContent === "0");

// ---------- preference persists, and tiles still reachable ----------
A.click(A.$$(".viewsw .chip").find(c => c.textContent === "Tiles"));
ok("tiles view one tap away", !!A.$(".plr") && !A.$(".tapgrid"));
ok("preference saved", JSON.parse(A.w.localStorage.getItem("j17.statbook.v2")).prefs.gameView === "tiles");
const saved = JSON.parse(A.w.localStorage.getItem("j17.statbook.v2"));
const B = h(boot(saved));
ok("preference survives reload", !!B.$(".plr") && !B.$(".tapgrid"));
B.click(B.$$(".viewsw .chip").find(c => c.textContent === "Tap grid"));
ok("and switches back", !!B.$(".tapgrid"));

// ---------- data written by the grid is identical to tile data ----------
ok("grid events read by box score", (() => {
  B.w.eval("UI.tab='box'; render();");
  return B.$$("table")[0].querySelector("tbody tr").textContent.indexOf("Player 1") > -1;
})());
const csv = B.w.eval("sessionCSV(activeSession())");
ok("grid events export to CSV", /Player 1,3,1,0,1,1/.test(csv), csv.split("\n").slice(4, 7).join(" | "));

// ---------- switched-off stat disappears from the grid ----------
B.w.eval("statByKey('BLK').on = false; UI.tab='session'; render();");
ok("switched-off stat leaves the grid", B.$$(".tapgrid thead th").map(t => t.textContent).indexOf("BLK") === -1);

// ---------- practice sessions unaffected ----------
const prac = JSON.parse(JSON.stringify(seed));
prac.sessions[0] = { id: "pr", date: Date.now(), kind: "practice", title: "Combine", playerIds: ["p1"],
  teams: [], finalScore: [null, null], events: [], notes: "", done: false };
prac.activeId = "pr";
const C = h(boot(prac));
ok("practice screen ignores the grid setting", !C.$(".tapgrid") && /Combine/.test(C.$("#view").textContent));

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
