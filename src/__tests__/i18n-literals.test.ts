import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/** No user-visible text is hard-coded in a screen: it goes through `t(...)`. A new literal fails this test. */
const SRC = join(__dirname, '..');
const ALLOWED_TEXT = new Set(['CUA']); // the brand name is not translated
const SKIP = [/\.test\.tsx?$/, /\/i18n\//];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return tsxFiles(p);
    return name.endsWith('.tsx') && !SKIP.some((re) => re.test(p)) ? [p] : [];
  });
}

describe('no hard-coded UI text', () => {
  const files = tsxFiles(SRC);

  it('props that show text are not string literals', () => {
    const found = files.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/\b(label|accessibilityLabel|placeholder|title)="([A-Za-z][^"]*)"/g)].map((m) => `${relative(SRC, f)}: ${m[0]}`),
    );
    expect(found).toEqual([]);
  });

  it('JSX text is not a literal sentence', () => {
    const found = files.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(/>\s*([A-Za-z][^<>{}\n]*[A-Za-z.!?])\s*</g)]
        .map((m) => (m[1] as string).trim())
        .filter((text) => !ALLOWED_TEXT.has(text) && !/^(import|export|return|const)\b/.test(text))
        .map((text) => `${relative(SRC, f)}: "${text}"`),
    );
    expect(found).toEqual([]);
  });
});
