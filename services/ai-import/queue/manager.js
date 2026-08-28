const { supabase, isSupabaseConfigured } = require('../database/supabase');

class QueueManager {
    constructor() {
        this.activeJobs = new Map();
    }

    async createJob(teacherEmail, classCode, fileInfo) {
        if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");

        const { data, error } = await supabase
            .from('ai_import_jobs')
            .insert([{
                teacher_email: teacherEmail,
                class_code: classCode,
                file_name: fileInfo.name,
                file_size: fileInfo.size,
                storage_path: fileInfo.path,
                status: 'queued'
            }])
            .select()
            .single();

        if (error) throw new Error(`Failed to create job: ${error.message}`);
        return data;
    }

    async getJobStatus(jobId) {
        if (!isSupabaseConfigured()) return null;

        const { data, error } = await supabase
            .from('ai_import_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error) return null;

        // Also fetch page stats
        const { data: pageStats, error: pageError } = await supabase
            .from('ai_import_pages')
            .select('status')
            .eq('job_id', jobId);

        let summary = { queued: 0, extracting: 0, generating: 0, review: 0, completed: 0, failed: 0 };
        if (!pageError && pageStats) {
            pageStats.forEach(p => {
                if (summary[p.status] !== undefined) summary[p.status]++;
            });
        }

        return { ...data, pageStats: summary };
    }

    async updateJobStatus(jobId, status, errorMessage = null) {
        if (!isSupabaseConfigured()) return;

        const updateData = { status, updated_at: new Date().toISOString() };
        if (errorMessage) updateData.error_message = errorMessage;

        await supabase
            .from('ai_import_jobs')
            .update(updateData)
            .eq('id', jobId);
    }

    async createPages(jobId, pageCount) {
        if (!isSupabaseConfigured()) return;

        const pages = [];
        for(let i = 1; i <= pageCount; i++) {
            pages.push({
                job_id: jobId,
                page_number: i,
                status: 'queued'
            });
        }

        await supabase.from('ai_import_pages').insert(pages);

        await supabase
            .from('ai_import_jobs')
            .update({ total_pages: pageCount })
            .eq('id', jobId);
    }

    async getPendingPages(limit = 5) {
         if (!isSupabaseConfigured()) return [];

         const { data, error } = await supabase
            .from('ai_import_pages')
            .select('*, ai_import_jobs!inner(status)')
            .eq('status', 'queued')
            .eq('ai_import_jobs.status', 'processing')
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error("Queue getPendingPages error:", error);
            return [];
        }
        return data;
    }

    async updatePageStatus(pageId, status, errorMessage = null) {
        if (!isSupabaseConfigured()) return;

        const updateData = { status, updated_at: new Date().toISOString() };
        if (errorMessage) updateData.error_message = errorMessage;

        await supabase
            .from('ai_import_pages')
            .update(updateData)
            .eq('id', pageId);
    }
}

module.exports = new QueueManager();
