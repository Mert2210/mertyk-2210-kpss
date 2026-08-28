class VisionProvider {
    /**
     * Extracts a structured question from an image and OCR text.
     */
    async extractQuestion(image, ocrContext) {
        throw new Error("Method 'extractQuestion()' must be implemented.");
    }

    /**
     * Analyzes the mathematical and structural intent of a question.
     */
    async analyzeQuestion(questionJson) {
        throw new Error("Method 'analyzeQuestion()' must be implemented.");
    }

    /**
     * Generates an original question based on analysis.
     */
    async generateOriginalQuestion(analysisContext) {
        throw new Error("Method 'generateOriginalQuestion()' must be implemented.");
    }
}

module.exports = VisionProvider;
