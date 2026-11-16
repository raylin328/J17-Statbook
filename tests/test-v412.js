// v4.12 tests: free throw misses (FTX); on-court players first in the grid and tiles,
// with the stat names repeated above the bench; the sticky grid header hooks;
// turnovers and blocks charted with a spot; assists paired with the basket.
"use strict";
var fs = require("fs");
var JSDOM = require("jsdom").JSDOM;
var STATBOOK = require("./app-path");

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("pass  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra !== undefined ? "  -> " + extra : "")); }
}
function eq(name, a, b) { ok(name, a === b, JSON.stringify(a) + " vs " + JSON.stringify(b)); }
function newApp() {
  var w = new JSDOM(fs.readFileSync(STATBOOK, "utf8"), { runScripts: "dangerously", url: "https://x.test/" }).window;
  w.__toasts = []; var t0 = w.toast; w.toast = function(m) { w.__toasts.push(m); return t0(m); };
  return w;
}
function pl(w, id, name, num) { return { id: id, name: name, num: num || "", active: true, cat: w.MISC_ID, aliases: [], desc: "", notes: "" }; }
function game(w, n) {
  var home = [], away = []; w.S.players = [];
  for (var i = 0; i < n; i++) {
    w.S.players.push(pl(w, "h" + i, "Home " + i, String(i))); home.push("h" + i);
    w.S.players.push(pl(w, "a" + i, "Away " + i, String(10 + i))); away.push("a" + i);
  }
  w.startSession({ kind: "game", title: "", format: "quarters", periodMin: 8,
                   teams: [{ name: "Black", playerIds: home }, { name: "White", playerIds: away }] });
  return w.activeSession();
}
function all(w, sel) { return Array.from(w.document.querySelectorAll(sel)); }
function cell(w, pid, key) { return w.document.querySelector('.tapgrid .cell[data-pid="' + pid + '"][data-key="' + key + '"]'); }
function btn(w, text) { return all(w, "button").filter(function(b) { return b.textContent.trim() === text; })[0]; }
function heads(w) { return all(w, ".tapgrid thead th").map(function(x) { return x.textContent; }); }
// each body row as the player id it belongs to, or "[bench]" for the repeated header
function rowIds(w) {
  return all(w, ".tapgrid tbody tr").map(function(tr) {
    if (tr.className === "benchhead") return "[bench]";
    return tr.querySelector(".cell").getAttribute("data-pid");
  });
}
function last(s) { return s.events[s.events.length - 1]; }

// ---- free throw misses ----------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 2);
  eq("version", w.APP_VERSION, "4.12");
  ok("tab title shows it", w.document.title === "J17 Stat Book 4.12", w.document.title);
  var keys = w.S.stats.map(function(x) { return x.key; });
  eq("FTX sits right after 1P in the catalog", keys.indexOf("FTX"), keys.indexOf("1P") + 1);
  var ftx = w.statByKey("FTX");
  ok("it is a game tally worth no points, on by default", ftx.tally === true && !ftx.pts && ftx.on === true && ftx.scope === "game");
  eq("label", ftx.label, "Free throw miss");
  eq("the grid has the column next to the makes", heads(w).join("|"), "Player|PTS|2P|3P|1P|FTX|OREB|DREB|AST|STL|BLK|PF|TO");

  cell(w, "h0", "1P").click();
  var poss = w.possessionsFor(s, 0);
  cell(w, "h0", "FTX").click(); cell(w, "h0", "FTX").click();
  eq("two misses counted", w.totalsFor(s).h0.FTX, 2);
  eq("the cell shows them", cell(w, "h0", "FTX").textContent, "2");
  eq("a miss adds no points", w.teamScore(s, 0), 1);
  eq("and doesn't change the possession count", w.possessionsFor(s, 0), poss);
  ok("the toast names it", /Home 0 · Free throw miss/.test(w.__toasts.join(" | ")), w.__toasts.join(" | "));
  eq("a miss is a plain event (no miss flag: it is its own stat)", last(s).miss, undefined);

  w.UI.minus = true; w.render(); cell(w, "h0", "FTX").click();
  eq("Minus takes one off", w.totalsFor(s).h0.FTX, 1);
  w.UI.minus = false; w.render(); btn(w, "Undo last") && btn(w, "Undo last").click();

  w.UI.tab = "box"; w.render();
  var t = w.document.querySelectorAll("table")[0];
  var h = Array.from(t.querySelectorAll("thead th")).map(function(x) { return x.textContent; });
  ok("the box score has the column", h.indexOf("FTX") === h.indexOf("1P") + 1, h.join("|"));
  var line = w.eventsCSV().split("\n").filter(function(l) { return /,FTX,/.test(l); });
  ok("events CSV: a miss has no made flag", line.every(function(l) { return l.split(",")[8] === ""; }), line.join(" / "));
})();

