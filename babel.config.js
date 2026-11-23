module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Unistyles reads the folders that contain StyleSheet.create calls.
    ['react-native-unistyles/plugin', { root: 'src' }],
    // `three` ships static class blocks, which Hermes does not run.
    '@babel/plugin-transform-class-static-block',
    // `@/core/...` instead of `../../../core/...`
    // `@magic-runtime/di` is vendored in packages/ (see its README): resolved here, no install step.
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@magic-runtime/di/react': './packages/magic-runtime-di/src/react.ts',
          '@magic-runtime/di': './packages/magic-runtime-di/src/index.ts',
        },
      },
    ],
  ],
  overrides: [
    {
      // `@Injectable([...])` / `@Module(...)` (@magic-runtime/di) are legacy class decorators: OUR code only. No type
      // metadata is needed (dependencies are listed explicitly). Applied to node_modules, this class-properties pass
      // runs before TypeScript is stripped and turns type-only fields such as react-native-maps'
      // `getNativeComponent!: …` into `= undefined`, shadowing the real method (Marker crash).
      include: ['./src', './packages'],
      plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['@babel/plugin-transform-class-properties', { loose: true }],
        // Reanimated 4 runs worklets on the UI thread; keep the Worklets plugin after every other plugin.
        'react-native-worklets/plugin',
      ],
    },
    {
      exclude: ['./src', './packages'],
      plugins: ['react-native-worklets/plugin'],
    },
  ],
};
