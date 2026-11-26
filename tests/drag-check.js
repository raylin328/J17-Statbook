// v4.16 drag checks that need a real browser (jsdom has no layout, so it can't drag).
//   node drag-check.js        (needs Playwright with Chromium; not part of npm test)
// At iPad landscape size, with a mouse and with a finger, drags each list like a person would: press the
// handle, head for the target, and if the target is off screen hold at the edge while the page scrolls.
// Checks: the game grid inside the court and inside the bench (never across), tiles, practice tiles, the
// one-value list, areas, drills inside an area, the roster (a long way, with scrolling), categories
// (Miscellaneous stays last), stats; that nothing gets selected, opened or switched; that the order
// survives a reload; and that no page scrolls sideways.
"use strict";
var STATBOOK = require("./app-path");
var chromium;
try { chromium = require("playwright").chromium; }
catch (e) { console.log("Playwright isn't installed here, so the drag checks were skipped."); process.exit(0); }
var URL = "file://" + require("path").resolve(STATBOOK), H = 820;
var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("pass  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra !== undefined ? "  -> " + JSON.stringify(extra) : "")); }
}
function setup(kind) {
  localStorage.clear(); S.players = [];
  ["Ari","Bo","Cy","Di","Ed","Fa","Gus"].forEach(function(n, i){ S.players.push({ id: "p" + i, name: n, num: String(i + 3), active: true, cat: MISC_ID, aliases: [], desc: "", notes: "" }); });
  if (kind === "game") {
    startSession({ kind: "game", format: "quarters", periodMin: 8, teams: [{ name: "Black", playerIds: ["p0","p1","p2","p3","p4","p5","p6"] }, { name: "White", playerIds: [] }] });
    setOnCourt(activeSession(), 0, ["p0","p1","p2"]);
  } else if (kind === "practice") startSession({ kind: "practice", title: "x", playerIds: ["p0","p1","p2","p3"] });
  save(); render();
}
function order(page, box, sel) {
  return page.$$eval('[data-sortable="' + box + '"] ' + (sel || "[data-sid]"), function(els){ return els.map(function(e){ return e.getAttribute("data-sid"); }); });
}
async function drag(page, box, src, dst, cdp) {
  var q = '[data-sortable="' + box + '"] [data-sid="' + src + '"] .dh';
  await page.evaluate(function(q){ document.querySelector(q).scrollIntoView({ block: "center" }); }, q);
  await page.waitForTimeout(50);
  var a = await page.locator(q).first().boundingBox(), x = a.x + a.width / 2, y = a.y + a.height / 2;
  var top = await page.evaluate(function(){ return dragTop(); });
  var ids0 = await order(page, box), up = ids0.indexOf(src) > ids0.indexOf(dst);
  async function placed() { var o = await order(page, box); return up ? o.indexOf(src) < o.indexOf(dst) : o.indexOf(src) > o.indexOf(dst); }
  async function touch(type, x, y) { await cdp.send("Input.dispatchTouchEvent", { type: type, touchPoints: type === "touchEnd" ? [] : [{ x: x, y: y, id: 1 }] }); }
  async function move(x, y) { if (cdp) await touch("touchMove", x, y); else await page.mouse.move(x, y); }
  if (cdp) await touch("touchStart", x, y); else { await page.mouse.move(x, y); await page.mouse.down(); }
  for (var n = 0; n < 200 && !(await placed()); n++) {
    var t = await page.locator('[data-sortable="' + box + '"] [data-sid="' + dst + '"]').first().boundingBox();
    var cy = t.y + Math.min(t.height / 2, 40);
    if (cy > top + 90 && cy < H - 90) {
      var x1 = t.x + Math.min(t.width / 2, 60), x0 = x, y0 = y;
      for (var i = 1; i <= 10; i++) { x = x0 + (x1 - x0) * i / 10; y = y0 + (cy - y0) * i / 10; await move(x, y); if (await placed()) break; }
      break;
    }
    var ey = cy < top + 90 ? top + 15 : H - 20;   // off screen: hold at the edge while it scrolls
    if (Math.abs(y - ey) > 1) { for (var k = 1; k <= 3; k++) await move(x, y + (ey - y) * k / 3); y = ey; }
    await page.waitForTimeout(60);
  }
  if (cdp) await touch("touchEnd", x, y); else await page.mouse.up();
  await page.waitForTimeout(150);
}
async function noSideways(page, label) {
  var w = await page.evaluate(function(){ return [document.documentElement.scrollWidth, window.innerWidth]; });
  ok(label + ": the page doesn't scroll sideways", w[0] <= w[1], w);
}
var DRILLCSV = "name,measure,unit,better,active,area\nHelp-side read,rating,BEG/INT/AVG/ADV/ELT,higher,TRUE,Defense\nClose-out,rating,BEG/INT/AVG/ADV/ELT,higher,TRUE,Defense";

