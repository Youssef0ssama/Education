-- Admin Course Management Database Schema

-- Add new columns to existing courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
ADD COLUMN IF NOT EXISTS enrollment_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS enrollment_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS prerequisites INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT false;

-- Create course_instructors table for multiple teacher assignments
CREATE TABLE IF NOT EXISTS course_instructors (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{"can_upload": true, "can_grade": true, "can_manage_students": true}',
    notes TEXT,
    UNIQUE(course_id, instructor_id)
);

-- Create course waitlist table
CREATE TABLE IF NOT EXISTS course_waitlist (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    position INTEGER,
    is_active BOOLEAN DEFAULT true,
    notified BOOLEAN DEFAULT false,
    UNIQUE(course_id, student_id)
);

-- Create course prerequisites tracking
CREATE TABLE IF NOT EXISTS course_prerequisites (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    prerequisite_course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    minimum_grade DECIMAL(5,2),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, prerequisite_course_id)
);

-- Create enrollment audit log
CREATE TABLE IF NOT EXISTS enrollment_audit_log (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE SET NULL,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    student_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'enrolled', 'dropped', 'completed', 'waitlisted'
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    metadata JSONB
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_dates ON courses(enrollment_start_date, enrollment_end_date);
CREATE INDEX IF NOT EXISTS idx_courses_prerequisites ON courses USING GIN(prerequisites);

CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor_id ON course_instructors(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_active ON course_instructors(is_active);
CREATE INDEX IF NOT EXISTS idx_course_instructors_primary ON course_instructors(is_primary);

CREATE INDEX IF NOT EXISTS idx_course_waitlist_course_id ON course_waitlist(course_id);
CREATE INDEX IF NOT EXISTS idx_course_waitlist_student_id ON course_waitlist(student_id);
CREATE INDEX IF NOT EXISTS idx_course_waitlist_position ON course_waitlist(course_id, position);

CREATE INDEX IF NOT EXISTS idx_enrollment_audit_course_id ON enrollment_audit_log(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_audit_student_id ON enrollment_audit_log(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_audit_performed_at ON enrollment_audit_log(performed_at);

-- Migrate existing data
-- Move existing instructor_id to course_instructors table
INSERT INTO course_instructors (course_id, instructor_id, is_primary, assigned_date)
SELECT id, instructor_id, true, created_at
FROM courses 
WHERE instructor_id IS NOT NULL
ON CONFLICT (course_id, instructor_id) DO NOTHING;

-- Update course status for existing courses
UPDATE courses 
SET status = 'active' 
WHERE is_active = true AND status = 'draft';

UPDATE courses 
SET status = 'archived' 
WHERE is_active = false AND status = 'draft';

-- Functions for course management

-- Function to check if student meets prerequisites
CREATE OR REPLACE FUNCTION check_course_prerequisites(
    p_student_id INTEGER,
    p_course_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    prerequisite_id INTEGER;
    has_completed BOOLEAN;
BEGIN
    -- Get all prerequisites for the course
    FOR prerequisite_id IN 
        SELECT unnest(prerequisites) FROM courses WHERE id = p_course_id
    LOOP
        -- Check if student has completed this prerequisite
        SELECT EXISTS(
            SELECT 1 FROM enrollments 
            WHERE student_id = p_student_id 
            AND course_id = prerequisite_id 
            AND status = 'completed'
        ) INTO has_completed;
        
        IF NOT has_completed THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get next waitlist position
CREATE OR REPLACE FUNCTION get_next_waitlist_position(p_course_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    next_position INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1 
    INTO next_position
    FROM course_waitlist 
    WHERE course_id = p_course_id AND is_active = true;
    
    RETURN next_position;
END;
$$ LANGUAGE plpgsql;

-- Function to promote from waitlist
CREATE OR REPLACE FUNCTION promote_from_waitlist(p_course_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    next_student_id INTEGER;
    enrollment_id INTEGER;
BEGIN
    -- Get the next student in line
    SELECT student_id INTO next_student_id
    FROM course_waitlist
    WHERE course_id = p_course_id AND is_active = true
    ORDER BY position ASC
    LIMIT 1;
    
    IF next_student_id IS NOT NULL THEN
        -- Create enrollment
        INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
        VALUES (next_student_id, p_course_id, CURRENT_TIMESTAMP, 'active')
        RETURNING id INTO enrollment_id;
        
        -- Remove from waitlist
        UPDATE course_waitlist 
        SET is_active = false, notified = true
        WHERE course_id = p_course_id AND student_id = next_student_id;
        
        -- Log the action
        INSERT INTO enrollment_audit_log (
            enrollment_id, course_id, student_id, action, 
            new_status, performed_at, reason
        ) VALUES (
            enrollment_id, p_course_id, next_student_id, 'enrolled',
            'active', CURRENT_TIMESTAMP, 'Promoted from waitlist'
        );
        
        RETURN next_student_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_modified_date
CREATE OR REPLACE FUNCTION update_course_modified_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_modified_date
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_course_modified_date();

-- Trigger to log enrollment changes
CREATE OR REPLACE FUNCTION log_enrollment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO enrollment_audit_log (
            enrollment_id, course_id, student_id, action, new_status, performed_at
        ) VALUES (
            NEW.id, NEW.course_id, NEW.student_id, 'enrolled', NEW.status, CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO enrollment_audit_log (
                enrollment_id, course_id, student_id, action, 
                old_status, new_status, performed_at
            ) VALUES (
                NEW.id, NEW.course_id, NEW.student_id, 'status_changed',
                OLD.status, NEW.status, CURRENT_TIMESTAMP
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO enrollment_audit_log (
            course_id, student_id, action, old_status, performed_at
        ) VALUES (
            OLD.course_id, OLD.student_id, 'dropped', OLD.status, CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_enrollment_changes
    AFTER INSERT OR UPDATE OR DELETE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION log_enrollment_changes();

-- Trigger to ensure only one primary instructor per course
CREATE OR REPLACE FUNCTION ensure_single_primary_instructor()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        -- Remove primary status from other instructors in the same course
        UPDATE course_instructors 
        SET is_primary = false 
        WHERE course_id = NEW.course_id 
        AND instructor_id != NEW.instructor_id 
        AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_instructor
    AFTER INSERT OR UPDATE ON course_instructors
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION ensure_single_primary_instructor();

-- View for course summary with instructor and enrollment info
CREATE OR REPLACE VIEW course_summary AS
SELECT 
    c.*,
    creator.name as created_by_name,
    COALESCE(
        json_agg(
            json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'is_primary', ci.is_primary,
                'assigned_date', ci.assigned_date
            ) ORDER BY ci.is_primary DESC, ci.assigned_date ASC
        ) FILTER (WHERE ci.is_active = true), 
        '[]'::json
    ) as instructors,
    COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
    COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_enrollments,
    COUNT(CASE WHEN e.status = 'dropped' THEN 1 END) as dropped_enrollments,
    COUNT(cw.student_id) as waitlist_count,
    c.max_students - COUNT(CASE WHEN e.status = 'active' THEN 1 END) as available_spots,
    CASE 
        WHEN c.max_students > 0 THEN 
            ROUND((COUNT(CASE WHEN e.status = 'active' THEN 1 END) * 100.0 / c.max_students), 2)
        ELSE 0
    END as enrollment_percentage
FROM courses c
LEFT JOIN users creator ON c.created_by = creator.id
LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
LEFT JOIN users u ON ci.instructor_id = u.id
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN course_waitlist cw ON c.id = cw.course_id AND cw.is_active = true
GROUP BY c.id, creator.name;

-- Sample data for testing (optional)
/*
-- Insert sample course categories
INSERT INTO course_categories (name, description) VALUES
('Programming', 'Software development and programming courses'),
('Mathematics', 'Mathematical concepts and applications'),
('Science', 'Natural sciences and research methods'),
('Business', 'Business administration and management'),
('Arts', 'Creative arts and design courses')
ON CONFLICT (name) DO NOTHING;

-- Update some existing courses with new fields
UPDATE courses 
SET 
    status = 'active',
    difficulty_level = 'intermediate',
    created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE status = 'draft' AND created_by IS NULL;
*/