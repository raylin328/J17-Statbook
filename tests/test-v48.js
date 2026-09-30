// v4.8 tests: drills CSV import (the club's real drills.csv), measure types,
// rating levels, notes, one-pass entry for a practice group, and export.
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
  return new JSDOM(fs.readFileSync(STATBOOK, "utf8"), { runScripts: "dangerously", url: "https://x.test/" }).window;
}
function drill(w, name) { return w.S.drills.filter(function(d) { return d.name === name; })[0]; }
function practice(w) {
  w.S.players = ["Ari Kim", "Blair Ng", "Cody Ito"].map(function(n, i) {
    return { id: "p" + i, name: n, num: "", active: true, cat: w.MISC_ID, aliases: [], desc: "", notes: "" };
  });
  w.startSession({ kind: "practice", title: "Combine", playerIds: ["p0", "p1", "p2"] });
  return w.activeSession();
}
function card(w) { return w.document.querySelector(".drillcard"); }
function choose(w, name) {
  var sel = card(w).querySelector("select");
  sel.value = drill(w, name).id; sel.dispatchEvent(new w.Event("change"));
}
function button(root, text) {
  return Array.from(root.querySelectorAll("button")).filter(function(b) { return b.textContent.trim() === text; })[0];
}
function type(w, input, v) { input.value = v; input.dispatchEvent(new w.Event("input")); }

// ---- importing the real file ---------------------------------------------------
(function() {
  var w = newApp(), rep = w.importDrillsCSV(DRILLS);
  eq("25 drills added", rep.added, 25);
  eq("no rows skipped", rep.skipped.length, 0);
  eq("7 built-in + 25 imported", w.S.drills.length, 32);
  var ft = drill(w, "Free-throw accuracy");
  eq("id kept from the file", ft.id, "18e6193f-b70f-4209-88ca-98703d7d9c84");
  eq("makes drill", w.stageMeasure(ft, 0), "makes");
  eq("out of 10", w.stageOutOf(ft, 0), 10);
  eq("one stage", w.drillValueCount(ft), 1);
  var pro = drill(w, "Free-throw proficiency");
  eq("count drill", w.stageMeasure(pro, 0), "count");
  eq("60-second limit", w.stageTimeLimit(pro, 0), 60);
  eq("hint reads naturally", w.stageHint(pro, 0), "makes in 60 s");
  var str = drill(w, "Strength combine");
  eq("strength stages", str.stages.map(function(g) { return g.measure; }).join(","), "count,count,time");
  eq("plank: longer is better", w.stageBetter(str, 2), "higher");
  eq("combine stage with makes", w.stageMeasure(drill(w, "Overall skills combine with shooting"), 1), "makes");
  var help = drill(w, "Help-side awareness");
  eq("rating drill", w.stageMeasure(help, 0), "rating");
  eq("rating goes up the scale", w.stageBetter(help, 0), "higher");
  eq("'none' description is empty", help.description, "");
  eq("seconds shown as s", w.stageHint(drill(w, "Speed to the ball"), 0), "s");
  ok("every drill active", w.S.drills.every(function(d) { return d.active !== false; }));
  var again = w.importDrillsCSV(DRILLS);
  eq("re-import adds nothing", again.added, 0);
  eq("re-import recognizes all 25", again.same, 25);
  var byName = w.importDrillsCSV("name,measure\nFree-throw accuracy,makes");
  eq("matched by name without an id", byName.same + byName.added * 100, 1);
})();

// ---- tabs pasted from a spreadsheet; files that aren't drills --------------------
(function() {
  var w = newApp();
  var tsv = DRILLS.split(/\r?\n/).map(function(l) { return w.parseCSVRows(l)[0] || []; })
                  .filter(function(r) { return r.length; }).map(function(r) { return r.join("\t"); }).join("\n");
  eq("tab-separated paste imports too", w.importDrillsCSV(tsv).added, 25);
  var notDrills = w.importDrillsCSV("id,name,jersey number\n,Ari Kim,7");
  ok("a players file is refused with a reason", notDrills.added === 0 && /drills file/.test(notDrills.skipped[0].why));
})();

// ---- bad rows are skipped with their row number ----------------------------------
(function() {
  var w = newApp();
  var rep = w.importDrillsCSV([
    "id,name,measure,out_of,stage_number,stage_name",
    "11111111-1111-4111-8111-111111111111,,time,,,",
    ",Speed test,speed,,,",
    ",=HYPERLINK(x),time,,,",
    ",Gap drill,time,,1,A",
    ",Gap drill,time,,3,C",
    ",Makes default,makes,,,"].join("\n"));
  eq("only the good drill is added", rep.added, 1);
  eq("four drills skipped", rep.skipped.length, 4);
  var rows = rep.skipped.map(function(x) { return x.row; }).join(",");
  eq("row numbers reported", rows, "2,3,4,6");
  ok("reasons say what's wrong", /name is empty/.test(rep.skipped[0].why) && /measure must be/.test(rep.skipped[1].why) &&
     /formulas/.test(rep.skipped[2].why) && /in order/.test(rep.skipped[3].why), JSON.stringify(rep.skipped));
  eq("makes without out_of defaults to 10", w.stageOutOf(drill(w, "Makes default"), 0), 10);
})();

