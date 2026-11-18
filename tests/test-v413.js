// v4.13 tests: shot zones. The zone definitions (which spot is which zone, the
// angle bands, distance and angle), the tally, the Zones tab (map, table, angles,
// dots, tap-to-name), games and filters, the zone in the toast and the log, the
// shots CSV, and the link from the box score.
// The drawn shapes are compared with the classifier point by point in a real
// browser (see the README); here the label anchors stand in for that.
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
function btn(w, text) { return all(w, "button").filter(function(b) { return b.textContent.trim() === text; })[0]; }
function cell(w, pid, key) { return w.document.querySelector('.tapgrid .cell[data-pid="' + pid + '"][data-key="' + key + '"]'); }
function last(s) { return s.events[s.events.length - 1]; }
function lastToast(w) { return w.__toasts[w.__toasts.length - 1]; }
// a spot given in feet: across from the left sideline, and out from the baseline (the court is 50 by 47)
function ft(x, y) { return { x: x / 50, y: y / 47 }; }
// a spot given as a distance from the basket and an angle from straight on; sd is 1 for the right, -1 for the left
function polar(dist, deg, sd) { var a = deg * Math.PI / 180; return ft(25 + sd * dist * Math.sin(a), 5.25 + dist * Math.cos(a)); }
function zid(w, p, three) { return w.zoneAt(p.x, p.y, three).id; }
function r3(n) { return Math.round(n * 1000) / 1000; }   // spots are saved to three places, as the app does
function shot(w, pid, key, p, made) {
  var extra = p ? { x: r3(p.x), y: r3(p.y) } : {};
  if (!made) extra.miss = true;
  w.record(key, undefined, pid, extra);
  return last(w.activeSession());
}
function rows(root) {
  return Array.from(root.querySelectorAll("tbody tr, tfoot tr")).map(function(tr) {
    return Array.from(tr.children).map(function(c) { return c.textContent; }).join("|"); });
}
function tapMap(w, ux, uy) {       // tap the zone map at a point given in drawing units (500 by 470)
  var m = w.document.querySelector("#view .zonemap");
  m.getBoundingClientRect = function() { return { left: 0, top: 0, width: 500, height: 470 }; };
  m.dispatchEvent(new w.MouseEvent("click", { clientX: ux, clientY: uy, bubbles: true }));
}
function view(w, name) { all(w, ".zoneviews .chip").filter(function(c) { return c.textContent === name; })[0].click(); }

