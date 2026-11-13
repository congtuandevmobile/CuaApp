const path = require('path');
const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// The SDKs live in the sibling monorepo and are symlinked into node_modules.
const sdkRoot = path.resolve(process.env.CUA_SDK_ROOT || path.join(__dirname, '../RNPackage'));
const hasLocalSdkRepo = fs.existsSync(sdkRoot);
// The hero renders with three.js' WebGPU build (react-native-webgpu). Every `three` import, including the ones inside
// `three/addons`, must resolve to that ONE build, or the loaders would create objects of a second copy of three.
// Resolve the package root through the public entrypoint, then build file paths without traversing `exports`.
const threeRoot = path.dirname(path.dirname(require.resolve('three')));
const threeWebGPUPath = path.join(threeRoot, 'build', 'three.webgpu.js');
const threeTSLPath = path.join(threeRoot, 'build', 'three.tsl.js');

// These must exist ONCE in the bundle. The SDKs have their own copies in their monorepo's node_modules (another
// react-native version): every import of them, from anywhere, is answered from this app.
const SINGLETONS = ['react', 'react-native', 'react-native-nitro-modules'];
const isSingleton = (name) => SINGLETONS.some((s) => name === s || name.startsWith(`${s}/`));

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: hasLocalSdkRepo ? [sdkRoot] : [],
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (isSingleton(moduleName)) {
        return context.resolveRequest(
          { ...context, originModulePath: path.join(__dirname, 'index.js') },
          moduleName,
          platform,
        );
      }
      if (moduleName === 'three' || moduleName === 'three/webgpu') {
        return { type: 'sourceFile', filePath: threeWebGPUPath };
      }
      if (moduleName === 'three/tsl') {
        return { type: 'sourceFile', filePath: threeTSLPath };
      }
      if (moduleName.startsWith('three/addons/')) {
        const file = moduleName.slice('three/addons/'.length).replace(/\.js$/, '');
        return { type: 'sourceFile', filePath: path.join(threeRoot, 'examples', 'jsm', `${file}.js`) };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
    // Hero models are bundled binary glTF.
    assetExts: [...defaultConfig.resolver.assetExts, 'glb'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
