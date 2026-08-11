const fs = require('fs');

let content = fs.readFileSync('index.js', 'utf8');

const anchor = 'socket.on("addNewQuestion", async (newQ) => {';
const events = `
    // AI QUESTION IMPORT SYSTEM (Admin/Teacher restricted based on env/requirements)
    socket.on("aiImportStart", async ({ classCode, fileInfo, pilotCount }) => {
        if (!ensureTeacher(socket)) return;
        if (!AI_IMPORT_ENABLED) return socket.emit("errorMsg", "AI Import is currently disabled.");

        try {
            const userEmail = currentUser(socket).email;

            // 1. Create Job in Supabase
            const job = await aiImportQueueManager.createJob(userEmail, classCode, fileInfo);

            // 2. Create mock pages based on pilotCount (for testing purposes, assumes each page is a question)
            const pagesToProcess = parseInt(pilotCount) || 10;
            await aiImportQueueManager.createPages(job.id, pagesToProcess);

            socket.emit("aiImportStarted", { success: true, jobId: job.id, expectedPages: pagesToProcess });

        } catch (error) {
            console.error("AI Import Start Error:", error);
            socket.emit("errorMsg", "Failed to start AI Import: " + error.message);
        }
    });

    socket.on("getAiImportStatus", async (jobId) => {
        if (!ensureTeacher(socket)) return;
        if (!AI_IMPORT_ENABLED) return;

        try {
            const status = await aiImportQueueManager.getJobStatus(jobId);
            if (status) {
                socket.emit("aiImportStatusData", status);
            }
        } catch (error) {
            console.error("AI Import Status Error:", error);
        }
    });

`;

content = content.replace(anchor, events + anchor);
fs.writeFileSync('index.js', content);
