# Admin-Controlled Course Management Design

## Overview

This system implements a centralized course management approach where administrators have full control over course creation and teacher assignments, while maintaining clear separation of responsibilities between admins, teachers, and students.

## Architecture

### Database Schema Changes

#### Enhanced course_instructors Table
```sql
CREATE TABLE course_instructors (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'instructor', -- 'lead_instructor', 'instructor', 'assistant'
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{"can_upload": true, "can_grade": true, "can_manage_students": true}',
    UNIQUE(course_id, instructor_id)
);
```

#### Enhanced courses Table
```sql
ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'; -- 'draft', 'active', 'archived'
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_start_date TIMESTAMP;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_end_date TIMESTAMP;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisite_course_ids INTEGER[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_modified_by INTEGER REFERENCES users(id);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### API Endpoints

#### Admin Course Management
```
POST   /api/admin/courses                    # Create new course
PUT    /api/admin/courses/:id                # Update course details
DELETE /api/admin/courses/:id                # Archive course
POST   /api/admin/courses/:id/instructors    # Assign teachers
DELETE /api/admin/courses/:id/instructors/:instructorId # Remove teacher
GET    /api/admin/courses/analytics          # Course performance analytics
```

#### Teacher Course Access
```
GET    /api/teacher/assigned-courses         # Get assigned courses
GET    /api/teacher/courses/:id              # Get course details if assigned
POST   /api/teacher/courses/:id/materials    # Upload materials (if assigned)
```

#### Student Course Browsing
```
GET    /api/student/available-courses        # Browse all active courses
POST   /api/student/courses/:id/enroll       # Enroll in course
GET    /api/student/enrolled-courses         # Get enrolled courses
```

## Components and Interfaces

### Admin Interface Components

#### AdminCourseManager
```jsx
const AdminCourseManager = () => {
  // Features:
  // - Course creation form with all details
  // - Teacher assignment interface
  // - Course status management (draft/active/archived)
  // - Enrollment settings and capacity management
  // - Course analytics and reporting
}
```

#### TeacherAssignmentModal
```jsx
const TeacherAssignmentModal = ({ courseId, currentInstructors }) => {
  // Features:
  // - Search and select teachers
  // - Define instructor roles and permissions
  // - Bulk assignment operations
  // - Assignment history tracking
}
```

### Teacher Interface Components

#### TeacherAssignedCourses
```jsx
const TeacherAssignedCourses = () => {
  // Features:
  // - Display assigned courses with role information
  // - Quick access to course management
  // - Collaboration indicators for multi-teacher courses
  // - Assignment notifications and updates
}
```

### Student Interface Components

#### StudentCourseBrowser
```jsx
const StudentCourseBrowser = () => {
  // Features:
  // - Browse all available courses
  // - Filter by category, instructor, difficulty
  // - Course details with instructor information
  // - Enrollment interface with capacity checking
  // - Waitlist functionality for full courses
}
```

#### StudentEnrolledCourses
```jsx
const StudentEnrolledCourses = () => {
  // Features:
  // - Display enrolled courses with progress
  // - Quick access to course materials
  // - Upcoming deadlines and notifications
  // - Instructor contact information
}
```

## Data Flow

### Course Creation Flow
1. Admin creates course with basic details
2. System creates course in 'draft' status
3. Admin assigns teachers with specific roles
4. System sends notifications to assigned teachers
5. Admin activates course when ready
6. Course becomes visible to students

### Teacher Assignment Flow
1. Admin selects course and teachers
2. System validates teacher availability
3. System creates course_instructors records
4. System sends assignment notifications
5. Teachers see course in their dashboard
6. Teachers gain access to course management tools

### Student Enrollment Flow
1. Student browses available courses
2. System shows course details and instructors
3. Student initiates enrollment
4. System checks capacity and prerequisites
5. System processes enrollment or adds to waitlist
6. Student gains access to course materials

## Security and Permissions

### Role-Based Access Control
- **Admin**: Full course management, teacher assignments, system analytics
- **Teacher**: Access only to assigned courses, content management within permissions
- **Student**: Browse active courses, enroll in available courses, access enrolled content

### Permission Matrix
| Action | Admin | Lead Teacher | Teacher | Assistant | Student |
|--------|-------|--------------|---------|-----------|---------|
| Create Course | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign Teachers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload Materials | ✅ | ✅ | ✅ | ✅* | ❌ |
| Grade Assignments | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Students | ✅ | ✅ | ✅* | ❌ | ❌ |
| View Analytics | ✅ | ✅ | ✅* | ❌ | ❌ |
| Enroll in Course | ❌ | ❌ | ❌ | ❌ | ✅ |

*Based on assigned permissions

## Performance Considerations

### Caching Strategy
- Cache course listings for students
- Cache teacher assignments for quick dashboard loading
- Cache enrollment counts for capacity checking
- Invalidate caches on course updates

### Database Optimization
- Index on course status for student browsing
- Index on instructor assignments for teacher dashboard
- Composite indexes for enrollment queries
- Partitioning for large course catalogs

## Monitoring and Analytics

### Key Metrics
- Course creation and activation rates
- Teacher assignment distribution
- Student enrollment patterns
- Course completion rates
- Material upload frequency

### Reporting Features
- Course performance dashboards
- Teacher workload analysis
- Student engagement metrics
- Enrollment trend analysis
- Revenue and capacity utilization

## Migration Strategy

### Phase 1: Database Updates
- Add new columns to existing tables
- Create course_instructors table
- Migrate existing instructor_id to course_instructors
- Update indexes and constraints

### Phase 2: API Updates
- Implement new admin endpoints
- Update teacher endpoints for assignment checking
- Enhance student endpoints for course browsing
- Maintain backward compatibility

### Phase 3: Frontend Updates
- Update admin interface with course management
- Enhance teacher dashboard with assigned courses
- Improve student course browsing experience
- Add collaboration features for multi-teacher courses

### Phase 4: Testing and Rollout
- Comprehensive testing of all user flows
- Performance testing with large course catalogs
- User acceptance testing with each role
- Gradual rollout with feature flags