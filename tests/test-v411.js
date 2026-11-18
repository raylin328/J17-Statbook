// v4.11 tests: the drill catalog holds 200, and 60 can be on at once; on/off per
// drill; drills grouped by area in collapsible sections; the area column round-trips;
// older saves open with the new fields filled in.
"use strict";
var fs = require("fs");
var JSDOM = require("jsdom").JSDOM;
var STATBOOK = require("./app-path");
var SKILLS = require("path").join(__dirname, "fixtures", "development_skills.csv");

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
function practice(w) {
  w.S.players = [{ id: "p0", name: "Ari Kim", num: "1", active: true, cat: w.MISC_ID, aliases: [], desc: "", notes: "" }];
  w.startSession({ kind: "practice", title: "Drills", playerIds: ["p0"] });
  return w.activeSession();
}
function card(w) { return w.document.querySelector(".drillcard"); }
function chipsIn(root, sel) { return Array.from(root.querySelectorAll(sel)); }
function onCount(w) { return w.S.drills.filter(function(d) { return d.active !== false; }).length; }
// a fixture with n drills, all on, spread across areas; ids are fresh UUIDs
function manyDrills(w, n, on) {
  var rows = ["name,measure,unit,better,active,area"];
  for (var i = 0; i < n; i++) rows.push("Drill " + i + ",rating,BEG/INT/AVG/ADV/ELT,higher," + (on ? "TRUE" : "FALSE") + ",Area " + (i % 4));
  return w.importDrillsCSV(rows.join("\n"));
}

// ---- the caps ----------------------------------------------------------------------------
(function() {
  var w = newApp();
  eq("catalog cap is 200", w.MAX_DRILLS, 200);
  eq("active cap is 60", w.MAX_ACTIVE_DRILLS, 60);
  ok("version is 4.11 or later", /^4\.(1[1-9]|[2-9]\d)/.test(w.APP_VERSION), w.APP_VERSION);
  ok("tab title shows it", w.document.title === "J17 Stat Book " + w.APP_VERSION, w.document.title);

  var rep = manyDrills(w, 70, true);
  eq("70 drills import (they fit the catalog)", rep.added, 70);
  eq("60 are on in total (the 7 standard drills count too)", onCount(w), 60);
  eq("the other 17 come in off", w.S.drills.filter(function(d){ return d.active === false; }).length, 17);
  ok("and the report says so", /17 saved off \(60 on at most\)/.test(w.drillReportLine(rep)), w.drillReportLine(rep));
  ok("the report lists them by name", rep.off.length === 17);
  var before = onCount(w);
  var r = w.setDrillOn(w.S.drills.filter(function(d){ return d.active === false; })[0], true);
  ok("turning one more on is refused at 60", !!r.error, JSON.stringify(r));
  eq("still 60 on", onCount(w), before);

  var w2 = newApp();
  var big = ["name,measure,unit,better,active,area"];
  for (var i = 0; i < 205; i++) big.push("Cap drill " + i + ",rating,BEG/INT/AVG/ADV/ELT,higher,FALSE,Area");
  var rep2 = w2.importDrillsCSV(big.join("\n"));
  eq("catalog stops at 200 (7 standard + 193)", w2.S.drills.length, 200);
  ok("the rest are skipped with the reason", rep2.skipped.length === 12 && /too many drills \(the limit is 200\)/.test(rep2.skipped[0].why), rep2.skipped.length);
})();

// ---- on and off ----------------------------------------------------------------------------
(function() {
  var w = newApp(), s = practice(w);
  manyDrills(w, 61, false);
  var d = w.S.drills.filter(function(x){ return x.name === "Drill 0"; })[0];
  eq("imported off", d.active, false);
  w.UI.tab = "session"; w.render();
  ok("off drills aren't in the practice picker", !chipsIn(card(w), ".areas .chip").some(function(c){ return c.textContent === "Drill 0"; }));
  var manage = card(w).querySelector("details.manage");
  ok("manage section is there", !!manage);
  ok("it says how many are on", /Manage drills \(7 of 60 on\)/.test(manage.textContent), manage.querySelector("summary").textContent);

  var chip = chipsIn(manage, "button.chip").filter(function(c){ return /Drill 0$/.test(c.textContent); })[0];
  ok("the switch says Off", /^Off · Drill 0/.test(chip.textContent), chip.textContent);
  chip.click();
  eq("tapping turns it on", d.active, true);
  ok("and it's in the picker now", chipsIn(card(w), ".areas .chip").some(function(c){ return c.textContent === "Drill 0"; }));
  ok("toast says on", /Drill 0 on/.test(w.__toasts.join(" ")));
  var tog = chipsIn(card(w).querySelector("details.manage"), "button.chip").filter(function(c){ return /Drill 0$/.test(c.textContent); })[0];
  tog.click();
  eq("tapping again turns it off", d.active, false);
  eq("turning off always works, and frees a slot", w.setDrillOn(w.S.drills.filter(function(x){ return x.name === "Drill 1"; })[0], true).ok, true);
  eq("off drill keeps its settings", d.measure, "rating");
})();

