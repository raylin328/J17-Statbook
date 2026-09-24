const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");
const v41 = fs.readFileSync(require("path").join(__dirname, "fixtures", "j17-statbook-v4_1.html"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}
function boot(seed, src, before) {
  return new JSDOM(src || html, {
    runScripts: "dangerously", url: "https://x.test/",
    beforeParse(w) { if (before) before(w); if (seed) w.localStorage.setItem("j17.statbook.v2", JSON.stringify(seed)); }
  });
}
function H(dom) {
  const d = dom.window.document, w = dom.window;
  return { w, d, $: s => d.querySelector(s), $$: s => Array.from(d.querySelectorAll(s)), ev: x => w.eval(x),
    click(e) { e.dispatchEvent(new w.Event("click", { bubbles: true })); },
    type(e, v) { e.value = v; e.dispatchEvent(new w.Event("input", { bubbles: true })); },
    byText(sel, t) { return Array.from(d.querySelectorAll(sel)).find(e => e.textContent.trim().startsWith(t)); } };
}
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const empty = () => ({ v: 3, prefs: { gameView: "grid" }, players: [], stats: null, sessions: [], activeId: null });

// the user's sheet, exactly as laid out: id, name, jersey number, desc, aliases, notes
const sheetIds = fs.readFileSync(require("path").join(__dirname, "fixtures", "players.csv"), "utf8").trim().split("\n").slice(1)
  .map(l => l.split(",").slice(0, 2));
const sheetWith = nums => ["id,name,jersey number,desc,aliases,notes"]
  .concat(sheetIds.map(([id, name], i) => [id, name, nums ? nums[i] : "", "", "", ""].join(","))).join("\r\n");

/* ============ UUIDs ============ */
console.log("-- ids");
{
  const A = H(boot(empty()));
  const ids = A.ev("Array.from({length:10000}, () => uid('p'))");
  ok("uid() returns UUID v4", ids.every(i => UUID4.test(i)), ids[0]);
  ok("10,000 IDs, no repeats", new Set(ids).size === 10000);

  A.ev("UI.tab='players'; render();");
  const f = p => A.$$("#view .card input").find(i => i.placeholder.startsWith(p));
  A.type(f("Name"), "Riley Park"); A.type(f("Jersey"), "#23");
  A.click(A.byText("button", "Add player"));
  ok("player added in the app gets a UUID", UUID4.test(A.ev("S.players[0].id")), A.ev("S.players[0].id"));
  A.ev("S.players.push({id:'p1', name:'Old Kid', aliases:[], desc:'', notes:'', num:'', active:true});");
  A.ev("startSession({kind:'game', format:'quarters', teams:[{name:'A',playerIds:[S.players[0].id]},{name:'B',playerIds:['p1']}]});");
  ok("session gets a UUID", UUID4.test(A.ev("activeSession().id")));
  A.ev("record('2P', undefined, S.players[0].id); record('REB', undefined, 'p1');");
  ok("stat entries get UUIDs", A.ev("activeSession().events").every(e => UUID4.test(e.id)));
  ok("an old short ID still works alongside", A.ev("totalsFor(activeSession())['p1'].REB") === 1);

  const noRandomUUID = H(boot(empty(), null, w => { Object.defineProperty(w.crypto, "randomUUID", { value: undefined }); }));
  ok("older browsers: falls back to getRandomValues, still UUID v4",
     noRandomUUID.ev("typeof crypto.randomUUID") === "undefined" && UUID4.test(noRandomUUID.ev("uid('p')")), noRandomUUID.ev("uid('p')"));
  const noCrypto = H(boot(empty(), null, w => { Object.defineProperty(w, "crypto", { value: undefined, configurable: true }); }));
  ok("no crypto at all: still produces the UUID v4 format", UUID4.test(noCrypto.ev("uid('p')")));
}

/* ============ jersey numbers from the sheet ============ */
console.log("\n-- jersey numbers");
{
  const nums = ["4", "07", "#11", "2", "", "15", "8", "3", "21", "10", "5", "23", "1", "9", "14", "6", "12", "30", "0", "33"];
  const A = H(boot(empty()));
  const r = A.ev("importFromCSVs(" + JSON.stringify(sheetWith(nums)) + ")");
  ok("your sheet layout imports all 20", r.players === 20);
  ok("IDs from the sheet kept exactly", A.ev("S.players[0].id") === sheetIds[0][0]);
  ok("number read from 'jersey number'", A.ev("player('" + sheetIds[0][0] + "').num") === "4");
  ok("leading zero kept (07)", A.ev("player('" + sheetIds[1][0] + "').num") === "07");
  ok("a typed # is stripped (#11 -> 11)", A.ev("player('" + sheetIds[2][0] + "').num") === "11");
  ok("a blank number stays blank", A.ev("player('" + sheetIds[4][0] + "').num") === "");
  ok("0 is a real number, not blank", A.ev("player('" + sheetIds[18][0] + "').num") === "0");

  const variants = { "Jersey": "7", "number": "8", "#": "9", "Jersey_Number": "10", "No.": "11", "Jersey #": "12", "NUM": "13" };
  Object.keys(variants).forEach(h => {
    const B = H(boot(empty()));
    B.ev("importPlayersCSV(" + JSON.stringify("id,name," + h + "\nx1,Kid," + variants[h]) + ")");
    ok("header '" + h + "' recognised", B.ev("player('x1').num") === variants[h]);
  });
  const C = H(boot(empty()));
  C.ev("importPlayersCSV('id,name,phone number\\nx1,Kid,555-0100')");
  ok("an unrelated 'phone number' column is not mistaken for a jersey", C.ev("player('x1').num") === "");

  // export and round trip
  const out = A.ev("playersCSV()");
  ok("export writes the jersey column", out.split("\n")[0] === "id,name,jersey number,category,desc,aliases,notes");  // v4.6: + category
  const D = H(boot(empty()));
  D.ev("importPlayersCSV(" + JSON.stringify(out) + ")");
  ok("numbers survive export -> import", D.ev("S.players.map(p=>p.num).join()") === A.ev("S.players.map(p=>p.num).join()"));

  // bench display
  const g = A.ev("S.players.slice(0,2).map(p=>p.id)"), h2 = A.ev("S.players.slice(2,4).map(p=>p.id)");
  A.ev("startSession({kind:'game', format:'quarters', teams:[{name:'Black',playerIds:" + JSON.stringify(g) + "},{name:'White',playerIds:" + JSON.stringify(h2) + "}]});");
  const first = A.$(".tapgrid .nmcell b");
  ok("grid shows the number beside the name", first.textContent === "#4Avery" && first.querySelector(".jno").textContent === "#4", first.textContent);
  A.ev("S.prefs.gameView='tiles'; render();");
  ok("tiles show the number", A.$$(".plr")[0].querySelector(".nm").textContent === "#4");
  A.ev("S.activeId=null; UI.setup=null; UI.tab='session'; render();");
  ok("session setup lists players by number", A.$$(".chips .chip").some(c => c.textContent.indexOf("#07 Blair") > -1));
  const noNum = A.$$(".chips .chip").find(c => c.textContent.indexOf("Jordan") > -1).textContent;
  ok("no stray # for a player without a number", noNum.indexOf("#") === -1, noNum);
  ok("box score and CSV still use plain names", A.ev("pname('" + sheetIds[0][0] + "')") === "Avery");

  // editing in the Players tab
  A.ev("UI.tab='players'; render();");
  const edit = A.$$("#view .card").find(c => Array.from(c.querySelectorAll("input")).some(i => i.value === "Jordan"));
  A.type(Array.from(edit.querySelectorAll("input")).find(i => i.placeholder === "Jersey number"), "#44");
  ok("number edited in Players tab is saved", A.ev("player('" + sheetIds[4][0] + "').num") === "44" &&
     JSON.parse(A.w.localStorage.getItem("j17.statbook.v2")).players.find(p => p.id === sheetIds[4][0]).num === "44");
}

/* ============ already imported into v4.1? numbers still arrive ============ */
console.log("\n-- fill in blanks");
{
  const nums = sheetIds.map((_, i) => String(i + 1));
  const A = H(boot(empty()));
  A.ev("importFromCSVs(" + JSON.stringify(sheetWith(null)) + ")");   // what v4.1 would have left: no numbers
  ok("first import: players, no numbers", A.ev("S.players.every(p => !p.num)"));
  A.ev("player('" + sheetIds[3][0] + "').num = '99'; player('" + sheetIds[0][0] + "').name = 'Avery L';");
  const r = A.ev("importFromCSVs(" + JSON.stringify(sheetWith(nums)) + ")");
  ok("re-import adds no duplicates", r.players === 0 && A.ev("S.players.length") === 20);
  ok("…and fills in the missing numbers", r.updated === 19, r.updated);
  ok("numbers now present", A.ev("player('" + sheetIds[1][0] + "').num") === "2");
  ok("a number set in the app is not overwritten", A.ev("player('" + sheetIds[3][0] + "').num") === "99");
  ok("a name edited in the app is not overwritten", A.ev("player('" + sheetIds[0][0] + "').name") === "Avery L");
  const again = A.ev("importFromCSVs(" + JSON.stringify(sheetWith(nums)) + ")");
  ok("third import changes nothing", again.players === 0 && again.updated === 0);
}

/* ============ compatibility with v4.1 ============ */
console.log("\n-- compatibility");
{
  const A = H(boot(empty()));
  A.ev("importFromCSVs(" + JSON.stringify(sheetWith(sheetIds.map((_, i) => String(i)))) + ")");
  A.ev("startSession({kind:'game', format:'quarters', teams:[{name:'A',playerIds:[S.players[0].id]},{name:'B',playerIds:[S.players[1].id]}]});");
  A.ev("record('3P', undefined, S.players[0].id); save();");
  ok("schema unchanged at 3", A.ev("S.v") === 3);
  const saved = JSON.parse(A.w.localStorage.getItem("j17.statbook.v2"));
  const old = H(boot(saved, v41));
  ok("v4.1 opens v4.2 data (no refusal)", !/newer version/.test(old.$("#view").textContent));
  ok("v4.1 sees the same game and score", old.ev("teamScore(activeSession(),0)") === 3);
  const oldImport = H(boot(empty(), v41));
  const r = oldImport.ev("importFromCSVs(" + JSON.stringify(A.ev("playersCSV()")) + ")");
  ok("v4.1 can still import a v4.2 players.csv", r.players === 20);

  const B = H(boot(empty()));
  const r2 = B.ev("importFromCSVs(" + JSON.stringify(fs.readFileSync(require("path").join(__dirname, "fixtures", "players.csv"), "utf8")) + ")");
  ok("the players.csv you already have imports", r2.players === 20 && B.ev("S.players.every(p => p.num === '')"));
}

console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
process.exit(fails ? 1 : 0);
