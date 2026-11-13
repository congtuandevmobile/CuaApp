import type { RecordingSport } from './Recording';

/**
 * The sports offered by the record button. Codes are lower camel case HealthKit names, so an activity recorded here and
 * a workout imported from Apple Health speak the same language. Add a sport by adding a row.
 */
export const RECORDABLE_SPORTS: readonly RecordingSport[] = [
  { code: 'running', name: 'Running' },
  { code: 'cycling', name: 'Cycling' },
  { code: 'walking', name: 'Walking' },
  { code: 'hiking', name: 'Hiking' },
  { code: 'soccer', name: 'Soccer' },
  { code: 'swimming', name: 'Swimming' },
  { code: 'tennis', name: 'Tennis' },
  { code: 'basketball', name: 'Basketball' },
];
