/**
 * Evaluation Module Index
 *
 * Exports the pure timeline evaluation function and related utilities.
 *
 * The core principle: evaluateTimeline() is a PURE FUNCTION that takes a
 * TimelineModel and TimeSlice, then produces EvaluatedEvents. No side effects,
 * no clocks, no scheduling - pure mathematical evaluation of musical meaning.
 */

export { evaluateTimeline } from "./evaluate-timeline";
