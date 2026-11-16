// v4.10 tests: opponent teams and players with permanent ids (kept apart from
// the roster), "new player wearing", merge, Team rows, the add-player panel
// (roster players keep their id; no more duplicates), and quick edit.
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
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function newApp() {
  var w = new JSDOM(fs.readFileSync(STATBOOK, "utf8"), { runScripts: "dangerously", url: "https://x.test/" }).window;
  w.__toasts = []; var t0 = w.toast; w.toast = function(m) { w.__toasts.push(m); return t0(m); };
  w.download = function() {};
  return w;
}
function pl(w, id, name, num) { return { id: id, name: name, num: num || "", active: true, cat: w.MISC_ID, aliases: [], desc: "", notes: "" }; }
function roster(w) {
  w.S.players = [pl(w, "p1", "Riley Park", "4"), pl(w, "p2", "Dana Ortiz", "7"), pl(w, "p3", "Casey Lin", "11"),
                 pl(w, "p4", "Late Arrival", "9"), pl(w, "p5", "Jo Moss", "0")];
}
function btn(root, text) {
  return Array.from(root.querySelectorAll("button")).filter(function(b) { return b.textContent.trim() === text; })[0];
}
function type(w, input, v) { input.value = v; input.dispatchEvent(new w.Event("input")); }
function oppGame(w, oppName, oppId) {
  var sides = w.gameSidesFromSetup({ names: ["Black", "White"], picks: [["p1", "p2"], []],
                                     opp: [null, { id: oppId || "", name: oppName || "" }] });
  w.startSession({ kind: "game", format: "quarters", periodMin: 8, teams: sides });
  return w.activeSession();
}

// ---- setup: a side can be an opponent team --------------------------------------------
(function() {
  var w = newApp(); roster(w);
  var c = { names: ["Black", "White"], picks: [["p1"], []], opp: [null, { id: "", name: "" }] };
  eq("an opponent side needs a team name", w.gameSidesFromSetup(c).error, "Name the opponent team");
  c.opp[1].name = "Richmond Raiders U12";
  var sides = w.gameSidesFromSetup(c);
  eq("opponent side starts empty", sides[1].playerIds.length, 0);
  eq("and is named after the team", sides[1].name, "Richmond Raiders U12");
  ok("and linked to it by id", UUID.test(sides[1].opp), sides[1].opp);
  eq("a J17 side still needs players", w.gameSidesFromSetup({ names: ["A", "B"], picks: [[], []], opp: [null, { id: sides[1].opp }] }).error,
     "Pick players for both teams");
  w.gameSidesFromSetup({ names: ["A", "B"], picks: [["p1"], []], opp: [null, { id: "", name: "richmond raiders u12" }] });
  eq("the same name again is the same team", w.S.oppTeams.length, 1);
  w.UI.setup = { kind: "game", title: "", format: "quarters", periodMin: 8, names: ["Black", "White"], picks: [[], []], opp: [null, null], pracIds: [] };
  w.UI.tab = "session"; w.S.activeId = null; w.render();   // setup shows on the Session tab when no session is open
  eq("setup offers the choice on both sides", Array.from(w.document.querySelectorAll(".chip")).filter(function(b) { return b.textContent === "Opponent team"; }).length, 2);
})();

// ---- opponents by jersey number, and the same kid across games --------------------------
var shared = (function() {
  var w = newApp(); roster(w);
  var s1 = oppGame(w, "Richmond Raiders U12");
  var r = w.addOppByNumber(s1, 1, "33");
  ok("#33 created", r.ok && UUID.test(r.player.id), JSON.stringify(r));
  eq("shown by number", w.pname(r.player.id), "#33");
  eq("typing 33 again doesn't duplicate", w.addOppByNumber(s1, 1, "#33").msg, "#33 is already in");
  ok("a number over 99 is refused", !w.addOppByNumber(s1, 1, "107").ok);
  var z = w.addOppByNumber(s1, 1, "0").player, zz = w.addOppByNumber(s1, 1, "00").player;
  ok("0 and 00 are different players", z.id !== zz.id);
  w.UI.team = 1; w.render();
  var bar = w.document.querySelector(".oppbar");
  ok("the opponent side shows the number box", !!bar);
  type(w, bar.querySelector("input.oppnum"), "12"); btn(bar, "Add").click();
  var p12 = w.S.opponents.filter(function(p) { return p.num === "12"; })[0];
  ok("added from the screen", !!p12 && s1.teams[1].playerIds.indexOf(p12.id) > -1);
  s1.events.push({ id: "e1", t: 1, sid: s1.id, pid: r.player.id, key: "2P", v: 1, period: "Q1", team: 1 });
  eq("their points count for their side", w.teamScore(s1, 1), 2);

  var s2 = oppGame(w, "", w.S.oppTeams[0].id);
  eq("a second game against them starts empty", s2.teams[1].playerIds.length, 0);
  w.UI.team = 1; w.render();
  var known = Array.from(w.document.querySelectorAll(".oppbar .chip")).map(function(b) { return b.textContent; });
  ok("players from the last game are offered", known.indexOf("+ #33") > -1 && known.indexOf("+ #12") > -1, known.join(" "));
  btn(w.document.querySelector(".oppbar"), "+ #33").click();
  ok("tapping one brings back the same id", s2.teams[1].playerIds.indexOf(r.player.id) > -1);
  eq("typing a known number finds the same kid", w.addOppByNumber(s2, 1, "12").player.id, p12.id);
  return { w: w, s1: s1, s2: s2, p33: r.player, p12: p12 };
})();

