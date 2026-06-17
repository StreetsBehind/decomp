// Checkpoint / resume (DESIGN §14.1) — crash-safe, deterministic.
//
// The orchestrator holds only the archive + generation log on disk (§1); this formalises it: every
// generation ATOMICALLY checkpoints {archive snapshot, RNG state, eval-count + cost ledger, route
// distribution, budget spent, generation index, breeding population}. A resume reads the latest
// checkpoint and continues deterministically (the loop restores rng.setState + archive.restore). Atomic =
// write to a temp file then rename (rename is atomic on POSIX), so a crash mid-write never corrupts the
// live checkpoint. A crash costs at most one generation, not the run.

import fs from 'node:fs';
import path from 'node:path';

export function makeCheckpointer(dir, { keepHistory = true } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const latestPath = path.join(dir, 'checkpoint.json');

  function save(state) {
    const payload = JSON.stringify(state);
    // atomic: tmp + rename
    const tmp = path.join(dir, `.checkpoint.${process.pid}.tmp`);
    fs.writeFileSync(tmp, payload);
    fs.renameSync(tmp, latestPath);
    if (keepHistory) {
      const gen = Number.isFinite(state.gen) ? state.gen : 0;
      fs.writeFileSync(path.join(dir, `gen-${String(gen).padStart(4, '0')}.json`), payload);
    }
    return latestPath;
  }

  function load() {
    if (!fs.existsSync(latestPath)) return null;
    try { return JSON.parse(fs.readFileSync(latestPath, 'utf8')); } catch { return null; }
  }

  function exists() { return fs.existsSync(latestPath); }

  return { save, load, exists, dir, latestPath };
}