// ---- which spot is which zone ---------------------------------------------------------------
(function() {
  var w = newApp();
  eq("version", w.APP_VERSION, "4.13");
  ok("tab title shows it", w.document.title === "J17 Stat Book 4.13", w.document.title);
  eq("17 zones", w.ZONES.length, 17);
  eq("in this order", w.ZONES.map(function(z) { return z.name; }).join("; "),
     "At the rim; Paint; Nail (free-throw line); Left short corner; Left wing midrange; Left elbow; Top of the key midrange; " +
     "Right elbow; Right wing midrange; Right short corner; Left corner three; Left wing three; Left slot three; " +
     "Top of the key three; Right slot three; Right wing three; Right corner three");
  eq("7 angle bands, left baseline round to right baseline", w.ZONE_SECTORS.map(function(s) { return s.name + " " + s.deg; }).join("; "),
     "Left baseline 68°+; Left wing 38–68°; Left slot 11–38°; Middle 0–11°; Right slot 11–38°; Right wing 38–68°; Right baseline 68°+");
  ok("the baseline band starts at the break of the three-point line", Math.abs(w.Z_BASE - 68.31) < 0.01, w.Z_BASE);

  // close in, the drawn lines decide
  eq("a layup is at the rim", zid(w, ft(25, 6), false), "rim");
  eq("so is a shot from under the basket", zid(w, ft(25, 2), false), "rim");
  eq("and one just beside the rim", zid(w, ft(22, 3), false), "rim");
  eq("a step wider along the baseline is the paint", zid(w, ft(20.5, 3), false), "paint");
  eq("the middle of the lane is the paint", zid(w, ft(25, 11), false), "paint");
  eq("the block is the paint", zid(w, ft(18, 7), false), "paint");
  eq("the free-throw line is the nail", zid(w, ft(25, 19), false), "nail");
  eq("a step behind the line is still the nail", zid(w, ft(25, 20.5), false), "nail");
  eq("the nail is the whole circle, sideways too", zid(w, ft(29.5, 19), false), "nail");
  eq("and the part of it inside the lane", zid(w, ft(25, 14), false), "nail");
  eq("below the circle it is the paint again", zid(w, ft(25, 12.5), false), "paint");

  // further out, the angle decides
  eq("right elbow", zid(w, ft(33.5, 19.5), false), "mid-rs");
  eq("left elbow", zid(w, ft(16.5, 19.5), false), "mid-ls");
  eq("just behind the line beside the circle is the elbow too", zid(w, ft(32, 20), false), "mid-rs");
  eq("right short corner", zid(w, ft(40, 4), false), "mid-rc");
  eq("left short corner", zid(w, ft(10, 4), false), "mid-lc");
  eq("right wing midrange", zid(w, ft(41, 19), false), "mid-rw");
  eq("left wing midrange", zid(w, ft(9, 19), false), "mid-lw");
  eq("top of the key midrange", zid(w, ft(25, 26.5), false), "mid-t");
  eq("top of the key three", zid(w, ft(25, 31), true), "three-t");
  eq("right slot three", zid(w, ft(33, 30.5), true), "three-rs");
  eq("left slot three", zid(w, ft(17, 30.5), true), "three-ls");
  eq("right wing three", zid(w, ft(43, 22), true), "three-rw");
  eq("left wing three", zid(w, ft(7, 22), true), "three-lw");
  eq("right corner three", zid(w, ft(48.5, 5), true), "three-rc");
  eq("left corner three", zid(w, ft(1.5, 5), true), "three-lc");

  // the stat decides two or three; the drawn line only decides when there is no stat
  eq("a 3P tapped a little inside the line is still a three", zid(w, ft(25, 27), true), "three-t");
  eq("a 2P tapped outside the line is a long two from that angle", zid(w, ft(43, 24), false), "mid-rw");
  eq("no stat: beyond the arc is a three", zid(w, ft(25, 31)), "three-t");
  eq("no stat: inside it is not", zid(w, ft(25, 27)), "mid-t");
  eq("no stat: outside the corner line is a corner three", zid(w, ft(48.5, 5)), "three-rc");
  eq("no stat: inside the corner line is the short corner", zid(w, ft(46.5, 5)), "mid-rc");
  ok("zoneOf reads the stat", w.zoneOf({ key: "3P", x: 0.5, y: 27 / 47 }).id === "three-t" && w.zoneOf({ key: "2P", x: 0.5, y: 27 / 47 }).id === "mid-t");

  // the band edges, 20 feet out
  eq("10.9° is the middle", zid(w, polar(20, 10.9, 1), false), "mid-t");
  eq("11.1° is the slot", zid(w, polar(20, 11.1, 1), false), "mid-rs");
  eq("37.9° is the slot", zid(w, polar(20, 37.9, -1), false), "mid-ls");
  eq("38.1° is the wing", zid(w, polar(20, 38.1, -1), false), "mid-lw");
  eq("68.2° is the wing", zid(w, polar(20, 68.2, 1), false), "mid-rw");
  eq("68.4° is the baseline", zid(w, polar(20, 68.4, 1), false), "mid-rc");

  // left and right mirror each other
  var odd = [];
  for (var i = 0; i < 40; i++) for (var j = 0; j < 38; j++) {
    var x = i / 40 + 0.0123, y = j / 38 + 0.0077;
    var a = w.zoneAt(x, y).id, b = w.zoneAt(1 - x, y).id;
    var flip = a.replace(/-(l|r)(\w)$/, function(m, s, k) { return "-" + (s === "l" ? "r" : "l") + k; });
    if (flip !== b) odd.push(x + "," + y + ": " + a + " / " + b);
  }
  eq("every spot's mirror image is the mirror zone", odd.length, 0);

  // distance and angle
  var nail = w.zoneAt(0.5, 19 / 47), wing = w.zoneAt(41 / 50, 19 / 47), lw = w.zoneAt(9 / 50, 19 / 47);
  ok("the nail is 13.8 ft out, straight on", nail.ft === 13.8 && nail.deg === 0, nail.ft + " " + nail.deg);
  ok("the wing spot is 21.1 ft out at 49°", wing.ft === 21.1 && Math.round(wing.deg) === 49, wing.ft + " " + wing.deg);
  ok("sides are as you face the basket", wing.lr === "right" && wing.side === "r" && lw.lr === "left" && lw.side === "l" && nail.side === "m");
  eq("a spot in words", w.spotText(w.zoneAt(33.5 / 50, 19.5 / 47)), "Right elbow · 17 ft from the basket · 31° right of straight on");
  eq("straight on in words", w.spotText(nail), "Nail (free-throw line) · 14 ft from the basket · straight on");

  // the map: every zone has a shape, and its label sits inside the zone it names
  var sh = w.zoneShapes();
  ok("a shape for every zone", w.ZONES.every(function(z) { return /^M[\d. ]+.*Z$/.test(sh.zones[z.id]); }));
  ok("a shape for every angle band", w.ZONE_SECTORS.every(function(s) { return /^M[\d. ]+.*Z$/.test(sh.sectors[s.id]); }));
  ok("no broken numbers in the shapes", !/NaN|undefined|Infinity/.test(JSON.stringify(sh)));
  var stray = w.ZONES.filter(function(z) { var a = w.ZONE_LABELS[z.id]; return !a || w.zoneAt(a[0] / 500, a[1] / 470).id !== z.id; });
  eq("every zone label is inside its own zone", stray.map(function(z) { return z.id; }).join(","), "");
  var stray2 = w.ZONE_SECTORS.filter(function(s) { var a = w.SECTOR_LABELS[s.id]; return !a || w.spotGeo(a[0] / 500, a[1] / 470).sector !== s.id; });
  eq("every angle label is inside its own band", stray2.map(function(s) { return s.id; }).join(","), "");
  eq("the half court still has its eight lines", w.courtSVG([]).children.length, 8);
})();

