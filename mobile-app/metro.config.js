const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// C:\p is the pnpm virtual store (junction) used to shorten paths for CMake on Windows
const pnpmVirtualStore = 'C:\\p';

const config = getDefaultConfig(projectRoot);

// Add the pnpm virtual store so Metro can watch and resolve modules inside it
config.watchFolders = [
  ...(config.watchFolders || []),
  pnpmVirtualStore,
];

// Allow Metro to resolve peer deps (like react) from the project root
// when packages inside C:\p look for them
config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [
    ...(config.resolver?.nodeModulesPaths || []),
    path.join(projectRoot, 'node_modules'),
    pnpmVirtualStore,
  ],
};

module.exports = config;
