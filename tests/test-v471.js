// v4.7.1 tests: possessions and points per possession from the event log,
// the offensive/defensive rebound split, and the one-time upgrade of older data.
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
  var dom = new JSDOM(fs.readFileSync(STATBOOK, "utf8"), { runScripts: "dangerously", url: "https://x.test/" });
  return dom.window;
}
function pl(w, id, name) { return { id:id, name:name, num:"", active:true, cat:w.MISC_ID, aliases:[], desc:"", notes:"" }; }
// a game with two players a side; events pushed straight into the log, in order
function game(w) {
  w.S.players = [pl(w,"h1","Ari Kim"), pl(w,"h2","Blair Ng"), pl(w,"a1","Cody Ito"), pl(w,"a2","Devon Osi")];
  w.startSession({ kind:"game", title:"Scrimmage", format:"quarters", periodMin:8,
                   teams:[{ name:"Black", playerIds:["h1","h2"] }, { name:"White", playerIds:["a1","a2"] }] });
  var sess = w.activeSession(), n = 0;
  sess.add = function(pid, key, extra) {
    var e = { id:"e" + (++n), t:n, sid:sess.id, pid:pid, key:key, v:1, period:"Q1", team:pid[0] === "h" ? 0 : 1 };
    if (extra) Object.keys(extra).forEach(function(k) { e[k] = extra[k]; });
    sess.events.push(e); return sess;
  };
  return sess;
}
function statOn(w, key) { var s = w.S.stats.filter(function(x) { return x.key === key; })[0]; return s ? !!s.on : null; }

// ---- new installs --------------------------------------------------------------
(function() {
  var w = newApp();
  eq("OREB on", statOn(w, "OREB"), true);
  eq("DREB on", statOn(w, "DREB"), true);
  eq("turnovers on by default", statOn(w, "TO"), true);
  eq("no plain REB in a new install", statOn(w, "REB"), null);
  eq("new install marked as upgraded", w.S.prefs.possV1, true);
})();

// ---- counting ---------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w);
  eq("no events, no possessions", w.possessionsFor(s, 0), 0);
  eq("PPP is blank with no possessions", w.pppFor(s, 0), null);
  s.add("h1", "2P");
  eq("made basket ends a possession", w.possessionsFor(s, 0), 1);
  s.add("h1", "3P", { miss:true });
  eq("charted miss alone ends nothing", w.possessionsFor(s, 0), 1);
  s.add("h2", "OREB");
  eq("offensive rebound keeps it going", w.possessionsFor(s, 0), 1);
  s.add("h2", "2P", { miss:true }).add("a1", "DREB");
  eq("their defensive rebound ends ours", w.possessionsFor(s, 0), 2);
  eq("...and gives them none by itself", w.possessionsFor(s, 1), 0);
  s.add("h1", "TO");
  eq("turnover ends a possession", w.possessionsFor(s, 0), 3);
  s.add("h1", "1P").add("h1", "1P");
  eq("two made free throws = one trip", w.possessionsFor(s, 0), 4);
  s.add("a2", "AST").add("a2", "BLK").add("a2", "PF");
  eq("assists, blocks and fouls don't count", w.possessionsFor(s, 1), 0);
  eq("points per possession", w.pppFor(s, 0), 4 / 4);   // 2 + 2 = 4 points over 4 possessions
  eq("practice sessions have none", w.possessionsFor({ kind:"practice", events:[] }, 0), null);
})();

// ---- steals and turnovers ------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w);
  s.add("a1", "STL");
  eq("a steal alone ends their possession", w.possessionsFor(s, 0), 1);
  s.add("a1", "STL").add("h1", "TO");
  eq("steal then TO counts once", w.possessionsFor(s, 0), 2);
  s.add("h2", "TO").add("a2", "STL");
  eq("TO then steal counts once", w.possessionsFor(s, 0), 3);
  s.add("a1", "STL").add("a1", "2P").add("h1", "TO");
  eq("TO two taps after the steal still pairs", w.possessionsFor(s, 0), 4);
  eq("...and their basket counts for them", w.possessionsFor(s, 1), 1);
  s.add("h1", "TO").add("a1", "STL").add("a2", "STL");
  eq("one TO can't pair two steals", w.possessionsFor(s, 0), 6);
  s.add("a1", "STL", { period:"Q2" }).add("h1", "TO", { period:"Q3" });
  eq("no pairing across periods", w.possessionsFor(s, 0), 8);
})();

// ---- older data and bulk entries ----------------------------------------------------
(function() {
  var w = newApp(), s = game(w);
  s.add("a1", "REB");
  eq("plain REB counts as defensive", w.possessionsFor(s, 0), 1);
  s.add("h1", "2P", { v:3 });
  eq("an event carrying a count of 3", w.possessionsFor(s, 0), 4);
  s.events.push({ id:"x1", t:99, pid:"h2", key:"TO", v:1, period:"Q1" });   // no team stamped
  eq("team found from the roster when missing", w.possessionsFor(s, 0), 5);
  s.events.push({ id:"x2", t:100, pid:"h2", key:"TO", v:1, period:"Q1", team:"0" });
  eq("team as text from a CSV import", w.possessionsFor(s, 0), 6);
})();

