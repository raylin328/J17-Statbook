// v4.14 tests: the practice results CSV, saving as you go (no Save button on the one-value list,
// drafts that survive switching drills), finding players and drills during practice, and the
// Level stat type (Beginner to Elite) for practice stats.
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
  return w;
}
function drill(w, name) { return w.S.drills.filter(function(d) { return d.name === name; })[0]; }
function practice(w) {
  w.S.players = [["Cody Ito", "21"], ["Ari Kim", "4"], ["Blair Ng", "12"]].map(function(n, i) {
    return { id: "p" + i, name: n[0], num: n[1], active: true, cat: w.MISC_ID, aliases: i === 0 ? ["Coco"] : [], desc: "", notes: "" };
  });
  w.startSession({ kind: "practice", title: "U12 Tuesday", playerIds: ["p0", "p1", "p2"] });
  return w.activeSession();
}
function card(w) { return w.document.querySelector(".drillcard"); }
function all(root, sel) { return Array.from(root.querySelectorAll(sel)); }
function button(root, text) { return all(root, "button").filter(function(b) { return b.textContent.trim() === text; })[0]; }
function type(w, input, v) { input.value = v; input.dispatchEvent(new w.Event("input")); }
function choose(w, name) {
  all(card(w), ".areas .chip").filter(function(b) { return b.textContent === name || b.textContent.indexOf(name + " (") === 0; })[0].click();
}
function csvRows(text) { return text.split("\n").map(function(l) { return l; }); }

// ---- version -----------------------------------------------------------------------
(function() {
  var w = newApp();
  ok("version 4.14 or later (exact version: test-v415.js)", parseFloat(w.APP_VERSION.replace(/^4\./, "")) >= 14, w.APP_VERSION);
})();

// ---- Level: Beginner to Elite as a practice stat ------------------------------------
(function() {
  var w = newApp();
  w.UI.tab = "stats"; w.render();
  var f = all(w.document, ".card").pop(), sel = f.querySelectorAll("select");
  ok("Level is offered as a type", all(sel[1], "option").some(function(o) { return o.value === "level"; }));
  f.querySelector("#newStat").value = "Effort level";
  sel[0].value = "practice"; sel[0].dispatchEvent(new w.Event("change"));
  sel[1].value = "level"; sel[1].dispatchEvent(new w.Event("change"));
  ok("no 'better' or unit boxes for a level", sel[2].style.display === "none");
  button(f, "Add stat").click();
  var st = w.S.stats.filter(function(s) { return s.label === "Effort level"; })[0];
  ok("added as a practice level", st && st.type === "level" && st.scope === "practice" && !st.tally, JSON.stringify(st));
  var sess = practice(w);
  w.UI.tab = "session"; w.UI.drill = st.key; w.UI.sel = "p1"; w.render();
  var lv = all(w.document, ".dock .lvl");
  eq("five level chips to tap", lv.length, 5);
  lv.filter(function(b) { return b.textContent === "ADV"; })[0].click();
  var e = sess.events[sess.events.length - 1];
  ok("one tap records the word", e && e.key === st.key && e.v === "Advanced" && e.pid === "p1", JSON.stringify(e));
  w.record(st.key, "Elite", "p1");
  var tot = w.totalsFor(sess).p1[st.key];
  eq("summary shows the latest level", w.summarize(st, tot), "Elite");
  eq("grid shows the short word", w.cellText(st, tot), "ELT");
  eq("formatted as the word", w.fmtVal(st, "Advanced"), "Advanced");
  eq("CSV import reads a level", w.parseValue(st, "adv"), "Advanced");
  ok("not treated as a number", !w.isNumeric(st));
})();