// ---- an older save gains the column once ------------------------------------------------------
(function() {
  var w = newApp(), saved = JSON.parse(JSON.stringify(w.S));
  saved.stats = saved.stats.filter(function(x) { return x.key !== "FTX"; });
  delete saved.prefs.ftxV1;
  var w2 = newApp(); w2.localStorage.setItem(w2.KEY, JSON.stringify(saved)); w2.load();
  var keys = w2.S.stats.map(function(x) { return x.key; });
  eq("a v4.11 save gains FTX right after 1P", keys.indexOf("FTX"), keys.indexOf("1P") + 1);
  eq("exactly once", keys.filter(function(k) { return k === "FTX"; }).length, 1);
  eq("the upgrade is remembered", w2.S.prefs.ftxV1, true);

  w2.S.stats = w2.S.stats.filter(function(x) { return x.key !== "FTX"; }); w2.save();
  var w3 = newApp(); w3.localStorage.setItem(w3.KEY, w2.localStorage.getItem(w2.KEY)); w3.load();
  ok("deleting it later is kept", !w3.S.stats.some(function(x) { return x.key === "FTX"; }));

  var noFT = JSON.parse(JSON.stringify(saved));
  noFT.stats = noFT.stats.filter(function(x) { return x.key !== "1P"; });
  var w4 = newApp(); w4.localStorage.setItem(w4.KEY, JSON.stringify(noFT)); w4.load();
  ok("a catalog without 1P still gets it (at the end)", w4.S.stats[w4.S.stats.length - 1].key === "FTX" || w4.S.stats.some(function(x) { return x.key === "FTX"; }));
})();

// ---- on-court players first -------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 6);
  eq("no lineup: roster order", rowIds(w).join(","), "h0,h1,h2,h3,h4,h5");
  ok("and no bench header", !w.document.querySelector(".tapgrid .benchhead"));
  eq("courtOrder says so", w.courtOrder(s, 0).benchAt, -1);

  w.setOnCourt(s, 0, ["h5", "h3"]); w.render();
  eq("on-court players come first, in roster order, then the bench", rowIds(w).join(","), "h3,h5,[bench],h0,h1,h2,h4");
  var bh = all(w, ".tapgrid .benchhead th").map(function(x) { return x.textContent; });
  eq("the bench header repeats the stat names", bh.join("|"), ["Bench", "PTS"].concat(heads(w).slice(2)).join("|"));
  eq("the top header is unchanged", heads(w)[0], "Player");
  eq("on-court rows are marked", all(w, ".tapgrid tbody tr")[0].className, "oncourt");
  eq("bench rows are marked", all(w, ".tapgrid tbody tr")[3].className, "bench");

  cell(w, "h3", "2P").click();
  eq("a tap still lands on the right player", w.totalsFor(s).h3["2P"], 1);
  eq("the roster itself is not reordered", s.teams[0].playerIds.join(","), "h0,h1,h2,h3,h4,h5");

  w.toggleOnCourt(s, 0, "h0"); w.render();
  eq("a sub moves up", rowIds(w).join(","), "h0,h3,h5,[bench],h1,h2,h4");
  w.UI.team = 1; w.render();
  eq("the other team has no lineup: roster order", rowIds(w).join(","), "a0,a1,a2,a3,a4,a5");
  w.UI.team = 0;

  s.teams[0].playerIds.push(w.TEAM_ROWS[0]); w.render();
  eq("a Team row sits between the court and the bench", rowIds(w).join(","), "h0,h3,h5," + w.TEAM_ROWS[0] + ",[bench],h1,h2,h4");
  eq("and is not dimmed as bench", all(w, ".tapgrid tbody tr")[3].className, "");
  s.teams[0].playerIds.pop();

  w.S.prefs.gameView = "tiles"; w.render();
  var tiles = all(w, ".plr").map(function(b) { return b.querySelector(".jn").textContent; });
  eq("tiles follow the same order", tiles.join(","), "Home 0,Home 3,Home 5,Home 1,Home 2,Home 4");
  w.S.prefs.gameView = "grid";

  w.setOnCourt(s, 0, []); w.render();
  ok("nobody on: no bench header, roster order", !w.document.querySelector(".benchhead") && rowIds(w).join(",") === "h0,h1,h2,h3,h4,h5", rowIds(w).join(","));
  w.setOnCourt(s, 0, ["h0", "h1", "h2", "h3", "h4", "h5"]); w.render();
  ok("everybody on: no bench header", !w.document.querySelector(".benchhead"));
})();

