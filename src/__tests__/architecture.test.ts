import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';

/**
 * The dependency rule, enforced: imports only point inward (presentation -> application -> domain; infrastructure ->
 * domain). A violation fails the build, so the layers cannot erode by accident.
 */
const SRC = join(__dirname, '..');
const CONTEXTS = ['auth', 'hero', 'tracking', 'health', 'liveActivity', 'localization', 'shared'];
const FEATURE_CONTEXTS = new Set(CONTEXTS.filter((context) => context !== 'shared'));
const FEATURE_NATIVE_SDKS = ['react-native-gps-tracking', 'react-native-apple-health-sync', 'react-native-live-activity-tracking', 'expo-location'];
const PLATFORM_NATIVE_SDKS = ['react-native-mmkv', 'react-native-nitro-fetch'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const importsOf = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/^(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1] as string);

/** Resolves an import to a bounded context and layer inside src. */
function target(file: string, spec: string): { context: string; layer: string } | undefined {
  const abs = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? join(dirname(file), spec) : undefined;
  if (!abs) return undefined;
  const segments = relative(SRC, abs).split('/');
  if (segments[0] === 'features') {
    return segments[1] && segments[2] ? { context: segments[1], layer: segments[2] } : undefined;
  }
  return segments[0] && segments[1] ? { context: segments[0], layer: segments[1] } : undefined;
}

const all = CONTEXTS.flatMap((c) => {
  const root = c === 'shared' ? join(SRC, c) : join(SRC, 'features', c);
  return files(root).map((file) => ({ file, context: c, layer: relative(root, file).split('/')[0] as string }));
});
const appAndPlatform = ['app', 'core', 'platform'].flatMap((rootName) => files(join(SRC, rootName)).map((file) => ({
  file,
  context: rootName,
  layer: relative(join(SRC, rootName), file).split('/')[0] as string,
})));
const allSource = [...all, ...appAndPlatform];

const violations = (check: (v: { file: string; context: string; layer: string; spec: string; t?: ReturnType<typeof target> }) => boolean) =>
  all.flatMap(({ file, context, layer }) =>
    importsOf(file)
      .map((spec) => ({ file, context, layer, spec, t: target(file, spec) }))
      .filter(check)
      .map((v) => `${relative(SRC, v.file)} -> ${v.spec}`),
  );

describe('architecture', () => {
  it('domain depends on nothing but the domain (no framework, no SDK, no other layer)', () => {
    expect(
      violations((v) => v.layer === 'domain' && (/^(react|react-native|mobx|inversiland|@react-navigation)/.test(v.spec) || FEATURE_NATIVE_SDKS.includes(v.spec) || PLATFORM_NATIVE_SDKS.includes(v.spec) || (v.t !== undefined && v.t.layer !== 'domain'))),
    ).toEqual([]);
  });

  it('application never imports infrastructure, presentation or a native SDK', () => {
    expect(
      violations((v) => v.layer === 'application' && (FEATURE_NATIVE_SDKS.includes(v.spec) || PLATFORM_NATIVE_SDKS.includes(v.spec) || /^(react|react-native|mobx|@react-navigation)/.test(v.spec) || v.t?.layer === 'infrastructure' || v.t?.layer === 'presentation')),
    ).toEqual([]);
  });

  it('infrastructure never imports presentation', () => {
    expect(violations((v) => v.layer === 'infrastructure' && v.t?.layer === 'presentation')).toEqual([]);
  });

  it('native SDKs are imported only by infrastructure', () => {
    expect(violations((v) => FEATURE_NATIVE_SDKS.includes(v.spec) && v.layer !== 'infrastructure')).toEqual([]);
    expect(allSource.flatMap(({ file, context }) => importsOf(file).filter((spec) => PLATFORM_NATIVE_SDKS.includes(spec) && context !== 'platform').map((spec) => `${relative(SRC, file)} -> ${spec}`))).toEqual([]);
  });

  it('a context reaches into another only through its domain or application layer', () => {
    expect(violations((v) => v.t !== undefined && v.t.context !== v.context && FEATURE_CONTEXTS.has(v.t.context) && !['domain', 'application'].includes(v.t.layer) && !v.file.endsWith('Module.ts'))).toEqual([]);
  });

  it('core and shared stay feature-agnostic', () => {
    expect(allSource.flatMap(({ file, context }) => importsOf(file).filter(() => context === 'core' || context === 'shared').map((spec) => ({ file, spec, target: target(file, spec) }))).filter((v) => v.target && FEATURE_CONTEXTS.has(v.target.context)).map((v) => `${relative(SRC, v.file)} -> ${v.spec}`)).toEqual([]);
  });

  it('app navigation and composition are the only app-level feature assembly points', () => {
    expect(allSource.flatMap(({ file, context, layer }) => importsOf(file).filter((spec) => target(file, spec)?.layer === 'infrastructure' && context === 'app' && layer !== 'composition').map((spec) => `${relative(SRC, file)} -> ${spec}`))).toEqual([]);
  });
});
