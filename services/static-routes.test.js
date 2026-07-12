const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { PUBLIC_ASSET_ROUTES, resolvePublicFile, getCoreStaticFileMap } = require("./static-routes");

function withTempDir(run) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "static-routes-test-"));
    try {
        run(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

test("resolvePublicFile public klasöründeki dosyayı önceliklendirir", () => {
    withTempDir((dir) => {
        const publicDir = path.join(dir, "public");
        fs.mkdirSync(publicDir, { recursive: true });
        const fileName = "index.html";
        fs.writeFileSync(path.join(publicDir, fileName), "public-index");
        fs.writeFileSync(path.join(dir, fileName), "root-index");

        const resolved = resolvePublicFile(dir, fileName);
        assert.equal(resolved, path.join(publicDir, fileName));
    });
});

test("resolvePublicFile public altında yoksa kök dizine düşer", () => {
    withTempDir((dir) => {
        const fileName = "manifest.json";
        fs.writeFileSync(path.join(dir, fileName), "{}");

        const resolved = resolvePublicFile(dir, fileName);
        assert.equal(resolved, path.join(dir, fileName));
    });
});

test("getCoreStaticFileMap kök ve varlık yollarını route bazında döndürür", () => {
    withTempDir((dir) => {
        const publicDir = path.join(dir, "public");
        fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(path.join(publicDir, "index.html"), "public-index");
        PUBLIC_ASSET_ROUTES.forEach(({ filename }) => {
        fs.writeFileSync(path.join(publicDir, filename), "asset");
        });

        const staticFileMap = getCoreStaticFileMap(dir);
        assert.equal(staticFileMap.root, path.join(publicDir, "index.html"));
        assert.deepEqual(
        Array.from(staticFileMap.assetsByRoute.keys()),
        PUBLIC_ASSET_ROUTES.map((item) => item.route)
        );
    });
});
