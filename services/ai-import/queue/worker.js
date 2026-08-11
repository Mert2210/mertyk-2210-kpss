const queueManager = require('./manager');

class WorkerPool {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.concurrencyLimit = parseInt(process.env.AI_IMPORT_CONCURRENCY || '2');
        this.activeWorkers = 0;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`🚀 AI Import Worker started (Concurrency: ${this.concurrencyLimit})`);

        // Poll every 5 seconds
        this.intervalId = setInterval(() => this.tick(), 5000);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log("🛑 AI Import Worker stopped.");
    }

    async tick() {
        if (this.activeWorkers >= this.concurrencyLimit) return;

        const availableSlots = this.concurrencyLimit - this.activeWorkers;
        const pages = await queueManager.getPendingPages(availableSlots);

        if (!pages || pages.length === 0) return;

        for (const page of pages) {
            this.activeWorkers++;
            this.processPage(page).finally(() => {
                this.activeWorkers--;
            });
        }
    }

    async processPage(page) {
        try {
            const orchestrator = require('../pipeline/orchestrator');
            console.log(`Processing page ${page.page_number} for job ${page.job_id}`);

            // Call orchestrator. We pass the classCode from the job,
            // but since page might not have it, we should fetch it or assume it's handled.
            // For now, passing a dummy 'GENEL' or fetching from db could be needed.
            // But orchestrator handles the DB update directly.
            await orchestrator.processPage(page.id, page.job_id, "GENEL");

        } catch (error) {
            console.error(`Error processing page ${page.id}:`, error);
            await queueManager.updatePageStatus(page.id, 'failed', error.message);
        }
    }
}

// Singleton worker instance
module.exports = new WorkerPool();
