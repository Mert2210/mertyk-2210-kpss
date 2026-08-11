const test = require('node:test');
const assert = require('node:assert');

test('AI Import Pipeline Validator', async (t) => {
    const validator = require('../services/ai-import/pipeline/validator');

    await t.test('validateExtractedJson - Valid JSON', () => {
        const json = {
            questionText: "Test Soru",
            choices: { A: "1", B: "2", C: "3", D: "4", E: "5" },
            correctAnswer: "A"
        };
        assert.strictEqual(validator.validateExtractedJson(json), true);
    });

    await t.test('validateExtractedJson - Invalid JSON', () => {
        const json = { questionText: "Missing choices" };
        assert.strictEqual(validator.validateExtractedJson(json), false);
    });

    await t.test('validateMath - Needs Review when correctAnswer missing in choices', () => {
        const json = {
            questionText: "Math Test",
            choices: { A: "1", B: "2" },
            correctAnswer: "C" // missing in choices
        };
        const result = validator.validateMath(json);
        assert.strictEqual(result.needsReview, true);
    });

    await t.test('checkOriginality - Passed for distinct text', () => {
        const src = "Türkiye'nin başkenti neresidir?";
        const gen = "Hangi şehrimiz Türkiye Cumhuriyeti'nin başkentidir?";
        const result = validator.checkOriginality(src, gen);
        assert.ok(result.originalityScore > 0);
        assert.strictEqual(result.passed, true);
    });
});
