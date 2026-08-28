class PipelineValidator {

    validateExtractedJson(json) {
        if (!json || typeof json !== 'object') return false;
        if (!json.questionText || typeof json.questionText !== 'string') return false;

        // Ensure choices exist and have basic structure
        if (!json.choices || typeof json.choices !== 'object') return false;
        if (!json.choices.A || !json.choices.B) return false;

        return true;
    }

    validateMath(generatedQuestion) {
        // Mock math validation. In a real scenario, this would parse
        // arithmetic expressions in the question text and verify the choices.
        // For now, if there's no correct answer, it needs review.
        let needsReview = false;
        if (!generatedQuestion.correctAnswer ||
            !generatedQuestion.choices[generatedQuestion.correctAnswer]) {
            needsReview = true;
        }

        return {
            passed: !needsReview,
            needsReview: needsReview,
            reason: needsReview ? "Correct answer missing or invalid in choices." : null
        };
    }

    checkOriginality(sourceText, generatedText) {
        // Very basic string distance or token overlap check.
        // Mocking a basic Jaccard similarity-like concept.
        if (!sourceText || !generatedText) return { originalityScore: 1.0, passed: true };

        const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const srcTokens = new Set(normalize(sourceText).split('')); // character level for simple mock
        const genTokens = new Set(normalize(generatedText).split(''));

        let intersection = 0;
        for (let t of genTokens) {
            if (srcTokens.has(t)) intersection++;
        }

        const union = srcTokens.size + genTokens.size - intersection;
        const similarity = union === 0 ? 0 : intersection / union;

        const originalityScore = 1.0 - similarity;
        const passed = originalityScore > 0.3; // Allow some similarity, but not exact copy

        return {
            textSimilarity: similarity,
            structureSimilarity: similarity, // mocked
            originalityScore: originalityScore,
            passed: passed
        };
    }
}

module.exports = new PipelineValidator();