// v4.12.2 tests: the full court for turnovers, blocks and assists. One toggle
// (game screen, the spot sheet, the chart); spots saved in a full-court frame;
// half-court spots mapped onto the full court and back; the court column in events.csv.
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
function same(name, a, b) { ok(name, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) + " vs " + JSON.stringify(b)); }
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
function last(s) { return s.events[s.events.length - 1]; }
// jsdom has no layout, so give the court a size and tap it at a point
function tapCourt(w, width, height, x, y) {
  var c = w.document.querySelector(".overlay .court");
  c.getBoundingClientRect = function() { return { left: 0, top: 0, width: width, height: height }; };
  c.dispatchEvent(new w.MouseEvent("click", { clientX: x, clientY: y, bubbles: true }));
}
function dots(w) { return all(w, "#view .court .mk").map(function(c) { return c.getAttribute("cx") + "," + c.getAttribute("cy"); }).sort(); }
function kind(w, i) { all(w, ".chartkinds .chip")[i].click(); }

// ---- the two frames -----------------------------------------------------------------------------
(function() {
  var w = newApp();
  ok("version is 4.12.2 or later", /^4\.(12\.2|1[3-9]|[2-9]\d)/.test(w.APP_VERSION), w.APP_VERSION);
  ok("tab title shows it", w.document.title === "J17 Stat Book " + w.APP_VERSION, w.document.title);
  same("a half-court spot on offence is the attacking half", w.spotOnFull({ x: 0.2, y: 0.4 }, false), { x: 0.2, y: 0.2 });
  same("a half-court block is the defended half, turned round", w.spotOnFull({ x: 0.2, y: 0.4 }, true), { x: 0.8, y: 0.8 });
  same("a full-court spot is used as it is", w.spotOnFull({ x: 0.2, y: 0.9, court: "full" }, false), { x: 0.2, y: 0.9 });
  same("full court to half: the attacking half fits", w.spotOnHalf({ x: 0.3, y: 0.3, court: "full" }, false), { x: 0.3, y: 0.6 });
  eq("full court to half: the backcourt doesn't", w.spotOnHalf({ x: 0.3, y: 0.7, court: "full" }, false), null);
  same("a block near the defended basket fits", w.spotOnHalf({ x: 0.25, y: 0.9, court: "full" }, true).x, 0.75);
  ok("and lands near the basket at the top", Math.abs(w.spotOnHalf({ x: 0.25, y: 0.9, court: "full" }, true).y - 0.2) < 1e-9);
  eq("a block at the other end doesn't", w.spotOnHalf({ x: 0.3, y: 0.2, court: "full" }, true), null);
  [false, true].forEach(function(def) {
    var f = w.spotOnFull({ x: 0.37, y: 0.62 }, def), back = w.spotOnHalf({ x: f.x, y: f.y, court: "full" }, def);
    ok("half to full and back is the same spot (" + (def ? "block" : "offence") + ")", Math.abs(back.x - 0.37) < 1e-9 && Math.abs(back.y - 0.62) < 1e-9, JSON.stringify(back));
  });
  var svg = w.courtSVG([{ x: 0.5, y: 0, side: "h" }], true);
  ok("the full court is its own drawing", svg.getAttribute("class") === "court full" && svg.getAttribute("viewBox") === "0 0 940 500" && svg.getAttribute("aria-label") === "Full court");
  eq("with a basket at each end", svg.querySelectorAll("g").length, 2);
  eq("the attacked baseline is on the right", svg.querySelector(".mk").getAttribute("cx"), "940");
  ok("the half court is unchanged", w.courtSVG([]).getAttribute("viewBox") === "0 0 500 470" && w.courtSVG([], false).getAttribute("class") === "court");
})();

