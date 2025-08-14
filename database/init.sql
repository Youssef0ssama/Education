-- Initialize the education database

-- Users table with comprehensive fields
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
    phone VARCHAR(20),
    date_of_birth DATE,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parent-Student relationships
CREATE TABLE IF NOT EXISTS parent_student_relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'parent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, student_id)
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructor_id INTEGER REFERENCES users(id),
    price DECIMAL(10,2) DEFAULT 0.00,
    duration_weeks INTEGER DEFAULT 1,
    max_students INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'suspended')),
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    final_grade VARCHAR(5),
    UNIQUE(student_id, course_id)
);

-- Content management for educational materials
CREATE TABLE IF NOT EXISTS content (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('pdf', 'video', 'presentation', 'document', 'link')),
    file_url TEXT,
    file_size BIGINT,
    duration_minutes INTEGER,
    order_index INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class sessions and scheduling
CREATE TABLE IF NOT EXISTS class_sessions (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    zoom_meeting_id VARCHAR(100),
    zoom_join_url TEXT,
    zoom_password VARCHAR(50),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    join_time TIMESTAMP,
    leave_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id)
);

-- Financial transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id),
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'discount')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    payment_method VARCHAR(50),
    payment_gateway_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discount coupons
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0.00,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student performance and grades
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    max_points DECIMAL(5,2) DEFAULT 100.00,
    assignment_type VARCHAR(50) DEFAULT 'homework',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_url TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade DECIMAL(5,2),
    feedback TEXT,
    graded_by INTEGER REFERENCES users(id),
    graded_at TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Communication system
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    message_type VARCHAR(50) DEFAULT 'direct' CHECK (message_type IN ('direct', 'announcement', 'system')),
    parent_message_id INTEGER REFERENCES messages(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    notification_type VARCHAR(50) DEFAULT 'info' CHECK (notification_type IN ('info', 'warning', 'success', 'error')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data with hashed passwords (password123 for all accounts)
-- These are bcrypt hashes for 'password123'
INSERT INTO users (name, email, password_hash, role, phone) VALUES 
    ('Admin User', 'admin@education.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '+1234567890'),
    ('Jane Smith', 'jane.teacher@education.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', '+1234567891'),
    ('John Doe', 'john.student@education.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '+1234567892'),
    ('Mary Parent', 'mary.parent@education.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'parent', '+1234567893'),
    ('Bob Student', 'bob.student@education.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', '+1234567894')
ON CONFLICT (email) DO NOTHING;

-- Create parent-student relationship
INSERT INTO parent_student_relationships (parent_id, student_id) VALUES 
    (4, 3), (4, 5)
ON CONFLICT DO NOTHING;

-- Insert sample courses
INSERT INTO courses (title, description, instructor_id, price, duration_weeks, max_students) VALUES 
    ('Introduction to Programming', 'Learn the basics of programming with Python', 2, 299.99, 8, 25),
    ('Web Development Fundamentals', 'Build modern web applications with HTML, CSS, and JavaScript', 2, 399.99, 12, 20),
    ('Data Science for Beginners', 'Introduction to data analysis and visualization', 2, 499.99, 10, 15)
ON CONFLICT DO NOTHING;

-- Insert sample enrollments
INSERT INTO enrollments (student_id, course_id, progress_percentage) VALUES 
    (3, 1, 45.5), (5, 1, 23.0), (3, 2, 78.2)
ON CONFLICT DO NOTHING;

-- Insert sample content
INSERT INTO content (course_id, title, description, content_type, order_index, created_by) VALUES 
    (1, 'Course Introduction', 'Welcome to Programming 101', 'video', 1, 2),
    (1, 'Python Basics PDF', 'Comprehensive guide to Python syntax', 'pdf', 2, 2),
    (2, 'HTML Fundamentals', 'Introduction to HTML structure', 'video', 1, 2)
ON CONFLICT DO NOTHING;