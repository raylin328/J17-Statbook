// v4.9 tests: lineups and substitutions (any number on court), minutes from the
// game clock across periods, plus/minus, the version on screen, "Clear all
// players", and players sheets laid out with team headings.
// (Replaces test-v45.js, which tested the v4.5 helpers these replace.)
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
  return new JSDOM(fs.readFileSync(STATBOOK, "utf8"), { runScripts: "dangerously", url: "https://x.test/" }).window;
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
function btn(w, text) {
  return Array.from(w.document.querySelectorAll("button")).filter(function(b) { return b.textContent.trim() === text; })[0];
}
function chip(w, text) {
  return Array.from(w.document.querySelectorAll(".lineup .chip")).filter(function(b) { return b.textContent === text; })[0];
}
function boxRows(w, k) {
  var t = w.document.querySelectorAll("table")[k];
  var head = Array.from(t.querySelectorAll("thead th")).map(function(x) { return x.textContent; });
  var rows = {};
  Array.from(t.querySelectorAll("tbody tr")).forEach(function(tr) {
    var c = Array.from(tr.children).map(function(x) { return x.textContent; });
    rows[c[0]] = function(col) { return c[head.indexOf(col)]; };
  });
  return { head: head, row: rows };
}

// ---- the version on screen --------------------------------------------------------
(function() {
  var w = newApp(); w.render();
  ok("version is set", /^4\.\d+/.test(w.APP_VERSION), w.APP_VERSION);
  ok("tab title shows it", w.document.title === "J17 Stat Book " + w.APP_VERSION, w.document.title);
  eq("header shows it", (w.document.querySelector(".board-title .ver") || {}).textContent, w.APP_VERSION);
})();

// ---- "Clear all players" ------------------------------------------------------------
(function() {
  var w = newApp();
  w.S.players = [pl(w, "p1", "Ari Kim"), pl(w, "p2", "Blair Ng")];
  w.UI.tab = "players"; w.render();
  var top = w.document.querySelector(".btns");
  ok("button at the top, next to import and export", /Clear all players/.test(top.textContent), top.textContent);
  ok("no 'Delete all' anywhere on the tab", !/Delete all/i.test(w.document.body.textContent));
  btn(w, "Clear all players\u2026").click();
  var asked = "";
  w.confirm = function(m) { asked = m; return true; };
  btn(w, "Clear all 2 players").click();
  ok("the question says clear", /^Clear all 2 players\?/.test(asked), asked);
  eq("players cleared", w.S.players.length, 0);
})();

// ---- players sheets with team headings ------------------------------------------------
(function() {
  var U = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222",
           "33333333-3333-4333-8333-333333333333"];
  function catOf(w, p) { var c = w.S.categories.filter(function(x) { return x.id === p.cat; })[0]; return c && c.name; }
  function byName(w, n) { return w.S.players.filter(function(p) { return p.name === n; })[0]; }

  var w = newApp();
  w.importPlayersCSV(["id,Team 1", U[0] + ",Ari Kim", U[1] + ",Blair Ng", ",", ",Team 2", U[2] + ",Cody Ito"].join("\n"));
  var rep = w.importPlayersCSV.report;
  eq("ids and headings: 3 players", rep.added, 3);
  eq("header heading becomes a category", catOf(w, w.playerById(U[0])), "Team 1");
  eq("heading row starts the next category", catOf(w, w.playerById(U[2])), "Team 2");
  ok("the report says what it did", /Team 1, Team 2/.test(rep.warnings.join(" ")), rep.warnings.join(" | "));
  ok("no player named after a heading", !byName(w, "Team 2") && !byName(w, "Team 1"));

  var w2 = newApp();
  w2.importPlayersCSV("Team 1\nAri Kim\nBlair Ng\n\nTeam 2\nCody Ito");
  eq("one column, no ids: 3 players", w2.importPlayersCSV.report.added, 3);
  eq("its categories", [catOf(w2, byName(w2, "Blair Ng")), catOf(w2, byName(w2, "Cody Ito"))].join("/"), "Team 1/Team 2");

  var w3 = newApp();
  w3.importPlayersCSV("Ari Kim\nBlair Ng");
  ok("a plain list with no headings still gets the help message", /no name column/.test(w3.importPlayersCSV.report.fatal || ""));
  ok("group names recognized", w.looksLikeGroup("U12 Team 1") && w.looksLikeGroup("U14 Rep") && w.looksLikeGroup("House League"));
  ok("player names aren't", !w.looksLikeGroup("Riley Park") && !w.looksLikeGroup("Reppert Lee"));
})();

