import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { KeyValueStore } from '@/shared/domain/ports';

/** The device storage (MMKV): synchronous, encrypted when a key is given. */
export class MmkvKeyValueStore implements KeyValueStore {
  private readonly storage: MMKV;

  constructor(id = 'cua') {
    this.storage = createMMKV({ id });
  }

  getString(key: string): string | undefined {
    return this.storage.getString(key);
  }

  setString(key: string, value: string): void {
    this.storage.set(key, value);
  }

  remove(key: string): void {
    this.storage.remove(key);
  }
}
