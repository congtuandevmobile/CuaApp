/**
 * Pre-start GPS signal (the UPRACE `GpsSignalMonitor` rules). Start is blocked only while `unknown`, so one fix is
 * enough to begin; "good" needs a couple of good fixes and is sticky so accuracy hovering near the limit does not
 * flicker the status.
 */
export type SignalQuality = 'unknown' | 'poor' | 'good';

export interface SignalFix {
  readonly accuracyM: number;
  readonly atMs: number;
}

/** Good enough to be drawn into the route once running. */
export const GOOD_ACCURACY_M = 40;
/** Once good, a single fix worse than this drops to poor. */
export const DROP_ACCURACY_M = 65;
const REQUIRED_GOOD = 2;
const DROP_AFTER_BAD = 2;
const STALE_AFTER_MS = 10_000;
const KEEP = 5;

export class GpsSignalJudge {
  private fixes: SignalFix[] = [];
  private current: SignalQuality = 'unknown';

  get quality(): SignalQuality {
    return this.current;
  }

  push(fix: SignalFix): SignalQuality {
    if (!(fix.accuracyM > 0)) return this.current;
    this.fixes = [...this.fixes, fix].slice(-KEEP);
    const good = (f: SignalFix) => f.accuracyM <= GOOD_ACCURACY_M;
    if (this.current === 'good') {
      const lastBad = this.fixes.slice(-DROP_AFTER_BAD);
      const dropped =
        fix.accuracyM > DROP_ACCURACY_M ||
        (lastBad.length === DROP_AFTER_BAD && lastBad.every(f => !good(f)));
      if (dropped) this.current = 'poor';
    } else {
      const last = this.fixes.slice(-REQUIRED_GOOD);
      this.current =
        last.length === REQUIRED_GOOD && last.every(good) ? 'good' : 'poor';
    }
    return this.current;
  }

  /** No fix for a while means we do not know any more. */
  tick(nowMs: number): SignalQuality {
    const last = this.fixes[this.fixes.length - 1];
    if (!last || nowMs - last.atMs > STALE_AFTER_MS) this.reset();
    return this.current;
  }

  reset(): void {
    this.fixes = [];
    this.current = 'unknown';
  }
}