// ---- lineups: any number on the court -------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 7); w.render();
  ok("starts with no lineup", /No lineup set/.test(w.document.querySelector(".lineup").textContent));
  btn(w, "Set lineup").click();
  eq("every player can be picked", w.document.querySelectorAll(".lineup .chip").length, 7);
  ["#0 Home 0", "#1 Home 1", "#2 Home 2", "#3 Home 3", "#4 Home 4"].forEach(function(t) { chip(w, t).click(); });
  eq("five on", w.onCourt(s, 0).length, 5);
  ok("the strip says who", /5 on court: #0 Home 0, #1 Home 1/.test(w.document.querySelector(".lutext").textContent));
  chip(w, "#5 Home 5").click();
  eq("six on is allowed", w.onCourt(s, 0).length, 6);
  ok("and shown plainly", /^6 on court/.test(w.document.querySelector(".lutext").textContent));
  chip(w, "#0 Home 0").click(); chip(w, "#1 Home 1").click();
  eq("four on is allowed", w.onCourt(s, 0).length, 4);
  eq("every change is kept", w.lineupsFor(s, 0).length, 8);
  w.setOnCourt(s, 0, ["h2", "a1", "h2"]);
  eq("other team's players and repeats are ignored", w.onCourt(s, 0).join(","), "h2");

  btn(w, "Done").click();
  var rows = w.document.querySelectorAll(".tapgrid tbody tr");
  eq("on-court row marked", rows[2].className, "oncourt");
  eq("bench rows marked", rows[0].className, "bench");
  w.UI.team = 1; w.render();
  eq("an untracked team isn't marked", w.document.querySelectorAll(".tapgrid tr.oncourt, .tapgrid tr.bench").length, 0);
})();

// ---- minutes from the game clock, across a period change --------------------------------
(function() {
  var w = newApp(), s = game(w, 6);
  s.clock = { len: 480000, left: 480000, since: null, ran: true };
  w.setOnCourt(s, 0, ["h0", "h1", "h2", "h3", "h4"]);
  s.clock.left = 300000;                                   // 3:00 played
  w.setOnCourt(s, 0, ["h0", "h1", "h2", "h3", "h5"]);      // h4 off, h5 on
  s.clock.left = 0;                                        // end of Q1
  w.render();
  var sel = w.document.querySelector("select.per");
  sel.value = "Q2"; sel.dispatchEvent(new w.Event("change"));
  eq("period change closes and reopens the lineup", w.lineupsFor(s, 0).slice(-2).map(function(x) { return x.mark; }).join(","), "end,start");
  s.clock.left = 420000;                                   // 1:00 into Q2
  var sec = w.secondsOnCourt(s, 0);
  eq("subbed out after 3:00", sec.h4, 180);
  eq("in for 5:00 of Q1 and 1:00 of Q2", sec.h5, 360);
  eq("on the whole way", sec.h0, 540);
  ok("never on: no minutes", !sec.h6 && !sec.a0);
  w.UI.tab = "box"; w.render();
  var b = boxRows(w, 0);
  eq("box shows minutes", [b.row["Home 0"]("MIN"), b.row["Home 4"]("MIN"), b.row["Home 5"]("MIN")].join(" "), "9:00 3:00 6:00");
  ok("other team has no MIN column (not tracked)", boxRows(w, 1).head.indexOf("MIN") < 0);

  var w2 = newApp(), s2 = game(w2, 5);
  s2.clock = { len: 480000, left: 480000, since: null };   // clock never started
  w2.setOnCourt(s2, 0, ["h0", "h1"]);
  eq("clock never ran: minutes unknown", w2.secondsOnCourt(s2, 0), null);
  w2.UI.tab = "box"; w2.render();
  eq("shown as a dash, not 0:00", boxRows(w2, 0).row["Home 0"]("MIN"), "\u2014");
})();

