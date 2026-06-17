// Live-gateway smoke (NON-BLOCKING). Proves the LIVE build path executes end-to-end against the real
// cheap supply: makeEpicEvaluator builds each surface on the jnoccio gateway, assembles, grades with the
// frozen apparatus, and returns a real scorecard (per-cell vector + $0 cost + route distribution). This
// is a smoke, not a gate — the gateway is non-deterministic/networked, so a failure here is reported as
// SKIP, never a P0 FAIL. No P0 conclusion is drawn from the reliability number (cheap-isolated is
// expected to score low — that IS the thesis baseline, not a result).

import url from 'node:url';
import { makeGatewayInvoke } from '../../../runner/model-client.mjs';
import { makeEpicEvaluator } from '../src/evaluator.mjs';
import { evalGenome } from '../src/worker.mjs';
import { defaultGenome } from '../src/genome.mjs';

export async function run({ epic = 'scale-d1', timeoutMs = 120000 } = {}) {
  try {
    const invoke = makeGatewayInvoke({ timeoutMs });
    const evaluate = makeEpicEvaluator({ core: [epic], invoke, epicK: 1, surfaceConcurrency: 3 });
    const genome = defaultGenome(); // cheap-isolated, checker off — the naive baseline candidate
    const sc = await evalGenome(genome, { evaluate });
    const lethalCells = Object.keys(sc.cells).filter((k) => /::(crosscut|integration)::/.test(k)).length;
    const detail = `reliability ${sc.reliability.toFixed(3)}, EPIC✓ ${sc.epicPass.count}/${sc.epicPass.total}, cost $${sc.cost.total.toFixed(4)}, ${lethalCells} lethal cells, routes ${JSON.stringify(sc.routeDist)}, harnessFailRate ${sc.harnessFailRate}`;
    // smoke success = a well-formed scorecard came back through the live path (not a reliability claim).
    const wellFormed = Number.isFinite(sc.reliability) && lethalCells > 0 && typeof sc.cost.total === 'number';
    return { name: 'live gateway smoke', status: wellFormed ? 'OK' : 'SKIP', blocking: false, detail };
  } catch (e) {
    return { name: 'live gateway smoke', status: 'SKIP', blocking: false, detail: `gateway unavailable: ${String(e && e.message || e).slice(0, 160)}` };
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { console.log(`  ${r.status}  ${r.name}  [${r.detail}]`); process.exit(0); });
}