// ---- one game: the tally, the map and the table -----------------------------------------------
var BLACK = [   // [player, stat, spot in feet, made]
  ["h0", "2P", [25, 6], true], ["h0", "2P", [24, 7], true], ["h0", "2P", [26, 6.5], false],     // rim 2/3
  ["h0", "2P", [25, 11], true],                                                                  // paint 1/1
  ["h1", "2P", [25, 19.5], false], ["h1", "2P", [26, 20], true],                                 // nail 1/2
  ["h1", "2P", [33.5, 19.5], true],                                                              // right elbow 1/1
  ["h1", "2P", [9, 19], false],                                                                  // left wing midrange 0/1
  ["h0", "3P", [25, 31], true],                                                                  // top three 1/1
  ["h0", "3P", [48.5, 5], false], ["h0", "3P", [48.6, 6], false], ["h0", "3P", [48.4, 4], false] // right corner three 0/3
];
function playBlack(w) { BLACK.forEach(function(b) { shot(w, b[0], b[1], ft(b[2][0], b[2][1]), b[3]); }); }
(function() {
  var w = newApp(), s = game(w, 2);
  playBlack(w);
  shot(w, "h1", "2P", null, true);                 // a make with no spot
  shot(w, "a0", "2P", ft(25, 6), true);            // the other team
  w.record("1P", undefined, "h0"); w.record("FTX", undefined, "h0"); w.record("FTX", undefined, "h0");

  var list = w.zoneShots([s], "t0"), t = w.zoneTally(list);
  eq("13 Black shots, 12 with a spot", list.length + "/" + t.all.att, "13/12");
  eq("made 6 for 13 points", t.all.made + "/" + t.all.pts, "6/13");
  eq("the rim cell", JSON.stringify(t.zone.rim), '{"att":3,"made":2,"pts":4}');
  eq("the corner three cell", JSON.stringify(t.zone["three-rc"]), '{"att":3,"made":0,"pts":0}');
  eq("midrange as a group", t.range.mid.made + "/" + t.range.mid.att, "1/2");
  eq("threes as a group", t.range.three.made + "/" + t.range.three.att + " " + t.range.three.pts, "1/4 3");
  eq("angle bands count every charted shot", ["lc", "lw", "ls", "t", "rs", "rw", "rc"].map(function(k) {
    var c = t.sector[k]; return c ? c.made + "/" + c.att : "-"; }).join(" "), "- 0/1 1/1 4/5 1/1 0/1 0/3");
  eq("sides", [t.side.l, t.side.m, t.side.r].map(function(c) { return c.made + "/" + c.att; }).join(" "), "1/2 4/5 1/5");
  eq("the shot without a spot is set aside", t.loose.att + "/" + t.loose.made, "1/1");
  eq("shade: 3 shots at 67% is the top band", w.zShade(t.zone.rim), "zf4");
  eq("shade: 0 for 3 is the bottom band", w.zShade(t.zone["three-rc"]), "zf1");
  eq("shade: one or two shots are not shaded", w.zShade(t.zone.nail), "zfew");
  eq("shade: no shots", w.zShade(t.zone["mid-lc"]), "zf0");
  eq("shade bands", [[1, 5], [3, 10], [2, 5], [5, 10], [11, 20]].map(function(p) {
    return w.zShade({ att: p[1], made: p[0], pts: 0 }); }).join(" "), "zf1 zf2 zf3 zf3 zf4");

  // the tab
  eq("Zones sits after Box score", all(w, "#nav button").map(function(b) { return b.textContent; }).join("|"),
     "Session|Box score|Zones|Log|Sessions|Players|Stats|Report card");
  all(w, "#nav button")[2].click();
  eq("the tab opens", w.document.querySelector("#view h2").textContent, "Shot zones");
  var gsel = w.document.querySelector('select[aria-label="Which games"]'), fsel = w.document.querySelector('select[aria-label="Whose shots"]');
  eq("it starts on the open game", gsel.value, s.id);
  eq("the game list", Array.from(gsel.options).map(function(o) { return o.textContent.replace(/^[\d/.\-\s]+· /, ""); }).join(" | "),
     "All games (1) | Black vs White · open");
  eq("whose shots", Array.from(fsel.options).map(function(o) { return o.textContent; }).join("|"), "Both teams|Black|White|Home 0|Home 1|Away 0|Away 1");
  eq("both teams to start: 13 charted", rows(w.document.querySelector(".zonetable")).pop(), "All charted shots|7/13|54%|100%|1.15");
  fsel.value = "t0"; fsel.dispatchEvent(new w.Event("change"));

  var map = w.document.querySelector("#view .zonemap");
  eq("the map draws all 17 zones", map.querySelectorAll("path.zone").length, 17);
  eq("the rim is drawn last, on top", map.querySelectorAll("path.zone")[16].getAttribute("data-zone"), "rim");
  eq("shaded by FG%", ["rim", "three-rc", "nail", "mid-lc"].map(function(id) {
    return map.querySelector('path[data-zone="' + id + '"]').getAttribute("class"); }).join(" | "), "zone zf4 | zone zf1 | zone zfew | zone zf0");
  var texts = Array.from(map.querySelectorAll("text")).map(function(x) { return x.textContent; });
  ok("a zone with shots shows them", texts.indexOf("Rim") > -1 && texts.indexOf("2/3 67%") > -1, texts.join(" / "));
  ok("a corner strip keeps name and numbers on one line", texts.indexOf("Corner 30/3 0%") > -1, texts.join(" / "));
  ok("an empty zone shows its name only", texts.filter(function(x) { return x === "Short corner"; }).length === 2 && texts.filter(function(x) { return /%/.test(x); }).length === 7);
  ok("the caption says what is shown", /Black vs White · Black$/.test(w.document.querySelector(".zonecap").textContent), w.document.querySelector(".zonecap").textContent);
  ok("the key explains the shades", /under 25%.*25–39%.*40–54%.*55% and up.*Shaded from 3 shots/.test(w.document.querySelector(".zkey").textContent));

  eq("the table", rows(w.document.querySelector(".zonetable")).join("\n"), [
    "At the rim|2/3|67%|25%|1.33",
    "Paint|1/1|100%|8%|2.00",
    "Nail (free-throw line)|1/2|50%|17%|1.00",
    "Midrange|1/2|50%|17%|1.00",
    "Left wing midrange|0/1|0%|8%|0.00",
    "Right elbow|1/1|100%|8%|2.00",
    "Threes|1/4|25%|33%|0.75",
    "Top of the key three|1/1|100%|8%|3.00",
    "Right corner three|0/3|0%|25%|0.00",
    "All charted shots|6/12|50%|100%|1.08"].join("\n"));
  var notes = w.document.querySelector(".zonenotes").textContent;
  ok("the shot without a spot is mentioned", /1 more shot has no spot \(1 made\), so it isn't in a zone\./.test(notes), notes);
  ok("free throws use the misses", /Free throws: 1 of 3 \(33%\)\./.test(notes), notes);
  ok("and the caveat about misses", /Misses are only recorded while Chart shots is on/.test(notes));

  // one player
  fsel = w.document.querySelector('select[aria-label="Whose shots"]');
  fsel.value = "p:h1"; fsel.dispatchEvent(new w.Event("change"));
  eq("one player's zones", rows(w.document.querySelector(".zonetable")).join("\n"), [
    "At the rim|—|—|—|—", "Paint|—|—|—|—", "Nail (free-throw line)|1/2|50%|50%|1.00",
    "Midrange|1/2|50%|50%|1.00", "Left wing midrange|0/1|0%|25%|0.00", "Right elbow|1/1|100%|25%|2.00",
    "Threes|—|—|—|—", "All charted shots|2/4|50%|100%|1.00"].join("\n"));
  ok("free throws follow the filter", !/Free throws/.test(w.document.querySelector(".zonenotes").textContent));
  fsel = w.document.querySelector('select[aria-label="Whose shots"]');
  fsel.value = "t0"; fsel.dispatchEvent(new w.Event("change"));

  // angles
  view(w, "Angles");
  map = w.document.querySelector("#view .zonemap");
  eq("the angle map has 7 bands", map.querySelectorAll("path.zone").length, 7);
  ok("labelled with their degrees", Array.from(map.querySelectorAll("text")).some(function(x) { return x.textContent === "Middle 0–11°"; }));
  eq("the angle table", rows(w.document.querySelector(".zonetable")).join("\n"), [
    "Left baseline|68°+|—|—|—|—", "Left wing|38–68°|0/1|0%|8%|0.00", "Left slot|11–38°|1/1|100%|8%|2.00",
    "Middle|0–11°|4/5|80%|42%|1.80", "Right slot|11–38°|1/1|100%|8%|2.00", "Right wing|38–68°|0/1|0%|8%|0.00",
    "Right baseline|68°+|0/3|0%|25%|0.00", "Left side||1/2|50%|17%|1.00", "Right side||1/5|20%|42%|0.40",
    "All charted shots||6/12|50%|100%|1.08"].join("\n"));

  // dots
  view(w, "Dots");
  ok("dots: the plain court", !!w.document.querySelector("#view .court") && !w.document.querySelector("#view .zonemap"));
  eq("six makes and six misses", all(w, "#view .court .mk").length + "/" + all(w, "#view .court .ms").length, "6/6");
  ok("the zone table stays under the dots", rows(w.document.querySelector(".zonetable")).pop() === "All charted shots|6/12|50%|100%|1.08");
  eq("one game: the dots key names the teams", w.document.querySelector(".zonedots").textContent, "● made   ✕ missed. Black in teal, White in red.");
  w.UI.zoneFilter = "all"; w.render();
  eq("one game: the second team's shots are red", all(w, "#view .court .mk.a").length + "/" + all(w, "#view .court .mk.h").length, "1/6");
  w.UI.zoneFilter = "t0"; w.render();

  // tap to name
  view(w, "Zones");
  eq("before a tap", w.document.querySelector(".zonepick").textContent, "Tap anywhere on the court to name the spot.");
  ok("the hint stays off a printout", w.document.querySelector(".zonepick").classList.contains("noprint"));
  tapMap(w, 335, 195);
  eq("tap the right elbow", w.document.querySelector(".zonepick").textContent, "That spot: Right elbow · 17 ft from the basket · 31° right of straight on");
  ok("the tapped spot is marked", !!w.document.querySelector("#view .zonemap .pick"));
  ok("a named spot does print", !w.document.querySelector(".zonepick").classList.contains("noprint"));
  tapMap(w, 15, 40);
  ok("tap the left corner", /^That spot: Left corner three · 24 ft from the basket · 9\d° left of straight on$/.test(w.document.querySelector(".zonepick").textContent), w.document.querySelector(".zonepick").textContent);
  view(w, "Angles"); tapMap(w, 250, 190);
  eq("it works on the angle map too", w.document.querySelector(".zonepick").textContent, "That spot: Nail (free-throw line) · 14 ft from the basket · straight on");
  eq("naming a spot records nothing", s.events.length, 17);
  ok("and nothing about zones is saved", JSON.stringify(w.S).indexOf("zone") === -1);
})();

// ---- several games, and who is who ---------------------------------------------------------------
(function() {
  var w = newApp(), s1 = game(w, 2);
  playBlack(w);
  w.S.oppTeams = [{ id: "ot1", name: "Hawks" }];
  w.S.opponents = [{ id: "o33", team: "ot1", num: "33", name: "", desc: "", aliases: [], active: true }];
  w.startSession({ kind: "game", title: "", format: "quarters", periodMin: 8,
                   teams: [{ name: "J17", playerIds: ["h0", "a1"] }, { name: "Hawks", playerIds: ["o33"], opp: "ot1" }] });
  var s2 = w.activeSession();
  shot(w, "h0", "2P", ft(25, 6), true); shot(w, "a1", "3P", ft(25, 31), false);
  shot(w, "o33", "2P", ft(40, 4), true); shot(w, "o33", "2P", ft(41, 19), false);
  w.record("1P", undefined, "h0");                       // a free throw in a game with no misses recorded

  w.UI.tab = "zones"; w.render();
  var gsel = w.document.querySelector('select[aria-label="Which games"]');
  eq("opens on the game that is open now", gsel.value, s2.id);
  eq("two games to choose from, newest first", Array.from(gsel.options).map(function(o) { return o.textContent.replace(/^[\d/.\-\s]+· /, ""); }).join(" | "),
     "All games (2) | J17 vs Hawks · open | Black vs White");
  eq("that game alone", rows(w.document.querySelector(".zonetable")).pop(), "All charted shots|2/4|50%|100%|1.00");
  ok("no free-throw line without recorded misses", !/Free throws/.test(w.document.querySelector(".zonenotes").textContent));

  gsel.value = "all"; gsel.dispatchEvent(new w.Event("change"));
  var fsel = w.document.querySelector('select[aria-label="Whose shots"]');
  eq("all games: who to show", Array.from(fsel.options).map(function(o) { return o.textContent; }).join("|"),
     "Everyone|Our players|Opponents|Away 1|Home 0|Home 1");
  eq("everyone", rows(w.document.querySelector(".zonetable")).pop(), "All charted shots|8/16|50%|100%|1.06");
  ok("the caption", /^All games \(2\) · Everyone$/.test(w.document.querySelector(".zonecap").textContent), w.document.querySelector(".zonecap").textContent);
  function pick(v) { var f = w.document.querySelector('select[aria-label="Whose shots"]'); f.value = v; f.dispatchEvent(new w.Event("change")); }
  view(w, "Dots");
  eq("several games: opponents' shots are red, ours teal, whichever side they were listed on",
     all(w, "#view .court .a").length + "/" + all(w, "#view .court .h").length, "2/14");
  eq("and the key says so", w.document.querySelector(".zonedots").textContent, "● made   ✕ missed. Our players in teal, opponents in red.");
  view(w, "Zones");
  pick("ours");
  eq("our players: both sides of the scrimmage, one side of the Hawks game", rows(w.document.querySelector(".zonetable")).pop(), "All charted shots|7/14|50%|100%|1.07");
  pick("opp");
  eq("opponents", rows(w.document.querySelector(".zonetable")).join("\n"), [
    "At the rim|—|—|—|—", "Paint|—|—|—|—", "Nail (free-throw line)|—|—|—|—", "Midrange|1/2|50%|100%|1.00",
    "Right wing midrange|0/1|0%|50%|0.00", "Right short corner|1/1|100%|50%|2.00", "Threes|—|—|—|—",
    "All charted shots|1/2|50%|100%|1.00"].join("\n"));
  pick("p:h0");
  eq("one player across both games", rows(w.document.querySelector(".zonetable")).filter(function(r) { return /^At the rim|^All/.test(r); }).join(" ; "),
     "At the rim|3/4|75%|44%|1.50 ; All charted shots|5/9|56%|100%|1.22");

  gsel = w.document.querySelector('select[aria-label="Which games"]');
  gsel.value = s1.id; gsel.dispatchEvent(new w.Event("change"));
  eq("changing the game goes back to both teams", w.document.querySelector('select[aria-label="Whose shots"]').value, "all");
  eq("the earlier game", rows(w.document.querySelector(".zonetable")).pop(), "All charted shots|6/12|50%|100%|1.08");

  w.S.sessions = w.S.sessions.filter(function(x) { return x.id !== s1.id; }); w.render();
  eq("a deleted game falls back to the open one", w.document.querySelector('select[aria-label="Which games"]').value, s2.id);
  w.S.players.push(pl(w, "p9", "Ari Kim", "9"));
  w.startSession({ kind: "practice", title: "Drills", playerIds: ["p9"] });
  w.UI.zoneScope = null; w.UI.tab = "zones"; w.render();
  eq("with a practice open it shows all games", w.document.querySelector('select[aria-label="Which games"]').value, "all");
  eq("zoneScope agrees", w.zoneScope(), "all");
})();

// ---- on the live screen ---------------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 2);
  w.S.prefs.chartShots = true; w.render();
  var e = ft(33.5, 19.5);
  cell(w, "h0", "2P").click(); w.placeShot(e.x, e.y);
  eq("the toast names the zone", lastToast(w), "Home 0 · 2-pointer · Right elbow");
  cell(w, "h1", "AST").click();
  cell(w, "h0", "3P").click(); w.UI.shot.made = false; w.placeShot(0.5, 27 / 47);
  eq("a missed three, tapped inside the line", lastToast(w), "Home 0 · 3-pointer (missed) · Top of the key three");
  cell(w, "h1", "AST").click();
  cell(w, "h0", "2P").click(); w.placeShot(0.5, 6 / 47);
  eq("with the assist after the zone", lastToast(w), "Home 0 · 2-pointer · At the rim · from Home 1");
  cell(w, "h0", "2P").click(); btn(w, "Save without a spot").click();
  eq("no spot, no zone", lastToast(w), "Home 0 · 2-pointer");
  cell(w, "h0", "TO").click(); w.placeShot(0.3, 0.3);
  eq("a turnover's spot has no shot zone", lastToast(w), "Home 0 · Turnover");
  w.UI.tab = "log"; w.render();
  var log = w.document.querySelector("#view").textContent;
  ok("the log says where each shot was from", /Right elbow/.test(log) && /Top of the key three/.test(log) && /At the rim/.test(log), log.slice(0, 300));
  ok("other spots are just marked charted", /charted/.test(log));
})();

