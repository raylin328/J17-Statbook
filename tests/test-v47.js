// v4.7 tests: drill catalog and M:N attempts.
"use strict";
var fs = require("fs"), path = require("path");
var JSDOM = require("jsdom").JSDOM;
var STATBOOK = require("./app-path");

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("pass  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra ? "  -> " + extra : "")); }
}
function eq(name, a, b) { ok(name, a === b, JSON.stringify(a) + " vs " + JSON.stringify(b)); }

function newApp() {
  var html = fs.readFileSync(STATBOOK, "utf8");
  var dom = new JSDOM(html, { runScripts: "dangerously", url: "https://x.test/" });
  return dom.window;
}
function seededPractice(w) {
  w.S.players = [
    { id:"p_a", name:"Ari Kim",   num:"1", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" },
    { id:"p_b", name:"Blair Ng",  num:"2", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" },
    { id:"p_c", name:"Cody Ito",  num:"3", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" },
    { id:"p_d", name:"Devon Osi", num:"4", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" },
    { id:"p_e", name:"Emery Rue", num:"5", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" },
    { id:"p_f", name:"Finn Sato", num:"6", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" }
  ];
  w.startSession({ kind:"practice", title:"Combine", playerIds:["p_a","p_b","p_c","p_d","p_e","p_f"] });
  return w.activeSession();
}

// ---- seed catalog ----------------------------------------------------------
(function() {
  var w = newApp();
  ok("drills seeded", Array.isArray(w.S.drills) && w.S.drills.length === 7);
  var byName = {}; w.S.drills.forEach(function(d) { byName[d.name] = d; });
  ok("3-Man Weave present",     !!byName["3-Man Weave"]);
  ok("Defender to Shot present", !!byName["Defender to Shot"]);
  ok("Vertical jump present",    !!byName["Vertical jump"]);
  var weave = byName["3-Man Weave"];
  eq("weave group size", weave.groupSize, 3);
  eq("weave unit", weave.unit, "s");
  eq("weave lower better", weave.better, "lower");
  eq("weave single stage", weave.stages.length, 0);
  eq("weave value count", w.drillValueCount(weave), 1);
  var d2s = byName["Defender to Shot"];
  eq("d2s solo", d2s.groupSize, 1);
  eq("d2s three stages", d2s.stages.length, 3);
  eq("d2s value count", w.drillValueCount(d2s), 3);
  eq("d2s stage 1 name", d2s.stages[0].name, "Beat defender");
  var range = w.drillGroupRange(weave);
  eq("weave range min", range.min, 3);
  eq("weave range max", range.max, 3);
})();

// ---- ensureDrills is idempotent and repairs ---------------------------------
(function() {
  var w = newApp();
  var before = w.S.drills.length;
  w.ensureDrills(w.S);
  eq("ensureDrills idempotent", w.S.drills.length, before);
  // wipe drills and reseed
  w.S.drills = [];
  w.ensureDrills(w.S);
  eq("ensureDrills reseeds empty", w.S.drills.length, 7);
  // drop 3-Man Weave; ensure it comes back
  w.S.drills = w.S.drills.filter(function(d) { return d.name !== "3-Man Weave"; });
  w.ensureDrills(w.S);
  ok("ensureDrills brings back weave", w.S.drills.some(function(d) { return d.name === "3-Man Weave"; }));
  // malformed entries stripped
  w.S.drills.push({ id:"", name:"" });
  w.S.drills.push(null);
  w.ensureDrills(w.S);
  ok("malformed drills stripped", w.S.drills.every(function(d) { return d && d.id && d.name; }));
  // stages capped
  var big = w.S.drills[0];
  big.stages = [];
  for (var i = 0; i < 10; i++) big.stages.push({ name:"s"+i, unit:"s", better:"lower" });
  w.ensureDrills(w.S);
  eq("stages capped to MAX_STAGES", big.stages.length, w.MAX_STAGES);
})();

// ---- record: solo single-stage ---------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var vert = w.S.drills.filter(function(d) { return d.name === "Vertical jump"; })[0];
  var r = w.recordAttempt(vert.id, ["p_a"], [22]);
  ok("solo record ok", !r.error);
  eq("attempt stored", w.activeSession().attempts.length, 1);
  eq("attempt vals length", w.activeSession().attempts[0].vals.length, 1);
  eq("attempt val", w.activeSession().attempts[0].vals[0], 22);
  eq("attempt pids length", w.activeSession().attempts[0].pids.length, 1);
})();

// ---- record: group (3-Man Weave) --------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var weave = w.S.drills.filter(function(d) { return d.name === "3-Man Weave"; })[0];
  var r = w.recordAttempt(weave.id, ["p_a", "p_b", "p_c"], [45.2]);
  ok("weave record ok", !r.error);
  eq("weave attempt vals length", r.attempt.vals.length, 1);
  eq("weave attempt pids length", r.attempt.pids.length, 3);
  eq("weave attempt val", r.attempt.vals[0], 45.2);
  var summary = w.attemptSummary(r.attempt);
  eq("weave summary formatted", summary, "45.2 s");
  var who = w.attemptParticipantsText(r.attempt);
  eq("weave participants text", who, "Ari Kim, Blair Ng, Cody Ito");
})();

// ---- record: multi-stage solo -----------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var d2s = w.S.drills.filter(function(d) { return d.name === "Defender to Shot"; })[0];
  var r = w.recordAttempt(d2s.id, ["p_a"], [2.1, 3.8, 1.2]);
  ok("d2s record ok", !r.error);
  eq("d2s three vals stored", r.attempt.vals.length, 3);
  var summary = w.attemptSummary(r.attempt);
  eq("d2s summary formatted", summary, "2.1 s + 3.8 s + 1.2 s");
})();

