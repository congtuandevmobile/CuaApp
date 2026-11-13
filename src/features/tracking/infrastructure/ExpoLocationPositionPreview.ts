import { injectable } from 'inversiland';
import * as Location from 'expo-location';
import type { Position } from '../domain/Recording';
import type { PositionPreview } from '../domain/ports';

/**
 * Pre-start positions from expo-location (CoreLocation / Fused Location). The recording itself is never made here:
 * once Start is pressed the GPS SDK owns location and this watcher is stopped.
 */
const SAMPLE_EVERY_MS = 2000;

@injectable()
export class ExpoLocationPositionPreview implements PositionPreview {
  async watch(listener: (position: Position) => void): Promise<() => void> {
    try {
      return await this.subscribe(listener);
    } catch {
      // No native module (a binary built before the pod was installed) or no location service: the preview simply
      // stays empty and the screen keeps saying "Searching for GPS"; Start stays blocked as it should.
      return () => undefined;
    }
  }

  private async subscribe(listener: (position: Position) => void): Promise<() => void> {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return () => undefined;
    const emit = (loc: Location.LocationObject) =>
      listener({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracyM: loc.coords.accuracy ?? undefined,
        headingDeg: loc.coords.heading !== null && loc.coords.heading >= 0 ? loc.coords.heading : undefined,
        atMs: loc.timestamp,
      });
    // Movement arrives through the watch...
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      emit,
    );
    // ...but a phone standing still gets no new callbacks (CoreLocation only reports changes), so, like UPRACE's
    // `GpsSignalMonitor`, a fresh fix is also requested every 2 s. Without it the signal went stale and Start stayed
    // blocked on "Searching for GPS" while the GPS was fine.
    let inFlight = false;
    const sample = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        emit(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
      } catch {
        // No fix this time: the judge decides when the signal is stale.
      } finally {
        inFlight = false;
      }
    };
    void sample();
    const timer = setInterval(() => void sample(), SAMPLE_EVERY_MS);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }
}
