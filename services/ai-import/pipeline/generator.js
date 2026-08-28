const visionAdapter = require('../vision/gemini-adapter');
const validator = require('./validator');

class QuestionGenerator {

    async generate(extractedData) {
        console.log("[Pipeline Generator] Analyzing extracted question...");
        const analysis = await visionAdapter.analyzeQuestion(extractedData);

        console.log("[Pipeline Generator] Generating original question...");
        const generated = await visionAdapter.generateOriginalQuestion(analysis);

        console.log("[Pipeline Generator] Validating generated math...");
        const mathCheck = validator.validateMath(generated);

        console.log("[Pipeline Generator] Checking originality...");
        const originalityCheck = validator.checkOriginality(
            extractedData.questionText,
            generated.questionText
        );

        return {
            sourceAnalysis: analysis,
            generatedQuestion: generated,
            mathValidation: mathCheck,
            originalityValidation: originalityCheck,
            needsReview: mathCheck.needsReview || !originalityCheck.passed
        };
    }
}

module.exports = new QuestionGenerator();