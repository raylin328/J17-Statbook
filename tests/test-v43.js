const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync(require("./app-path"), "utf8");
const playersCsv = fs.readFileSync(require("path").join(__dirname, "fixtures", "players.csv"), "utf8");

let fails = 0;
function ok(label, cond, extra) {
  if (!cond) { fails++; console.log("FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
  else console.log("pass  " + label);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function boot() {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://x.test/",
    beforeParse(w) {
      w.localStorage.setItem("j17.statbook.v2", JSON.stringify(
        { v: 3, prefs: {}, players: [], stats: null, sessions: [], activeId: null }));
      // capture the file inputs the app creates, and stop jsdom trying to open a picker
      const make = w.document.createElement.bind(w.document);
      w.__inputs = [];
      w.document.createElement = function (tag) {
        const e = make(tag);
        if (String(tag).toLowerCase() === "input") { w.__inputs.push(e); e.click = function () {}; }
        return e;
      };
    } });
  const w = dom.window, d = w.document;
  return { w, d, ev: x => w.eval(x),
    click(e) { e.dispatchEvent(new w.Event("click", { bubbles: true })); },
    byText(t) { return Array.from(d.querySelectorAll("button")).find(b => b.textContent.trim() === t); },
    lastInput() { return w.__inputs[w.__inputs.length - 1]; },
    async pick(input, files) {
      Object.defineProperty(input, "files", { value: files, configurable: true });
      input.onchange();
      await sleep(60);
    },
    toast() { const t = d.querySelector(".toast"); return t ? t.textContent : ""; } };
}
// how iOS hands over a Google Sheets download: often with no MIME type at all
const file = (w, content, name, type) => new w.File([content], name, { type: type || "" });
const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const pdf = "%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n\u0000\u0001";

(async () => {
  console.log("-- no file-type filters");
  {
    const A = boot();
    A.ev("UI.tab='players'; render();");
    A.click(A.byText("Import players CSV"));
    ok("Players import opens an unfiltered picker", A.lastInput().type === "file" && !A.lastInput().accept, A.lastInput().accept);
    A.ev("UI.tab='sessions'; render();");
    A.click(A.byText("Import CSVs"));
    ok("Import CSVs opens an unfiltered picker", !A.lastInput().accept && A.lastInput().multiple === true);
    A.click(A.byText("Restore (JSON)"));
    ok("Restore opens an unfiltered picker", !A.lastInput().accept);
    ok("no accept filter anywhere in the app", !/\.accept\s*=/.test(html));
  }

  console.log("\n-- Players tab import, as an iPad hands files over");
  {
    const A = boot();
    A.ev("UI.tab='players'; render();");
    A.click(A.byText("Import players CSV"));
    await A.pick(A.lastInput(), [file(A.w, playersCsv, "U12_Players_Sept2026 - Sheet1.csv", "")]);
    ok("CSV with no MIME type imports", A.ev("S.players.length") === 20, A.toast());
    ok("…and says so", /20 players imported/.test(A.toast()), A.toast());

    A.click(A.byText("Import players CSV"));
    await A.pick(A.lastInput(), [file(A.w, png, "IMG_5131.PNG", "image/png")]);
    ok("a screenshot picked by mistake is refused", A.ev("S.players.length") === 20);
    ok("…with a message showing the first row", /IMG_5131\.PNG — first row:/.test(A.toast()), A.toast());

    A.click(A.byText("Import players CSV"));
    await A.pick(A.lastInput(), [file(A.w, pdf, "roster.pdf", "application/pdf")]);
    ok("a PDF is refused", A.ev("S.players.length") === 20 && /— first row:/.test(A.toast()));

    A.click(A.byText("Import players CSV"));
    await A.pick(A.lastInput(), [file(A.w, "key,label,type,scope\nX,X,integer,game", "stats.csv", "text/csv")]);
    ok("a different stat book CSV is refused here", A.ev("S.players.length") === 20 && /is a stats file, not players/.test(A.toast()));

    A.click(A.byText("Import players CSV"));
    await A.pick(A.lastInput(), [file(A.w, "\uFEFF" + playersCsv.replace(/\n/g, "\r\n"), "players.csv", "text/plain")]);
    ok("Excel-style CSV (BOM, CRLF, text/plain) is recognised", /0 players imported/.test(A.toast()), A.toast());
  }

  console.log("\n-- Import CSVs with a mixed selection");
  {
    const A = boot();
    A.ev("UI.tab='sessions'; render();");
    A.click(A.byText("Import CSVs"));
    await A.pick(A.lastInput(), [
      file(A.w, playersCsv, "U12_Players_Sept2026.csv", ""),
      file(A.w, png, "IMG_5132.PNG", "image/png"),
      file(A.w, pdf, "schedule.pdf", "application/pdf")
    ]);
    ok("the CSV is imported", A.ev("S.players.length") === 20, A.toast());
    ok("the image and PDF are named as ignored", /ignored IMG_5132\.PNG, schedule\.pdf/.test(A.toast()), A.toast());

    A.click(A.byText("Import CSVs"));
    await A.pick(A.lastInput(), [file(A.w, png, "IMG_1.PNG", "image/png")]);
    ok("only non-CSVs picked: nothing changes, clear message",
       A.ev("S.players.length") === 20 && /None of those look like Stat Book CSVs/.test(A.toast()), A.toast());
  }

  console.log("\n-- binary files never parse as CSV");
  {
    const A = boot();
    ok("PNG bytes -> not a CSV", A.ev("csvKind(" + JSON.stringify(png.toString("latin1")) + ")") === null);
    ok("PDF bytes -> not a CSV", A.ev("csvKind(" + JSON.stringify(pdf) + ")") === null);
    ok("real players CSV still recognised", A.ev("csvKind(" + JSON.stringify(playersCsv) + ")") === "players");
    ok("notes containing tabs are still text, not binary",
       A.ev("csvKind('id,name,notes\\nx1,Kid,\"left\\tright\"')") === "players");
  }

  console.log(fails ? "\n" + fails + " FAILING" : "\nall green");
  process.exit(fails ? 1 : 0);
})();
