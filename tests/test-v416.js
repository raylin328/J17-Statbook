// v4.16 tests: drag to rearrange. The order logic for every list (game players inside court and bench,
// practice players, the roster inside a category, categories, stats = tap-grid columns, drills inside an
// area, areas), the handles being where they should be, a tap on a handle never counting as a tap on the
// item, and redraws waiting until a drag ends. Real dragging in a browser is checked separately.
"use strict";
var fs = require("fs"), path = require("path");
var JSDOM = require("jsdom").JSDOM;
var STATBOOK = require("./app-path");
var DRILLS = fs.readFileSync(path.join(__dirname, "fixtures", "drills.csv"), "utf8");
var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("pass  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra !== undefined ? "  -> " + extra : "")); }
}
function eq(name, a, b) { ok(name, a === b, JSON.stringify(a) + " vs " + JSON.stringify(b)); }
function newApp() {
  var w = new JSDOM(fs.readFileSync(STATBOOK, "utf8"), { runScripts: "dangerously", url: "https://x.test/" }).window;
  w.__toasts = []; var t0 = w.toast; w.toast = function(m) { w.__toasts.push(m); return t0(m); };
  w.download = function() {};
  return w;
}
function pl(w, id, name, num, cat) { return { id: id, name: name, num: num || "", active: true, cat: cat || w.MISC_ID, aliases: [], desc: "", notes: "" }; }
function all(root, sel) { return Array.from(root.querySelectorAll(sel)); }
function names(w, ids) { return ids.map(function(id) { var p = w.player(id); return p ? p.name : id; }).join(","); }

(function() {
  var w = newApp();
  eq("version", w.APP_VERSION, "4.16");
  ok("tab title shows it", w.document.title === "J17 Stat Book 4.16", w.document.title);
  // the order helper
  eq("reorder a subset in place", w.reorderSubset(["a","b","c","d","e"], ["d","b"]).join(""), "adcbe");
  eq("everything", w.reorderSubset(["a","b","c"], ["c","a","b"]).join(""), "cab");
  eq("unknown ids leave it alone", w.reorderSubset(["a","b"], ["a","z"]).join(""), "ab");
})();

// ---- games: inside the court and inside the bench ----------------------------------------
(function() {
  var w = newApp();
  w.S.players = [pl(w,"p1","Ari","4"), pl(w,"p2","Bo","5"), pl(w,"p3","Cy","6"), pl(w,"p4","Di","7"), pl(w,"p5","Ed","8")];
  w.startSession({ kind: "game", format: "quarters", periodMin: 8, teams: [{ name: "Black", playerIds: ["p1","p2","p3","p4","p5"] }, { name: "White", playerIds: [] }] });
  var sess = w.activeSession();
  w.setOnCourt(sess, 0, ["p1","p2","p3"]);
  w.UI.tab = "session"; w.S.prefs.gameView = "grid"; w.render();
  var rows = all(w.document, ".tapgrid tbody tr[data-sid]");
  ok("every player row can be dragged", rows.filter(function(r){ return !w.isTeamRow(r.getAttribute("data-sid")); }).every(function(r){ return r.querySelector(".dh"); }));
  ok("the Team row has no handle", rows.filter(function(r){ return w.isTeamRow(r.getAttribute("data-sid")); }).every(function(r){ return !r.querySelector(".dh"); }));
  eq("rows know their group", rows.slice(0, 3).map(function(r){ return r.getAttribute("data-grp"); }).join(","), "oncourt,oncourt,oncourt");
  ok("the grid's body is the draggable list", w.document.querySelector(".tapgrid tbody").getAttribute("data-sortable") === "game");
  // a drop inside the court group
  var ids = w.courtOrder(sess, 0).ids.slice(); var a = ids.indexOf("p3"); ids.splice(a, 1); ids.splice(0, 0, "p3");
  w.dropGameOrder(sess, 0, ids); w.render();
  eq("court order after the drop", names(w, w.courtOrder(sess, 0).ids.filter(function(id){ return w.onCourt(sess, 0).indexOf(id) > -1; })), "Cy,Ari,Bo");
  eq("the bench is still the bench", names(w, w.courtOrder(sess, 0).ids.filter(function(id){ return !w.isTeamRow(id) && w.onCourt(sess, 0).indexOf(id) < 0; })), "Di,Ed");
  // the order lasts through subs: Di comes on and goes off again, still after the others
  w.setOnCourt(sess, 0, ["p3","p1","p2","p4"]); w.setOnCourt(sess, 0, ["p3","p1","p2"]);
  eq("after a sub in and out, the court keeps the dragged order", names(w, w.onCourt(sess, 0).length ? w.courtOrder(sess, 0).ids.slice(0, 3) : []), "Cy,Ari,Bo");
  // tiles
  w.S.prefs.gameView = "tiles"; w.render();
  var tiles = all(w.document, ".grid[data-sortable=tiles] .plr[data-sid]");
  ok("tiles have handles too", tiles.length >= 5 && tiles.filter(function(t){ return !w.isTeamRow(t.getAttribute("data-sid")); }).every(function(t){ return t.querySelector(".dh"); }));
  // a tap on a handle is not a tap on the tile
  var t1 = tiles.filter(function(t){ return t.getAttribute("data-sid") === "p1"; })[0];
  t1.querySelector(".dh").click();
  ok("tapping a tile's handle doesn't select the player", w.UI.sel !== "p1", w.UI.sel);
  w.S.prefs.gameView = "grid"; w.render();
  all(w.document, ".tapgrid tbody tr[data-sid]")[0].querySelector(".dh").click();
  ok("tapping a row's handle doesn't open the player editor", !w.UI.editing, w.UI.editing);
})();