// ---- the shots file ---------------------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 2);
  w.S.players[0].name = "=HYPERLINK(\"http://x\")";       // a name that a spreadsheet would run
  w.record("AST", undefined, "h1");
  shot(w, "h0", "2P", ft(33.5, 19.5), true);
  shot(w, "a0", "3P", ft(1.5, 5), false);
  shot(w, "h1", "2P", null, true);
  w.record("TO", undefined, "h1", { x: 0.3, y: 0.3 });
  var csv = w.shotsCSV(w.zoneShots([s], "all")).split("\n");
  eq("header", csv[0], "date,game,period,clock,team,player,jersey,shot,made,points,zone,area,angle,side,distance_ft,angle_deg,x,y,assisted_by,session_id,event_id,player_id");
  eq("one row per shot, turnovers and assists left out", csv.length - 1, 3);
  var r1 = csv[1].split(",");
  eq("a charted make", r1.slice(1, 5).join(",") + " | " + r1.slice(7, 19).join(","), "Black vs White,Q1,8:00,Black | 2P,1,2,Right elbow,Midrange,Right slot,right,16.6,31,0.67,0.415,Home 1");
  ok("a name starting with = is defused", / =HYPERLINK/.test(csv[1]) && !/,=HYPERLINK/.test(csv[1]) && !/,"=HYPERLINK/.test(csv[1]), csv[1]);
  ok("it ends with the ids", r1.slice(-3).join(",") === s.id + "," + s.events[1].id + ",h0", r1.slice(-3).join(","));
  ok("a missed corner three", /White,Away 0,10,3P,0,0,Left corner three,Threes,Left baseline,left,23\.5,9\d,0\.03,0\.106,,/.test(csv[2]), csv[2]);
  ok("a shot with no spot has no zone", /Black,Home 1,1,2P,1,2,,,,,,,,,,/.test(csv[3]), csv[3]);
  eq("the file follows the filter", w.shotsCSV(w.zoneShots([s], "t1")).split("\n").length - 1, 1);

  var saved = null; w.download = function(name, text) { saved = { name: name, text: text }; };
  w.UI.tab = "zones"; w.render();
  btn(w, "Export shots CSV").click();
  ok("the button saves shots-<date>.csv", !!saved && /^shots-\d{4}-\d\d-\d\d\.csv$/.test(saved.name) && saved.text.split("\n").length === 4, saved && saved.name);
})();

