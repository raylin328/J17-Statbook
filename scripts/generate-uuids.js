#!/usr/bin/env node
/**
 * J17 Stat Book: UUID generator
 *
 *   node generate-uuids.js [count] [format]
 *
 *   plain    one UUID per line (default)
 *   json     a JSON array
 *   players  a players.csv template: fill in names, leave unused rows blank
 *
 *   node generate-uuids.js 20 players > players-template.csv
 *
 * The UUIDs are plain v4, the same kind the app makes. Only data goes to
 * stdout, so redirecting to a file gives a clean file; messages go to stderr.
 * The older three-argument form (count, type, format) still works.
 */
"use strict";
const crypto = require("crypto");

const PLAYER_HEADER = "id,name,jersey number,category,desc,aliases,notes";
const MAX = 10000;
const USAGE = "usage: node generate-uuids.js [count 1-" + MAX + "] [plain|json|players]";

function uuid() { return crypto.randomUUID(); }
function uuids(count) { return Array.from({ length: count }, uuid); }
function format(list, kind) {
  if (kind === "json") return JSON.stringify(list, null, 2);
  if (kind === "players") return [PLAYER_HEADER].concat(list.map(id => id + ",,,,,,")).join("\n");
  return list.join("\n");
}
function kindOf(word) {
  word = String(word || "plain").toLowerCase();
  if (word === "player" || word === "players") return "players";
  if (word === "json") return "json";
  if (word === "session" || word === "sessions") return "sessions";
  return "plain";   // plain, csv, id, uuid, events, drills...
}
function main(argv) {
  const count = argv[0] === undefined ? 1 : Number(argv[0]);
  if (!Number.isInteger(count) || count < 1 || count > MAX) { console.error(USAGE); return 1; }
  let kind = kindOf(argv.length > 2 ? argv[2] : argv[1]);
  if (kind === "sessions") {
    console.error("Session templates were removed: sessions are created in the app. Printing plain ids.");
    kind = "plain";
  }
  process.stdout.write(format(uuids(count), kind) + "\n");
  if (kind === "players") console.error("Fill in the names. Rows left with only an id are skipped on import.");
  return 0;
}

module.exports = { uuid, uuids, format, PLAYER_HEADER };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
