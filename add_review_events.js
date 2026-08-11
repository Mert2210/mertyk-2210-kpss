const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

const anchor = 'socket.on("addNewQuestion", async (newQ) => {';
const events = `
    socket.on("aiImportApprove", async ({ pageId, questionId }) => {
        if (!ensureTeacher(socket)) return;
        if (!AI_IMPORT_ENABLED) return;
        try {
            const { supabase } = require('./services/ai-import/database/supabase');
            await supabase.from('ai_questions').update({ review_status: 'approved' }).eq('id', questionId);
            socket.emit("successMsg", "Soru başarıyla onaylandı.");
        } catch (error) {
            socket.emit("errorMsg", "Onaylama hatası: " + error.message);
        }
    });

    socket.on("aiImportReject", async ({ pageId, questionId }) => {
        if (!ensureTeacher(socket)) return;
        if (!AI_IMPORT_ENABLED) return;
        try {
            const { supabase } = require('./services/ai-import/database/supabase');
            await supabase.from('ai_questions').update({ review_status: 'rejected' }).eq('id', questionId);
            socket.emit("successMsg", "Soru reddedildi.");
        } catch (error) {
            socket.emit("errorMsg", "Reddetme hatası: " + error.message);
        }
    });

    socket.on("aiImportRegenerate", async ({ pageId, questionId }) => {
        if (!ensureTeacher(socket)) return;
        if (!AI_IMPORT_ENABLED) return;
        // In a full implementation, this would trigger the orchestrator's generator step again.
        // For this V1, we will mock the response.
        socket.emit("successMsg", "Yeniden üretim kuyruğa alındı (Mock).");
    });

    socket.on("aiImportPublish", async (jobId) => {
        if (!ensureTeacher(socket)) return;
        if (!AI_IMPORT_ENABLED) return;
        // In V1, we simulate taking all 'approved' questions for a job and marking them 'published'
        try {
            const { supabase } = require('./services/ai-import/database/supabase');
            await supabase.from('ai_questions').update({ review_status: 'published' }).eq('job_id', jobId).eq('review_status', 'approved');
            socket.emit("successMsg", "Onaylı sorular yayınlandı.");
            // Trigger cache invalidate
            listeleriHerkesinEkranindaGuncelle();
        } catch (error) {
            socket.emit("errorMsg", "Yayınlama hatası: " + error.message);
        }
    });

`;

content = content.replace(anchor, events + anchor);
fs.writeFileSync('index.js', content);