// ---- kept apart from the roster -------------------------------------------------------
(function() {
  var w = shared.w;
  ok("no opponent in the roster", w.S.players.every(function(p) { return !p.team; }) && w.S.players.length === 5);
  ok("not in the roster export", w.playersCSV().indexOf(shared.p33.id) < 0);
  shared.p33.name = "Sam Brooks";
  w.importPlayersCSV("name\nSam Brooks");
  eq("a roster import with the same name makes a roster player", w.importPlayersCSV.report.added, 1);
  eq("and leaves the opponent alone", w.player(shared.p33.id).team, w.S.oppTeams[0].id);
  w.confirm = function() { return true; }; w.UI.clearing = { backedUp: true };
  w.deleteAllPlayers();
  ok("Clear all players keeps opponents", w.S.players.length === 0 && w.S.opponents.length >= 4);
})();

// ---- a different kid in an old number; merging two ids -------------------------------
(function() {
  var w = newApp(); roster(w);
  var s1 = oppGame(w, "Burnaby Hawks U12");
  var old = w.addOppByNumber(s1, 1, "33").player;
  s1.events.push({ id: "a1", t: 1, sid: s1.id, pid: old.id, key: "2P", v: 1, period: "Q1", team: 1 });
  var s2 = oppGame(w, "", w.S.oppTeams[0].id);
  w.addOppByNumber(s2, 1, "33");
  s2.events.push({ id: "b1", t: 2, sid: s2.id, pid: old.id, key: "3P", v: 1, period: "Q1", team: 1 });
  var r = w.newOppInNumber(s2, 1, "33");
  ok("a new id for today's #33", r.ok && r.player.id !== old.id);
  eq("today's stats move to the new kid", s2.events[0].pid, r.player.id);
  eq("last game's stay with the old one", s1.events[0].pid, old.id);
  ok("the old one is kept, marked earlier", w.player(old.id).retired === true);
  var s3 = oppGame(w, "", w.S.oppTeams[0].id);
  eq("next game, 33 means the new kid", w.addOppByNumber(s3, 1, "33").player.id, r.player.id);

  var three = w.addOppByNumber(s3, 1, "3").player;
  three.name = "Kit Rowe";
  s3.events.push({ id: "c1", t: 3, sid: s3.id, pid: three.id, key: "2P", v: 1, period: "Q1", team: 1 });
  ok("merge", w.mergeOpponents(three.id, r.player.id));
  eq("stats follow the merge", s3.events[0].pid, r.player.id);
  ok("the merged id is gone", !w.player(three.id));
  eq("its name carries over", w.player(r.player.id).name, "Kit Rowe");
  eq("no duplicate in the game", s3.teams[1].playerIds.filter(function(x) { return x === r.player.id; }).length, 1);
  ok("only opponents merge", !w.mergeOpponents("p1", r.player.id));

  w.UI.tab = "players"; w.render();
  var card = w.document.querySelector(".oppcard");
  ok("an Opponents card on the Players tab", !!card && /Burnaby Hawks U12/.test(card.innerHTML));
  var sel = card.querySelector("select");
  var drop = w.S.opponents.filter(function(p) { return p.retired; })[0];
  var rowSel = Array.from(card.querySelectorAll(".opprow")).filter(function(rw) { return /earlier/.test(rw.textContent); })[0].querySelector("select");
  w.confirm = function() { return true; };
  rowSel.value = r.player.id; rowSel.dispatchEvent(new w.Event("change"));
  ok("merged from the card too", !w.player(drop.id) && s1.events[0].pid === r.player.id);
  var tn = w.document.querySelector(".oppcard input.oppteam");
  tn.value = "Burnaby Hawks U13"; tn.dispatchEvent(new w.Event("change"));
  eq("renaming the team renames it in past games", s1.teams[1].name, "Burnaby Hawks U13");
  var csv = w.opponentsCSV();
  ok("opponents CSV", /^id,team_id,team,jersey,name,description,retired/.test(csv) && /Burnaby Hawks U13,33,Kit Rowe/.test(csv), csv.split("\n")[1]);
  w.__toasts = []; w.exportAllCSVs();
  ok("included when you save all CSVs", /Saving 7 files/.test(w.__toasts.join(" ")), w.__toasts.join(" | "));
})();

