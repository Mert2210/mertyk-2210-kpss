const fs = require("node:fs");
const path = require("node:path");

const PUBLIC_ASSET_ROUTES = Object.freeze([
    { route: "/icon-192.png", filename: "icon-192.png" },
    { route: "/icon-512.png", filename: "icon-512.png" },
    { route: "/logo-square.png", filename: "logo-square.png" },
    { route: "/manifest.json", filename: "manifest.json" }
]);

function resolvePublicFile(baseDir, filename) {
    const publicPath = path.join(baseDir, "public", filename);
    return fs.existsSync(publicPath) ? publicPath : path.join(baseDir, filename);
}

function getCoreStaticFileMap(baseDir) {
    return {
        root: resolvePublicFile(baseDir, "index.html"),
        assetsByRoute: new Map(
            PUBLIC_ASSET_ROUTES.map(({ route, filename }) => [route, resolvePublicFile(baseDir, filename)])
        )
    };
}

module.exports = {
    PUBLIC_ASSET_ROUTES,
    resolvePublicFile,
    getCoreStaticFileMap
};
