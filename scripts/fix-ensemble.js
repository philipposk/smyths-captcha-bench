#!/usr/bin/env node
// Correct the bogus shape+color-ensemble row (its 86.5%/97.3% came from a silent CV failure that
// fell back to qwen — qwen did the locate, not the free CV). Real pure-CV numbers from a validated
// bench (control qwen-vlm reproduced 91.9% exactly). Also add the truly-free variant (free Gemini
// key reads the legend; CV locate). Both confirmed: the CV can't order, so ~16-19%.
const fs = require('fs');
const path = require('path');
const F = path.resolve(__dirname, '../data/results.json');
const r = JSON.parse(fs.readFileSync(F, 'utf8'));

const lb = r.leaderboard;
const i = lb.findIndex(x => x.name === 'shape+color-ensemble');
if (i < 0) { console.error('ensemble row not found'); process.exit(1); }

// 1) correct the ensemble (qwen legend, pure CV locate) to the real benched numbers
lb[i] = {
  ...lb[i],
  legendAcc: 0, locateAcc: 0.716, solveAcc: 0.486, orderedSolveAcc: 0.189,
  p50ms: 978, avgTokens: 146, avgCalls: 1, providers: { openrouter: 37 },
  free: false, new: false, costReal: true, errors: 0, n: 37,
};

// 2) add the truly-free variant (free Gemini key legend) if not present
if (!lb.some(x => x.name === 'shape+color (free legend)')) {
  lb.push({
    name: 'shape+color (free legend)',
    legendAcc: 0, locateAcc: 0.716, solveAcc: 0.486, orderedSolveAcc: 0.162,
    p50ms: 1262, avgTokens: 283, avgCalls: 0.9,
    providers: { 'gemini-native1': 5, 'gemini-native2': 15, 'gemini': 12 },
    free: true, new: true, costReal: true, errors: 0, n: 37,
  });
}

fs.writeFileSync(F, JSON.stringify(r, null, 2));
console.log('patched. ensemble + free-legend rows:');
for (const x of lb.filter(x => /ensemble|free legend/.test(x.name)))
  console.log(' ', x.name, 'solved=' + x.orderedSolveAcc, 'locate=' + x.locateAcc, 'free=' + x.free);
