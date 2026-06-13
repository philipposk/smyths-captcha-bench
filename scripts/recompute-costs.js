#!/usr/bin/env node
// Recompute the leaderboard cost field to a single HONEST basis: $ per 1,000 captcha-solves,
// from real avgTokens (bench) x real OpenRouter unit prices. Replaces the earlier Frankenstein
// field (mix of total-project-bill + stale token estimates) and the bogus color-cv $2.12.
//
// Unit prices: USD per 1M tokens [input, output]. 'real' = fetched from OpenRouter Jun 2026;
// 'est' = reasonable tier estimate (model is not a production pick) -> flagged costEst:true.
const fs = require('fs');
const path = require('path');
const F = path.resolve(__dirname, '../data/results.json');
const r = JSON.parse(fs.readFileSync(F, 'utf8'));

const PRICE = {            // [in, out, isReal]
  'gemini-3-flash':        [0.50, 3.00, true],
  'gemini-3.5-flash':      [0.50, 3.00, false],
  'gemini-3.1-flash-lite': [0.25, 1.50, true],
  'qwen3-vl-32b':          [0.104, 0.416, true],
  'qwen3-vl-235b':         [0.30, 1.20, false],
  'gpt-5.4-mini':          [0.75, 4.50, true],
  'gpt-5.4':               [1.25, 10.0, false],
  'gpt-5.4-nano':          [0.10, 0.40, false],
  'glm-4.6v':              [0.30, 1.20, false],
  'claude-sonnet-4.6':     [3.00, 15.0, false],
};
const FREE_TIER = new Set(['gemini-2.5-flash', 'gemini-2.5-flash-lite']); // run on the free Gemini key (within daily quota)
const OUT_TOK = 110;       // output tokens per solve are tiny + roughly constant (names + a few coords)

// per-solve USD from real tokens x unit price
const perSolve = (tok, [pin, pout]) => Math.max(0, (tok - OUT_TOK)) / 1e6 * pin + OUT_TOK / 1e6 * pout;

for (const row of r.leaderboard) {
  let cps = null, est = false, note = null;

  if (row.free) { cps = 0; }                                   // truly $0 (local / free:true)
  else if (FREE_TIER.has(row.name)) { cps = 0; note = 'free Gemini key (within daily quota)'; }
  else if (row.name === 'qwen3-vl-32b→gemini-3.1-flash-lite') {
    // best-of: qwen runs on EVERY puzzle, gemini-lite runs only on qwen's misses (~8.1%).
    const q = perSolve(763, PRICE['qwen3-vl-32b'][0] !== undefined ? PRICE['qwen3-vl-32b'] : [0.104, 0.416]);
    const g = perSolve(2428, PRICE['gemini-3.1-flash-lite']);
    cps = q + g * (1 - 0.919);                                 // qwen full + gemini on the 8.1% it missed
    note = 'qwen on every puzzle + gemini-3.1-flash-lite only on qwen’s misses';
  } else if (row.name === 'shape+color-ensemble') {
    cps = perSolve(738, PRICE['qwen3-vl-32b']);                // CV locate is free; cost is the qwen legend read
    note = 'locate is free CV; cost is the legend read (qwen)';
  } else if (row.name === 'color-cv') {
    cps = perSolve(420, PRICE['qwen3-vl-32b']);                // free CV locate; one qwen legend read (no moondream)
    note = 'free CV locate; one qwen legend read (earlier $2.12 was stale moondream-classify)';
  } else if (PRICE[row.name]) {
    const p = PRICE[row.name];
    cps = perSolve(row.avgTokens || 0, p);
    est = !p[2];
  } else {
    // moondream combos etc. — not production picks; mark estimate at a mid tier
    cps = row.avgTokens ? perSolve(row.avgTokens, [0.40, 1.60]) : 0.002;
    est = true;
  }

  row.costPerSolve = Math.round(cps * 1e6) / 1e6;     // USD per solve
  row.estPer1000Usd = Math.round(cps * 1000 * 1e4) / 1e4; // USD per 1,000 solves (relabelled meaning)
  row.costEst = est;
  if (note) row.costNoteRow = note; else delete row.costNoteRow;
  // cost tier for the chip: 0 FREE, 1 $, 2 $$, 3 $$$
  row.costTier = cps === 0 ? 0 : cps < 0.0004 ? 1 : cps < 0.0015 ? 2 : 3;
}

r.costNote = 'Cost = USD per 1,000 captcha-solves: real bench token-counts × real OpenRouter unit prices (Jun 2026). The solver only runs on a captcha, so per-scrape cost = this × the captcha rate. See the Economics tab.';
r.updated = r.updated; // leave timestamp; bench owns it

fs.writeFileSync(F, JSON.stringify(r, null, 2));

// verify
console.log('name'.padEnd(36), 'tier', '$/1k-solves', 'est?');
for (const row of r.leaderboard.slice().sort((a,b)=>b.orderedSolveAcc-a.orderedSolveAcc)) {
  const chip = ['FREE','$','$$','$$$'][row.costTier];
  console.log(row.name.padEnd(36), chip.padEnd(4), String(row.estPer1000Usd).padStart(8), row.costEst?'est':'');
}