// ---- display ---------------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w);
  s.add("h1", "2P").add("h1", "2P").add("a1", "3P").add("h2", "TO");
  w.render();
  var poss = [].map.call(w.document.querySelectorAll(".tposs"), function(e) { return e.textContent; });
  eq("scoreboard shows possessions per team", poss.join(" | "), "3 poss | 1 poss");
  w.UI.tab = "box"; w.render();
  var lines = [].map.call(w.document.querySelectorAll(".possline"), function(e) { return e.textContent; });
  eq("box score line, Black", lines[0], "Possessions 3 \u00b7 Points per possession 1.33");
  eq("box score line, White", lines[1], "Possessions 1 \u00b7 Points per possession 3.00");
  s.add("h1", "1P");
  eq("half possessions show one decimal", w.fmtPoss(w.possessionsFor(s, 0)), "3.5");
  var w2 = newApp(), s2 = game(w2);
  eq("dash for PPP when nothing is recorded", w2.possText(s2, 0), "Possessions 0 \u00b7 Points per possession \u2014");
})();

// ---- grid: O/D rebound cells, and they move the other team's count --------------------
(function() {
  var w = newApp(); game(w); w.render();
  var heads = [].map.call(w.document.querySelectorAll(".tapgrid thead th"), function(e) { return e.textContent.trim(); });
  ok("grid has OREB and DREB", heads.indexOf("OREB") > -1 && heads.indexOf("DREB") > -1, heads.join("|"));
  ok("grid has no plain REB", heads.indexOf("REB") < 0, heads.join("|"));
  ok("grid has TO", heads.indexOf("TO") > -1, heads.join("|"));
})();

// ---- box score keeps a combined REB column ------------------------------------------
(function() {
  var w = newApp(), s = game(w);
  s.add("h1", "OREB").add("h1", "DREB").add("h1", "REB");
  w.UI.tab = "box"; w.render();
  var tbl = w.document.querySelectorAll("table")[0];
  var heads = [].map.call(tbl.querySelectorAll("thead th"), function(e) { return e.textContent; });
  var row = [].map.call(tbl.querySelector("tbody tr").children, function(e) { return e.textContent; });
  var at = function(k) { return row[heads.indexOf(k)]; };
  eq("box columns", heads.join("|"), "Player|PTS|2P|3P|1P|OREB|DREB|REB|AST|STL|BLK|PF|TO");
  eq("OREB cell", at("OREB"), "1");
  eq("DREB cell", at("DREB"), "1");
  eq("REB is the total, old plain REB included", at("REB"), "3");
  var csv = w.sessionCSV(s);
  ok("session CSV carries the total", /Ari Kim,0,0,0,0,1,1,3/.test(csv), csv.split("\n").slice(4, 6).join(" | "));
  var card = w.cardCSV("h1");
  ok("report card CSV totals rebounds, old REB included", /\nRebounds,3,3\.0/.test(card),
     card.split("\n").filter(function(l) { return /reb/i.test(l); }).join(" | "));
})();

// ---- one-time upgrade of data saved by v4.7 and older ----------------------------------
(function() {
  var w = newApp(), s = game(w);
  s.add("h1", "2P");
  // reshape the saved state the way v4.7 left it: plain REB on, TO off, no O/D, no marker
  var d = JSON.parse(JSON.stringify(w.S));
  d.stats = d.stats.filter(function(x) { return x.key !== "OREB" && x.key !== "DREB"; });
  var at = d.stats.map(function(x) { return x.key; }).indexOf("AST");
  d.stats.splice(at, 0, { key:"REB", label:"Rebound", short:"REB", type:"integer", tally:true, scope:"game", pts:null, on:true });
  d.stats.forEach(function(x) { if (x.key === "TO") x.on = false; });
  delete d.prefs.possV1;
  d.sessions[0].events.push({ id:"old", t:5, sid:d.sessions[0].id, pid:"a1", key:"REB", v:1, period:"Q1", team:1 });
  var w2 = newApp();
  w2.localStorage.setItem(w2.KEY, JSON.stringify(d)); w2.load();
  var keys = w2.S.stats.map(function(x) { return x.key; });
  var r = keys.indexOf("REB");
  ok("O/D inserted where REB was", keys[r + 1] === "OREB" && keys[r + 2] === "DREB", keys.join(","));
  eq("plain REB switched off", statOn(w2, "REB"), false);
  eq("turnovers switched on", statOn(w2, "TO"), true);
  eq("marked as upgraded", w2.S.prefs.possV1, true);
  eq("old REB still counts for possessions", w2.possessionsFor(w2.S.sessions[0], 0), 2);
  // the coach turns turnovers off again; the upgrade must not undo that on the next load
  w2.S.stats.forEach(function(x) { if (x.key === "TO") x.on = false; });
  w2.save();
  var w3 = newApp();
  w3.localStorage.setItem(w3.KEY, w2.localStorage.getItem(w2.KEY)); w3.load();
  eq("upgrade runs once; later choices stick", statOn(w3, "TO"), false);
  eq("no duplicate O/D after reload", w3.S.stats.filter(function(x) { return x.key === "OREB"; }).length, 1);
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
