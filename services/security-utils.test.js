const test = require("node:test");
const assert = require("node:assert/strict");

const {
    sanitizeString,
    isValidImageDataUrl,
    isTeacherRole,
    isAdminRole
} = require("./security-utils");

test("sanitizeString trims, enforces max length, and rejects non-string values", () => {
    assert.equal(sanitizeString("  örnek değer  "), "örnek değer");
    assert.equal(sanitizeString("abcdef", 3), "abc");
    assert.equal(sanitizeString(42), "");
});

test("isValidImageDataUrl validates MIME/base64 format and length guards", () => {
    const valid = "data:image/png;base64,QUJDRA==";
    assert.equal(isValidImageDataUrl(valid), true);
    assert.equal(isValidImageDataUrl("data:text/plain;base64,QUJD"), false);
    assert.equal(isValidImageDataUrl("data:image/png;base64,not_base64!?"), false);
    assert.equal(isValidImageDataUrl(valid, 10), false);
});

test("role helpers correctly classify teacher/admin permissions", () => {
    assert.equal(isTeacherRole("teacher"), true);
    assert.equal(isTeacherRole("admin"), true);
    assert.equal(isTeacherRole("student"), false);
    assert.equal(isAdminRole("admin"), true);
    assert.equal(isAdminRole("teacher"), false);
});