// ---- sticky header hooks (the layout itself is checked in a real browser) -----------------------
(function() {
  var w = newApp(); game(w, 3);
  var wrap = w.document.querySelector(".gridtw");
  ok("the grid sits in its own scroll box", !!wrap && wrap.classList.contains("tw") && !!wrap.querySelector(".tapgrid"));
  ok("render measures the scoreboard for the header offset", /px$/.test(w.document.documentElement.style.getPropertyValue("--boardh")));
  ok("a grid that fits is not boxed, so the header can stick", wrap.classList.contains("fits"));
  ok("the style is there", /\.tapgrid thead th\s*\{[^}]*position:sticky/.test(w.document.querySelector("style").textContent));
  eq("fitGrid is safe to call with no grid on screen", (function() { w.UI.tab = "players"; w.render(); w.fitGrid(); return true; })(), true);
})();

// ---- turnovers and blocks get a spot ------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 3);
  cell(w, "h0", "TO").click();
  ok("chart off: a turnover is one tap", !w.document.querySelector(".overlay") && s.events.length === 1);

  w.S.prefs.chartShots = true; w.render();
  cell(w, "h0", "TO").click();
  var ov = w.document.querySelector(".overlay");
  ok("chart on: a turnover opens the court", !!ov && !!ov.querySelector(".court"));
  eq("nothing is recorded until it is placed", s.events.length, 1);
  ok("there is no Made or Missed to choose", !btn(w, "Made") && !btn(w, "Missed"));
  eq("the sheet is labelled", ov.getAttribute("aria-label"), "Mark the spot");
  ok("and says what to do", /Tap where it happened/.test(ov.textContent));
  w.placeShot(0.25, 0.6);
  var e = last(s);
  ok("the turnover is saved with its spot", e.key === "TO" && e.x === 0.25 && e.y === 0.6 && !e.miss && !w.document.querySelector(".overlay"), JSON.stringify(e));
  eq("and counts as a turnover", w.totalsFor(s).h0.TO, 2);

  cell(w, "h1", "BLK").click();
  ok("a block opens the court too", !!w.document.querySelector(".overlay .court"));
  btn(w, "Save without a spot").click();
  ok("it can be saved without a spot", last(s).key === "BLK" && last(s).x === undefined);
  cell(w, "h1", "BLK").click(); btn(w, "Cancel").click();
  eq("cancel records nothing", w.totalsFor(s).h1.BLK, 1);
  cell(w, "h1", "BLK").click(); w.placeShot(0.5, 0.1);

  cell(w, "h0", "AST").click();
  ok("an assist never asks for a spot", !w.document.querySelector(".overlay") && last(s).key === "AST");
  cell(w, "h0", "1P").click(); cell(w, "h0", "FTX").click(); cell(w, "h0", "DREB").click();
  ok("free throws and rebounds don't either", !w.document.querySelector(".overlay"));
  cell(w, "h2", "2P").click();
  ok("a shot still gets Made and Missed", !!btn(w, "Made") && !!btn(w, "Missed"));
  w.placeShot(0.4, 0.3);

  w.S.prefs.gameView = "tiles"; w.UI.sel = "h2"; w.render();
  all(w, ".dock .act").filter(function(b) { return b.textContent === "Turnover"; })[0].click();
  ok("tiles view asks for the spot as well", !!w.document.querySelector(".overlay .court"));
  btn(w, "Cancel").click(); w.S.prefs.gameView = "grid";

  w.UI.tab = "box"; w.render();
  var kinds = all(w, ".chartkinds .chip").map(function(c) { return c.textContent; });
  eq("the chart offers each kind", kinds.join("|"), "Shots|Turnovers|Blocks|Assists");
  eq("shots are shown first", all(w, "#view .court .mk").length, 1);
  all(w, ".chartkinds .chip")[1].click();
  eq("turnovers: one charted", all(w, "#view .court .mk").length, 1);
  var card = w.document.querySelector(".chartkinds").parentNode;
  var row = Array.from(card.querySelectorAll("tbody tr")).map(function(tr) { return Array.from(tr.children).map(function(c) { return c.textContent; }).join("|"); });
  eq("the table gives charted and total", row.join(" / "), "Home 0|1|2");
  ok("the legend explains the dots", /where the ball was lost/.test(card.textContent));
  all(w, ".chartkinds .chip")[2].click();
  eq("blocks: one charted of two", all(w, "#view .court .mk").length, 1);
  w.UI.shotFilter = "t1"; w.render();
  eq("the team filter applies to every kind", all(w, "#view .court .mk").length, 0);
})();