(async function() {
  var browser = await chromium.launch();
  for (var mode of ["mouse", "finger"]) {
    var ctx = await browser.newContext({ viewport: { width: 1180, height: H }, hasTouch: mode === "finger" });
    var page = await ctx.newPage(), errs = [];
    page.on("pageerror", function(e){ errs.push(String(e)); });
    await page.goto(URL); await page.waitForTimeout(200);
    var cdp = mode === "finger" ? await ctx.newCDPSession(page) : null, T = function(s){ return "[" + mode + "] " + s; };
    var ev = function(f, arg){ return page.evaluate(f, arg); };

    // game: the grid, inside the court and inside the bench
    await ev(setup, "game"); await ev(function(){ UI.tab = "session"; S.prefs.gameView = "grid"; render(); });
    await drag(page, "game", "p2", "p0", cdp);
    var o = await order(page, "game", "tr[data-sid]");
    ok(T("grid: Cy dragged above Ari on the court"), o.indexOf("p2") < o.indexOf("p0"), o);
    await drag(page, "game", "p0", "p5", cdp);
    o = await order(page, "game", "tr[data-sid]");
    var oc = await ev(function(){ return onCourt(activeSession(), 0).slice().sort(); });
    ok(T("grid: a court player can't be dragged into the bench"), oc.join() === "p0,p1,p2" && o.indexOf("p0") < o.indexOf("p3"), [o, oc]);
    await drag(page, "game", "p6", "p3", cdp);
    o = await order(page, "game", "tr[data-sid]");
    ok(T("grid: the bench reorders inside the bench"), o.indexOf("p6") < o.indexOf("p3"), o);
    var sel = await ev(function(){ return [UI.sel || null, UI.editing || null]; });
    ok(T("grid: dragging doesn't select or open anybody"), !sel[0] && !sel[1], sel);
    await page.reload(); await page.waitForTimeout(200); await ev(function(){ UI.tab = "session"; render(); });
    ok(T("grid: the order survives a reload"), (await order(page, "game", "tr[data-sid]")).join() === o.join());
    await noSideways(page, T("grid"));
    // tiles
    await ev(function(){ S.prefs.gameView = "tiles"; render(); });
    var t0 = await order(page, "tiles", ".plr[data-sid]");
    await drag(page, "tiles", "p1", "p2", cdp);
    var t1 = await order(page, "tiles", ".plr[data-sid]");
    ok(T("tiles: Bo moves past Cy"), (t1.indexOf("p1") > t1.indexOf("p2")) !== (t0.indexOf("p1") > t0.indexOf("p2")), [t0, t1]);
    await noSideways(page, T("tiles"));

    // practice: tiles, the one-value list, areas, drills
    await ev(setup, "practice"); await ev(function(){ UI.tab = "session"; S.prefs.pracSort = "practice"; render(); });
    await drag(page, "practice", "p3", "p0", cdp);
    ok(T("practice: Di dragged to the front"), (await ev(function(){ return activeSession().playerIds[0]; })) === "p3");
    await ev(function(csv){ importDrillsCSV(csv); pickDrill(S.drills.filter(function(d){ return d.name === "Help-side read"; })[0].id); }, DRILLCSV);
    await drag(page, "batch", "p2", "p3", cdp);
    ok(T("one-value list: Cy dragged to the front"), (await ev(function(){ return activeSession().playerIds[0]; })) === "p2");
    await noSideways(page, T("practice"));
    await ev(function(){ document.querySelector("details.manage").open = true; });
    var areas = await order(page, "areas", "details.area[data-sid]");
    await drag(page, "areas", areas[areas.length - 1], areas[0], cdp);
    ok(T("areas: the last area dragged to the top"), (await ev(function(){ return drillAreas(S.drills)[0].name; })) === areas[areas.length - 1]);
    await ev(function(){ document.querySelector("details.manage").open = true; document.querySelectorAll("[data-sortable=areas] details.area").forEach(function(d){ d.open = true; }); });
    var on0 = await ev(function(){ return S.drills.map(function(d){ return d.active; }).join(); });
    var ds = await order(page, "drills:Standard drills");
    await drag(page, "drills:Standard drills", ds[ds.length - 1], ds[0], cdp);
    ok(T("drills: the last standard drill dragged to the top of its area"), (await ev(function(){ return drillAreas(S.drills).filter(function(a){ return a.name === "Standard drills"; })[0].drills[0].id; })) === ds[ds.length - 1]);
    ok(T("drills: no drill switched on or off"), (await ev(function(){ return S.drills.map(function(d){ return d.active; }).join(); })) === on0);

    // roster (a long way: the cards are tall), categories
    await ev(setup, "none"); await ev(function(){ UI.tab = "players"; render(); });
    var rb = (await page.$$eval("[data-sortable^='roster:']", function(els){ return els.map(function(e){ return e.getAttribute("data-sortable"); }); }))[0];
    await drag(page, rb, "p6", "p0", cdp);
    ok(T("roster: Gus dragged from the bottom to the top, scrolling on the way"), (await ev(function(){ return S.players[0].id; })) === "p6");
    ok(T("roster: no editor opened"), !(await ev(function(){ return UI.editing; })));
    var cats = await order(page, "cats", ".catrow[data-sid]");
    await drag(page, "cats", cats[cats.length - 1], cats[0], cdp);
    var c2 = await ev(function(){ return catsSorted().map(function(c){ return [c.id, !!c.misc]; }); });
    ok(T("categories: the last one dragged to the top, Miscellaneous still last"), c2[0][0] === cats[cats.length - 1] && c2[c2.length - 1][1], c2);
    await noSideways(page, T("players"));

    // stats
    await ev(function(){ UI.tab = "stats"; render(); });
    var st = await order(page, "stats:game", ".chip[data-sid]"), son = await ev(function(){ return S.stats.map(function(s){ return s.on; }).join(); });
    await drag(page, "stats:game", st[st.length - 1], st[0], cdp);
    ok(T("stats: the last stat dragged to the front"), (await order(page, "stats:game", ".chip[data-sid]"))[0] === st[st.length - 1]);
    ok(T("stats: no stat switched on or off"), (await ev(function(){ return S.stats.map(function(s){ return s.on; }).join(); })) === son);
    await noSideways(page, T("stats"));
    ok(T("no script errors"), !errs.length, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(pass + " pass, " + fail + " fail");
  if (!fail) console.log("all green");
  process.exit(fail ? 1 : 0);
})();
