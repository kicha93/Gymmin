const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolverMainFields = ["react-native", "browser", "main"];

const gluestackAliases = {
  "@gluestack-ui/config": path.join(
    __dirname,
    "node_modules",
    "@gluestack-ui",
    "config",
    "build",
    "gluestack-ui.config.js"
  ),
  "@gluestack-ui/themed": path.join(
    __dirname,
    "node_modules",
    "@gluestack-ui",
    "themed",
    "build",
    "index.js"
  ),
  "@gluestack-style/animation-resolver": path.join(
    __dirname,
    "src",
    "gluestackAnimationResolverShim.js"
  )
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (gluestackAliases[moduleName]) {
    return {
      filePath: gluestackAliases[moduleName],
      type: "sourceFile"
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
