class OCRProvider {
    /**
     * Extracts text and layout information from a given page image.
     * @param {Buffer|String} image - The page image (Buffer or base64 string).
     * @returns {Promise<Object>} The OCR result containing blocks and raw text.
     */
    async extract(image) {
        throw new Error("Method 'extract()' must be implemented.");
    }
}

module.exports = OCRProvider;