// ---- validation: pids ------------------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var weave = w.S.drills.filter(function(d) { return d.name === "3-Man Weave"; })[0];
  var r = w.recordAttempt(weave.id, ["p_a", "p_b"], [45]);
  ok("weave needs 3, refuses 2", !!r.error && /at least 3/i.test(r.error), r.error);
  r = w.recordAttempt(weave.id, ["p_a", "p_b", "p_c", "p_d"], [45]);
  ok("weave refuses 4",           !!r.error && /at most 3/i.test(r.error), r.error);
  r = w.recordAttempt(weave.id, ["p_a", "p_a", "p_b"], [45]);
  ok("no duplicate players",      !!r.error && /twice/i.test(r.error), r.error);
  r = w.recordAttempt(weave.id, ["p_a", "p_b", "p_z"], [45]);
  ok("player must be on session", !!r.error && /(practice|session)/i.test(r.error), r.error);
  var okr = w.recordAttempt(weave.id, ["p_a", "p_b", "p_c"], [45]);
  ok("valid weave records",       !okr.error);
})();

// ---- validation: values ----------------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var d2s = w.S.drills.filter(function(d) { return d.name === "Defender to Shot"; })[0];
  var r = w.recordAttempt(d2s.id, ["p_a"], [2.1, 3.8]);
  ok("multi-stage needs 3 vals", !!r.error && /3/.test(r.error), r.error);
  r = w.recordAttempt(d2s.id, ["p_a"], [2.1, "nope", 1.2]);
  ok("non-numeric refused", !!r.error && /not a number/i.test(r.error), r.error);
  r = w.recordAttempt(d2s.id, ["p_a"], [2.1, -3, 1.2]);
  ok("negative refused",   !!r.error && /negative/i.test(r.error), r.error);
  r = w.recordAttempt(d2s.id, ["p_a"], [2.1, "", 1.2]);
  ok("empty refused",      !!r.error, r.error);
})();

