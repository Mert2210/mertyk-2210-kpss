const { GoogleGenerativeAI } = require("@google/generative-ai");
const VisionProvider = require('./provider');

class GeminiVisionAdapter extends VisionProvider {
    constructor() {
        super();
        this.apiKey = process.env.VISION_API_KEY || process.env.GEMINI_API_KEY || '';
        this.modelName = process.env.VISION_MODEL || "gemini-1.5-flash";

        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: this.modelName });
        } else {
            console.warn("⚠️ VISION_API_KEY / GEMINI_API_KEY is not set.");
            this.model = null;
        }
    }

    /**
     * Helper to enforce JSON output
     */
    async _generateJson(prompt, imageBase64 = null) {
        if (!this.model) throw new Error("Vision Model is not initialized.");

        let parts = [prompt];
        if (imageBase64) {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
        }

        const result = await this.model.generateContent(parts);
        const text = result.response.text();

        // Clean markdown backticks
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
    }

    async extractQuestion(image, ocrContext) {
        const prompt = `Aşağıdaki görsel ve OCR metnini analiz et. OCR metni yardımcı olarak verilmiştir.
Lütfen soruyu yapılandırılmış olarak çıkar ve sadece geçerli JSON döndür.
Schema: { "questionText": "", "choices": {"A":"", "B":"", "C":"", "D":"", "E":""}, "correctAnswer": "", "solution": "", "formulas": [], "visualElements": [], "questionNumber": "", "confidence": 0, "needsReview": false }

OCR Metni:
${ocrContext}
`;
        return this._generateJson(prompt, image);
    }

    async analyzeQuestion(questionJson) {
         const prompt = `Aşağıdaki sorunun kazanımını, ölçtüğü beceriyi, zorluk seviyesini ve matematiksel yapısını analiz et.
Sadece JSON döndür.
Schema: { "intent": "", "skills": [], "difficulty": "", "structure": "" }

Soru:
${JSON.stringify(questionJson, null, 2)}
`;
        return this._generateJson(prompt);
    }

    async generateOriginalQuestion(analysisContext) {
        const prompt = `Aşağıdaki analizi kullanarak TAMAMEN YENİ, BAĞIMSIZ, ÖZGÜN bir KPSS sorusu üret.
Kaynak sorunun kelimelerini, sayılarını veya cümle yapısını doğrudan kopyalama. Farklı bir bağlam kullan. Yeni şıklar ve yeni bir doğru cevap hesapla.
Sadece JSON döndür.
Schema: { "questionText": "", "choices": {"A":"", "B":"", "C":"", "D":"", "E":""}, "correctAnswer": "", "solution": "", "subject": "", "topic": "", "difficulty": "ORTA" }

Analiz:
${JSON.stringify(analysisContext, null, 2)}
`;
        return this._generateJson(prompt);
    }
}

module.exports = new GeminiVisionAdapter();
