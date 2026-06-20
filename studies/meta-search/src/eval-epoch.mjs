// eval-epoch — Batch-1 gleaning #4 (additive / bit-identical / audit-only).
//
// Purpose: stamp every persisted generation-log / candidate-record / driver-summary with an
// `eval_epoch` integer SO THAT, the day a frozen-fitness or oracle DEFECT is confirmed, the
// surviving evidence is partitionable by epoch — "you cannot retro-stamp logs you never tagged".
// The grader-bug history ([[coevo-grader-bug-and-baseline]] — the void "rung-1 92/92") is the exact
// trap: an un-stamped RUN-FOR-DAYS produces logs that cannot later be cleanly excluded.
//
// FREEZE POSTURE (DECISION-BRIEF #4, DESIGN/FREEZE §2/§11):
//   * EVAL_EPOCH lives HERE, NOT in src/config.mjs (config.mjs is FROZEN; void-on-change post-P1).
//   * stampEpoch adds a CONSTANT field (default 0). No decision path reads it. The default trajectory
//     is therefore BIT-IDENTICAL — the field is pure metadata.
//   * filterCurrentEpoch is scaffolding for the Batch-2 bump. At epoch 0 with all-epoch-0 nodes it is
//     a NO-OP. It is intentionally NOT wired into the live archive (that would touch the P0-imported
//     archive.mjs and could perturb the §14/K8 bit-identical trajectory).
//   * bumpEpoch is an INERT, GUARDED STUB. The actual bump is a Batch-2 clean-restart event requiring a
//     NEW FREEZE record + a candidate-INDEPENDENT defect fixture + 2nd-oracle confirmation. It THROWS.
//
// See EVAL-EPOCH-PROTOCOL.md for the pre-registered legitimate-trigger list, the minimum bump evidence,
// and how the evidence bar closes the peek-then-redraw loophole.

// The current (default) evaluation epoch. A bump to 1 is a Batch-2 clean-restart event (new FREEZE
// record), NEVER an in-place edit of this constant during a live run.
export const EVAL_EPOCH = 0;

// stampEpoch — return a SHALLOW COPY of `record` carrying an additive `eval_epoch` field. Constant by
// default → no decision reads it → trajectory bit-identical. Idempotent: re-stamping with the same
// epoch is a no-op on the value; re-stamping with a different epoch overwrites (explicit caller intent).
export function stampEpoch(record, epoch = EVAL_EPOCH) {
  if (record === null || typeof record !== 'object') {
    throw new TypeError(`stampEpoch: record must be a non-null object, got ${record === null ? 'null' : typeof record}`);
  }
  if (!Number.isInteger(epoch) || epoch < 0) {
    throw new RangeError(`stampEpoch: epoch must be a non-negative integer, got ${epoch}`);
  }
  if (Array.isArray(record)) {
    throw new TypeError('stampEpoch: record must be an object, not an array (stamp each element, or the summary that contains the array)');
  }
  return { ...record, eval_epoch: epoch };
}

// stampEach — convenience: stamp an array of records (e.g. per-candidate records). Returns a new array.
export function stampEach(records, epoch = EVAL_EPOCH) {
  if (!Array.isArray(records)) {
    throw new TypeError(`stampEach: records must be an array, got ${typeof records}`);
  }
  return records.map((r) => stampEpoch(r, epoch));
}

// epochOf — read the stamped epoch off a record. Un-stamped (legacy / pre-gleaning) records are treated
// as epoch 0 by convention so the filter degrades gracefully on old logs.
export function epochOf(record) {
  if (record === null || typeof record !== 'object') return 0;
  const e = record.eval_epoch;
  return Number.isInteger(e) && e >= 0 ? e : 0;
}

// filterCurrentEpoch — the frontier/best/WIN epoch filter. Keeps only nodes stamped at `epoch`
// (excludes PRIOR-epoch nodes once a bump has happened). At epoch 0 with all nodes epoch 0 this is a
// strict NO-OP (returns the same membership, order-preserving). Scaffolding for the Batch-2 bump; do
// NOT wire into the live archive in Batch 1.
export function filterCurrentEpoch(records, epoch = EVAL_EPOCH) {
  if (!Array.isArray(records)) {
    throw new TypeError(`filterCurrentEpoch: records must be an array, got ${typeof records}`);
  }
  if (!Number.isInteger(epoch) || epoch < 0) {
    throw new RangeError(`filterCurrentEpoch: epoch must be a non-negative integer, got ${epoch}`);
  }
  return records.filter((r) => epochOf(r) === epoch);
}

// bumpEpoch — INERT GUARDED STUB. The eval-epoch bump is a Batch-2 clean-restart event, NOT an in-place
// amend. It requires a new FREEZE record + a candidate-independent reproducible defect fixture + 2nd-
// oracle lethal-bucket confirmation (the peek-proof evidence bar). This stub mutates NOTHING and always
// throws — calling it is a programming error in Batch 1.
export function bumpEpoch(/* reason, defectClass, evidence */) {
  throw new Error(
    'eval-epoch bump is a Batch-2 clean-restart event requiring a new FREEZE record + ' +
    'candidate-independent defect fixture + 2nd-oracle confirmation (see EVAL-EPOCH-PROTOCOL.md). ' +
    'The bump operation is intentionally NOT implemented in Batch 1; this stub is inert and mutates nothing.'
  );
}
