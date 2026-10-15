// Metro does not treat .ogg as an asset by default; the in-app "request sent" voice clips are .ogg.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("ogg");

module.exports = config;
