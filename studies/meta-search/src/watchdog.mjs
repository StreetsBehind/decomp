// Watchdog / liveness (DESIGN §14.2).
//
// A separate watchdog adds two liveness guards on top of the loop's validity kills (K4/K5/K7/K8, which the
// loop enforces directly): a PER-CANDIDATE-EVAL timeout (above the per-surface 15 s SIGKILL the sandbox
// already has) and a PER-GENERATION wall-clock stall guard. On any trip it raises a WatchdogTrip — the
// loop catches it, halts cleanly to a resumable checkpoint, and the watchdog emits a notification. It
// never silently spins, and it never pushes past a guardrail (run-until-a-guardrail-then-halt-and-notify).
//
// A trip is signalled by throwing an Error tagged `__watchdogTrip`, so the loop can distinguish it from a
// genuine bug (which it re-throws). Date.now()/timers are fine here — this is a normal module, not a
// Workflow script.

export function makeWatchdogTrip(kind, detail = '') {
  const e = new Error(`watchdog trip: ${kind}${detail ? ` (${detail})` : ''}`);
  e.__watchdogTrip = true;
  e.kind = kind;
  return e;
}

/**
 * @param {object} p
 * @param {number} p.evalTimeoutMs   per-candidate-eval timeout
 * @param {number} [p.genStallMs]    per-generation wall-clock budget (Infinity to disable)
 * @param {Function} [p.notify]      ({kind, detail, gen}) => void  — emits the halt notification (§14.2)
 * @param {Function} [p.now]         clock injection for tests (default Date.now)
 */
export function makeWatchdog({ evalTimeoutMs, genStallMs = Infinity, notify = null, now = Date.now } = {}) {
  let genStart = null;
  let currentGen = 0;
  const notifications = [];

  function fire(kind, detail) {
    const note = { kind, detail, gen: currentGen, at: now() };
    notifications.push(note);
    if (notify) { try { notify(note); } catch { /* notifier must never crash the halt */ } }
    return makeWatchdogTrip(kind, detail);
  }

  return {
    notifications,

    // Race a candidate eval against the per-eval timeout. On timeout -> trip (the hung promise is left
    // pending; workers are ephemeral + idempotent so a re-dispatch on resume is safe, §14.1).
    guardEval(fn) {
      return new Promise((resolve, reject) => {
        let settled = false;
        // NOT unref'd: during a true hang the timer is the only live handle, and it MUST fire to trip the
        // watchdog (an unref'd timer would let the process idle-exit instead of halting-to-checkpoint).
        const timer = setTimeout(() => { if (settled) return; settled = true; reject(fire('eval-timeout', `>${evalTimeoutMs}ms`)); }, evalTimeoutMs);
        Promise.resolve().then(fn).then(
          (v) => { if (settled) return; settled = true; clearTimeout(timer); resolve(v); },
          (e) => { if (settled) return; settled = true; clearTimeout(timer); reject(e); },
        );
      });
    },

    startGeneration(gen) { currentGen = gen; genStart = now(); },
    endGeneration(gen) {
      if (genStart != null && now() - genStart > genStallMs) throw fire('gen-stall', `>${genStallMs}ms`);
    },
  };
}
