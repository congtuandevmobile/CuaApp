module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Unistyles reads the folders that contain StyleSheet.create calls.
    ['react-native-unistyles/plugin', { root: 'src' }],
    // `three` ships static class blocks, which Hermes does not run.
    '@babel/plugin-transform-class-static-block',
    // `@/core/...` instead of `../../../core/...`
    ['module-resolver', { root: ['./src'], alias: { '@': './src' } }],
  ],
  overrides: [
    {
      // Inversiland (InversifyJS) needs parameter metadata and legacy decorators: OUR code only. Applied to
      // node_modules, this class-properties pass runs before TypeScript is stripped and turns type-only fields such
      // as react-native-maps' `getNativeComponent!: …` into `= undefined`, shadowing the real method (Marker crash).
      include: './src',
      plugins: [
        'babel-plugin-transform-typescript-metadata',
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['@babel/plugin-transform-class-properties', { loose: true }],
      ],
    },
  ],
};
