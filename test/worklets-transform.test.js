const { execFileSync } = require('node:child_process');
const path = require('node:path');

// Run outside Jest's module mocks: exercise Metro's real transformer and this
// app's Babel config against the dependency that crashed during native startup.
it('gives the Worklets value unpacker executable init data on both native platforms', () => {
  execFileSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const path = require('node:path');
    const vm = require('node:vm');
    const { transform } = require('@react-native/metro-babel-transformer');
    const generate = require('@babel/generator').default;
    const filename = path.resolve('node_modules/react-native-worklets/src/memory/valueUnpacker.native.ts');
    for (const platform of ['ios', 'android']) {
      for (const dev of [true, false]) {
        const { ast } = transform({
          filename,
          src: fs.readFileSync(filename, 'utf8'),
          options: { projectRoot: process.cwd(), platform, dev, hot: false },
        });
        const context = vm.createContext({ exports: {} });
        vm.runInContext('globalThis.global = globalThis', context);
        vm.runInContext(generate(ast).code, context);
        const unpacker = context.exports.installValueUnpacker;
        assert.equal(typeof unpacker.__initData?.code, 'string', platform + ': missing init data');
        // Exercise the serialized function consumed by the native runtime.
        vm.runInContext(unpacker.__initData.code, context)();
        assert.equal(typeof context.__valueUnpacker, 'function');
      }
    }
  `], { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
}, 30000);
