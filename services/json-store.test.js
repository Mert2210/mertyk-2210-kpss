const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { readJsonFile, writeJsonFile, batchWriteJsonFiles } = require("./json-store");

function withTempDir(run) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "json-store-test-"));
    try {
        run(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

test("readJsonFile returns fallback when file does not exist", () => {
    withTempDir((dir) => {
        const fallback = { ok: false };
        const result = readJsonFile(path.join(dir, "missing.json"), fallback);
        assert.strictEqual(result, fallback);
    });
});

test("readJsonFile parses valid JSON content", () => {
    withTempDir((dir) => {
        const filePath = path.join(dir, "data.json");
        fs.writeFileSync(filePath, JSON.stringify({ lesson: "Tarih", count: 2 }));
        assert.deepStrictEqual(readJsonFile(filePath, null), { lesson: "Tarih", count: 2 });
    });
});

test("readJsonFile returns fallback and logs when JSON is invalid", () => {
    withTempDir((dir) => {
        const filePath = path.join(dir, "broken.json");
        fs.writeFileSync(filePath, "{invalid");
        const fallback = [];
        const originalError = console.error;
        const captured = [];
        console.error = (...args) => captured.push(args.join(" "));
        try {
            const result = readJsonFile(filePath, fallback);
            assert.strictEqual(result, fallback);
            assert.equal(captured.length > 0, true);
            assert.equal(captured[0].includes("JSON parse error"), true);
        } finally {
            console.error = originalError;
        }
    });
});

test("writeJsonFile writes pretty-printed JSON", () => {
    withTempDir((dir) => {
        const filePath = path.join(dir, "out.json");
        const value = { a: 1, b: ["x"] };
        writeJsonFile(filePath, value);
        const content = fs.readFileSync(filePath, "utf8");
        assert.equal(content, `${JSON.stringify(value, null, 2)}`);
        assert.deepStrictEqual(JSON.parse(content), value);
    });
});

test("batchWriteJsonFiles writes each entry atomically", () => {
    withTempDir((dir) => {
        const fileA = path.join(dir, "a.json");
        const fileB = path.join(dir, "b.json");
        const entries = [
            { filePath: fileA, value: { lesson: "Tarih" } },
            { filePath: fileB, value: { lesson: "Coğrafya", count: 3 } }
        ];

        batchWriteJsonFiles(entries);

        assert.deepStrictEqual(JSON.parse(fs.readFileSync(fileA, "utf8")), { lesson: "Tarih" });
        assert.deepStrictEqual(JSON.parse(fs.readFileSync(fileB, "utf8")), { lesson: "Coğrafya", count: 3 });
    });
});

test("batchWriteJsonFiles rejects non-array input", () => {
    assert.throws(
        () => batchWriteJsonFiles({ filePath: "x.json", value: {} }),
        /entries must be an array/
    );
});
