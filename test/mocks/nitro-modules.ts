// Unit tests never load native code: the SDK adapters are replaced by fakes of the ports, and this stub only lets the
// SDK sources be imported (to test pure mapping functions).
export const NitroModules = { createHybridObject: () => ({}) };
