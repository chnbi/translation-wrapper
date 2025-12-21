-- Supabase Schema for Translation Wrapper

-- 1. Create ENUM types for status fields to ensure data integrity.
CREATE TYPE project_status AS ENUM ('draft', 'in_progress', 'review', 'completed');
CREATE TYPE translation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE translation_source AS ENUM ('text', 'ocr', 'import');
CREATE TYPE glossary_category AS ENUM ('brand', 'technical', 'product', 'general');
CREATE TYPE element_type AS ENUM ('heading', 'paragraph', 'button', 'label', 'alt_text', 'meta', 'other');

-- 2. Create the 'projects' table.
CREATE TABLE projects (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status project_status DEFAULT 'draft'::project_status,
    -- stats_* columns replace the 'statistics' object from Mongoose.
    stats_total_items INT DEFAULT 0 NOT NULL,
    stats_approved_items INT DEFAULT 0 NOT NULL,
    stats_pending_items INT DEFAULT 0 NOT NULL,
    stats_rejected_items INT DEFAULT 0 NOT NULL
);
COMMENT ON TABLE projects IS 'Represents a single translation campaign or project.';

-- 3. Create the 'glossary' table. This is a global table not tied to projects.
CREATE TABLE glossary (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    en TEXT NOT NULL,
    bm TEXT NOT NULL,
    zh TEXT NOT NULL,
    category glossary_category DEFAULT 'general'::glossary_category,
    do_not_translate BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    version TEXT DEFAULT 'v1.0',
    -- Ensure that the English term is unique for any given version.
    UNIQUE(en, version)
);
COMMENT ON TABLE glossary IS 'Global repository for standardized brand and technical terms.';

-- 4. Create the 'translations' table.
CREATE TABLE translations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    reviewed_at TIMESTAMPTZ,
    page TEXT NOT NULL,
    section TEXT NOT NULL,
    element_type element_type NOT NULL,
    element_name TEXT,
    -- 'content' object flattened into separate columns.
    content_en TEXT NOT NULL,
    content_bm TEXT DEFAULT '',
    content_zh TEXT DEFAULT '',
    status translation_status DEFAULT 'pending'::translation_status,
    -- 'glossaryTerms' array is now a native text array.
    glossary_terms TEXT[],
    -- 'warnings' object flattened.
    warnings_bm TEXT,
    warnings_zh TEXT,
    source_type translation_source DEFAULT 'text'::translation_source,
    ocr_confidence REAL,
    reviewer TEXT,
    notes TEXT
);
COMMENT ON TABLE translations IS 'Stores individual text units for translation within a project.';
-- Add indexes for faster queries, mirroring the Mongoose schema.
CREATE INDEX ON translations (project_id, status);
CREATE INDEX ON translations (project_id, page, section);


-- 5. Enable Row Level Security (RLS) for all tables.
-- This is a crucial security step in Supabase. By default, it blocks all access.
-- We will add specific access policies (e.g., 'user can see their own projects')
-- in a later step.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
