// The typed resource lattice the deterministic join operates over.
// SURFACE-DISCOVERY-SPEC §1.2 / §1.3: a bead declares a typed interface
//   produces: [resource]   consumes: [resource]
// and the dependency graph is the deterministic JOIN of consumes against produces.
// Getting this kind-set right is "the single highest-leverage design choice".
//
// A resource id is the string "Kind:name" — e.g. "Store:session", "Config:provider".
// `name` is the canonicalized resource identity the join matches on (vocabulary alignment,
// §1.1): two beads only wire if they name the SAME canonical resource, so the join is
// deliberately exact — a "Store:session" producer does NOT match a "Store:sessions" consumer.
// That sensitivity is a feature (it surfaces the vocabulary-alignment sub-problem), not a bug.

export const LATTICE = [
  'Route',
  'Store', // Store / Table
  'Schema', // Schema / Type
  'Token',
  'Credential', // Token / Credential
  'Config', // Config / Env
  'Event',
  'Migration',
  'Job',
  'Middleware',
  'ExternalIntegration',
  'ErrorState',
];

const KINDS = new Set(LATTICE);

export const isLatticeKind = (kind) => KINDS.has(kind);

/** Parse "Kind:name" into { kind, name }. Throws on a malformed id or an off-lattice kind. */
export function parseResource(id) {
  if (typeof id !== 'string') throw new Error(`resource id must be a string, got ${typeof id}`);
  const i = id.indexOf(':');
  if (i < 0) throw new Error(`resource id must be "Kind:name": ${JSON.stringify(id)}`);
  const kind = id.slice(0, i).trim();
  const name = id.slice(i + 1).trim();
  if (!isLatticeKind(kind)) throw new Error(`unknown lattice kind "${kind}" in ${JSON.stringify(id)} (allowed: ${LATTICE.join(', ')})`);
  if (!name) throw new Error(`resource id has an empty name: ${JSON.stringify(id)}`);
  return { kind, name };
}

/** Canonical "Kind:name" form the join matches on (trimmed; kind + name validated). */
export function canonical(id) {
  const { kind, name } = parseResource(id);
  return `${kind}:${name}`;
}

export default { LATTICE, isLatticeKind, parseResource, canonical };
