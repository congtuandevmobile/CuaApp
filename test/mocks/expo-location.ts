/** expo-location in tests: never granted, so the pre-start preview watcher is a no-op. */
export const PermissionStatus = { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' } as const;
export const Accuracy = { BestForNavigation: 6, High: 4 } as const;
export async function getForegroundPermissionsAsync() {
  return { status: PermissionStatus.UNDETERMINED };
}
export async function watchPositionAsync() {
  return { remove: () => undefined };
}
export async function getCurrentPositionAsync() {
  throw new Error('no location in tests');
}
