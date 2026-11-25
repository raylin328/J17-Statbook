// v4.15 tests: opponents survive a CSV round trip. opponents.csv is read back (and is never mistaken
// for players.csv), and sessions.csv keeps which opponent team each side was, so old games find
// their opponents again. Older sessions.csv files (no opponent columns) link by team name.
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
  w.download = function() {};
  return w;
}
function pl(w, id, name, num) { return { id: id, name: name, num: num || "", active: true, cat: w.MISC_ID, aliases: [], desc: "", notes: "" }; }
function season(w) {
  w.S.players = [pl(w, "p1", "Riley Park", "4"), pl(w, "p2", "Dana Ortiz", "7")];
  var sides = w.gameSidesFromSetup({ names: ["Black", "White"], picks: [["p1", "p2"], []], opp: [null, { id: "", name: "Richmond Raiders U12" }] });
  w.startSession({ kind: "game", format: "quarters", periodMin: 8, teams: sides });
  var sess = w.activeSession();
  w.addOppByNumber(sess, 1, "12"); w.addOppByNumber(sess, 1, "33");
  var o12 = w.S.opponents.filter(function(o) { return o.num === "12"; })[0];
  o12.name = "Big Center"; o12.desc = "left-handed";
  w.UI.team = 1; w.UI.sel = o12.id; w.record("PTS2", 1, o12.id);
  w.UI.team = 0; w.record("PTS2", 1, "p1");
  return { sess: sess, o12: o12 };
}
function files(w) { return { players: w.playersCSV(), sessions: w.sessionsCSV(), events: w.eventsCSV(), stats: w.statsCSV(), opponents: w.opponentsCSV() }; }

(function() {
  var w = newApp();
  eq("version", w.APP_VERSION, "4.15");
  ok("tab title shows it", w.document.title === "J17 Stat Book 4.15", w.document.title);
})();

// ---- the files ---------------------------------------------------------------------------
var A = newApp(), made = season(A), F = files(A);
(function() {
  var head = F.sessions.split("\n")[0];
  ok("sessions.csv has the opponent team columns", /,team1_opp,team2_opp$/.test(head), head);
  var row = F.sessions.split("\n")[1];
  ok("and the game's row names the opponent team id", row.indexOf(A.S.oppTeams[0].id) > -1);
  eq("opponents.csv is recognised as opponents", A.csvKind(F.opponents), "opponents");
  eq("players.csv is still players", A.csvKind(F.players), "players");
})();

// ---- a clean device, rebuilt from the CSVs alone -------------------------------------------
(function() {
  var w = newApp();
  var r = w.importFromCSVs(F.players, F.sessions, F.events, F.stats, F.opponents);
  eq("roster: only our 2 players (opponents never join it)", w.S.players.length, 2);
  eq("opponents back", w.S.opponents.length, 2);
  eq("their team back with its id", w.S.oppTeams.length + ":" + w.S.oppTeams[0].id, "1:" + A.S.oppTeams[0].id);
  var o = w.S.opponents.filter(function(x) { return x.id === made.o12.id; })[0];
  ok("the same opponent id, number, name and description", o && o.num === "12" && o.name === "Big Center" && o.desc === "left-handed", JSON.stringify(o));
  var sess = w.S.sessions[0];
  eq("the game's side is linked to the opponent team again", sess.teams[1].opp, A.S.oppTeams[0].id);
  eq("their stat finds the player by name", w.player(made.o12.id) && w.player(made.o12.id).name, "Big Center");
  eq("counts reported", r.opponents + "/" + r.oppTeams, "2/1");
  w.S.activeId = sess.id; w.UI.tab = "box"; w.render();
  ok("the box score shows the opponent by name", /Big Center/.test(w.document.getElementById("view").textContent));
})();

// ---- importing through the file picker: every file at once ----------------------------------------
(function() {
  var w = newApp();
  var kinds = ["players", "sessions", "events", "stats", "opponents"].map(function(k) { return w.csvKind(F[k]); });
  eq("each file's kind", kinds.join(","), "players,sessions,events,stats,opponents");
})();

// ---- re-importing fills blanks, never overwrites -----------------------------------------------
(function() {
  var w = newApp();
  w.importFromCSVs(F.players, F.sessions, F.events, F.stats, F.opponents);
  var o = w.S.opponents.filter(function(x) { return x.id === made.o12.id; })[0];
  o.name = "Renamed here";
  var again = w.importFromCSVs("", "", "", "", F.opponents);
  eq("no duplicates on a second import", w.S.opponents.length, 2);
  eq("what you changed is kept", o.name, "Renamed here");
  eq("nothing new counted", again.opponents, 0);
})();

// ---- an older sessions.csv without the opponent columns -------------------------------------------
(function() {
  var w = newApp();
  var oldSessions = F.sessions.split("\n").map(function(l) { return l.split(",").slice(0, 14).join(","); }).join("\n");
  ok("(an old-style file)", !/team1_opp/.test(oldSessions));
  w.importFromCSVs(F.players, oldSessions, F.events, F.stats, F.opponents);
  eq("linked by the team name when every player on that side is an opponent", w.S.sessions[0].teams[1].opp, A.S.oppTeams[0].id);
  ok("our side stays ours", !w.S.sessions[0].teams[0].opp);
})();

// ---- sessions.csv without opponents.csv: the team is kept, players fill in later ---------------------
(function() {
  var w = newApp();
  w.importFromCSVs(F.players, F.sessions, F.events, F.stats);
  eq("the opponent team is made from the game's row", w.S.oppTeams.length + ":" + (w.S.oppTeams[0] && w.S.oppTeams[0].name), "1:Richmond Raiders U12");
  w.importFromCSVs("", "", "", "", F.opponents);
  eq("opponents.csv later joins the same team", w.S.oppTeams.length + ":" + w.S.opponents.filter(function(o){ return o.team === w.S.oppTeams[0].id; }).length, "1:2");
})();

console.log(pass + " pass, " + fail + " fail");
if (fail) { console.log(fail + " FAILING"); process.exit(1); }