// ---- values by measure, ratings, notes -------------------------------------------
(function() {
  var w = newApp(); w.importDrillsCSV(DRILLS); practice(w);
  var id = function(n) { return drill(w, n).id; };
  eq("ADV means Advanced", w.recordAttempt(id("Help-side awareness"), ["p0"], ["ADV"]).attempt.vals[0], "Advanced");
  eq("any case works", w.recordAttempt(id("Help-side awareness"), ["p1"], ["elite"]).attempt.vals[0], "Elite");
  ok("unknown level refused", /Beginner, Intermediate/.test(w.recordAttempt(id("Help-side awareness"), ["p2"], ["Great"]).error));
  ok("blank level refused", !!w.recordAttempt(id("Help-side awareness"), ["p2"], [""]).error);
  eq("scale order", w.RATING_LEVELS.map(function(r) { return w.ratingRank(r.label); }).join(""), "01234");
  ok("7 of 10 is fine", !w.recordAttempt(id("Free-throw accuracy"), ["p0"], [7]).error);
  ok("11 of 10 refused", /more than 10/.test(w.recordAttempt(id("Free-throw accuracy"), ["p0"], [11]).error));
  ok("7.5 makes refused", /whole number/.test(w.recordAttempt(id("Free-throw accuracy"), ["p0"], [7.5]).error));
  ok("count must not be negative", /negative/.test(w.recordAttempt(id("Free-throw proficiency"), ["p0"], [-1]).error));
  var n = w.recordAttempt(id("Speed to the ball"), ["p0"], [2.35], "Slipped on the turn").attempt;
  eq("note kept", n.notes, "Slipped on the turn");
  var d = function(nm) { return drill(w, nm); };
  eq("time shown", w.fmtAttemptValue(d("Speed to the ball"), 0, 2.35), "2.35 s");
  eq("makes shown", w.fmtAttemptValue(d("Free-throw accuracy"), 0, 7), "7/10");
  eq("rating shown as the word", w.fmtAttemptValue(d("Help-side awareness"), 0, "Advanced"), "Advanced");
  var csv = w.attemptsCSV();
  ok("attempts CSV has the level and the note", /Advanced/.test(csv) && /Slipped on the turn/.test(csv));
})();

// ---- the practice screen ---------------------------------------------------------
(function() {
  var w = newApp(); practice(w); w.render();
  ok("drills card without imports shows the built-in group drills as chips",
     !card(w).querySelector("select") && card(w).querySelectorAll(".chip").length === 2);
  ok("import button there", !!button(card(w), "Import drills CSV"));
  w.importDrillsCSV(DRILLS); w.render();
  ok("27 drills: a dropdown instead of chips", !!card(w).querySelector("select"));

  choose(w, "Help-side awareness");
  var rows = card(w).querySelectorAll(".brow");
  eq("one row per player", rows.length, 3);
  eq("five levels per row", rows[0].querySelectorAll(".lvl").length, 5);
  button(rows[0], "ADV").click();
  rows = card(w).querySelectorAll(".brow");
  button(rows[1], "ELT").click();
  rows = card(w).querySelectorAll(".brow");
  eq("tapped level shows as selected", rows[0].querySelector('.lvl[aria-pressed="true"]').textContent, "ADV");
  type(w, rows[0].querySelector(".bnote"), "Late rotating on skip passes");
  button(card(w), "Save results").click();
  var at = w.activeSession().attempts;
  eq("two ratings saved in one pass", at.length, 2);
  eq("first rating", at[0].vals[0], "Advanced");
  eq("its note", at[0].notes, "Late rotating on skip passes");
  eq("second rating", at[1].vals[0], "Elite");
  ok("the list shows the note", /Late rotating/.test(w.document.querySelector("table.attempts").textContent));

  choose(w, "Free-throw accuracy");
  rows = card(w).querySelectorAll(".brow");
  type(w, rows[0].querySelector("input[type=number]"), "7");
  type(w, rows[1].querySelector("input[type=number]"), "11");
  button(card(w), "Save results").click();
  eq("the valid result saved", w.activeSession().attempts.length, 3);
  eq("the bad one is kept to fix", w.UI.batch.rows.p1.val, "11");

  choose(w, "Strength combine");
  ok("a combine uses the pick-and-record flow", !card(w).querySelector(".brow") && !!button(card(w), "Record attempt"));
  card(w).querySelectorAll(".plr")[0].click();
  var ins = card(w).querySelectorAll(".grid2 input[type=number]");
  eq("one box per station", ins.length, 3);
  type(w, ins[0], "30"); type(w, ins[1], "40"); type(w, ins[2], "55.5");
  button(card(w), "Record attempt").click();
  var last = w.activeSession().attempts[w.activeSession().attempts.length - 1];
  eq("combine values", last.vals.join(","), "30,40,55.5");
})();

// ---- export matches the import, round trip -------------------------------------------
(function() {
  var a = newApp(); a.importDrillsCSV(DRILLS);
  var out = a.drillsCSV(), lines = out.split("\n");
  eq("same columns as the import", lines[0], a.DRILL_COLS.join(","));
  ok("no blank cells: 'none' instead", !/,,|,$/m.test(out));
  var b = newApp(), rep = b.importDrillsCSV(out);
  eq("round trip adds the 25", rep.added, 25);
  eq("built-ins recognized", rep.same, 7);
  var shape = function(w) {
    var d = drill(w, "Strength combine");
    return JSON.stringify(d.stages.map(function(g, i) {
      return [w.stageName(d, i), w.stageMeasure(d, i), w.stageUnit(d, i), w.stageBetter(d, i), w.stageTimeLimit(d, i)];
    }));
  };
  eq("combine survives the round trip", shape(b), shape(a));
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
