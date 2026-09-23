#!/usr/bin/env node

/**
 * J17 Stat Book — UUID v4 Generator
 * 
 * Generates UUID v4 identifiers for players, sessions, events, and drills.
 * Use this to:
 * - Generate IDs when creating new players in bulk
 * - Pre-generate IDs for import files
 * - Migrate old data to UUID format
 * 
 * Usage:
 *   node generate-uuids.js [count] [type]
 * 
 * Examples:
 *   node generate-uuids.js 20 players
 *   node generate-uuids.js 5 sessions
 *   node generate-uuids.js 100 events
 *   node generate-uuids.js 10           # defaults to 'id'
 */

const crypto = require('crypto');

/**
 * Generate a UUID v4
 * @returns {string} UUID v4 in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate multiple UUIDs with optional prefix
 * @param {number} count - How many UUIDs to generate
 * @param {string} prefix - Prefix for readability (p, s, e, d, etc.)
 * @returns {string[]} Array of UUIDs with optional prefix
 */
function generateUUIDs(count = 1, prefix = '') {
  const uuids = [];
  for (let i = 0; i < count; i++) {
    const uuid = generateUUID();
    uuids.push(prefix ? `${prefix}_${uuid}` : uuid);
  }
  return uuids;
}

/**
 * Format UUIDs for CSV import
 * @param {string[]} uuids - Array of UUIDs
 * @returns {string} CSV-formatted output (one per line)
 */
function formatCSV(uuids) {
  return uuids.join('\n');
}

/**
 * Format UUIDs as JSON array
 * @param {string[]} uuids - Array of UUIDs
 * @returns {string} JSON-formatted output
 */
function formatJSON(uuids) {
  return JSON.stringify(uuids, null, 2);
}

/**
 * Format UUIDs as player CSV template
 * @param {string[]} uuids - Array of UUIDs
 * @returns {string} CSV with headers
 */
function formatPlayerCSV(uuids) {
  const header = 'id,name,jersey number,desc,aliases,notes';
  const rows = uuids.map(uuid => `${uuid},PLAYER_NAME,,,,`);
  return [header, ...rows].join('\n');
}

/**
 * Format UUIDs as session CSV template
 * @param {string[]} uuids - Array of UUIDs
 * @returns {string} CSV with headers
 */
function formatSessionCSV(uuids) {
  const header = 'id,date,kind,format,title,team1_name,team1_players,team2_name,team2_players,final_score_1,final_score_2,period_min,done,notes';
  const rows = uuids.map(uuid => {
    const today = new Date().toISOString().split('T')[0];
    return `${uuid},${today},game,quarters,GAME_TITLE,Team A,,Team B,,,,8,false,`;
  });
  return [header, ...rows].join('\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 1;
const type = (args[1] || 'id').toLowerCase();
const format = (args[2] || 'plain').toLowerCase();

// Validate count
if (count < 1 || count > 1000) {
  console.error('Error: Count must be between 1 and 1000');
  process.exit(1);
}

// Map types to prefixes
const prefixes = {
  'player': 'p',
  'players': 'p',
  'session': 's',
  'sessions': 's',
  'event': 'e',
  'events': 'e',
  'drill': 'd',
  'drills': 'd',
  'id': '',
  'uuid': ''
};

const prefix = prefixes[type] || '';

// Generate UUIDs
const uuids = generateUUIDs(count, prefix);

// Format output
let output = '';
let typeLabel = type;

switch (format) {
  case 'json':
    output = formatJSON(uuids);
    break;
  case 'player':
  case 'players':
    output = formatPlayerCSV(uuids);
    typeLabel = 'player (CSV template)';
    break;
  case 'session':
  case 'sessions':
    output = formatSessionCSV(uuids);
    typeLabel = 'session (CSV template)';
    break;
  case 'csv':
    output = formatCSV(uuids);
    break;
  case 'plain':
  default:
    output = formatCSV(uuids);
    break;
}

// Print header
console.log(`\n=== UUID v4 Generator ===`);
console.log(`Generated ${count} ${typeLabel} ID${count !== 1 ? 's' : ''}`);
console.log(`Format: ${format}\n`);

// Print output
console.log(output);

// Print footer with usage hints
console.log(`\n--- Usage ---`);
console.log(`Copy the above IDs into your import file or use directly.\n`);
console.log(`Examples:`);
console.log(`  Players CSV:   node generate-uuids.js 20 players player`);
console.log(`  Sessions CSV:  node generate-uuids.js 5 sessions session`);
console.log(`  JSON array:    node generate-uuids.js 10 id json`);
console.log(`  Plain list:    node generate-uuids.js 100 events csv\n`);

// Export functions for use as module
module.exports = {
  generateUUID,
  generateUUIDs,
  formatCSV,
  formatJSON,
  formatPlayerCSV,
  formatSessionCSV
};
