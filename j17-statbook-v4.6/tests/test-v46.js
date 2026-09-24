// v4.6: player categories, smart players import, input checks, delete all players.
// Fictional players only.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");
const v45 = fs.readFileSync(path.join(__dirname, "fixtures", "j17-statbook-v4_5.html"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEY = "j17.statbook.v2";
const MISC = "00000000-0000-4000-8000-000000000000";
const U14REP = "00000000-0000-4000-8000-000000001402";
const UUIDV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function boot(state, src) {
  const dom = new JSDOM(src || html, { runScripts: "dangerously", url: "https://x.test/",
    beforeParse(w) {
      if (state !== null) w.localStorage.setItem(KEY, typeof state === "string" ? state
        : JSON.stringify(state || { v: 3, prefs: {}, players: [], stats: null, sessions: [], activeId: null }));
      const make = w.document.createElement.bind(w.document);
      w.__inputs = [];
      w.document.createElement = function (tag) {
        const e = make(tag);
        if (String(tag).toLowerCase() === "input") { w.__inputs.push(e); e.click = function () {}; }
        return e;
      };
      w.__confirms = []; w.__confirmAnswer = true;
      w.confirm = m => { w.__confirms.push(m); return w.__confirmAnswer; };
      w.__prompts = []; w.__promptAnswer = null;
      w.prompt = m => { w.__prompts.push(m); return w.__promptAnswer; };
    } });
  const w = dom.window, d = w.document;
  const A = { w, d, ev: x => w.eval(x),
    $: s => d.querySelector(s), $$: s => Array.from(d.querySelectorAll(s)),
    click(e) { e.dispatchEvent(new w.Event("click", { bubbles: true })); },
    change(e, v) { e.value = v; e.dispatchEvent(new w.Event("change", { bubbles: true })); },
    type(e, v) { e.value = v; e.dispatchEvent(new w.Event("input", { bubbles: true })); },
    btn(t) { return A.$$("button").find(b => b.textContent.trim().startsWith(t)); },
    view() { return d.getElementById("view").textContent; },
    toast() { const t = d.querySelector(".toast"); return t ? t.textContent : ""; },
    lastInput() { return w.__inputs[w.__inputs.length - 1]; },
    async pick(content, name) {
      A.click(A.btn("Import players CSV"));
      const input = A.lastInput();
      Object.defineProperty(input, "files", { value: [new w.File([content], name, { type: "" })], configurable: true });
      input.onchange();
      await sleep(60);
    },
    saved() { return JSON.parse(w.localStorage.getItem(KEY)); } };
  A.downloads = [];
  w.download = (name, text) => A.downloads.push({ name, text });
  return A;
}
const P = (id, name, extra) => Object.assign({ id, name, desc: "", aliases: [], num: "", notes: "", active: true }, extra || {});

(async () => {
  console.log("-- existing data gains categories (no schema bump)");
  {
    const A = boot({ v: 3, prefs: {}, players: [P("p1", "Riley Park"), P("p2", "Dana Ortiz", { num: "00" })], stats: null, sessions: [], activeId: null });
    ok("schema stays at 3", A.ev("S.v") === 3);
    ok("Miscellaneous exists with its fixed id", A.ev("catById('" + MISC + "').name") === "Miscellaneous");
    ok("standard categories seeded with fixed ids", A.ev("catById('" + U14REP + "').name") === "U14 Rep" && A.ev("S.categories.length") === 9);
    ok("every existing player is in Miscellaneous", A.ev("S.players.every(p => p.cat === '" + MISC + "')"));
    ok("jersey 00 untouched", A.ev("player('p2').num") === "00");
    A.ev("save()");
    const B = boot(JSON.stringify(A.saved()));
    ok("loading again changes nothing (idempotent)", B.ev("S.categories.length") === 9 && B.ev("S.categories.filter(c => c.misc).length") === 1);
    const C = boot({ v: 3, prefs: {}, players: [P("p1", "X", { cat: "gone-category" })], stats: null, sessions: [], activeId: null, categories: [] });
    ok("a player pointing at a missing category lands in Miscellaneous", C.ev("player('p1').cat") === MISC && !!C.ev("catById('" + MISC + "')"));
  }

  console.log("\n-- older builds share this browser's storage and must keep working");
  {
    const A = boot();
    A.ev("importPlayersCSV('name,category\\nRiley Park,U14 Rep\\nDana Ortiz,Team 1'); save();");
    const old = boot(JSON.stringify(A.saved()), v45);
    ok("v4.5 opens v4.6 data (no 'newer version' refusal)", !/newer version/.test(old.view()));
    ok("v4.5 sees the same players", old.ev("S.players.length") === 2);
    old.ev("S.players[0].num = '5'; S.players.push({id:'p9',name:'Ari Kim',desc:'',aliases:[],num:'',notes:'',active:true}); save();");
    const back = boot(JSON.stringify(old.saved()));
    ok("categories survive a round trip through v4.5", back.ev("catName(catOf(S.players[0]))") === "U14 Rep" && back.ev("catName(catOf(S.players[1]))") === "Team 1");
    ok("v4.5's edit is kept", back.ev("S.players[0].num") === "5");
    ok("a player v4.5 added is in Miscellaneous", back.ev("catOf(player('p9'))") === MISC);
  }

  console.log("\n-- import: ids, names, categories");
  {
    const A = boot();
    ok("a name-only file is a players file", A.ev("csvKind('Name\\nRiley Park')") === "players");
    ok("id + jersey (no name) is a players file", A.ev("csvKind('id,jersey number\\nx,4')") === "players");
    ok("a sectioned sheet (id, Team 1) is not", A.ev("csvKind('id,Team 1\\nabc,Riley')") === null);
    const n = A.ev("importPlayersCSV('Player Name,Jersey #,Age Group\\nRiley Park,23,u14 rep\\nDana Ortiz,#7,U14-REP\\nCasey Lin,,Team 1\\nAri Kim,4,team 1\\nSam Lee,,\\nJo Moss,,Misc')");
    const r = A.ev("importPlayersCSV.report");
    ok("6 players added from a file with no ids", n === 6 && r.added === 6);
    ok("each got a fresh UUID v4", A.ev("S.players.map(p => p.id)").every(x => UUIDV4.test(x)) && r.idsMade === 6);
    ok("'u14 rep' and 'U14-REP' both match U14 Rep", A.ev("S.players.filter(p => p.cat === '" + U14REP + "').length") === 2);
    ok("unknown 'Team 1' created once, 'team 1' matched it", r.catsMade.join() === "Team 1" && A.ev("S.players.filter(p => catName(p.cat) === 'Team 1').length") === 2);
    ok("blank and 'Misc' both mean Miscellaneous", A.ev("catOf(S.players[4])") === MISC && A.ev("catOf(S.players[5])") === MISC && r.toMisc === 1);
    ok("'#7' stored as 7", A.ev("S.players[1].num") === "7");

    const again = A.ev("importPlayersCSV('name,jersey number,category\\nRiley Park,99,U12 Rep\\nSam Lee,12,U16 Rep\\nJo Moss,,U14 Rep')");
    const r2 = A.ev("importPlayersCSV.report");
    ok("re-import by name adds nobody", again === 0 && A.ev("S.players.length") === 6);
    ok("a blank jersey is filled; a set one is kept", A.ev("S.players[4].num") === "12" && A.ev("S.players[0].num") === "23");
    ok("Miscellaneous counts as blank: Sam and Jo get sorted", A.ev("catName(catOf(S.players[4]))") === "U16 Rep" && A.ev("catOf(S.players[5])") === U14REP);
    ok("a category set in the app is kept", A.ev("catOf(S.players[0])") === U14REP);
    ok("kept values are counted", r2.kept === 2 && r2.updated === 2, JSON.stringify(r2));

    const id0 = A.ev("S.players[2].id");
    A.ev("importPlayersCSV(" + JSON.stringify("id,jersey number\n" + id0.toUpperCase() + ",31") + ")");
    ok("bulk jersey update by id, even with the UUID in capitals", A.ev("S.players[2].num") === "31" && A.ev("S.players.length") === 6);
  }

  console.log("\n-- import: every row checked");
  {
    const A = boot({ v: 3, prefs: {}, players: [P("s1", "Sam Lee"), P("s2", "Sam Lee")], stats: null, sessions: [], activeId: null });
    const csv = [
      "id,name,jersey number,aliases,notes",
      ",  Jo   Moss  ,00,,",
      ",Ri\u200Bley\u202E Park,07,Ri; ri; =cmd,",
      ",Kate O'Brien,TBD,,",
      ",Lee Ng,123,,",
      ",Ada Hale,NULL,,",
      ",=HYPERLINK(\"http://x\"),5,,",
      ",-Dash,,,",
      "bad id!,Tom Fox,,,",
      "p77,Legacy Id,,,",
      "3f2a9c1e-0000-4000-8000-00000000abcd,,,,",
      ",,9,,",
      ",Sam Lee,4,,",
      ",Kate O'Brien,,,",
      "," + "X".repeat(81) + ",,,",
      ",Max Rae,,,\"line one\nline two\""
    ].join("\n");
    A.ev("importPlayersCSV(" + JSON.stringify(csv) + ")");
    const r = A.ev("importPlayersCSV.report");
    const names = A.ev("S.players.map(p => p.name)");
    ok("spaces trimmed and collapsed", names.includes("Jo Moss"));
    ok("invisible and direction-flipping characters removed", names.includes("Riley Park"));
    ok("apostrophes are fine", names.includes("Kate O'Brien"));
    ok("00 and 07 kept as typed", A.ev("S.players.find(p => p.name === 'Jo Moss').num") === "00" && A.ev("S.players.find(p => p.name === 'Riley Park').num") === "07");
    ok("'TBD' and '123' imported with the jersey left blank + a warning",
       A.ev("S.players.find(p => p.name === 'Lee Ng').num") === "" && r.warnings.filter(x => /isn't a number from 0 to 99/.test(x)).length === 2);
    ok("'NULL' is a blank jersey, silently", A.ev("S.players.find(p => p.name === 'Ada Hale').num") === "" && !r.warnings.some(x => /Ada Hale/.test(x)));
    ok("formula-looking names are refused", !names.some(x => /HYPERLINK|Dash/.test(x)) && r.errors.filter(x => /formulas/.test(x)).length === 2);
    ok("an id with spaces/punctuation is refused", !names.includes("Tom Fox") && r.errors.some(x => /Row 9 .*can't be used/.test(x)));
    ok("an older short id is still accepted", A.ev("player('p77').name") === "Legacy Id");
    ok("an unused template row (id only) is skipped quietly", !r.errors.some(x => /Row 11/.test(x)) && !A.ev("player('3f2a9c1e-0000-4000-8000-00000000abcd')"));
    ok("a new row with no name is refused", r.errors.some(x => /Row 12 .*no name/.test(x)));
    ok("an ambiguous name is refused, nothing guessed", r.errors.some(x => /2 players already have this name/.test(x)) && A.ev("S.players.filter(p => p.num === '4').length") === 0);
    ok("same name twice in one file: one player, with a warning", A.ev("S.players.filter(p => p.name === \"Kate O'Brien\").length") === 1 && r.warnings.some(x => /same name as row 4/.test(x)));
    ok("names over 80 characters are refused", r.errors.some(x => /longer than 80/.test(x)));
    ok("a formula alias is dropped, duplicates collapse", A.ev("S.players.find(p => p.name === 'Riley Park').aliases.join('|')") === "Ri" && r.warnings.some(x => /skipped alias =cmd/.test(x)));
    ok("multi-line notes survive", A.ev("S.players.find(p => p.name === 'Max Rae').notes") === "line one\nline two");
  }

  console.log("\n-- import through the Players tab");
  {
    const A = boot();
    A.ev("UI.tab='players'; render();");
    await A.pick("id,Team 1\nd4f3c9a2-1111-4222-8333-444455556666,Riley Park\n\n,Team 2\n", "roster - Sheet1.csv");
    ok("a sectioned sheet is refused with the fix spelled out", A.ev("S.players.length") === 0 &&
       /no name column \(first row: id, Team 1\).*column headed name.*column headed category/.test(A.$(".note.warn").textContent), A.$(".note") && A.$(".note").textContent);
    await A.pick("name,category\nRiley Park,U14 Rep\n=bad,U14 Rep\nDana Ortiz,", "players.csv");
    ok("toast still reads 'N players imported'", /^2 players imported/.test(A.toast()) && /1 skipped/.test(A.toast()), A.toast());
    const note = A.$(".note.warn").textContent;
    ok("report: counts, new ids, Miscellaneous, and the bad row", /2 added, 1 skipped/.test(note) && /Made ids for 2 new players/.test(note) &&
       /1 had no category/.test(note) && /Row 3 \(=bad\)/.test(note), note);
    ok("the report is a note, so the add form is still the first card", A.$(".card").textContent.indexOf("Add a player") > -1);
    A.click(A.btn("Dismiss"));
    ok("Dismiss clears it", !A.$(".note.warn") && A.ev("UI.importReport") === null);
  }

  console.log("\n-- markup in names or stat labels is shown as text");
  {
    const A = boot();
    A.ev("importPlayersCSV(" + JSON.stringify('name,aliases,category\n"<img src=x onerror=window.__pwned=1>",<b>b</b>,"<i>Cat</i>"\nDana Ortiz,,') + ")");
    A.ev("importStatsCSV('key,label,short,type,scope,tally\\nZZ,<u>Z</u>,<img src=y onerror=window.__pwned=2>,integer,game,true')");
    const ids = A.ev("S.players.map(p => p.id)");
    A.ev("startSession({kind:'game', format:'quarters', teams:[{name:'<b>Black</b>',playerIds:['" + ids[0] + "']},{name:'White',playerIds:['" + ids[1] + "']}]});");
    A.ev("record('2P', undefined, '" + ids[0] + "', {x:0.5, y:0.5}); record('ZZ', undefined, '" + ids[0] + "');");
    // the app draws its own <b> name cells, so look for what only a parsed payload could create
    const injected = () => A.$$("img").length + A.$$("b, i, u").filter(e => ["b", "Cat", "Z", "Black"].includes(e.textContent)).length;
    let total = 0;
    ["session", "box", "log", "sessions", "players", "stats", "card"].forEach(tab => {
      A.ev("UI.tab='" + tab + "'; UI.card='" + ids[0] + "'; render();");
      total += injected();
    });
    ok("no element injected on any tab", total === 0, total);
    ok("no script ran", A.w.__pwned === undefined);
    A.ev("UI.tab='card'; render();");
    ok("report card list shows the name as typed", A.$("#view select option").textContent === "<img src=x onerror=window.__pwned=1>");
    A.ev("UI.tab='box'; render();");
    ok("box score header shows the stat label as typed", A.$$("#view th").some(t => t.textContent === "<img src=y onerror=window.__pwned=2>"));
    ok("the category keeps its literal name", A.ev("catName(catOf(S.players[0]))") === "<i>Cat</i>");
  }

  console.log("\n-- Players tab");
  {
    const A = boot();
    A.ev("importPlayersCSV('name,jersey number,category\\nRiley Park,4,U14 Rep\\nDana Ortiz,5,U14 Rep\\nCasey Lin,6,U12 Rep\\nAri Kim,,'); UI.tab='players'; render();");
    const chips = A.$$("#view > .chips .chip").map(c => c.textContent);
    ok("filter chips: All and each category in use, with counts", chips.join("|") === "All4|U12 Rep1|U14 Rep2|Miscellaneous1", chips.join("|"));
    ok("players are grouped under category headings", A.$$("#view h3").map(h => h.firstChild.textContent).join("|") === "U12 Rep|U14 Rep|Miscellaneous");
    ok("a note points at the one player in Miscellaneous", /1 player is in Miscellaneous/.test(A.view()));
    A.click(A.$$("#view > .chips .chip").find(c => c.textContent.startsWith("U14 Rep")));
    ok("filtering shows just that category", A.$$("#view .card input[aria-label=Name]").map(i => i.value).join() === "Riley Park,Dana Ortiz");
    const addSel = A.$(".card select");
    ok("the add form defaults to the filtered category", addSel.value === U14REP);
    A.click(A.btn("All"));

    const card = name => A.$$("#view .card").find(c => Array.from(c.querySelectorAll("input")).some(i => i.value === name));
    A.change(card("Ari Kim").querySelector("select"), U14REP);
    ok("a player moves with the category menu (and it's saved)", A.saved().players.find(p => p.name === "Ari Kim").cat === U14REP);
    A.w.__promptAnswer = "Travel Team";
    A.change(card("Casey Lin").querySelector("select"), "__new");
    ok("'+ New category…' creates one and moves the player", A.ev("catName(catOf(S.players[2]))") === "Travel Team");

    A.type(card("Riley Park").querySelector("input[placeholder='Jersey number']"), "4a");
    A.change(card("Riley Park").querySelector("input[placeholder='Jersey number']"), "4a");
    ok("an invalid jersey edit is refused and reverted", A.ev("S.players[0].num") === "4" && /0.99/.test(A.toast()), A.toast());
    const nm = card("Riley Park").querySelector("input[aria-label=Name]");
    A.type(nm, "@Riley"); A.change(nm, "@Riley");
    ok("a formula-looking name edit is refused", A.ev("S.players[0].name") === "Riley Park");

    const form = A.$(".card");
    const field = ph => Array.from(form.querySelectorAll("input")).find(i => i.placeholder.startsWith(ph));
    A.type(field("Name"), "Lee Ng"); A.type(field("Jersey"), "123");
    A.click(A.btn("Add player"));
    ok("the add form refuses jersey 123", A.ev("S.players.length") === 4 && /0.99/.test(A.toast()));
    A.type(field("Jersey"), "00"); A.change(A.$(".card select"), U14REP);
    A.click(A.btn("Add player"));
    ok("...and adds with 00 into the chosen category", A.ev("S.players[4].num") === "00" && A.ev("S.players[4].cat") === U14REP && /added to U14 Rep/.test(A.toast()));
  }

  console.log("\n-- managing categories");
  {
    const A = boot();
    A.ev("importPlayersCSV('name,category\\nRiley Park,Team 1\\nDana Ortiz,Team 1\\nCasey Lin,U14 Rep'); UI.tab='players'; render();");
    const row = n => A.$$(".catrow").find(r => r.querySelector(".cnt").textContent === n);
    ok("Miscellaneous can't be renamed or removed", row("Miscellaneous").querySelectorAll("button").length === 0);
    A.w.__promptAnswer = "u14 rep";
    A.click(row("Team 1").querySelector("button"));
    ok("renaming to an existing name is refused", /already exists/.test(A.toast()) && !!row("Team 1"));
    A.w.__promptAnswer = "Team Black";
    A.click(row("Team 1").querySelector("button"));
    ok("rename keeps its players", A.ev("S.players.filter(p => catName(p.cat) === 'Team Black').length") === 2);
    A.click(row("Team Black").querySelector("button.danger"));
    ok("remove asks first and says where players go", /Its 2 players will move to Miscellaneous/.test(A.w.__confirms.pop()));
    ok("removed: its players are in Miscellaneous", A.ev("S.players.filter(p => p.cat === '" + MISC + "').length") === 2 && !row("Team Black"));
    A.w.__promptAnswer = "=evil";
    A.click(A.btn("+ New category"));
    ok("category names get the same checks", /formulas/.test(A.toast()));
  }

  console.log("\n-- session picker: one tap per category");
  {
    const A = boot();
    A.ev("importPlayersCSV('name,jersey number,category\\nRiley Park,4,U14 Rep\\nDana Ortiz,5,U14 Rep\\nCasey Lin,6,U14 Rep\\nAri Kim,7,U12 Rep\\nJo Moss,,')");
    A.ev("S.players[2].active = false; S.activeId = null; UI.setup = null; UI.tab='session'; render();");
    const cards = A.$$("#view .card");
    const cat = (c, n) => Array.from(c.querySelectorAll(".chip.grp")).find(x => x.textContent.indexOf(n) > -1);
    ok("category buttons appear once categories are in use", cat(cards[0], "U14 Rep") && cat(cards[0], "U12 Rep") && cat(cards[0], "Miscellaneous"));
    A.click(cat(cards[0], "U14 Rep"));
    ok("one tap adds the active members", A.ev("UI.setup.picks[0].length") === 2 && /Added 2 from U14 Rep/.test(A.toast()));
    ok("the button shows it's all in", cat(cards[0], "U14 Rep").getAttribute("aria-pressed") === "true");
    A.click(cat(cards[1], "U14 Rep"));
    ok("the other team can't take them", A.ev("UI.setup.picks[1].length") === 0 && /on the other team/.test(A.toast()));
    A.click(cat(cards[0], "U14 Rep"));
    ok("tapping again takes them back out", A.ev("UI.setup.picks[0].length") === 0);
    ok("players are listed under their category", Array.from(cards[0].querySelectorAll(".grphead")).map(h => h.textContent).join("|") === "U12 Rep|U14 Rep|Miscellaneous");
    const chipIn = (c, n) => Array.from(c.querySelectorAll(".chip:not(.grp)")).find(x => x.textContent.indexOf(n) > -1);
    A.click(chipIn(cards[0], "Riley Park"));
    A.click(chipIn(cards[1], "Riley Park"));
    ok("a player can't be on both teams (bug in v4.5)", A.ev("UI.setup.picks[0].length") === 1 && A.ev("UI.setup.picks[1].length") === 0);
    ok("...and the other team's list shows them as taken", chipIn(cards[1], "Riley Park").style.opacity === "0.35");
  }

  console.log("\n-- delete all players");
  {
    const A = boot();
    A.ev("importPlayersCSV('name,category\\nRiley Park,U14 Rep\\nDana Ortiz,U14 Rep\\nCasey Lin,U12 Rep')");
    const ids = A.ev("S.players.map(p => p.id)");
    A.ev("startSession({kind:'game', format:'quarters', teams:[{name:'Black',playerIds:['" + ids[0] + "']},{name:'White',playerIds:['" + ids[1] + "']}]});");
    A.ev("record('3P', undefined, '" + ids[0] + "'); activeSession().done = true; UI.tab='players'; render();");
    A.click(A.btn("Delete all players"));
    const warn = A.$(".note.warn").textContent;
    ok("the warning counts players and explains the '?'", /deletes all 3 players/.test(warn) && /1 of them have stats/.test(warn), warn);
    A.w.__confirmAnswer = false;
    A.click(A.btn("Delete all 3 players"));
    ok("cancelling the final check deletes nothing", A.ev("S.players.length") === 3);
    ok("...and it warned there was no backup", /haven't downloaded a backup/.test(A.w.__confirms.pop()));
    A.click(A.btn("Download backup CSV"));
    ok("backup is the players CSV", A.downloads.length === 1 && A.downloads[0].text.split("\n").length === 4);
    ok("the button confirms it", !!A.btn("Backup downloaded"));
    A.w.__confirmAnswer = true;
    A.click(A.btn("Delete all 3 players"));
    ok("deleted, and the toast uses the same words", A.ev("S.players.length") === 0 && A.toast() === "Deleted 3 players");
    ok("the final check didn't nag about a backup", !/haven't downloaded/.test(A.w.__confirms.pop()));
    ok("sessions and categories stay", A.ev("S.sessions.length") === 1 && A.ev("S.categories.length") === 9);
    ok("the old box score shows '?'", A.ev("pname('" + ids[0] + "')") === "?");
    A.ev("importPlayersCSV(" + JSON.stringify(A.downloads[0].text) + ")");
    ok("importing the backup brings names and categories back", A.ev("pname('" + ids[0] + "')") === "Riley Park" && A.ev("catName(catOf(player('" + ids[2] + "')))") === "U12 Rep");
    ok("...and the score is intact", A.ev("teamScore(S.sessions[0], 0)") === 3);
  }

  console.log("\n-- export and backups");
  {
    const A = boot();
    A.ev("importPlayersCSV('name,category,notes,desc\\nRiley Park,,=SUM(A1),+tall\\nDana Ortiz,Team 1,,')");
    const csv = A.ev("playersCSV()");
    ok("header", csv.split("\n")[0] === "id,name,jersey number,category,desc,aliases,notes");
    ok("Miscellaneous written out, not left blank", csv.split("\n")[1].indexOf(",Riley Park,,Miscellaneous,") > -1);
    ok("free text that looks like a formula is defused", csv.indexOf(", +tall,, =SUM(A1)") > -1, csv.split("\n")[1]);
    const B = boot();
    B.ev("importPlayersCSV(" + JSON.stringify(csv) + ")");
    ok("...and comes back exactly on import", B.ev("S.players[0].notes") === "=SUM(A1)" && B.ev("S.players[0].desc") === "+tall");
    ok("categories travel by name", B.ev("catName(catOf(S.players[1]))") === "Team 1");

    const backup = A.ev("JSON.parse(JSON.stringify(S))");
    const C = boot();
    C.ev("addCategory('team 1')");
    const mine = C.ev("findCatByName('Team 1').id");
    C.ev("var d = " + JSON.stringify(backup) + "; d = upgrade(d); mergeCategories(d); d.players.forEach(p => S.players.push(p));");
    ok("a restored backup's categories merge by name", C.ev("S.players[1].cat") === mine && C.ev("S.categories.filter(c => catKey(c.name) === 'team1').length") === 1);
    A.ev("UI.tab='sessions'; render();");
    ok("version shown on Sessions", /Stat Book 4\.6/.test(A.view()));
  }

  console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
  process.exit(fails ? 1 : 0);
})();