// ---- from the box score ---------------------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 2);
  playBlack(w); shot(w, "a0", "2P", ft(25, 6), true);
  w.record("TO", undefined, "h0", { x: 0.3, y: 0.3 });
  w.UI.tab = "box"; w.UI.shotFilter = "t1"; w.render();
  var link = btn(w, "See these shots by zone");
  ok("the shot chart links to the zones", !!link);
  link.click();
  ok("it opens the Zones tab on that game and those shots", w.UI.tab === "zones" && w.document.querySelector('select[aria-label="Which games"]').value === s.id &&
     w.document.querySelector('select[aria-label="Whose shots"]').value === "t1");
  eq("showing the other team's one shot", rows(w.document.querySelector(".zonetable")).pop(), "All charted shots|1/1|100%|100%|2.00");
  w.UI.tab = "box"; w.render();
  all(w, ".chartkinds .chip")[1].click();
  ok("the link is only on the shots view", !btn(w, "See these shots by zone"));
})();

// ---- nothing to show yet -------------------------------------------------------------------------------
(function() {
  var w = newApp();
  w.UI.tab = "zones"; w.render();
  var map = w.document.querySelector("#view .zonemap");
  ok("with no games the map is a guide to the names", map.querySelectorAll("path.zone").length === 17 && !/%/.test(map.textContent) && /Rim/.test(map.textContent) && /Slot 3/.test(map.textContent));
  ok("and says so", /No games yet/.test(w.document.querySelector("#view").textContent));
  ok("no game or player pickers", !w.document.querySelector('select[aria-label="Which games"]') && !w.document.querySelector(".zonetable"));
  tapMap(w, 250, 400);
  eq("tap-to-name still works", w.document.querySelector(".zonepick").textContent, "That spot: Top of the key three · 35 ft from the basket · straight on");
  view(w, "Angles");
  eq("the angle guide", w.document.querySelectorAll("#view .zonemap path.zone").length, 7);

  var s = game(w, 2);
  w.record("2P", undefined, "h0");                         // a make with charting off
  w.UI.tab = "zones"; w.UI.zoneView = "zones"; w.render();
  ok("a game with nothing charted says how to start", /No charted shots here yet/.test(w.document.querySelector(".zonenone").textContent) && !w.document.querySelector(".zonetable"));
  ok("and counts the shot it can't place", /1 more shot has no spot \(1 made\)/.test(w.document.querySelector(".zonenotes").textContent));
})();

// ---- the sticky grid header only applies when the grid fits (a fix to v4.12) ---------------------------
// Where it lands on a real screen is checked in browser-check.js; this guards the rule itself.
(function() {
  var w = newApp(), css = w.document.querySelector("style").textContent;
  ok("the header sticks only inside a grid that fits", /\.gridtw\.fits \.tapgrid thead th\s*\{[^}]*position:sticky/.test(css));
  ok("and not otherwise", !/(^|[};\n])\s*\.tapgrid thead th\s*\{[^}]*position:sticky/.test(css));
  game(w, 3);
  ok("the grid is still marked when it fits", w.document.querySelector(".gridtw").classList.contains("fits"));
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