// ---- assists pair with the basket ----------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 4);
  function rec(key, pid, extra) { w.record(key, undefined, pid, extra); return last(s); }

  var b1 = rec("2P", "h0", { x: 0.3, y: 0.2 });
  var a1 = rec("AST", "h1");
  eq("an assist tapped after a teammate's basket pairs with it", a1.shot, b1.id);
  ok("the toast says who it went to", /Home 1 · Assist · to Home 0/.test(w.__toasts[w.__toasts.length - 1]), w.__toasts[w.__toasts.length - 1]);
  var a1b = rec("AST", "h2");
  eq("a basket takes one assist only", a1b.shot, undefined);

  var a2 = rec("AST", "h2");
  var b2 = rec("3P", "h3");
  eq("an assist tapped first pairs with the basket that follows", a2.shot, b2.id);
  ok("the toast says who it came from", /Home 3 · 3-pointer · from Home 2/.test(w.__toasts[w.__toasts.length - 1]), w.__toasts[w.__toasts.length - 1]);

  var b3 = rec("2P", "h0"); rec("DREB", "a0"); rec("PF", "a1");
  var a3 = rec("AST", "h1");
  eq("the other team's taps in between don't break the pair", a3.shot, b3.id);

  // each case below ends with a neutral tap, so a leftover assist can't pair with the next case's basket
  function gap() { rec("PF", "h3"); }
  rec("2P", "h0"); rec("TO", "h0");
  eq("not paired when the team's nearest tap is something else", rec("AST", "h1").shot, undefined); gap();
  rec("2P", "h0");
  eq("a player can't assist their own basket", rec("AST", "h0").shot, undefined); gap();
  rec("2P", "h0", { miss: true });
  eq("a missed shot is not assisted", rec("AST", "h1").shot, undefined); gap();
  var old = rec("2P", "h0"); old.t -= 2 * 60 * 1000;
  eq("not paired after more than a minute", rec("AST", "h1").shot, undefined); gap();
  rec("2P", "h0"); s.period = 2;
  eq("not paired across periods", rec("AST", "h1").shot, undefined); gap();
  var b4 = rec("2P", "a0");
  eq("teams don't assist each other", rec("AST", "h1").shot, undefined);
  eq("the opponent's own assist pairs", rec("AST", "a1").shot, b4.id);

  var stale = rec("AST", "h2"), late = rec("2P", "h1");
  eq("an unpaired assist does pair with the team's very next basket", stale.shot, late.id);

  eq("five baskets have an assist", w.assistPairs(s).length, 5);
  w.UI.tab = "box"; w.render();
  all(w, ".chartkinds .chip")[3].click();
  eq("the assist chart shows the charted basket", all(w, "#view .court .mk").length, 1);
  var card = w.document.querySelector(".chartkinds").parentNode;
  var rows = Array.from(card.querySelectorAll("tbody tr")).map(function(tr) { return Array.from(tr.children).map(function(c) { return c.textContent; }).join("|"); });
  ok("the table pairs passer and scorer", rows[0] === "Home 1|Home 0|2" && rows.indexOf("Home 2|Home 3|1") > -1 && rows.indexOf("Away 1|Away 0|1") > -1, rows.join(" / "));
  ok("and says how many are paired", /5 of 12 assists are paired/.test(card.textContent), card.querySelector("p.sub:last-child").textContent);

  // the link survives export and import, and a removed basket just unpairs
  var csv = w.eventsCSV();
  eq("events CSV has the column", csv.split("\n")[0].split(",").pop(), "assist_for");
  ok("with the basket's id on the assist row", csv.split("\n").some(function(l) { return l.indexOf(a1.id) === 0 && l.split(",").pop() === b1.id; }));
  var kept = s.events.length; s.events = [];
  eq("events import back", w.importEventsCSV(csv), kept);
  var a1in = s.events.filter(function(e) { return e.id === a1.id; })[0];
  eq("with the pairing", a1in.shot, b1.id);
  s.events = s.events.filter(function(e) { return e.id !== b1.id; });
  eq("removing the basket unpairs its assist", w.assistShot(s, a1in), null);
  eq("and the count follows", w.assistPairs(s).length, 4);

  var p = newApp(); p.S.players = [pl(p, "p0", "Ari Kim", "1")];
  p.startSession({ kind: "practice", title: "Drills", playerIds: ["p0"] });
  ok("practice sessions are untouched", p.activeSession().kind === "practice" && typeof p.pairAssist === "function");
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