// ---- results CSV ------------------------------------------------------------------
(function() {
  var w = newApp(); w.importDrillsCSV(DRILLS);
  var sess = practice(w), t = sess.date;
  w.record("FT10", 7, "p1");
  var ft = drill(w, "Free-throw accuracy");
  var r1 = w.recordAttempt(ft.id, ["p0"], [8], "=SUM(A1) rushed the last two");
  var weave = w.S.drills.filter(function(d) { return w.drillGroupRange(d).min === 3; })[0];
  var r2 = w.recordAttempt(weave.id, ["p0", "p1", "p2"], [Array(w.drillValueCount(weave)).fill(30)[0]].concat(Array(w.drillValueCount(weave) - 1).fill(30)), "");
  var str = drill(w, "Strength combine");
  var r3 = w.recordAttempt(str.id, ["p2"], [30, 40, 55.5], "");
  ok("attempts recorded", !r1.error && !r2.error && !r3.error, [r1.error, r2.error, r3.error].join(" / "));
  var csv = w.resultsCSV([sess]), lines = csv.split("\n");
  eq("header", lines[0], "date,practice,time,drill,area,stage,measure,player,jersey,with,value,out_of,unit,note");
  var n = 1 + 3 * w.drillValueCount(weave) + 3 + 1;
  eq("one row per player per value (stat 1 + weave 3x + combine 3 + FT 1)", lines.length - 1, n);
  ok("practice stat row", lines.some(function(l) { return /,U12 Tuesday,/.test(l) && /Free throws \/10/.test(l) && /,Ari Kim,4,,7,/.test(l); }), lines[1]);
  ok("makes row has its out of", lines.some(function(l) { return /Free-throw accuracy/.test(l) && /,makes,Cody Ito,21,,8,10,/.test(l); }));
  ok("a formula-looking note is defused", /" =SUM\(A1\) rushed the last two"| =SUM\(A1\) rushed the last two/.test(csv));
  ok("group rows name who else was in it", lines.some(function(l) { return /,Ari Kim,4,Cody Ito; Blair Ng,/.test(l); }));
  ok("each stage of a combine is its own row", ["30", "40", "55.5"].every(function(v) { return lines.some(function(l) { return /Strength combine/.test(l) && l.indexOf("Blair Ng,12,," + v + ",") > -1; }); }));
  ok("rows in time order", (function(){ var ts = lines.slice(1).map(function(l){ return l.split(",")[2]; }); return ts.join() === ts.slice().sort().join(); })());
  w.startSession({ kind: "game", format: "quarters", periodMin: 8, teams: [{ name: "A", playerIds: ["p0"] }, { name: "B", playerIds: ["p1"] }] });
  eq("all practices: games are left out", w.resultsCSV().split("\n").length, lines.length);
  // the buttons
  w.S.activeId = sess.id; w.UI.tab = "box"; w.render();
  ok("Box score of a practice offers Export results CSV", !!button(w.document, "Export results CSV"));
  w.UI.tab = "sessions"; w.render();
  ok("Sessions offers All practice results (CSV)", !!button(w.document, "All practice results (CSV)"));
  eq("and Results CSV on each practice, not on games", all(w.document, "button").filter(function(b) { return b.textContent === "Results CSV"; }).length, 1);
})();