// ---- game sessions can't hold drill attempts -------------------------------
(function() {
  var w = newApp();
  w.S.players = [
    { id:"p_a", name:"Ari Kim", num:"1", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" },
    { id:"p_b", name:"Blair Ng", num:"2", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" }
  ];
  w.startSession({ kind:"game", title:"vs. Someone", format:"quarters", periodMin:8,
                   teams:[{ name:"Home", playerIds:["p_a"] }, { name:"Away", playerIds:["p_b"] }] });
  var vert = w.S.drills.filter(function(d) { return d.name === "Vertical jump"; })[0];
  var r = w.recordAttempt(vert.id, ["p_a"], [22]);
  ok("game refuses attempt", !!r.error && /practice/i.test(r.error), r.error);
})();

// ---- addDrill (custom drills) -----------------------------------------------
(function() {
  var w = newApp();
  var before = w.S.drills.length;
  var r = w.addDrill("Zig-zag Slide", { groupSize:1, unit:"s", better:"lower" });
  ok("custom drill added", !r.error);
  eq("drill count grew", w.S.drills.length, before + 1);
  // name collision returns existed
  var again = w.addDrill("Zig-zag Slide", { groupSize:1 });
  ok("duplicate name returns existed", again.existed === true);
  // formula guard
  var bad = w.addDrill("=EVIL()", { groupSize:1 });
  ok("formula name refused", !!bad.error && /formula/i.test(bad.error), bad.error);
  // groupSize capped
  var big = w.addDrill("Big Group", { groupSize:99 });
  eq("groupSize capped to MAX", big.drill.groupSize, w.MAX_GROUP_SIZE);
  // stages capped
  var many = w.addDrill("Many Stages", { groupSize:1,
    stages: [{ name:"a" }, { name:"b" }, { name:"c" }, { name:"d" }, { name:"e" }, { name:"f" }] });
  eq("stages capped", many.drill.stages.length, w.MAX_STAGES);
})();

// ---- removeAttempt ---------------------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var vert = w.S.drills.filter(function(d) { return d.name === "Vertical jump"; })[0];
  w.recordAttempt(vert.id, ["p_a"], [22]);
  w.recordAttempt(vert.id, ["p_b"], [24]);
  var second = w.activeSession().attempts[1];
  w.removeAttempt(second.id);
  eq("one attempt removed", w.activeSession().attempts.length, 1);
  eq("right one kept", w.activeSession().attempts[0].pids[0], "p_a");
})();

// ---- attempts survive save/reload ------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var weave = w.S.drills.filter(function(d) { return d.name === "3-Man Weave"; })[0];
  w.recordAttempt(weave.id, ["p_a", "p_b", "p_c"], [45.2]);
  var raw = w.localStorage.getItem(w.KEY);
  var restored = JSON.parse(raw);
  ok("attempts serialized",
     restored.sessions[0].attempts && restored.sessions[0].attempts.length === 1);
  eq("weave val round-trips", restored.sessions[0].attempts[0].vals[0], 45.2);
  // reopen fresh; upgrade() runs ensureDrills, catalog re-seeds
  var w2 = newApp();
  w2.localStorage.setItem(w2.KEY, raw);
  w2.load();
  eq("attempts reload", w2.S.sessions[0].attempts.length, 1);
  ok("catalog present after reload", w2.S.drills.length >= 7);
})();

