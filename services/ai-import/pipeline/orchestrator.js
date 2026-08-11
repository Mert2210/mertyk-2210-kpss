const queueManager = require('../queue/manager');
const ocrAdapter = require('../ocr/paddle-adapter');
const visionAdapter = require('../vision/gemini-adapter');
const validator = require('./validator');
const generator = require('./generator');
const { supabase, isSupabaseConfigured } = require('../database/supabase');

class PipelineOrchestrator {

    async processPage(pageId, jobId, classCode) {
        if (!isSupabaseConfigured()) throw new Error("Supabase is required for orchestrator.");

        try {
            await queueManager.updatePageStatus(pageId, 'extracting');

            // 1. OCR (Mock for now, would need actual image buffer)
            const ocrResult = await ocrAdapter.extract("dummy_image_data");

            // Update page with OCR result
            await supabase.from('ai_import_pages').update({ ocr_result: ocrResult }).eq('id', pageId);

            // 2. Extract Question via LLM
            let extractedQuestion;
            try {
                extractedQuestion = await visionAdapter.extractQuestion(null, ocrResult.rawText);
            } catch (e) {
                console.error("Vision extraction failed:", e);
                // Fallback to strict OCR blocks if LLM fails (simplified)
                extractedQuestion = {
                    questionText: ocrResult.rawText,
                    choices: { A: "A", B: "B", C: "C", D: "D", E: "E" },
                    correctAnswer: "A",
                    confidence: 0,
                    needsReview: true
                };
            }

            const isValidJson = validator.validateExtractedJson(extractedQuestion);
            if (!isValidJson) throw new Error("Invalid JSON extracted from Vision model.");

            await queueManager.updatePageStatus(pageId, 'generating');

            // 3. Generate Original Question
            const generationResult = await generator.generate(extractedQuestion);

            // 4. Save to Database
            const { error: insertError } = await supabase.from('ai_questions').insert([{
                job_id: jobId,
                page_id: pageId,
                class_code: classCode,

                source_question_text: extractedQuestion.questionText,
                source_choices: extractedQuestion.choices,
                source_correct_answer: extractedQuestion.correctAnswer,

                question_text: generationResult.generatedQuestion.questionText,
                choices: generationResult.generatedQuestion.choices,
                correct_answer: generationResult.generatedQuestion.correctAnswer,
                solution: generationResult.generatedQuestion.solution,
                subject: generationResult.generatedQuestion.subject,
                topic: generationResult.generatedQuestion.topic,
                difficulty: generationResult.generatedQuestion.difficulty,

                confidence: extractedQuestion.confidence || 0,
                originality_score: generationResult.originalityValidation.originalityScore,
                needs_review: generationResult.needsReview,

                extraction_status: 'completed',
                generation_status: 'completed',
                validation_status: generationResult.needsReview ? 'failed' : 'passed',
                review_status: 'pending',

                model_used: visionAdapter.modelName
            }]);

            if (insertError) throw new Error(`DB Insert Failed: ${insertError.message}`);

            await queueManager.updatePageStatus(pageId, 'completed');

        } catch (error) {
            console.error(`Orchestrator Error for page ${pageId}:`, error);
            await queueManager.updatePageStatus(pageId, 'failed', error.message);
        }
    }
}

module.exports = new PipelineOrchestrator();
