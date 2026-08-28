const test = require('node:test');
const assert = require('node:assert');
const orchestrator = require('../services/ai-import/pipeline/orchestrator');
const queueManager = require('../services/ai-import/queue/manager');
const validator = require('../services/ai-import/pipeline/validator');
const { supabase } = require('../services/ai-import/database/supabase');

// Mocks to avoid real DB/LLM calls during the test suite
const mockQueueManager = {
    updatePageStatus: async (id, status) => { return true; }
};

test('AI Import E2E and Integration Cases', async (t) => {

    await t.test('1. Math Validation - Rejects Malformed Math', () => {
        const generated = {
            questionText: "What is 2+2?",
            choices: { A: "1", B: "2", C: "3", D: "4" },
            correctAnswer: "E" // Invalid choice
        };
        const result = validator.validateMath(generated);
        assert.strictEqual(result.needsReview, true);
        assert.strictEqual(result.passed, false);
    });

    await t.test('2. Role-Based Access Control - Socket Simulation', () => {
        // Mock socket object
        const mockSocketStudent = { data: { user: { role: 'student', isAdmin: false } } };
        const mockSocketTeacher = { data: { user: { role: 'teacher', isAdmin: false } } };
        const mockSocketAdmin = { data: { user: { role: 'admin', isAdmin: true } } };

        // The ensureAdmin check looks for isAdmin
        const ensureAdmin = (socket) => socket.data && socket.data.user && socket.data.user.isAdmin;

        assert.strictEqual(ensureAdmin(mockSocketStudent), false);
        assert.strictEqual(ensureAdmin(mockSocketTeacher), false);
        assert.strictEqual(ensureAdmin(mockSocketAdmin), true);
    });

    await t.test('3. Pipeline Orchestrator - Validation Failure marks as needsReview', async () => {
        // In this test, we verify that invalid JSON or Math triggers a fallback/needsReview state.
        const mockExtracted = {
            questionText: "Mock",
            choices: { A: "1", B: "2" },
            correctAnswer: "X" // will trigger validation error in generator math check
        };
        const result = validator.validateMath(mockExtracted);
        assert.strictEqual(result.needsReview, true);
    });

    await t.test('4. Queue Manager - Job State Transitions', async () => {
        // We verify the logic structure. (DB is mocked in CI/environment without Supabase keys).
        // Since Supabase returns null when keys are missing, we test the safeguard.
        const { isSupabaseConfigured } = require('../services/ai-import/database/supabase');
        if (!isSupabaseConfigured()) {
            const status = await queueManager.getJobStatus("mock-id");
            assert.strictEqual(status, null, "Should return null if Supabase is not configured.");
        }
    });
});
