// Minimal validity gate for ONE surface module, run in a child so generated code can't touch the parent.
// Exits 0 iff the module imports cleanly AND exports the named function; non-zero otherwise. This is a
// SYNTACTIC/structural check (does it run and export the right symbol?) — NOT a behaviour check, so using
// it as a retry gate does not leak the hidden obligation/cohesion tests.
//
// argv: <modulePath> <exportName>
import { pathToFileURL } from 'node:url';
const [, , modulePath, exportName] = process.argv;
import(pathToFileURL(modulePath).href)
  .then((m) => process.exit(typeof m[exportName] === 'function' ? 0 : 1))
  .catch(() => process.exit(1));