// ---- the toggle, and placing a spot ----------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 3);
  ok("no Full court switch while charting is off", !btn(w, "Full court"));
  w.S.prefs.chartShots = true; w.render();
  var sw = btn(w, "Full court");
  ok("it appears next to Chart shots", !!sw && sw.getAttribute("aria-pressed") === "false" && sw.parentNode === btn(w, "Chart shots").parentNode);

  cell(w, "h0", "TO").click();
  ok("off: a turnover gets the half court", !!w.document.querySelector(".overlay .court") && !w.document.querySelector(".overlay .court.full"));
  tapCourt(w, 500, 470, 100, 235);
  ok("and the spot is saved as before", last(s).x === 0.2 && last(s).y === 0.5 && last(s).court === undefined, JSON.stringify(last(s)));

  btn(w, "Full court").click();
  eq("the switch is saved", w.S.prefs.fullCourt, true);
  ok("and says what changed", /Turnovers and blocks now use the full court/.test(w.__toasts[w.__toasts.length - 1]));
  eq("it shows as on", btn(w, "Full court").getAttribute("aria-pressed"), "true");

  cell(w, "h0", "TO").click();
  var ov = w.document.querySelector(".overlay");
  ok("on: a turnover gets the full court", !!ov.querySelector(".court.full"));
  ok("in a wider sheet", ov.querySelector(".sheet").classList.contains("widesheet"));
  ok("the sheet says which way the team is going", /Black is attacking the basket on the right/.test(ov.textContent), ov.textContent);
  ok("there is still no Made or Missed", !btn(w, "Made"));
  tapCourt(w, 940, 500, 94, 125);        // near the left end: deep in the backcourt
  var e = last(s);
  ok("a tap at the left end is near the team's own baseline", e.court === "full" && e.x === 0.25 && e.y === 0.9, JSON.stringify(e));
  cell(w, "a1", "BLK") || (w.UI.team = 1, w.render());
  cell(w, "a1", "BLK").click();
  ok("the other team is told about its own direction", /White is attacking the basket on the right/.test(w.document.querySelector(".overlay").textContent));
  tapCourt(w, 940, 500, 846, 250);       // right end, middle
  ok("a tap at the right end is near the attacked baseline", last(s).court === "full" && last(s).x === 0.5 && last(s).y === 0.1, JSON.stringify(last(s)));
  w.UI.team = 0; w.render();

  cell(w, "h1", "BLK").click();
  var chip = all(w, ".overlay .fullcourt")[0];
  ok("the sheet has the switch too", !!chip && chip.getAttribute("aria-pressed") === "true");
  chip.click();
  ok("switching it there goes to the half court, sheet still open", w.S.prefs.fullCourt === false && !!w.document.querySelector(".overlay .court") && !w.document.querySelector(".overlay .court.full"));
  all(w, ".overlay .fullcourt")[0].click();
  ok("and back", w.S.prefs.fullCourt === true && !!w.document.querySelector(".overlay .court.full"));
  btn(w, "Save without a spot").click();
  ok("no spot means no frame either", last(s).key === "BLK" && last(s).x === undefined && last(s).court === undefined);
  cell(w, "h1", "BLK").click(); btn(w, "Cancel").click();
  eq("cancel records nothing", w.totalsFor(s).h1.BLK, 1);

  cell(w, "h2", "2P").click();
  ov = w.document.querySelector(".overlay");
  ok("a shot stays on the half court", !!ov.querySelector(".court") && !ov.querySelector(".court.full") && !ov.querySelector(".fullcourt"));
  ok("with Made and Missed", !!btn(w, "Made") && !!btn(w, "Missed"));
  tapCourt(w, 500, 470, 150, 94);
  ok("and is saved in the half-court frame", last(s).x === 0.3 && last(s).y === 0.2 && last(s).court === undefined, JSON.stringify(last(s)));

  w.S.prefs.chartShots = false; w.render();
  ok("charting off hides the switch and keeps the choice", !btn(w, "Full court") && w.S.prefs.fullCourt === true);
})();

