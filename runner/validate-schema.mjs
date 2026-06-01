// A tiny, dependency-free JSON-Schema validator — just enough of draft 2020-12 to
// round-trip-validate our own scorecards against schemas/scorecard.schema.json.
//
// CHARTER §6: no new runtime deps. We do NOT need a full validator; we own the schemas
// and only use a fixed subset: type, required, properties, additionalProperties:false,
// enum, minimum/maximum, and intra-repo $ref (resolved against a provided schema map).
//
// PURE: no clock, no randomness, no I/O. Returns { valid, errors[] }.

const typeOf = (v) =>
  v === null ? 'null'
  : Array.isArray(v) ? 'array'
  : typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number')
  : typeof v;

function matchesType(value, type) {
  // JSON-Schema "integer" also accepts integral numbers; "number" accepts both.
  const t = typeOf(value);
  if (type === 'number') return t === 'number' || t === 'integer';
  if (type === 'integer') return t === 'integer';
  return t === type;
}

/**
 * @param {*} value
 * @param {object} schema
 * @param {{ refs?: Record<string, object> }} [opts]  refs: { "<$id or key>": schema }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validate(value, schema, opts = {}) {
  const refs = opts.refs || {};
  const errors = [];

  const walk = (val, sch, path) => {
    if (!sch || typeof sch !== 'object') return;

    if (sch.$ref) {
      const target = refs[sch.$ref];
      if (!target) { errors.push(`${path}: unresolved $ref ${sch.$ref}`); return; }
      walk(val, target, path);
      return;
    }

    if (sch.type) {
      const types = Array.isArray(sch.type) ? sch.type : [sch.type];
      if (!types.some((t) => matchesType(val, t))) {
        errors.push(`${path}: expected type ${types.join('|')}, got ${typeOf(val)}`);
        return; // further keyword checks are meaningless on a type mismatch
      }
    }

    if (sch.enum && !sch.enum.includes(val)) {
      errors.push(`${path}: value ${JSON.stringify(val)} not in enum ${JSON.stringify(sch.enum)}`);
    }

    if (typeof val === 'number') {
      if (sch.minimum !== undefined && val < sch.minimum) errors.push(`${path}: ${val} < minimum ${sch.minimum}`);
      if (sch.maximum !== undefined && val > sch.maximum) errors.push(`${path}: ${val} > maximum ${sch.maximum}`);
    }

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const req of sch.required || []) {
        if (!(req in val)) errors.push(`${path}: missing required property '${req}'`);
      }
      const props = sch.properties || {};
      if (sch.additionalProperties === false) {
        for (const k of Object.keys(val)) {
          if (!(k in props)) errors.push(`${path}: additional property '${k}' not allowed`);
        }
      }
      for (const [k, v] of Object.entries(val)) {
        if (props[k]) walk(v, props[k], `${path}.${k}`);
      }
    }

    if (Array.isArray(val) && sch.items) {
      val.forEach((item, i) => walk(item, sch.items, `${path}[${i}]`));
    }
  };

  walk(value, schema, '$');
  return { valid: errors.length === 0, errors };
}

export default validate;