// ---- Team rows ------------------------------------------------------------------------
(function() {
  var w = newApp(); roster(w);
  var s = oppGame(w, "Surrey Stars U12");
  w.UI.team = 1; w.render();
  btn(w.document, "+ Team row").click();
  ok("Team row added to the opponent side", s.teams[1].playerIds.indexOf(w.TEAM_ROWS[1]) > -1);
  eq("it's called Team", w.pname(w.TEAM_ROWS[1]), "Team");
  ok("button goes once it's there", !btn(w.document, "+ Team row"));
  w.UI.team = 0; w.render(); btn(w.document, "+ Team row").click();
  ok("our side can have one too", s.teams[0].playerIds.indexOf(w.TEAM_ROWS[0]) > -1);
  ok("never in the roster", w.S.players.every(function(p) { return !p.teamRow; }));
  s.events.push({ id: "t1", t: 5, sid: s.id, pid: w.TEAM_ROWS[1], key: "DREB", v: 1, period: "Q1", team: 1 });
  eq("a Team rebound ends our possession", w.possessionsFor(s, 0), 1);
  w.UI.subs = true; w.render();
  ok("Team isn't offered for the lineup", !/Team/.test(w.document.querySelector(".lineup .chips").textContent));
})();

// ---- adding players mid-game and mid-practice -----------------------------------------
(function() {
  var w = newApp(); roster(w);
  w.startSession({ kind: "game", format: "quarters", periodMin: 8,
                   teams: [{ name: "Black", playerIds: ["p1", "p2"] }, { name: "White", playerIds: ["p3"] }] });
  var s = w.activeSession(); w.UI.team = 0; w.render();
  ok("J17 vs J17: no opponent box", !w.document.querySelector(".oppbar"));
  var prompts = 0; w.prompt = function() { prompts++; return null; };
  btn(w.document, "+ Add player to Black").click();
  eq("the button stays on the game and opens the panel", w.UI.tab === "session" && !!w.document.querySelector(".addpanel"), true);
  var names = Array.from(w.document.querySelectorAll(".addres .chip")).map(function(b) { return b.textContent; });
  ok("roster players not in the game are offered", names.indexOf("+ #9 Late Arrival") > -1 && names.indexOf("+ #0 Jo Moss") > -1, names.join(" | "));
  ok("not players already here or on the other side", names.every(function(n) { return !/Riley|Casey/.test(n); }));
  type(w, w.document.querySelector('.addpanel input[aria-label="Search your players"]'), "late");
  names = Array.from(w.document.querySelectorAll(".addres .chip")).map(function(b) { return b.textContent; });
  eq("search narrows it", names.join(","), "+ #9 Late Arrival");
  btn(w.document.querySelector(".addres"), "+ #9 Late Arrival").click();
  ok("the late arrival joins with their own id", s.teams[0].playerIds.indexOf("p4") > -1);
  eq("no duplicate player made", w.S.players.length, 5);

  var dock = w.document.querySelector(".dock");
  btn(dock, "+ Player").click();
  eq("the dock's + Player opens the same panel, no popup", !!w.document.querySelector(".addpanel") && prompts === 0, true);
  var panel = w.document.querySelector(".addpanel");
  type(w, panel.querySelector('input[aria-label="New player\'s name"]'), "New Kid");
  type(w, panel.querySelector('input[aria-label="Jersey number"]'), "15");
  var cat = w.S.categories.filter(function(x) { return x.name === "U14 Rep"; })[0];
  var sel = panel.querySelector('select[aria-label="Category"]'); sel.value = cat.id; sel.dispatchEvent(new w.Event("change"));
  btn(panel, "Add new player").click();
  var nk = w.S.players.filter(function(p) { return p.name === "New Kid"; })[0];
  ok("a new player with jersey and category in one go", nk && nk.num === "15" && nk.cat === cat.id && s.teams[0].playerIds.indexOf(nk.id) > -1);

  btn(w.document.querySelector(".dock"), "+ Player").click();
  panel = w.document.querySelector(".addpanel");
  type(w, panel.querySelector('input[aria-label="New player\'s name"]'), "jo moss");
  btn(panel, "Add new player").click();
  ok("a name already in the roster gets a warning first", /already in your roster/.test(w.document.querySelector(".addpanel").textContent) && w.S.players.length === 6);
  btn(w.document.querySelector(".addpanel"), "Add new player").click();
  eq("and can still be added if it's a different kid", w.S.players.length, 7);

  var w2 = newApp(); roster(w2);
  w2.startSession({ kind: "practice", title: "T", playerIds: ["p1"] }); w2.render();
  btn(w2.document.querySelector(".dock"), "+ Player").click();
  eq("practice gets the panel too", /Add a player to this practice/.test(w2.document.querySelector(".addpanel").textContent), true);
  btn(w2.document.querySelector(".addres"), "+ #7 Dana Ortiz").click();
  ok("and adds roster players to the practice", w2.activeSession().playerIds.indexOf("p2") > -1);
})();