// ---- the chart ---------------------------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 3);
  function rec(key, pid, extra) { w.record(key, undefined, pid, extra); return last(s); }
  rec("TO", "h0", { x: 0.2, y: 0.4 });                       // half court
  rec("TO", "h0", { x: 0.5, y: 0.8, court: "full" });        // full court, backcourt
  rec("TO", "a0", { x: 0.5, y: 0.25, court: "full" });       // full court, front court
  rec("BLK", "h1", { x: 0.2, y: 0.4 });                      // half court
  rec("BLK", "h1", { x: 0.5, y: 0.9, court: "full" });       // full court, at the defended basket
  rec("BLK", "h1", { x: 0.5, y: 0.3, court: "full" });       // full court, at the far end
  var shot = rec("2P", "h2", { x: 0.3, y: 0.2 }); rec("AST", "h0");

  w.UI.tab = "box"; w.render();
  ok("the shots view has no Full court switch", !all(w, "#view .fullcourt").length && !w.document.querySelector("#view .court.full"));
  kind(w, 1);
  var sw = all(w, "#view .fullcourt")[0];
  ok("turnovers: the switch is there, off", !!sw && sw.getAttribute("aria-pressed") === "false");
  same("half court: the two front-court turnovers", dots(w), ["100,188", "250,235"]);
  var card = w.document.querySelector(".chartkinds").parentNode;
  ok("and it says one is out of view", /1 more in the other half of the court: turn on Full court to see it/.test(card.textContent));
  eq("the table still counts every one", Array.from(card.querySelectorAll("tbody tr")).map(function(tr) { return tr.textContent; }).join("/"), "Home 022/Away 011");

  sw.click();
  eq("the switch is saved", w.S.prefs.fullCourt, true);
  ok("the full court is drawn", !!w.document.querySelector("#view .court.full"));
  same("with all three, the half-court one mapped on", dots(w), ["188,250", "705,250", "752,100"]);
  card = w.document.querySelector(".chartkinds").parentNode;
  ok("the legend says which way", /Each team is shown attacking the basket on the right/.test(card.textContent) && !/more in the other half/.test(card.textContent));
  w.UI.shotFilter = "t1"; w.render();
  same("the team filter still applies", dots(w), ["705,250"]);
  w.UI.shotFilter = "all"; w.render();

  kind(w, 2);
  same("blocks on the full court: the half-court one is at the defended end", dots(w), ["188,400", "658,250", "94,250"]);
  all(w, "#view .fullcourt")[0].click();
  same("blocks on the half court: the far-end one is left out", dots(w), ["100,188", "250,94"]);
  ok("and counted", /1 more in the other half/.test(w.document.querySelector(".chartkinds").parentNode.textContent));

  kind(w, 3);
  same("assists on the half court: where the basket was shot", dots(w), ["150,94"]);
  all(w, "#view .fullcourt")[0].click();
  same("assists on the full court: the same spot in the attacking half", dots(w), ["846,150"]);
  kind(w, 0);
  ok("shots stay on the half court even with the switch on", !w.document.querySelector("#view .court.full") && dots(w).join() === "150,94");

  // events.csv carries the frame
  var csv = w.eventsCSV(), head = csv.split("\n")[0].split(",");
  eq("events CSV ends with the court column", head[head.length - 1], "court");
  eq("the four full-court rows are marked", csv.split("\n").filter(function(l) { return /,full$/.test(l); }).length, 4);
  var n = s.events.length; s.events = [];
  eq("events import back", w.importEventsCSV(csv), n);
  eq("with their frame", s.events.filter(function(e) { return e.court === "full"; }).length, 4);
  ok("half-court rows have none", s.events.filter(function(e) { return e.key === "2P"; })[0].court === undefined);
  var oldCsv = csv.split("\n").map(function(l) { return l.split(",").slice(0, 13).join(","); }).join("\n");
  s.events = [];
  ok("a v4.12 file (no court column) still imports, as half court", w.importEventsCSV(oldCsv) === n && !s.events.some(function(e) { return e.court; }));
})();

// ---- older data ------------------------------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 2);
  eq("a save with no choice starts on the half court", w.S.prefs.fullCourt, undefined);
  w.record("TO", undefined, "h0", { x: 0.4, y: 0.6 });
  w.UI.tab = "box"; w.render(); kind(w, 1);
  same("v4.12 spots draw as before", dots(w), ["200,282"]);
  all(w, "#view .fullcourt")[0].click();
  same("and appear on the full court without being changed", dots(w), ["658,200"]);
  ok("the saved spot is untouched", s.events[0].x === 0.4 && s.events[0].y === 0.6 && s.events[0].court === undefined);
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
