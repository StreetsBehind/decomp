// Omission catch-rate — of the defects PLANTED in a variant fixture, how many did
// the method DETECT (emit a localized gap signal for)? Plus the false-positive rate
// from the clean control fixture.
//
// Distinct from build-completeness: catch-rate grades the METHOD's self-auditing;
// build-completeness grades the RESULT. A method can be good at one and bad at the other.
//
// Recall    = caught / planted   (null on a clean control — recall is undefined)
// FP        = on a control, ANY emitted signal is a false positive;
//             on a non-control, emitted signals that match no planted gap.
//
// PURE function over data: matches on stable fields (class + location), never free text.
// Output shape: schemas/scorecard.schema.json -> axes.catchRate  { recall, falsePositives }.

// A planted gap is "caught" iff some emitted gap matches it by class AND
// (location matches OR the planted location is absent). Stable-field match only.
function emittedMatchesPlanted(emitted, planted) {
  if (emitted?.class !== planted?.class) return false;
  // planted location absent -> class match is sufficient (can't localize what wasn't located)
  if (planted.location === undefined || planted.location === null || planted.location === '') return true;
  return emitted.location === planted.location;
}

/**
 * @param {Array<{class?:string, location?:string}>} emittedGaps  gap signals the METHOD self-reported
 * @param {{fixture:string, control?:boolean, gaps:Array<{id:string,class:string,expectedSignal:string,location?:string}>}} plantedGaps
 * @returns {{recall: number|null, falsePositives: number}}
 */
export function scoreCatchRate(emittedGaps, plantedGaps) {
  const emitted = Array.isArray(emittedGaps) ? emittedGaps : [];
  const planted = Array.isArray(plantedGaps?.gaps) ? plantedGaps.gaps : [];

  // recall: null when there are no planted gaps (a clean control — recall is undefined).
  let recall = null;
  if (planted.length > 0) {
    let caught = 0;
    for (const p of planted) {
      if (emitted.some((e) => emittedMatchesPlanted(e, p))) caught++;
    }
    recall = caught / planted.length;
  }

  // falsePositives:
  //  - control: any emitted signal on a clean fixture is a false positive.
  //  - non-control: emitted signals that match NO planted gap.
  let falsePositives;
  if (plantedGaps?.control === true) {
    falsePositives = emitted.length;
  } else {
    falsePositives = emitted.filter(
      (e) => !planted.some((p) => emittedMatchesPlanted(e, p)),
    ).length;
  }

  return { recall, falsePositives };
}

export default scoreCatchRate;
