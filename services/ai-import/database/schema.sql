-- AI Question Import System - Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for tracking PDF import jobs
CREATE TABLE IF NOT EXISTS ai_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_email VARCHAR(255) NOT NULL,
    class_code VARCHAR(20) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, paused, completed, failed, cancelled
    total_pages INT DEFAULT 0,
    processed_pages INT DEFAULT 0,
    total_questions_extracted INT DEFAULT 0,
    total_questions_approved INT DEFAULT 0,
    total_questions_rejected INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking individual pages of a job
CREATE TABLE IF NOT EXISTS ai_import_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES ai_import_jobs(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    status VARCHAR(50) DEFAULT 'queued', -- queued, extracting, generating, review, completed, failed
    ocr_result JSONB,
    extracted_image_url TEXT,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing the actual questions (both extracted and generated)
CREATE TABLE IF NOT EXISTS ai_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES ai_import_jobs(id) ON DELETE CASCADE,
    page_id UUID REFERENCES ai_import_pages(id) ON DELETE CASCADE,
    class_code VARCHAR(20) NOT NULL,

    -- Extracted (Source) Data
    source_question_text TEXT,
    source_choices JSONB,
    source_correct_answer VARCHAR(10),
    source_visual_elements JSONB,
    source_formulas JSONB,
    source_image_url TEXT,

    -- AI Generated Data (The Independent Question)
    question_text TEXT NOT NULL,
    choices JSONB NOT NULL,
    correct_answer VARCHAR(10) NOT NULL,
    solution TEXT,
    subject VARCHAR(100),
    topic VARCHAR(200),
    subtopic VARCHAR(200),
    difficulty VARCHAR(50) DEFAULT 'ORTA',
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    image_url TEXT,

    -- Metadata & Status
    confidence NUMERIC(5,2) DEFAULT 0,
    originality_score NUMERIC(5,2) DEFAULT 0,
    needs_review BOOLEAN DEFAULT true,
    extraction_status VARCHAR(50),
    generation_status VARCHAR(50),
    validation_status VARCHAR(50),

    -- Teacher Review
    review_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, edited

    -- AI Tracking
    model_used VARCHAR(100),
    prompt_version VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_jobs_teacher ON ai_import_jobs(teacher_email);
CREATE INDEX IF NOT EXISTS idx_ai_pages_job ON ai_import_pages(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_questions_job ON ai_questions(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_questions_class ON ai_questions(class_code);
CREATE INDEX IF NOT EXISTS idx_ai_questions_review ON ai_questions(review_status);