// ---- quick edit ----------------------------------------------------------------------------
(function() {
  var w = newApp(); roster(w);
  var s = oppGame(w, "Delta Dragons U12");
  s.events.push({ id: "q1", t: 1, sid: s.id, pid: "p1", key: "2P", v: 1, period: "Q1", team: 0 });
  w.UI.team = 0; w.render();
  w.document.querySelectorAll(".tapgrid td.nmcell")[1].click();
  var ep = w.document.querySelector(".editpanel");
  ok("tapping a name opens edit", !!ep && /Edit #7 Dana Ortiz/.test(ep.textContent));
  type(w, ep.querySelector('input[aria-label="Jersey (optional)"]'), "abc");
  btn(ep, "Save").click();
  eq("a bad jersey isn't saved", w.player("p2").num, "7");
  ep = w.document.querySelector(".editpanel");
  type(w, ep.querySelector('input[aria-label="Jersey (optional)"]'), "22");
  type(w, ep.querySelector('input[aria-label="Name"]'), "Dana Ortiz-Lee");
  btn(ep, "Save").click();
  ok("edits saved to the player", w.player("p2").num === "22" && w.player("p2").name === "Dana Ortiz-Lee");
  w.document.querySelectorAll(".tapgrid td.nmcell")[1].click();
  ok("no stats yet: can be taken out of the session", !!btn(w.document.querySelector(".editpanel"), "Take out of this session"));
  btn(w.document.querySelector(".editpanel"), "Take out of this session").click();
  ok("taken out", s.teams[0].playerIds.indexOf("p2") < 0 && !!w.player("p2"));
  w.render(); w.document.querySelectorAll(".tapgrid td.nmcell")[0].click();
  ok("with stats: can't be taken out", !btn(w.document.querySelector(".editpanel"), "Take out of this session"));

  var o = w.addOppByNumber(s, 1, "5").player;
  w.UI.team = 1; w.UI.editing = null; w.render();
  w.document.querySelectorAll(".tapgrid td.nmcell")[0].click();
  ep = w.document.querySelector(".editpanel");
  eq("an opponent's number is fixed; name and descriptor only", ep.querySelectorAll("input").length, 2);
  type(w, ep.querySelector('input[aria-label="Name (optional)"]'), "Tall lefty");
  btn(ep, "Save").click();
  eq("opponent named", w.player(o.id).name, "Tall lefty");

  w.S.prefs.gameView = "tiles"; w.UI.team = 0; w.UI.sel = "p1"; w.render();
  btn(w.document, "Edit").click();
  ok("tiles: Edit beside Clear", /Edit #4 Riley Park/.test(w.document.querySelector(".editpanel").textContent));
})();

// ---- data from 4.9 opens ------------------------------------------------------------------
(function() {
  var w = newApp(); roster(w);
  var d = JSON.parse(JSON.stringify(w.S)); delete d.oppTeams; delete d.opponents;
  var w2 = newApp(); w2.localStorage.setItem(w2.KEY, JSON.stringify(d)); w2.load();
  ok("older data gets empty opponent lists", Array.isArray(w2.S.oppTeams) && Array.isArray(w2.S.opponents));
  eq("its roster is untouched", w2.S.players.length, 5);
})();

console.log(pass + " pass, " + fail + " fail");
if (!fail) console.log("all green");
process.exit(fail ? 1 : 0);