// ---- paused clock: subs while stopped, and a clock that never ran ---------------------
(function() {
  // the clock runs 8:00 -> 5:00, is paused, a sub is made while it's stopped,
  // then it runs again to 2:00; only running time counts
  var w = newApp(), s = game(w, 6);
  s.clock = { len: 480000, left: 480000, since: null, ran: true };
  w.setOnCourt(s, 0, ["h0", "h1", "h2", "h3", "h4"]);
  s.clock.left = 300000;                                   // paused at 5:00
  ok("clock is stopped", !s.clock.since);
  w.setOnCourt(s, 0, ["h0", "h1", "h2", "h3", "h5"]);      // sub made during the pause
  eq("the sub is stamped at the paused time", w.lineupsFor(s, 0).slice(-1)[0].clk, 300000);
  s.clock.left = 120000;                                   // ran again to 2:00
  var sec = w.secondsOnCourt(s, 0);
  eq("subbed out at the pause: 3:00", sec.h4, 180);
  eq("subbed in at the pause: 3:00", sec.h5, 180);
  eq("on throughout: 6:00", sec.h0, 360);

  // several subs during one pause take no time from anyone
  var w2 = newApp(), s2 = game(w2, 6);
  s2.clock = { len: 480000, left: 480000, since: null, ran: true };
  w2.setOnCourt(s2, 0, ["h0", "h1"]);
  s2.clock.left = 400000;
  w2.setOnCourt(s2, 0, ["h0", "h2"]); w2.setOnCourt(s2, 0, ["h0", "h3"]); w2.setOnCourt(s2, 0, ["h0", "h1"]);
  s2.clock.left = 360000;
  var sec2 = w2.secondsOnCourt(s2, 0);
  eq("back on after a paused mix-up: 1:20 + 0:40", sec2.h1, 120);
  ok("on and off during the pause: no time", !sec2.h2 && !sec2.h3);

  // the clock never runs: no minutes, but plus/minus still counts
  var w3 = newApp(), s3 = game(w3, 5);
  s3.lineups = [{ id: "l1", t: 10, team: 0, on: ["h0", "h1"], period: "Q1", clk: 480000 }];
  s3.events.push({ id: "e1", t: 20, sid: s3.id, pid: "h0", key: "3P", v: 1, period: "Q1", team: 0 });
  s3.events.push({ id: "e2", t: 30, sid: s3.id, pid: "a1", key: "2P", v: 1, period: "Q1", team: 1 });
  s3.events.push({ id: "e3", t: 40, sid: s3.id, pid: "h1", key: "2P", v: 1, period: "Q1", team: 0 });
  eq("never ran: minutes unknown", w3.secondsOnCourt(s3, 0), null);
  var pm = w3.plusMinus(s3, 0);
  eq("never ran: +/- still counts (+3 -2 +2)", pm.h0, 3);
  eq("bench player unaffected", pm.h2, 0);
  w3.UI.tab = "box"; w3.render();
  var b = boxRows(w3, 0);
  eq("box: dash for MIN, number for +/-", b.row["Home 0"]("MIN") + " " + b.row["Home 0"]("+/-"), "\u2014 +3");
})();

// ---- plus/minus --------------------------------------------------------------------------
(function() {
  var w = newApp(), s = game(w, 6);
  s.lineups = [{ id: "l1", t: 10, team: 0, on: ["h0", "h1"], period: "Q1", clk: null },
               { id: "l2", t: 30, team: 0, on: ["h0", "h2"], period: "Q1", clk: null }];
  var n = 0;
  function add(t, pid, key, extra) {
    var e = { id: "e" + (++n), t: t, sid: s.id, pid: pid, key: key, v: 1, period: "Q1", team: pid[0] === "h" ? 0 : 1 };
    if (extra) Object.keys(extra).forEach(function(k) { e[k] = extra[k]; });
    s.events.push(e);
  }
  add(20, "h0", "2P"); add(25, "a0", "3P"); add(40, "h2", "3P");
  add(45, "a0", "2P", { miss: true }); add(50, "a1", "1P"); add(55, "h2", "DREB");
  var pm = w.plusMinus(s, 0);
  eq("on for everything: +2 -3 +3 -1", pm.h0, 1);
  eq("subbed out after +2 -3", pm.h1, -1);
  eq("subbed in for +3 -1", pm.h2, 2);
  eq("never on", pm.h3, 0);
  eq("untracked team has none", w.plusMinus(s, 1), null);
  w.UI.tab = "box"; w.render();
  var b = boxRows(w, 0);
  eq("box +/- column", ["Home 0", "Home 1", "Home 2", "Home 3"].map(function(k) { return b.row[k]("+/-"); }).join(" "), "+1 -1 +2 0");
  eq("columns added at the end", b.head.slice(-2).join(","), "MIN,+/-");
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
