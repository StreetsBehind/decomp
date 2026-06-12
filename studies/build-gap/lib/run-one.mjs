// Child process: import a generated solution module + a task's test buckets, run every test, print a
// JSON result to stdout. Runs in its OWN process so a generated solution that throws at import, hangs,
// or calls process.exit can't take the parent down (the parent spawns this with a timeout). Each test
// is a { name, run(mod) } that THROWS on failure; a test that throws (incl. a missing export) = fail.
//
// argv: <solutionPath> <testsPath>
import { pathToFileURL } from 'node:url';

const [, , solutionPath, testsPath] = process.argv;

async function main() {
  let mod;
  try {
    mod = await import(pathToFileURL(solutionPath).href);
  } catch (e) {
    return { importError: String(e && e.message || e) };
  }
  const tests = await import(pathToFileURL(testsPath).href);
  const runBucket = (bucket) => {
    const items = Array.isArray(tests[bucket]) ? tests[bucket] : [];
    const fails = [];
    let pass = 0;
    for (const t of items) {
      try {
        t.run(mod);
        pass++;
      } catch (e) {
        fails.push({ name: t.name, why: String(e && e.message || e).slice(0, 200) });
      }
    }
    return { pass, total: items.length, fails };
  };
  return { happy: runBucket('happy'), obligation: runBucket('obligation') };
}

main()
  .then((r) => { process.stdout.write(JSON.stringify(r)); })
  .catch((e) => { process.stdout.write(JSON.stringify({ harnessError: String(e && e.message || e) })); });
