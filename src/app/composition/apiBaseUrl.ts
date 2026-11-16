import { Platform } from 'react-native';

/**
 * Where Cua API runs. Development: CuaApp-BE on this machine (`npm run dev`, port 4000). The iOS simulator reaches
 * the Mac at localhost; the Android emulator at 10.0.2.2. A physical phone needs the Mac's LAN IP instead.
 */
export function apiBaseUrl(): string {
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}
