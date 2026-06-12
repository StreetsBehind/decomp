// Runs every *.selftest.mjs. The scorers must pass this before they are trusted.
// (npm run selftest)

import buildCompleteness from './build-completeness.selftest.mjs';
import catchRate from './catch-rate.selftest.mjs';
import fidelity from './fidelity.selftest.mjs';
import leaderboard from './leaderboard.selftest.mjs';
import outcomeCoverage from './outcome-coverage.selftest.mjs';
import generativeCoverage from './generative-coverage.selftest.mjs';
import granularity from './granularity.selftest.mjs';
import rulerMutation from './ruler-mutation.selftest.mjs';
import openQuestionChannel from './open-question-channel.selftest.mjs';
import c1Lint from './c1-lint.selftest.mjs';
import partitionRecall from './partition-recall.selftest.mjs';
import quadrantRecall from './quadrant-recall.selftest.mjs';
import gatewayInvoke from './gateway-invoke.selftest.mjs';
import batteryRetry from './battery-retry.selftest.mjs';

const SUITES = [buildCompleteness, catchRate, fidelity, leaderboard, outcomeCoverage, generativeCoverage, granularity, rulerMutation, openQuestionChannel, c1Lint, partitionRecall, quadrantRecall, gatewayInvoke, batteryRetry];

let failed = 0;
for (const suite of SUITES) {
  try {
    const r = await suite();
    console.log(`PASS  ${r.name}  (${r.assertions} assertions)`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${e.message}`);
    if (process.env.VERBOSE) console.error(e.stack);
  }
}

if (failed) {
  console.error(`\n${failed} selftest suite(s) failed`);
  process.exit(1);
}
console.log('\nall selftests passed');
