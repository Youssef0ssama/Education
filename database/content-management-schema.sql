-- Course Content Management System Database Schema

-- Table for storing course materials (files, documents, videos, etc.)
CREATE TABLE course_materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    folder_id INTEGER REFERENCES material_folders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'scheduled')),
    scheduled_date TIMESTAMP,
    tags TEXT[], -- Array of tags for categorization
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Table for organizing materials into folders
CREATE TABLE material_folders (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    parent_folder_id INTEGER REFERENCES material_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Table for creating learning modules (grouped materials)
CREATE TABLE learning_modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    prerequisite_module_id INTEGER REFERENCES learning_modules(id) ON DELETE SET NULL,
    is_sequential BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for associating materials with modules
CREATE TABLE module_materials (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    UNIQUE(module_id, material_id)
);

-- Table for tracking material access and analytics
CREATE TABLE material_access_logs (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'download', 'preview')),
    access_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER, -- For view tracking
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);

-- Table for tracking student progress through modules
CREATE TABLE module_progress (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, student_id)
);

-- Table for tracking individual material completion by students
CREATE TABLE material_completion (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    UNIQUE(material_id, student_id)
);

-- Indexes for performance optimization
CREATE INDEX idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX idx_course_materials_folder_id ON course_materials(folder_id);
CREATE INDEX idx_course_materials_visibility ON course_materials(visibility);
CREATE INDEX idx_course_materials_upload_date ON course_materials(upload_date DESC);
CREATE INDEX idx_course_materials_tags ON course_materials USING GIN(tags);

CREATE INDEX idx_material_folders_course_id ON material_folders(course_id);
CREATE INDEX idx_material_folders_parent_id ON material_folders(parent_folder_id);

CREATE INDEX idx_learning_modules_course_id ON learning_modules(course_id);
CREATE INDEX idx_learning_modules_sort_order ON learning_modules(sort_order);

CREATE INDEX idx_module_materials_module_id ON module_materials(module_id);
CREATE INDEX idx_module_materials_material_id ON module_materials(material_id);

CREATE INDEX idx_material_access_logs_material_id ON material_access_logs(material_id);
CREATE INDEX idx_material_access_logs_user_id ON material_access_logs(user_id);
CREATE INDEX idx_material_access_logs_access_date ON material_access_logs(access_date DESC);

CREATE INDEX idx_module_progress_module_id ON module_progress(module_id);
CREATE INDEX idx_module_progress_student_id ON module_progress(student_id);

CREATE INDEX idx_material_completion_material_id ON material_completion(material_id);
CREATE INDEX idx_material_completion_student_id ON material_completion(student_id);

-- Function to update material updated_date on changes
CREATE OR REPLACE FUNCTION update_material_updated_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_date
CREATE TRIGGER trigger_update_material_updated_date
    BEFORE UPDATE ON course_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_material_updated_date();

-- Function to update module progress when materials are completed
CREATE OR REPLACE FUNCTION update_module_progress()
RETURNS TRIGGER AS $$
DECLARE
    module_record RECORD;
    total_materials INTEGER;
    completed_materials INTEGER;
    new_progress INTEGER;
BEGIN
    -- Find all modules that contain this material
    FOR module_record IN 
        SELECT DISTINCT mm.module_id, mp.student_id
        FROM module_materials mm
        LEFT JOIN module_progress mp ON mm.module_id = mp.module_id
        WHERE mm.material_id = NEW.material_id
    LOOP
        -- Calculate progress for this module and student
        SELECT COUNT(*) INTO total_materials
        FROM module_materials mm
        WHERE mm.module_id = module_record.module_id;
        
        SELECT COUNT(*) INTO completed_materials
        FROM module_materials mm
        JOIN material_completion mc ON mm.material_id = mc.material_id
        WHERE mm.module_id = module_record.module_id 
        AND mc.student_id = NEW.student_id;
        
        new_progress := CASE 
            WHEN total_materials = 0 THEN 0
            ELSE (completed_materials * 100 / total_materials)
        END;
        
        -- Update or insert module progress
        INSERT INTO module_progress (module_id, student_id, progress_percentage, last_accessed)
        VALUES (module_record.module_id, NEW.student_id, new_progress, CURRENT_TIMESTAMP)
        ON CONFLICT (module_id, student_id) 
        DO UPDATE SET 
            progress_percentage = new_progress,
            last_accessed = CURRENT_TIMESTAMP,
            completed_date = CASE 
                WHEN new_progress = 100 THEN CURRENT_TIMESTAMP
                ELSE module_progress.completed_date
            END;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update module progress when materials are completed
CREATE TRIGGER trigger_update_module_progress
    AFTER INSERT ON material_completion
    FOR EACH ROW
    EXECUTE FUNCTION update_module_progress();

-- Function to check if a student can access a material based on module prerequisites
CREATE OR REPLACE FUNCTION can_access_material(
    p_student_id INTEGER,
    p_material_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    material_course_id INTEGER;
    module_record RECORD;
    prerequisite_completed BOOLEAN;
BEGIN
    -- Get the course ID for the material
    SELECT course_id INTO material_course_id
    FROM course_materials
    WHERE id = p_material_id;
    
    -- Check if student is enrolled in the course
    IF NOT EXISTS (
        SELECT 1 FROM enrollments 
        WHERE student_id = p_student_id 
        AND course_id = material_course_id 
        AND status = 'active'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check module prerequisites
    FOR module_record IN
        SELECT lm.prerequisite_module_id
        FROM module_materials mm
        JOIN learning_modules lm ON mm.module_id = lm.id
        WHERE mm.material_id = p_material_id
        AND lm.prerequisite_module_id IS NOT NULL
    LOOP
        -- Check if prerequisite module is completed
        SELECT COALESCE(mp.progress_percentage = 100, FALSE) INTO prerequisite_completed
        FROM module_progress mp
        WHERE mp.module_id = module_record.prerequisite_module_id
        AND mp.student_id = p_student_id;
        
        IF NOT prerequisite_completed THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add some sample data for testing (optional)
-- This would be removed in production
/*
INSERT INTO material_folders (course_id, name, description, created_by) VALUES
(1, 'Lecture Materials', 'Weekly lecture slides and notes', 2),
(1, 'Assignments', 'Assignment files and resources', 2),
(1, 'Additional Resources', 'Supplementary reading materials', 2);

INSERT INTO learning_modules (course_id, title, description, sort_order, created_by) VALUES
(1, 'Introduction to Course', 'Getting started materials and overview', 1, 2),
(1, 'Week 1: Fundamentals', 'Basic concepts and principles', 2, 2),
(1, 'Week 2: Advanced Topics', 'More complex material building on fundamentals', 3, 2);
*/