// ---- UI: recording an attempt via the DOM ----------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  w.render();
  // find the M:N card and its chips
  var cards = w.document.querySelectorAll(".card");
  var mnCard = null;
  for (var i = 0; i < cards.length; i++) {
    if (/Group and multi-stage/.test(cards[i].textContent)) { mnCard = cards[i]; break; }
  }
  ok("M:N card rendered", !!mnCard);
  var chips = mnCard.querySelectorAll(".chip");
  ok("chips rendered", chips.length >= 2, "chips=" + chips.length);
  // click 3-Man Weave chip
  var weaveChip = null;
  for (var j = 0; j < chips.length; j++) if (/3-Man Weave/.test(chips[j].textContent)) weaveChip = chips[j];
  ok("weave chip present", !!weaveChip);
  weaveChip.click();
  // re-find the card after render
  cards = w.document.querySelectorAll(".card");
  for (var k = 0; k < cards.length; k++) if (/Group and multi-stage/.test(cards[k].textContent)) { mnCard = cards[k]; break; }
  // pick 3 players
  var picks = mnCard.querySelectorAll(".plr");
  picks[0].click(); picks[1].click(); picks[2].click();
  eq("3 players picked", w.UI.attempt.pids.length, 3);
  // enter a value
  cards = w.document.querySelectorAll(".card");
  for (var m = 0; m < cards.length; m++) if (/Group and multi-stage/.test(cards[m].textContent)) { mnCard = cards[m]; break; }
  var input = mnCard.querySelector("input[type=number]");
  input.value = "44.8";
  input.dispatchEvent(new w.Event("input"));
  eq("val captured", w.UI.attempt.vals[0], "44.8");
  // click Record attempt
  var recordBtn = null;
  var btns = mnCard.querySelectorAll("button");
  for (var b = 0; b < btns.length; b++) if (/Record attempt/.test(btns[b].textContent)) recordBtn = btns[b];
  ok("record button found", !!recordBtn && !recordBtn.disabled);
  recordBtn.click();
  eq("attempt stored via UI", w.activeSession().attempts.length, 1);
  eq("value stored via UI", w.activeSession().attempts[0].vals[0], 44.8);
})();

// ---- CSV export ------------------------------------------------------------
(function() {
  var w = newApp();
  seededPractice(w);
  var weave = w.S.drills.filter(function(d) { return d.name === "3-Man Weave"; })[0];
  var d2s = w.S.drills.filter(function(d) { return d.name === "Defender to Shot"; })[0];
  w.recordAttempt(weave.id, ["p_a","p_b","p_c"], [45.2]);
  w.recordAttempt(d2s.id, ["p_a"], [2.1, 3.8, 1.2]);
  // drills catalog
  var dcsv = w.drillsCSV().split("\n");
  eq("drills header", dcsv[0], "id,name,short,group_size,unit,better,stage_number,stage_name,stage_unit,stage_better,seeded,active");
  // 6 solo-single-stage rows + 3 D2S stage rows + 1 weave row = 10 data rows
  var d2sRows = dcsv.filter(function(r) { return /Defender to Shot/.test(r); });
  eq("d2s written as 3 stage rows", d2sRows.length, 3);
  ok("d2s stage 1 named", /Beat defender/.test(d2sRows[0]));
  var weaveRow = dcsv.filter(function(r) { return /3-Man Weave/.test(r); })[0];
  ok("weave row has group_size 3", /,3,s,lower,/.test(weaveRow), weaveRow);
  // attempts
  var acsv = w.attemptsCSV().split("\n");
  eq("attempts header",  acsv[0], "attempt_id,session_id,drill_id,drill_name,participant_ids,participant_names,stage_number,stage_name,value,unit,timestamp,notes");
  // 1 weave row + 3 d2s stage rows = 4 data rows
  eq("attempts rows count", acsv.length, 5);   // header + 4
  var weaveAtt = acsv.filter(function(r) { return /3-Man Weave/.test(r); })[0];
  ok("weave attempt has 3 pids", /p_a\|p_b\|p_c/.test(weaveAtt), weaveAtt);
  ok("weave attempt has 3 names", /Ari Kim\|Blair Ng\|Cody Ito/.test(weaveAtt), weaveAtt);
  ok("weave attempt value", /,45\.2,s,/.test(weaveAtt), weaveAtt);
  var d2sAtts = acsv.filter(function(r) { return /Defender to Shot/.test(r); });
  eq("d2s three attempt rows", d2sAtts.length, 3);
  ok("d2s stage 2 present", /Sprint to pylon/.test(d2sAtts[1]), d2sAtts[1]);
})();
console.log("(v4.7 csv extras done)");

console.log(pass + " pass, " + fail + " fail");
process.exit(fail ? 1 : 0);
