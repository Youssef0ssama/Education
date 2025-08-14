import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get courses assigned to the teacher
router.get('/assigned-courses', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { status = 'active' } = req.query;

    let whereConditions = ['ci.instructor_id = $1', 'ci.is_active = true'];
    let queryParams = [teacherId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const coursesResult = await pool.query(`
      SELECT 
        c.*,
        ci.is_primary,
        ci.assigned_date,
        ci.permissions,
        creator.name as created_by_name,
        COUNT(DISTINCT other_ci.instructor_id) as total_instructors,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_enrollments,
        c.max_students - COUNT(CASE WHEN e.status = 'active' THEN 1 END) as available_spots,
        COALESCE(
          json_agg(
            json_build_object(
              'id', co_teacher.id,
              'name', co_teacher.name,
              'email', co_teacher.email,
              'is_primary', other_ci.is_primary
            ) ORDER BY other_ci.is_primary DESC, other_ci.assigned_date ASC
          ) FILTER (WHERE other_ci.instructor_id != ci.instructor_id AND other_ci.is_active = true), 
          '[]'::json
        ) as co_instructors,
        COUNT(DISTINCT cm.id) as material_count,
        COUNT(DISTINCT a.id) as assignment_count
      FROM course_instructors ci
      JOIN courses c ON ci.course_id = c.id
      LEFT JOIN users creator ON c.created_by = creator.id
      LEFT JOIN course_instructors other_ci ON c.id = other_ci.course_id AND other_ci.is_active = true
      LEFT JOIN users co_teacher ON other_ci.instructor_id = co_teacher.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN course_materials cm ON c.id = cm.course_id AND cm.is_active = true
      LEFT JOIN assignments a ON c.id = a.course_id
      WHERE ${whereClause}
      GROUP BY c.id, ci.is_primary, ci.assigned_date, ci.permissions, creator.name
      ORDER BY ci.is_primary DESC, c.title ASC
    `, queryParams);

    res.json({
      courses: coursesResult.rows,
      total: coursesResult.rows.length
    });

  } catch (error) {
    console.error('Get assigned courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific course details (if assigned)
router.get('/courses/:courseId', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;

    // Check if teacher is assigned to this course
    const assignmentCheck = await pool.query(`
      SELECT ci.*, c.title as course_title
      FROM course_instructors ci
      JOIN courses c ON ci.course_id = c.id
      WHERE ci.course_id = $1 AND ci.instructor_id = $2 AND ci.is_active = true
    `, [courseId, teacherId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this course' });
    }

    const assignment = assignmentCheck.rows[0];

    // Get detailed course information
    const courseResult = await pool.query(`
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
              'assigned_date', ci.assigned_date,
              'permissions', ci.permissions
            ) ORDER BY ci.is_primary DESC, ci.assigned_date ASC
          ) FILTER (WHERE ci.is_active = true), 
          '[]'::json
        ) as all_instructors,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_enrollments,
        COUNT(CASE WHEN e.status = 'dropped' THEN 1 END) as dropped_enrollments,
        c.max_students - COUNT(CASE WHEN e.status = 'active' THEN 1 END) as available_spots
      FROM courses c
      LEFT JOIN users creator ON c.created_by = creator.id
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.is_active = true
      LEFT JOIN users u ON ci.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.id = $1
      GROUP BY c.id, creator.name
    `, [courseId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Get recent course activity
    const activityResult = await pool.query(`
      SELECT 
        'material_upload' as activity_type,
        cm.title as title,
        cm.upload_date as activity_date,
        uploader.name as performed_by
      FROM course_materials cm
      JOIN users uploader ON cm.uploaded_by = uploader.id
      WHERE cm.course_id = $1 AND cm.is_active = true
      
      UNION ALL
      
      SELECT 
        'assignment_created' as activity_type,
        a.title as title,
        a.created_at as activity_date,
        creator.name as performed_by
      FROM assignments a
      JOIN users creator ON a.created_by = creator.id
      WHERE a.course_id = $1
      
      UNION ALL
      
      SELECT 
        'student_enrolled' as activity_type,
        'Student enrolled: ' || student.name as title,
        e.enrollment_date as activity_date,
        student.name as performed_by
      FROM enrollments e
      JOIN users student ON e.student_id = student.id
      WHERE e.course_id = $1 AND e.status = 'active'
      
      ORDER BY activity_date DESC
      LIMIT 20
    `, [courseId]);

    res.json({
      course: {
        ...course,
        my_assignment: assignment
      },
      recent_activity: activityResult.rows
    });

  } catch (error) {
    console.error('Get course details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get students enrolled in assigned course
router.get('/courses/:courseId/students', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const { status = 'active', search } = req.query;

    // Check if teacher is assigned to this course
    const assignmentCheck = await pool.query(`
      SELECT permissions FROM course_instructors
      WHERE course_id = $1 AND instructor_id = $2 AND is_active = true
    `, [courseId, teacherId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this course' });
    }

    const permissions = assignmentCheck.rows[0].permissions;
    if (!permissions.can_manage_students) {
      return res.status(403).json({ error: 'You do not have permission to view students' });
    }

    let whereConditions = ['e.course_id = $1'];
    let queryParams = [courseId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereConditions.push(`e.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const studentsResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        e.enrollment_date,
        e.status,
        e.progress_percentage,
        e.final_grade,
        COUNT(DISTINCT s.id) as total_submissions,
        COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
        AVG(CASE WHEN s.grade IS NOT NULL THEN (s.grade / a.max_points) * 100 END) as avg_grade_percentage,
        COUNT(DISTINCT att.id) FILTER (WHERE att.status = 'present') as classes_attended,
        COUNT(DISTINCT cs.id) as total_classes,
        CASE 
          WHEN COUNT(DISTINCT cs.id) > 0 THEN 
            ROUND((COUNT(DISTINCT att.id) FILTER (WHERE att.status = 'present') * 100.0 / COUNT(DISTINCT cs.id)), 2)
          ELSE 0
        END as attendance_percentage
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN submissions s ON u.id = s.student_id
      LEFT JOIN assignments a ON s.assignment_id = a.id AND a.course_id = e.course_id
      LEFT JOIN attendance att ON u.id = att.student_id
      LEFT JOIN class_sessions cs ON att.session_id = cs.id AND cs.course_id = e.course_id
      WHERE ${whereClause}
      GROUP BY u.id, u.name, u.email, e.enrollment_date, e.status, e.progress_percentage, e.final_grade
      ORDER BY u.name ASC
    `, queryParams);

    res.json({
      students: studentsResult.rows,
      total: studentsResult.rows.length
    });

  } catch (error) {
    console.error('Get course students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get course materials (for assigned course)
router.get('/courses/:courseId/materials', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;

    // Check if teacher is assigned to this course
    const assignmentCheck = await pool.query(`
      SELECT permissions FROM course_instructors
      WHERE course_id = $1 AND instructor_id = $2 AND is_active = true
    `, [courseId, teacherId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this course' });
    }

    // Get materials using the existing content API logic
    const materialsResult = await pool.query(`
      SELECT 
        cm.*,
        mf.name as folder_name,
        uploader.name as uploaded_by_name,
        CASE 
          WHEN cm.file_size < 1024 THEN cm.file_size || ' B'
          WHEN cm.file_size < 1048576 THEN ROUND(cm.file_size / 1024.0, 1) || ' KB'
          WHEN cm.file_size < 1073741824 THEN ROUND(cm.file_size / 1048576.0, 1) || ' MB'
          ELSE ROUND(cm.file_size / 1073741824.0, 1) || ' GB'
        END as formatted_size
      FROM course_materials cm
      LEFT JOIN material_folders mf ON cm.folder_id = mf.id
      LEFT JOIN users uploader ON cm.uploaded_by = uploader.id
      WHERE cm.course_id = $1 AND cm.is_active = true
      ORDER BY cm.upload_date DESC
    `, [courseId]);

    res.json({
      materials: materialsResult.rows,
      total: materialsResult.rows.length,
      can_upload: assignmentCheck.rows[0].permissions.can_upload
    });

  } catch (error) {
    console.error('Get course materials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get assignments for assigned course
router.get('/courses/:courseId/assignments', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;

    // Check if teacher is assigned to this course
    const assignmentCheck = await pool.query(`
      SELECT permissions FROM course_instructors
      WHERE course_id = $1 AND instructor_id = $2 AND is_active = true
    `, [courseId, teacherId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this course' });
    }

    const assignmentsResult = await pool.query(`
      SELECT 
        a.*,
        creator.name as created_by_name,
        COUNT(s.id) as total_submissions,
        COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
        COUNT(CASE WHEN s.submitted_at IS NULL THEN 1 END) as pending_submissions,
        AVG(CASE WHEN s.grade IS NOT NULL THEN (s.grade / a.max_points) * 100 END) as avg_grade_percentage
      FROM assignments a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN submissions s ON a.id = s.assignment_id
      WHERE a.course_id = $1
      GROUP BY a.id, creator.name
      ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
    `, [courseId]);

    res.json({
      assignments: assignmentsResult.rows,
      total: assignmentsResult.rows.length,
      can_grade: assignmentCheck.rows[0].permissions.can_grade
    });

  } catch (error) {
    console.error('Get course assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get teacher dashboard statistics
router.get('/dashboard-stats', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT ci.course_id) as assigned_courses,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN ci.course_id END) as active_courses,
        COUNT(DISTINCT CASE WHEN ci.is_primary = true THEN ci.course_id END) as primary_courses,
        SUM(
          (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = ci.course_id AND e.status = 'active')
        ) as total_students,
        COUNT(DISTINCT cm.id) as uploaded_materials,
        COUNT(DISTINCT a.id) as created_assignments,
        COUNT(DISTINCT s.id) FILTER (WHERE s.grade IS NULL) as pending_grades
      FROM course_instructors ci
      JOIN courses c ON ci.course_id = c.id
      LEFT JOIN course_materials cm ON c.id = cm.course_id AND cm.uploaded_by = $1 AND cm.is_active = true
      LEFT JOIN assignments a ON c.id = a.course_id AND a.created_by = $1
      LEFT JOIN submissions s ON a.id = s.assignment_id
      WHERE ci.instructor_id = $1 AND ci.is_active = true
    `, [teacherId]);

    // Get recent activity across all assigned courses
    const recentActivityResult = await pool.query(`
      SELECT 
        'new_enrollment' as activity_type,
        'New student enrolled in ' || c.title as description,
        e.enrollment_date as activity_date,
        c.title as course_title
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN course_instructors ci ON c.id = ci.course_id
      WHERE ci.instructor_id = $1 AND ci.is_active = true
      AND e.enrollment_date >= NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'new_submission' as activity_type,
        'New submission for ' || a.title as description,
        s.submitted_at as activity_date,
        c.title as course_title
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN course_instructors ci ON c.id = ci.course_id
      WHERE ci.instructor_id = $1 AND ci.is_active = true
      AND s.submitted_at >= NOW() - INTERVAL '7 days'
      
      ORDER BY activity_date DESC
      LIMIT 10
    `, [teacherId]);

    res.json({
      stats: statsResult.rows[0],
      recent_activity: recentActivityResult.rows
    });

  } catch (error) {
    console.error('Get teacher dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming sessions for assigned courses
router.get('/upcoming-sessions', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { days = 7 } = req.query;

    const sessionsResult = await pool.query(`
      SELECT 
        cs.*,
        c.title as course_title,
        c.id as course_id,
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'active') as enrolled_students,
        COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'present') as expected_attendance
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN attendance a ON cs.id = a.session_id
      WHERE ci.instructor_id = $1 AND ci.is_active = true
      AND cs.scheduled_start >= NOW()
      AND cs.scheduled_start <= NOW() + INTERVAL '${days} days'
      GROUP BY cs.id, c.title, c.id
      ORDER BY cs.scheduled_start ASC
    `, [teacherId]);

    res.json({
      sessions: sessionsResult.rows,
      total: sessionsResult.rows.length
    });

  } catch (error) {
    console.error('Get upcoming sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;