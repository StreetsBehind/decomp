// Deterministic, serial-state RNG for the meta-search instrument.
//
// Determinism is load-bearing for §14.1 (checkpoint/resume must replay *exactly*) and for the K8 / G1
// gates (a planted-positive run must be reproducible). So the generator is a pure 32-bit state machine
// (mulberry32): the entire generator state is one uint32, trivially serialised into a checkpoint and
// restored bit-for-bit. No Math.random anywhere in the instrument.
//
// API: makeRng(seed | state) -> { next, int, float, pick, shuffle, state, fork }
//   - next()        : float in [0,1)
//   - int(n)        : integer in [0,n)
//   - float(a,b)    : float in [a,b)
//   - pick(arr)     : a uniformly-chosen element
//   - shuffle(arr)  : a NEW array, Fisher–Yates (does not mutate input)
//   - state()       : the current uint32 (serialise this)
//   - fork(tag)     : a child RNG deterministically derived from this one + a string tag (so independent
//                     streams — e.g. per-worker — don't entangle the parent's sequence)

const MASK = 0xffffffff;

function mix(seed) {
  // splitmix32-style avalanche so nearby seeds (e.g. 1,2,3) don't produce correlated streams.
  let z = (seed >>> 0);
  z = (z + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}

function hashTag(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function makeRng(seedOrState = 0x2545f491) {
  let s = (seedOrState >>> 0) === seedOrState ? seedOrState >>> 0 : mix(Number(seedOrState) | 0);

  function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng = {
    next,
    int(n) { return Math.floor(next() * n); },
    float(a, b) { return a + next() * (b - a); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },
    state() { return s >>> 0; },
    setState(v) { s = (v >>> 0); return rng; },
    fork(tag) { return makeRng((s ^ hashTag(String(tag))) >>> 0); },
  };
  return rng;
}

export { mix as _mix };
