const OCRProvider = require('./provider');

class PaddleOCRAdapter extends OCRProvider {
    constructor() {
        super();
        this.providerName = 'PaddleOCR-VL';
    }

    async extract(image) {
        console.log(`[OCR] Executing PaddleOCR extraction...`);
        // In a real implementation, this would spawn a Python process using
        // child_process or make an API call to an OCR service.
        // We are stubbing this out as requested.

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    rawText: "Mock OCR Text Extracted from PaddleOCR.",
                    blocks: [
                        { type: 'text', text: "Mock Soru 1", boundingBox: [0,0,100,20] }
                    ]
                });
            }, 500);
        });
    }
}

module.exports = new PaddleOCRAdapter();