// ---- a redraw waits while a drag is going on --------------------------------------------------
(function() {
  var w = newApp();
  w.S.players = [pl(w,"p1","Ari","4"), pl(w,"p2","Bo","5")];
  w.startSession({ kind: "practice", title: "x", playerIds: ["p1","p2"] });
  w.UI.tab = "session"; w.render();
  var h = w.document.querySelector(".grid[data-sortable=practice] .plr .dh");
  h.dispatchEvent(new w.MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
  ok("a press on a handle starts a drag", !!w.DRAG);
  var before = w.document.querySelector(".grid[data-sortable=practice]");
  w.UI.pq = "zzz"; w.render();
  ok("a redraw during the drag waits", w.document.querySelector(".grid[data-sortable=practice]") === before && w.DRAG.pending);
  w.document.dispatchEvent(new w.MouseEvent("pointerup", { bubbles: true }));
  ok("and happens when the drag ends", !w.DRAG && w.document.querySelector(".grid[data-sortable=practice]") !== before);
})();

// ---- practices: tiles and the one-value list, in Practice order ------------------------------------
(function() {
  var w = newApp(); w.importDrillsCSV(DRILLS);
  w.S.players = [pl(w,"p1","Cody","21"), pl(w,"p2","Ari","4"), pl(w,"p3","Blair","12")];
  w.startSession({ kind: "practice", title: "x", playerIds: ["p1","p2","p3"] });
  var sess = w.activeSession();
  w.UI.tab = "session"; w.render();
  ok("practice tiles have handles in Practice order", all(w.document, ".grid[data-sortable=practice] .plr .dh").length === 3);
  w.dropPracticeOrder(sess, ["p3","p1","p2"]); w.render();
  eq("Practice order is the dragged order", names(w, w.pracPlayers(sess)), "Blair,Cody,Ari");
  w.S.prefs.pracSort = "az"; w.render();
  eq("no handles while sorted A to Z (dragging sets Practice order)", all(w.document, ".grid[data-sortable=practice] .dh").length, 0);
  w.S.prefs.pracSort = "practice"; w.UI.pq = "a"; w.render();
  eq("no handles while a search is narrowing the list", all(w.document, ".grid[data-sortable=practice] .dh").length, 0);
  w.UI.pq = ""; w.render();
  var help = w.S.drills.filter(function(d){ return d.name === "Help-side awareness"; })[0];
  w.pickDrill(help.id);
  eq("the one-value list follows Practice order and has handles", all(w.document, ".brow .dh").length + ":" + all(w.document, ".brow .bname").map(function(e){ return e.textContent; }).join(","), "3:Blair,Cody,Ari");
  ok("the one-value list is draggable", !!w.document.querySelector("[data-sortable=batch] .brow[data-sid]"));
})();

// ---- roster, categories ---------------------------------------------------------------------------
(function() {
  var w = newApp();
  var u14 = w.addCategory("U14 Rep").cat, u12 = w.addCategory("U12 Rep").cat;
  w.S.players = [pl(w,"p1","Ari","4",u14.id), pl(w,"p2","Bo","5",u14.id), pl(w,"p3","Cy","6",u12.id), pl(w,"p4","Di","7",u14.id)];
  w.UI.tab = "players"; w.render();
  var grp = w.document.querySelector("[data-sortable='roster:" + u14.id + "']");
  ok("each category's players are their own draggable list", !!grp && all(grp, ".card[data-sid]").length === 3);
  ok("every roster card has a handle", all(w.document, ".rostergrp .card[data-sid]").every(function(c){ return c.querySelector(".dh"); }));
  w.dropRoster(["p4","p1","p2"]); w.render();
  eq("roster order inside U14", all(w.document.querySelector("[data-sortable='roster:" + u14.id + "']"), ".card[data-sid]").map(function(c){ return w.player(c.getAttribute("data-sid")).name; }).join(","), "Di,Ari,Bo");
  eq("other categories untouched", w.S.players.filter(function(p){ return p.cat === u12.id; })[0].name, "Cy");
  var cats = all(w.document, "[data-sortable=cats] .catrow");
  ok("categories have handles, Miscellaneous doesn't", cats.filter(function(r){ return r.querySelector(".dh"); }).length === w.catsSorted().length - 1 && cats.some(function(r){ return !r.querySelector(".dh") && /Miscellaneous/.test(r.textContent); }));
  var order = function(){ return w.catsSorted().filter(function(c){ return !c.misc; }).map(function(c){ return c.name; }); };
  var n0 = order().length;
  w.dropCategories([u14.id, u12.id]);   // only two named: they swap places, the others stay put
  eq("the two dragged categories swap", order().filter(function(n){ return n === "U14 Rep" || n === "U12 Rep"; }).join(","), "U14 Rep,U12 Rep");
  eq("no category is lost", order().length, n0);
  var all0 = order().slice().reverse().map(function(n){ return w.catsSorted().filter(function(c){ return c.name === n; })[0].id; });
  w.dropCategories(all0);
  eq("a full reorder sticks", order().join(","), all0.map(function(id){ return w.catById(id).name; }).join(","));
  eq("Miscellaneous stays where it was", w.catsSorted()[w.catsSorted().length - 1].name, "Miscellaneous");
})();

// ---- stats: the order is the tap grid's columns ----------------------------------------------------
(function() {
  var w = newApp();
  w.UI.tab = "stats"; w.render();
  var game = w.document.querySelector("[data-sortable='stats:game']");
  ok("game stats are a draggable list with handles", !!game && all(game, ".chip[data-sid]").every(function(c){ return c.querySelector(".dh"); }));
  var on = w.gameCols().filter(function(s){ return !s.pts; }).map(function(s){ return s.key; });
  var rev = on.slice().reverse();
  w.dropStats(rev);
  eq("the tap grid's columns follow (after the scoring ones)", w.gameCols().filter(function(s){ return !s.pts; }).map(function(s){ return s.key; }).join(), rev.join());
  var chip = all(w.document.querySelector("[data-sortable='stats:game']"), ".chip[data-sid]")[0], key = chip.getAttribute("data-sid");
  var was = w.S.stats.filter(function(s){ return s.key === key; })[0].on;
  chip.querySelector(".dh").click();
  eq("tapping a stat's handle doesn't switch it on or off", w.S.stats.filter(function(s){ return s.key === key; })[0].on, was);
})();

// ---- drills inside an area, and the areas -----------------------------------------------------------
(function() {
  var w = newApp(); w.importDrillsCSV(DRILLS);
  w.S.players = [pl(w,"p1","Ari","4")];
  w.startSession({ kind: "practice", title: "x", playerIds: ["p1"] });
  w.UI.tab = "session"; w.render();
  var areas = w.drillAreas(w.S.drills).map(function(a){ return a.name; });
  ok("(at least two areas in the fixture)", areas.length >= 2, areas.join());
  var box = w.document.querySelector("[data-sortable=areas]");
  ok("areas are a draggable list with a handle on each", !!box && all(box, "details.area[data-sid]").every(function(d){ return d.querySelector("summary .dh"); }));
  w.dropAreas(areas.slice().reverse());
  eq("areas in the dragged order", w.drillAreas(w.S.drills).map(function(a){ return a.name; }).join("|"), areas.slice().reverse().join("|"));
  var first = w.drillAreas(w.S.drills)[0], ids = first.drills.map(function(d){ return d.id; });
  w.dropDrills(ids.slice().reverse());
  eq("drills inside the area in the dragged order", w.drillAreas(w.S.drills)[0].drills.map(function(d){ return d.id; }).join(), ids.slice().reverse().join());
  eq("and the area itself didn't move", w.drillAreas(w.S.drills)[0].name, first.name);
  w.S.prefs.drillAZ = true; w.render();
  eq("A to Z keeps the areas in the dragged order", w.drillAreas(w.S.drills).map(function(a){ return a.name; }).join("|"), areas.slice().reverse().join("|"));
  eq("no drill handles while drills are A to Z", all(w.document, "[data-sortable^='drills:'] .dh").length, 0);
  ok("area handles stay", all(w.document, "[data-sortable=areas] summary .dh").length === areas.length);
  // a tap on an area's handle doesn't open or close it
  var sec = w.document.querySelector("[data-sortable=areas] details.area"), open0 = sec.open;
  sec.querySelector("summary .dh").click();
  eq("tapping an area's handle doesn't open or close it", sec.open, open0);
})();

// ---- the new order is saved -----------------------------------------------------------------------------
(function() {
  var w = newApp();
  w.S.players = [pl(w,"p1","Ari","4"), pl(w,"p2","Bo","5")];
  w.startSession({ kind: "practice", title: "x", playerIds: ["p1","p2"] });
  var sess = w.activeSession(); w.dropPracticeOrder(sess, ["p2","p1"]); w.save();
  var stored = JSON.parse(w.localStorage.getItem(w.KEY));
  eq("saved with the session", stored.sessions.filter(function(s){ return s.id === sess.id; })[0].playerIds.join(), "p2,p1");
})();

console.log(pass + " pass, " + fail + " fail");
if (fail) { console.log(fail + " FAILING"); process.exit(1); }
