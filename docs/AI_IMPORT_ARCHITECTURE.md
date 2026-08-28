# AI Question Import System - Technical Architecture & Guide

## 1. Architecture Overview
- **Storage/DB:** Supabase (PostgreSQL) is the primary store for AI Import jobs, pages, and questions. Legacy JSON files (`questions.json`) remain fully functional and are merged at runtime if AI import is enabled.
- **Worker & Queue:** Uses a background process orchestrated by `services/ai-import/queue/worker.js` alongside a database-backed queue (`ai_import_jobs`, `ai_import_pages`) for persistence across server restarts. Concurrency is limited to prevent event loop blocking.
- **Providers:**
  - **OCR:** Stubbed `PaddleOCRAdapter` ready for integration.
  - **Vision/LLM:** `GeminiVisionAdapter` utilizing Google Generative AI to extract structures and generate independent original questions via JSON schema forcing.
- **Validation:** Strict Pipeline Validator logic checks for math consistency (arithmetic/formulas) and originality (ensuring source text isn't verbatim copied).
- **Access Control:** V1 strictly limits all AI Question Import operations (upload, pilot, approve, reject, publish) to the **Admin** role. Teachers cannot yet initiate these actions.

## 2. Environment Variables Required
Ensure the following variables are present in your `.env`:
```
AI_IMPORT_ENABLED=true
AI_IMPORT_CONCURRENCY=2
VISION_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Database Schema & Migrations
You must manually execute the schema file provided to set up the necessary tables in your Supabase SQL Editor.
- **File:** `services/ai-import/database/schema.sql`
- **Tables created:** `ai_import_jobs`, `ai_import_pages`, `ai_questions`.
- **Purpose:** Tracks job states, page-by-page progress, and stores extracted vs generated question data.

## 4. Job Lifecycle & Transitions
1. **Queued:** Admin uploads a file/requests a Pilot. Job and N pages are created in DB.
2. **Processing/Extracting:** Worker picks up a page. OCR and Vision model attempt extraction.
3. **Generating:** Pipeline generates the new original question and validates it.
4. **Review:** Page is marked complete; question marked `pending` review.
5. **Approved/Rejected:** Admin reviews via UI.
6. **Published:** Admin hits "Onaylananları Yayınla", merging them into active question pools.

## 5. Pilot Modes (10/50 Questions)
To limit costs and verify extraction accuracy, Admin users should utilize the Pilot buttons in the Teacher Dashboard (Admin View):
- Click **10 Soru Pilot** or **50 Soru Pilot**.
- The system will mock reading the first N pages and run them through the background worker.
- Monitor the queue via the status text and wait for the Review Queue to populate.

## 6. How to Run and Test
- **Start Backend:** `npm start` (or `node index.js`).
- **Run AI Pipeline Tests:** `node --test utils/ai-import-e2e.test.js` and `node --test utils/ai-import.test.js`.
- **Troubleshooting:**
  - `MODULE_NOT_FOUND`: Run `npm install express @supabase/supabase-js @google/generative-ai`.
  - Supabase Warnings: Ensure `.env` is loaded or the variables are passed in the execution environment.
  - Generation Failures: Check `ai_questions.validation_status` or `needs_review` flags in DB for malformed math logic.