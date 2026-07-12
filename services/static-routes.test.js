const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { PUBLIC_ASSET_ROUTES, resolvePublicFile, registerCoreStaticRoutes } = require("./static-routes");

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

test("registerCoreStaticRoutes kök ve varlık route'larını bağlar", () => {
    const routes = [];
    const app = {
        get(route, limiter, handler) {
            routes.push({ route, limiter, handler });
        }
    };
    const limiter = Symbol("limiter");
    const baseDir = "/repo";

    registerCoreStaticRoutes({ app, limiter, baseDir });

    assert.equal(routes.length, 1 + PUBLIC_ASSET_ROUTES.length);
    assert.equal(routes[0].route, "/");
    assert.equal(routes[0].limiter, limiter);
    assert.deepEqual(
        routes.slice(1).map((item) => item.route),
        PUBLIC_ASSET_ROUTES.map((item) => item.route)
    );
});

