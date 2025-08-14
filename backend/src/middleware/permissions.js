import pool from '../config/database.js';

// Check if user owns a resource or has admin privileges
export const checkResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Admin can access everything
      if (userRole === 'admin') {
        return next();
      }

      let ownershipQuery;
      let ownershipParams = [resourceId, userId];

      switch (resourceType) {
        case 'course':
          // Teachers can access their own courses
          ownershipQuery = 'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2';
          break;
        
        case 'enrollment':
          // Students can access their own enrollments
          ownershipQuery = 'SELECT id FROM enrollments WHERE id = $1 AND student_id = $2';
          break;
        
        case 'assignment':
          // Teachers can access assignments for their courses
          ownershipQuery = `
            SELECT a.id FROM assignments a 
            JOIN courses c ON a.course_id = c.id 
            WHERE a.id = $1 AND c.instructor_id = $2
          `;
          break;
        
        case 'submission':
          // Students can access their own submissions, teachers can access submissions for their courses
          if (userRole === 'student') {
            ownershipQuery = 'SELECT id FROM submissions WHERE id = $1 AND student_id = $2';
          } else if (userRole === 'teacher') {
            ownershipQuery = `
              SELECT s.id FROM submissions s 
              JOIN assignments a ON s.assignment_id = a.id 
              JOIN courses c ON a.course_id = c.id 
              WHERE s.id = $1 AND c.instructor_id = $2
            `;
          }
          break;
        
        default:
          return res.status(400).json({ error: 'Invalid resource type' });
      }

      const result = await pool.query(ownershipQuery, ownershipParams);
      
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: You do not own this resource' });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Check if user can access student data (parent-child relationship or admin)
export const checkStudentAccess = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin can access any student
    if (userRole === 'admin') {
      return next();
    }

    // Student can access their own data
    if (userRole === 'student' && parseInt(studentId) === userId) {
      return next();
    }

    // Parent can access their children's data
    if (userRole === 'parent') {
      const relationshipResult = await pool.query(
        'SELECT id FROM parent_student_relationships WHERE parent_id = $1 AND student_id = $2',
        [userId, studentId]
      );
      
      if (relationshipResult.rows.length > 0) {
        return next();
      }
    }

    // Teacher can access students enrolled in their courses
    if (userRole === 'teacher') {
      const enrollmentResult = await pool.query(`
        SELECT e.id FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = $1 AND c.instructor_id = $2 AND e.status = 'active'
      `, [studentId, userId]);
      
      if (enrollmentResult.rows.length > 0) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Access denied: Cannot access this student data' });
  } catch (error) {
    console.error('Student access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if user can manage course enrollments
export const checkEnrollmentPermission = async (req, res, next) => {
  try {
    const courseId = req.params.id || req.params.courseId;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Admin can manage any enrollment
    if (userRole === 'admin') {
      return next();
    }

    // Teacher can manage enrollments for their courses
    if (userRole === 'teacher') {
      const courseResult = await pool.query(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
      
      if (courseResult.rows.length > 0) {
        return next();
      }
    }

    // Student can enroll themselves (handled in the route)
    if (userRole === 'student' && req.method === 'POST') {
      return next();
    }

    return res.status(403).json({ error: 'Access denied: Cannot manage enrollments for this course' });
  } catch (error) {
    console.error('Enrollment permission check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Validate user role transitions (admin only, with restrictions)
export const validateRoleChange = (req, res, next) => {
  try {
    const { role: newRole } = req.body;
    const userRole = req.user.role;
    const targetUserId = parseInt(req.params.id);
    const requestingUserId = req.user.id;

    // Only admin can change roles
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can change user roles' });
    }

    // Admin cannot change their own role
    if (targetUserId === requestingUserId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Validate role value
    if (newRole && !['student', 'teacher', 'parent', 'admin'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    next();
  } catch (error) {
    console.error('Role change validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Rate limiting for sensitive operations
export const sensitiveOperationLimit = (maxAttempts = 5, windowMinutes = 15) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.user.id}-${req.route.path}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key);
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);
    attempts.set(key, recentAttempts);

    if (recentAttempts.length >= maxAttempts) {
      return res.status(429).json({ 
        error: `Too many attempts. Please try again in ${windowMinutes} minutes.` 
      });
    }

    // Add current attempt
    recentAttempts.push(now);
    next();
  };
};

// Data integrity checks
export const validateDataIntegrity = {
  // Ensure user cannot be deleted if they have active relationships
  checkUserDeletion: async (req, res, next) => {
    try {
      const userId = req.params.id;

      // Check for active enrollments
      const enrollmentsResult = await pool.query(
        'SELECT COUNT(*) as count FROM enrollments WHERE student_id = $1 AND status = $2',
        [userId, 'active']
      );

      // Check for courses being taught
      const coursesResult = await pool.query(
        'SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1 AND is_active = true',
        [userId]
      );

      // Check for parent-child relationships
      const relationshipsResult = await pool.query(
        'SELECT COUNT(*) as count FROM parent_student_relationships WHERE parent_id = $1 OR student_id = $1',
        [userId]
      );

      const hasActiveEnrollments = parseInt(enrollmentsResult.rows[0].count) > 0;
      const hasActiveCourses = parseInt(coursesResult.rows[0].count) > 0;
      const hasRelationships = parseInt(relationshipsResult.rows[0].count) > 0;

      if (hasActiveEnrollments || hasActiveCourses || hasRelationships) {
        return res.status(400).json({ 
          error: 'Cannot delete user with active enrollments, courses, or relationships. Deactivate instead.',
          details: {
            activeEnrollments: hasActiveEnrollments,
            activeCourses: hasActiveCourses,
            hasRelationships: hasRelationships
          }
        });
      }

      next();
    } catch (error) {
      console.error('User deletion validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Ensure course cannot be deleted if it has active enrollments
  checkCourseDeletion: async (req, res, next) => {
    try {
      const courseId = req.params.id;

      const enrollmentsResult = await pool.query(
        'SELECT COUNT(*) as count FROM enrollments WHERE course_id = $1 AND status = $2',
        [courseId, 'active']
      );

      const hasActiveEnrollments = parseInt(enrollmentsResult.rows[0].count) > 0;

      if (hasActiveEnrollments) {
        return res.status(400).json({ 
          error: 'Cannot delete course with active enrollments. Deactivate instead.',
          activeEnrollments: hasActiveEnrollments
        });
      }

      next();
    } catch (error) {
      console.error('Course deletion validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

export default {
  checkResourceOwnership,
  checkStudentAccess,
  checkEnrollmentPermission,
  validateRoleChange,
  sensitiveOperationLimit,
  validateDataIntegrity
};