// ---- the standard drills and older saves ----------------------------------------------------
(function() {
  var w = newApp(); w.render();
  var std = w.S.drills.filter(function(d){ return d.seeded; });
  eq("7 standard drills", std.length, 7);
  ok("they are grouped under Standard drills", std.every(function(d){ return d.area === "Standard drills"; }));

  var old = newApp();
  var saved = JSON.parse(JSON.stringify(old.S));
  saved.drills.forEach(function(d){ delete d.area; });
  saved.drills.push({ id: "a0000000-0000-4000-8000-000000000001", name: "Old drill", short: "OLD", groupSize: 1,
                      measure: "rating", unit: "BEG/INT/AVG/ADV/ELT", better: "higher", stages: [], active: true, order: 99 });
  var w2 = newApp(); w2.localStorage.setItem(w2.KEY, JSON.stringify(saved)); w2.load();
  var oldDrill = w2.S.drills.filter(function(d){ return d.name === "Old drill"; })[0];
  ok("a save from before area existed loads", !!oldDrill);
  eq("and its drill is under Other", w2.areaOf(oldDrill), "Other");
  eq("standard drills get their area back", w2.S.drills.filter(function(d){ return d.seeded; })[0].area, "Standard drills");
})();

// ---- areas: grouped, collapsible, state kept across renders ---------------------------------
(function() {
  var w = newApp(), s = practice(w);
  w.importDrillsCSV(fs.readFileSync(SKILLS, "utf8"));
  eq("102 skills saved, all off", w.S.drills.filter(function(d){ return d.area && !d.seeded && d.active === false; }).length, 102);
  eq("the 7 standard drills are on", onCount(w), 7);
  w.UI.tab = "session"; w.render();

  // the practice picker only lists drills that are on, so only the standard area shows
  var pickSums = chipsIn(card(w).querySelector(".areas"), "details.area summary").map(function(x){ return x.textContent; });
  eq("the picker shows only the area with drills on", pickSums.length, 1);
  ok("with its count", /^Standard drills \(\d+\)$/.test(pickSums[0]), pickSums[0]);

  // the manage section lists every area, collapsed
  var manage = card(w).querySelector("details.manage");
  ok("manage starts collapsed", manage.open === false);
  ok("manage lists every area with its on count", /Shooting  ·  0 on \(14\)/.test(manage.textContent));
  var shoot = chipsIn(manage, "details.area").filter(function(x){ return /^Shooting/.test(x.querySelector("summary").textContent); })[0];
  shoot.open = true;
  chipsIn(shoot, "button.chip").filter(function(c){ return /Set shots/.test(c.textContent); })[0].click();
  eq("Set shots is on", w.S.drills.filter(function(d){ return d.name === "Set shots"; })[0].active, true);
  var pickSums2 = chipsIn(card(w).querySelector(".areas"), "details.area summary").map(function(x){ return x.textContent; });
  ok("the picker gains Shooting with one drill", pickSums2.some(function(t){ return /^Shooting \(1\)$/.test(t); }), pickSums2.join(" | "));
  ok("the manage heading counts it", /Manage drills \(8 of 60 on\)/.test(card(w).querySelector("details.manage summary").textContent));

  // a section stays open across re-renders, and across changes to its own count
  var ballOf = function(){ return chipsIn(card(w).querySelector("details.manage"), "details.area").filter(function(x){ return /^Ball handling/.test(x.querySelector("summary").textContent); })[0]; };
  var mBall = ballOf();
  mBall.open = true; mBall.dispatchEvent(new w.Event("toggle"));
  eq("opening it is remembered", w.UI.areaOpen["manage:Ball handling"], true);
  w.render();
  eq("it stays open after a re-render", ballOf().open, true);
  chipsIn(ballOf(), "button.chip").filter(function(c){ return /Speed dribbling/.test(c.textContent); })[0].click();
  eq("still open after its count changes", ballOf().open, true);
  ok("its count went to 1", /Ball handling  ·  1 on/.test(ballOf().querySelector("summary").textContent), ballOf().querySelector("summary").textContent);
})();

// ---- a 102-skill import with 60 on: the first 60 by order stay on ---------------------------
(function() {
  var w = newApp(); practice(w);
  var txt = fs.readFileSync(SKILLS, "utf8").replace(/,FALSE,/g, ",TRUE,");   // every skill asks to be on
  var rep = w.importDrillsCSV(txt);
  eq("all 102 saved", rep.added, 102);
  eq("exactly 60 on in total (7 standard + 53)", onCount(w), 60);
  eq("the other 49 are off", rep.off.length, 49);
  ok("reported", /49 saved off/.test(w.drillReportLine(rep)), w.drillReportLine(rep));
})();

// ---- export and import round-trip the area column --------------------------------------------
(function() {
  var w = newApp(); practice(w);
  w.importDrillsCSV(fs.readFileSync(SKILLS, "utf8"));
  var csv = w.drillsCSV();
  var head = csv.split("\n")[0].split(",");
  eq("last column is area", head[head.length - 1], "area");
  var w2 = newApp(); w2.importDrillsCSV(csv);
  var a1 = w.S.drills.filter(function(d){ return !d.seeded; }).map(function(d){ return w.areaOf(d); });
  var a2 = w2.S.drills.filter(function(d){ return !d.seeded; }).map(function(d){ return w2.areaOf(d); });
  eq("areas survive export and import", a2.join("|"), a1.join("|"));
  ok("the file has no blank cells", csv.split("\n").slice(1).every(function(l){ return l.split(",").every(function(c){ return c !== ""; }); }));
})();

// ---- the CSV-only picker wording on the drill buttons -----------------------------------------
(function() {
  var w = newApp(); practice(w); w.render();
  var inp = null, real = w.document.createElement.bind(w.document);
  w.document.createElement = function(tag) { var e = real(tag); if (tag === "input") inp = e; return e; };
  Array.from(w.document.querySelectorAll("button")).filter(function(b){ return b.textContent.trim() === "Import drills CSV"; })[0].click();
  eq("drill picker accepts CSV only", inp && inp.accept, ".csv,text/csv");
  w.document.createElement = real;
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