// ---- saving as you go: the one-value list ----------------------------------------
(function() {
  var w = newApp(); var sess = practice(w); w.importDrillsCSV(DRILLS); w.render();
  choose(w, "Help-side awareness");
  var help = drill(w, "Help-side awareness");
  ok("no Save results button", !button(card(w), "Save results"));
  button(card(w).querySelectorAll(".brow")[0], "ADV").click();
  eq("a level saves on the tap", sess.attempts.length, 1);
  eq("as the word", sess.attempts[0].vals[0], "Advanced");
  var row0 = card(w).querySelectorAll(".brow")[0];
  ok("the row says Saved", row0.querySelector(".bstat").textContent === "Saved");
  type(w, row0.querySelector(".bnote"), "Late rotating");
  eq("the note goes onto the same attempt", sess.attempts[0].notes, "Late rotating");
  eq("no second attempt for the note", sess.attempts.length, 1);
  ok("kept in the saved data at once", /Late rotating/.test(w.localStorage.getItem(w.KEY || "j17statbook")) || /Late rotating/.test(JSON.stringify(Object.keys(w.localStorage).map(function(k){ return w.localStorage.getItem(k); }))));
  button(card(w).querySelectorAll(".brow")[0], "ELT").click();
  eq("changing the level updates the attempt", sess.attempts.length + ":" + sess.attempts[0].vals[0], "1:Elite");
  // switch drills and come back: still there
  choose(w, "Free-throw accuracy");
  var rows = card(w).querySelectorAll(".brow");
  type(w, rows[0].querySelector("input[type=number]"), "7");
  eq("a number saves as it's typed", sess.attempts.length, 2);
  type(w, rows[0].querySelector("input[type=number]"), "8");
  eq("typing again updates it, no duplicate", sess.attempts.length + ":" + sess.attempts[1].vals[0], "2:8");
  type(w, rows[1].querySelector("input[type=number]"), "11");
  ok("an impossible value is held back with the reason", sess.attempts.length === 2 && /can't be more than 10/.test(rows[1].querySelector(".bstat").textContent));
  choose(w, "Help-side awareness");
  ok("back on the first drill, its level is still shown", card(w).querySelectorAll(".brow")[0].querySelector('.lvl[aria-pressed="true"]').textContent === "ELT");
  choose(w, "Free-throw accuracy");
  rows = card(w).querySelectorAll(".brow");
  eq("the typed 8 is still there", rows[0].querySelector("input[type=number]").value, "8");
  eq("the 11 to fix is still there", rows[1].querySelector("input[type=number]").value, "11");
  // clearing a value removes its attempt
  type(w, rows[0].querySelector("input[type=number]"), "");
  eq("clearing the value removes the attempt", sess.attempts.length, 1);
  // a note typed before a value waits
  type(w, rows[2].querySelector(".bnote"), "Sat out, ankle");
  ok("a note with no result is kept and says so", sess.attempts.length === 1 && /kept/.test(rows[2].querySelector(".bstat").textContent) && sess.batch[w.UI.attempt.drillId].p2.note === "Sat out, ankle");
  // another round
  type(w, rows[0].querySelector("input[type=number]"), "6");
  w.render();
  var again = all(card(w), "button").filter(function(b) { return /^Start another round/.test(b.textContent); })[0];
  ok("Start another round offered once something is saved", !!again);
  again.click();
  rows = card(w).querySelectorAll(".brow");
  ok("new round: rows are empty, saved results stay", rows[0].querySelector("input[type=number]").value === "" && sess.attempts.length === 2);
  type(w, rows[0].querySelector("input[type=number]"), "9");
  eq("a second try is its own attempt", sess.attempts.length, 3);
  // removing an attempt from the list empties its row
  var ftId = w.UI.attempt.drillId, aid = sess.batch[ftId].p0.aid;
  w.removeAttempt(aid); w.render();
  eq("removed in the list, gone from the row", card(w).querySelectorAll(".brow")[0].querySelector("input[type=number]").value, "");
})();

// ---- group and multi-stage drafts survive switching drills ----------------------------
(function() {
  var w = newApp(); var sess = practice(w); w.importDrillsCSV(DRILLS); w.render();
  choose(w, "Strength combine");
  card(w).querySelectorAll(".plr")[0].click();
  var ins = card(w).querySelectorAll(".grid2 input[type=number]");
  type(w, ins[0], "30");
  choose(w, "Help-side awareness");
  choose(w, "Strength combine");
  ok("the picked player is still picked", card(w).querySelectorAll('.plr[aria-pressed="true"]').length === 1);
  eq("the typed value is still there", card(w).querySelectorAll(".grid2 input[type=number]")[0].value, "30");
  ok("the draft lives in the session (saved with it)", sess.adrafts && sess.adrafts[drill(w, "Strength combine").id].vals[0] == "30");
  ins = card(w).querySelectorAll(".grid2 input[type=number]");
  type(w, ins[1], "40"); type(w, ins[2], "50");
  button(card(w), "Record attempt").click();
  eq("recorded", sess.attempts.length, 1);
  ok("the draft is cleared after recording", card(w).querySelectorAll('.plr[aria-pressed="true"]').length === 0 && card(w).querySelectorAll(".grid2 input[type=number]")[0].value === "");
})();

// ---- finding players and drills ------------------------------------------------------
(function() {
  var w = newApp(); practice(w); w.importDrillsCSV(DRILLS); w.UI.tab = "session"; w.render();
  var grid = function() { return all(w.document, "#view > .grid .plr .jn").map(function(e) { return e.textContent; }); };
  eq("practice order to start", grid().join(","), "Cody Ito,Ari Kim,Blair Ng");
  var find = w.document.getElementById("pracFind");
  type(w, find, "12");
  eq("a jersey number finds the player", grid().join(","), "Blair Ng");
  ok("the search box keeps focus-friendly: same element after filtering", w.document.getElementById("pracFind") === find);
  type(w, find, "coco");
  eq("a nickname finds the player", grid().join(","), "Cody Ito");
  type(w, find, "ari");
  eq("part of a name", grid().join(","), "Ari Kim");
  ok("the one-value list is filtered too", (function(){ choose(w, "Help-side awareness"); return all(card(w), ".brow .bname").map(function(e){ return e.textContent; }).join() === "Ari Kim"; })());
  w.UI.pq = ""; w.render();
  button(w.document.querySelector(".finder"), "A–Z").click();
  eq("A to Z", grid().join(","), "Ari Kim,Blair Ng,Cody Ito");
  button(w.document.querySelector(".finder"), "#").click();
  eq("by jersey", grid().join(","), "Ari Kim,Blair Ng,Cody Ito");
  ok("sort is remembered", w.S.prefs.pracSort === "num");
  // drills
  var dq = w.document.getElementById("drillFind");
  type(w, dq, "free throw");
  var chips = all(card(w), ".chip").map(function(c) { return c.textContent; }).filter(function(t) { return /Free/.test(t); });
  ok("drill search shows matching drills", chips.length >= 2 && chips.every(function(t){ return /free/i.test(t); }), chips.join(" | "));
  ok("results are A to Z", chips.join() === chips.slice().sort().join());
  all(card(w), ".chip").filter(function(c) { return c.textContent === "Free-throw proficiency"; })[0].click();
  eq("tapping a result picks the drill and clears the search", w.UI.attempt.drillId + "|" + (w.UI.dq || ""), drill(w, "Free-throw proficiency").id + "|");
  type(w, w.document.getElementById("drillFind"), "zzzz");
  ok("no match says so", /No drill matches/.test(card(w).textContent));
  w.UI.dq = ""; w.render();
  button(card(w).querySelector(".finder"), "A–Z").click();
  var area = w.drillAreas(w.practiceDrills())[0].drills.map(function(d) { return d.name.toLowerCase(); });
  ok("A to Z inside each area", area.join() === area.slice().sort().join(), area.join(" | "));
})();

console.log(pass + " pass, " + fail + " fail");
if (fail) { console.log(fail + " FAILING"); process.exit(1); }
