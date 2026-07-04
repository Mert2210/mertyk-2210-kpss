const test = require("node:test");
const assert = require("node:assert/strict");

const {
    sanitizeString,
    isValidImageDataUrl,
    isTeacherRole,
    isAdminRole,
    sanitizeQuestionReport,
    isValidEmail
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

test("sanitizeQuestionReport keeps only bounded safe question fields", () => {
    const report = sanitizeQuestionReport({
        id: "  q-1  ",
        soru: ` ${"a".repeat(1200)} `,
        dogru: 2,
        siklar: Array.from({ length: 12 }, (_, index) => ` secenek-${index} `),
        unexpected: "ignored"
    });

    assert.equal(report.id, "q-1");
    assert.equal(report.soru.length, 1000);
    assert.equal(report.dogru, "2");
    assert.equal(report.siklar.length, 10);
    assert.equal(report.siklar[0], "secenek-0");
    assert.equal(Object.hasOwn(report, "unexpected"), false);
});

test("sanitizeQuestionReport supports keyed options and rejects invalid payloads", () => {
    const report = sanitizeQuestionReport({
        not: "Gorsel soru",
        siklar: {
            " A ": " cevap ",
            "long-option-key": "x".repeat(250)
        }
    });

    assert.equal(report.soru, "Gorsel soru");
    assert.equal(report.siklar.A, "cevap");
    assert.equal(report.siklar["long-optio"].length, 200);
    assert.equal(sanitizeQuestionReport(null), null);
    assert.equal(sanitizeQuestionReport([]), null);
});

test("isValidEmail validates trimmed emails and rejects invalid values", () => {
    assert.equal(isValidEmail("  user@example.com  "), true);
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail(null), false);
    assert.equal(isValidEmail("invalid-email"), false);
    assert.equal(isValidEmail("name@domain"), false);
    assert.equal(isValidEmail("a".repeat(250) + "@x.com"), false);
});
