// Layout checks that need a real browser. The other test files run in jsdom, which
// has no layout, so they can't see where things land on the screen.
//   node browser-check.js        (needs Playwright with Chromium; not part of npm test)
// What it checks, at phone, iPad portrait and iPad landscape sizes:
//   1. the game grid's header row is where it belongs and never covers a row of cells
//      (in v4.12 and v4.12.2 it covered the third row on a phone);
//   2. the header sticks under the scoreboard when the grid fits, and scrolls away when it doesn't;
//   3. the zone map's drawn shapes and zoneAt() agree, point by point;
//   4. the Zones tab doesn't push the page wider than the screen.
"use strict";
var path = require("path");
var STATBOOK = require("./app-path");
var chromium;
try { chromium = require("playwright").chromium; }
catch (e) { console.log("Playwright isn't installed here, so the browser checks were skipped."); process.exit(0); }

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("pass  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra !== undefined ? "  -> " + extra : "")); }
}
var SIZES = [["phone", 390, 844], ["iPad portrait", 820, 1180], ["iPad landscape", 1180, 820]];

function setup() {
  S.players = []; var home = [], away = [];
  for (var i = 0; i < 20; i++) {       // a long roster, so every screen size has room to scroll
    S.players.push({ id: "h" + i, name: "Home Player " + i, num: String(i + 1), active: true, cat: MISC_ID, aliases: [], desc: "", notes: "" }); home.push("h" + i);
    S.players.push({ id: "a" + i, name: "Away Player " + i, num: String(i + 20), active: true, cat: MISC_ID, aliases: [], desc: "", notes: "" }); away.push("a" + i);
  }
  startSession({ kind: "game", title: "", format: "quarters", periodMin: 8,
                 teams: [{ name: "Black", playerIds: home }, { name: "White", playerIds: away }] });
  setOnCourt(activeSession(), 0, ["h2", "h5", "h7", "h9", "h11"]);
  render();
}
function grid() {
  var tbl = document.querySelector(".tapgrid").getBoundingClientRect();
  var th = document.querySelector(".tapgrid thead th:nth-child(3)").getBoundingClientRect();
  var board = document.querySelector(".board").getBoundingClientRect();
  var onTop = Array.from(document.querySelectorAll(".tapgrid tbody tr")).slice(0, 3).map(function(r) {
    var c = r.querySelector(".cell").getBoundingClientRect();
    var e = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
    return e ? e.tagName : "none";
  });
  return { headerInTable: Math.round(th.top - tbl.top), thTop: Math.round(th.top), boardBottom: Math.round(board.bottom),
           onTop: onTop.join(","), fits: document.querySelector(".gridtw").classList.contains("fits") };
}
function shapes(mode) {
  UI.tab = "zones"; UI.zoneView = mode; render();
  var svg = document.querySelector("#view .zonemap");
  var paths = Array.from(svg.querySelectorAll("path.zone")).reverse();
  var bad = 0, n = 0;
  for (var x = 1.25; x < 500; x += 2.5) for (var y = 1.25; y < 470; y += 2.5) {
    var z = zoneAt(x / 500, y / 470), want = mode === "angles" ? z.sector : z.id, got = null;
    var pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    for (var i = 0; i < paths.length; i++) { if (paths[i].isPointInFill(pt)) { got = paths[i].getAttribute("data-zone"); break; } }
    n++; if (got !== want) bad++;
  }
  return { points: n, bad: bad, wide: document.documentElement.scrollWidth - innerWidth };
}

(async function() {
  var browser = await chromium.launch();
  for (var i = 0; i < SIZES.length; i++) {
    var name = SIZES[i][0];
    var page = await browser.newPage({ viewport: { width: SIZES[i][1], height: SIZES[i][2] } });
    var errors = [];
    page.on("pageerror", function(e) { errors.push(String(e)); });
    await page.goto("file://" + path.resolve(STATBOOK));
    await page.evaluate(setup);
    var g = await page.evaluate(grid);
    ok(name + ": the grid header sits at the top of the grid", g.headerInTable >= 0 && g.headerInTable <= 12, JSON.stringify(g));
    ok(name + ": nothing covers the first rows of cells", g.onTop === "BUTTON,BUTTON,BUTTON", g.onTop);
    await page.evaluate(function() { window.scrollTo(0, 420); });
    await page.waitForTimeout(150);
    var s = await page.evaluate(grid);
    ok(name + ": the page scrolled far enough to test the header", await page.evaluate(function() { return window.scrollY >= 400; }));
    if (s.fits) ok(name + ": the grid fits, so the header sticks under the scoreboard", Math.abs(s.thTop - s.boardBottom) <= 1, JSON.stringify(s));
    else ok(name + ": the grid doesn't fit, so the header scrolls away with it", s.thTop < s.boardBottom && s.headerInTable <= 12, JSON.stringify(s));
    var modes = ["zones", "angles"];
    for (var m = 0; m < modes.length; m++) {
      var r = await page.evaluate(shapes, modes[m]);
      // outlines are drawn to a tenth of a unit, so a handful of points right on a line may land either side
      ok(name + ": the " + modes[m] + " map matches zoneAt (" + r.bad + " of " + r.points + " points differ)", r.bad / r.points < 0.001, JSON.stringify(r));
      ok(name + ": the " + modes[m] + " view fits the screen width", r.wide <= 0, r.wide + "px too wide");
    }
    ok(name + ": no script errors", errors.length === 0, errors.join(" / "));
    await page.close();
  }
  await browser.close();
  console.log(pass + " pass, " + fail + " fail");
  if (!fail) console.log("all green");
  process.exit(fail ? 1 : 0);
})();
