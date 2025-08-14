import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/course-materials');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    // Audio
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Helper function to get file type category
const getFileTypeCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf')) return 'pdf';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'presentation';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'spreadsheet';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return 'archive';
  return 'other';
};

// Upload course material
router.post('/courses/:courseId/materials/upload', 
  authenticateToken, 
  requireRole(['teacher', 'admin']), 
  upload.array('files', 10),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { 
        title, 
        description, 
        folderId, 
        visibility = 'public', 
        scheduledDate,
        tags 
      } = req.body;
      
      const userId = req.user.id;

      // Verify user has access to this course
      const courseCheck = await pool.query(`
        SELECT id FROM courses 
        WHERE id = $1 AND (instructor_id = $2 OR $3 = 'admin')
      `, [courseId, userId, req.user.role]);

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Verify folder belongs to this course if specified
      if (folderId) {
        const folderCheck = await pool.query(`
          SELECT id FROM material_folders 
          WHERE id = $1 AND course_id = $2
        `, [folderId, courseId]);

        if (folderCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid folder for this course' });
        }
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadedMaterials = [];

      // Process each uploaded file
      for (const file of req.files) {
        const fileTypeCategory = getFileTypeCategory(file.mimetype);
        const relativePath = path.relative(
          path.join(__dirname, '../../'),
          file.path
        );

        // Parse tags if provided
        let parsedTags = [];
        if (tags) {
          try {
            parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
          } catch (e) {
            parsedTags = typeof tags === 'string' ? [tags] : [];
          }
        }

        // Insert material record into database
        const result = await pool.query(`
          INSERT INTO course_materials (
            course_id, folder_id, title, description, file_name, file_path,
            file_type, file_size, mime_type, visibility, scheduled_date,
            tags, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [
          courseId,
          folderId || null,
          title || file.originalname,
          description || null,
          file.originalname,
          relativePath,
          fileTypeCategory,
          file.size,
          file.mimetype,
          visibility,
          scheduledDate || null,
          parsedTags,
          userId
        ]);

        uploadedMaterials.push(result.rows[0]);
      }

      res.status(201).json({
        message: 'Files uploaded successfully',
        materials: uploadedMaterials
      });

    } catch (error) {
      console.error('File upload error:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error cleaning up file:', unlinkError);
          }
        }
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size is 100MB.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Maximum is 10 files per upload.' });
      }
      if (error.message.includes('File type') && error.message.includes('not allowed')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error during file upload' });
    }
  }
);

// Serve/download course material
router.get('/courses/:courseId/materials/:materialId/download',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Get material information
      const materialResult = await pool.query(`
        SELECT cm.*, c.instructor_id
        FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        WHERE cm.id = $1 AND cm.course_id = $2 AND cm.is_active = true
      `, [materialId, courseId]);

      if (materialResult.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const material = materialResult.rows[0];

      // Check access permissions
      let hasAccess = false;

      if (userRole === 'admin' || material.instructor_id === userId) {
        hasAccess = true;
      } else if (userRole === 'student') {
        // Check if student is enrolled and material is accessible
        const enrollmentCheck = await pool.query(`
          SELECT 1 FROM enrollments 
          WHERE student_id = $1 AND course_id = $2 AND status = 'active'
        `, [userId, courseId]);

        if (enrollmentCheck.rows.length > 0) {
          // Check visibility and scheduling
          if (material.visibility === 'public') {
            hasAccess = true;
          } else if (material.visibility === 'scheduled' && material.scheduled_date) {
            hasAccess = new Date() >= new Date(material.scheduled_date);
          }

          // Check module prerequisites if applicable
          if (hasAccess) {
            const canAccess = await pool.query(`
              SELECT can_access_material($1, $2) as can_access
            `, [userId, materialId]);
            
            hasAccess = canAccess.rows[0]?.can_access || false;
          }
        }
      } else if (userRole === 'parent') {
        // Check if parent has a child enrolled in the course
        const childCheck = await pool.query(`
          SELECT 1 FROM parent_children pc
          JOIN enrollments e ON pc.child_id = e.student_id
          WHERE pc.parent_id = $1 AND e.course_id = $2 AND e.status = 'active'
        `, [userId, courseId]);

        if (childCheck.rows.length > 0 && material.visibility === 'public') {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this material' });
      }

      // Log the access
      await pool.query(`
        INSERT INTO material_access_logs (material_id, user_id, access_type, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        materialId,
        userId,
        'download',
        req.ip,
        req.get('User-Agent')
      ]);

      // Update download count
      await pool.query(`
        UPDATE course_materials 
        SET download_count = download_count + 1 
        WHERE id = $1
      `, [materialId]);

      // Serve the file
      const filePath = path.join(__dirname, '../../', material.file_path);
      
      try {
        await fs.access(filePath);
        res.download(filePath, material.file_name);
      } catch (fileError) {
        console.error('File not found:', fileError);
        res.status(404).json({ error: 'File not found on server' });
      }

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Stream/preview course material (for videos, PDFs, etc.)
router.get('/courses/:courseId/materials/:materialId/preview',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const userId = req.user.id;

      // Similar access check as download
      const materialResult = await pool.query(`
        SELECT cm.*, c.instructor_id
        FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        WHERE cm.id = $1 AND cm.course_id = $2 AND cm.is_active = true
      `, [materialId, courseId]);

      if (materialResult.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const material = materialResult.rows[0];

      // Access control logic (same as download)
      let hasAccess = false;
      const userRole = req.user.role;

      if (userRole === 'admin' || material.instructor_id === userId) {
        hasAccess = true;
      } else if (userRole === 'student') {
        const enrollmentCheck = await pool.query(`
          SELECT 1 FROM enrollments 
          WHERE student_id = $1 AND course_id = $2 AND status = 'active'
        `, [userId, courseId]);

        if (enrollmentCheck.rows.length > 0) {
          if (material.visibility === 'public') {
            hasAccess = true;
          } else if (material.visibility === 'scheduled' && material.scheduled_date) {
            hasAccess = new Date() >= new Date(material.scheduled_date);
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this material' });
      }

      // Log the preview access
      await pool.query(`
        INSERT INTO material_access_logs (material_id, user_id, access_type, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        materialId,
        userId,
        'preview',
        req.ip,
        req.get('User-Agent')
      ]);

      // Update view count
      await pool.query(`
        UPDATE course_materials 
        SET view_count = view_count + 1 
        WHERE id = $1
      `, [materialId]);

      // Serve file for preview (with appropriate headers)
      const filePath = path.join(__dirname, '../../', material.file_path);
      
      try {
        await fs.access(filePath);
        
        // Set appropriate headers for preview
        res.setHeader('Content-Type', material.mime_type);
        res.setHeader('Content-Disposition', 'inline');
        
        // For videos, support range requests
        if (material.file_type === 'video') {
          const stat = await fs.stat(filePath);
          const fileSize = stat.size;
          const range = req.headers.range;

          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', chunksize);

            const stream = (await import('fs')).createReadStream(filePath, { start, end });
            stream.pipe(res);
          } else {
            res.setHeader('Content-Length', fileSize);
            const stream = (await import('fs')).createReadStream(filePath);
            stream.pipe(res);
          }
        } else {
          res.sendFile(filePath);
        }
      } catch (fileError) {
        console.error('File not found:', fileError);
        res.status(404).json({ error: 'File not found on server' });
      }

    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get upload progress (for chunked uploads - future enhancement)
router.get('/upload-progress/:uploadId', 
  authenticateToken,
  (req, res) => {
    // This would be implemented with a more sophisticated upload system
    // For now, return a placeholder
    res.json({ progress: 100, status: 'completed' });
  }
);

// Get all materials for a course
router.get('/courses/:courseId/materials',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { folderId, visibility, fileType, search, tags } = req.query;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check access to course
      let accessQuery = '';
      let accessParams = [courseId];

      if (userRole === 'admin') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1';
      } else if (userRole === 'teacher') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2';
        accessParams.push(userId);
      } else if (userRole === 'student') {
        accessQuery = `
          SELECT c.id FROM courses c
          JOIN enrollments e ON c.id = e.course_id
          WHERE c.id = $1 AND e.student_id = $2 AND e.status = 'active'
        `;
        accessParams.push(userId);
      } else if (userRole === 'parent') {
        accessQuery = `
          SELECT DISTINCT c.id FROM courses c
          JOIN enrollments e ON c.id = e.course_id
          JOIN parent_children pc ON e.student_id = pc.child_id
          WHERE c.id = $1 AND pc.parent_id = $2 AND e.status = 'active'
        `;
        accessParams.push(userId);
      }

      const courseCheck = await pool.query(accessQuery, accessParams);
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Build materials query with filters
      let whereConditions = ['cm.course_id = $1', 'cm.is_active = true'];
      let queryParams = [courseId];
      let paramIndex = 2;

      // Folder filter
      if (folderId) {
        if (folderId === 'root') {
          whereConditions.push('cm.folder_id IS NULL');
        } else {
          whereConditions.push(`cm.folder_id = $${paramIndex}`);
          queryParams.push(folderId);
          paramIndex++;
        }
      }

      // Visibility filter (only for teachers/admins)
      if (visibility && ['teacher', 'admin'].includes(userRole)) {
        whereConditions.push(`cm.visibility = $${paramIndex}`);
        queryParams.push(visibility);
        paramIndex++;
      } else if (userRole === 'student') {
        // Students only see public and scheduled materials that are available
        whereConditions.push(`(
          cm.visibility = 'public' OR 
          (cm.visibility = 'scheduled' AND cm.scheduled_date <= NOW())
        )`);
      }

      // File type filter
      if (fileType) {
        whereConditions.push(`cm.file_type = $${paramIndex}`);
        queryParams.push(fileType);
        paramIndex++;
      }

      // Search filter
      if (search) {
        whereConditions.push(`(
          cm.title ILIKE $${paramIndex} OR 
          cm.description ILIKE $${paramIndex} OR
          cm.file_name ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Tags filter
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        whereConditions.push(`cm.tags && $${paramIndex}`);
        queryParams.push(tagArray);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const materialsResult = await pool.query(`
        SELECT 
          cm.*,
          mf.name as folder_name,
          u.name as uploaded_by_name,
          CASE 
            WHEN cm.file_size < 1024 THEN cm.file_size || ' B'
            WHEN cm.file_size < 1048576 THEN ROUND(cm.file_size / 1024.0, 1) || ' KB'
            WHEN cm.file_size < 1073741824 THEN ROUND(cm.file_size / 1048576.0, 1) || ' MB'
            ELSE ROUND(cm.file_size / 1073741824.0, 1) || ' GB'
          END as formatted_size
        FROM course_materials cm
        LEFT JOIN material_folders mf ON cm.folder_id = mf.id
        LEFT JOIN users u ON cm.uploaded_by = u.id
        WHERE ${whereClause}
        ORDER BY cm.upload_date DESC
      `, queryParams);

      res.json({
        materials: materialsResult.rows,
        total: materialsResult.rows.length
      });

    } catch (error) {
      console.error('Get materials error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get single material details
router.get('/courses/:courseId/materials/:materialId',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check access and get material
      const materialResult = await pool.query(`
        SELECT 
          cm.*,
          mf.name as folder_name,
          u.name as uploaded_by_name,
          c.instructor_id,
          CASE 
            WHEN cm.file_size < 1024 THEN cm.file_size || ' B'
            WHEN cm.file_size < 1048576 THEN ROUND(cm.file_size / 1024.0, 1) || ' KB'
            WHEN cm.file_size < 1073741824 THEN ROUND(cm.file_size / 1048576.0, 1) || ' MB'
            ELSE ROUND(cm.file_size / 1073741824.0, 1) || ' GB'
          END as formatted_size
        FROM course_materials cm
        LEFT JOIN material_folders mf ON cm.folder_id = mf.id
        LEFT JOIN users u ON cm.uploaded_by = u.id
        JOIN courses c ON cm.course_id = c.id
        WHERE cm.id = $1 AND cm.course_id = $2 AND cm.is_active = true
      `, [materialId, courseId]);

      if (materialResult.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const material = materialResult.rows[0];

      // Check access permissions
      let hasAccess = false;

      if (userRole === 'admin' || material.instructor_id === userId) {
        hasAccess = true;
      } else if (userRole === 'student') {
        const enrollmentCheck = await pool.query(`
          SELECT 1 FROM enrollments 
          WHERE student_id = $1 AND course_id = $2 AND status = 'active'
        `, [userId, courseId]);

        if (enrollmentCheck.rows.length > 0) {
          if (material.visibility === 'public') {
            hasAccess = true;
          } else if (material.visibility === 'scheduled' && material.scheduled_date) {
            hasAccess = new Date() >= new Date(material.scheduled_date);
          }
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this material' });
      }

      res.json({ material });

    } catch (error) {
      console.error('Get material error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update material metadata
router.put('/courses/:courseId/materials/:materialId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const { 
        title, 
        description, 
        folderId, 
        visibility, 
        scheduledDate, 
        tags 
      } = req.body;
      const userId = req.user.id;

      // Verify access to course and material
      const materialCheck = await pool.query(`
        SELECT cm.*, c.instructor_id
        FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        WHERE cm.id = $1 AND cm.course_id = $2 AND cm.is_active = true
      `, [materialId, courseId]);

      if (materialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const material = materialCheck.rows[0];

      if (req.user.role !== 'admin' && material.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verify folder belongs to this course if specified
      if (folderId) {
        const folderCheck = await pool.query(`
          SELECT id FROM material_folders 
          WHERE id = $1 AND course_id = $2
        `, [folderId, courseId]);

        if (folderCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid folder for this course' });
        }
      }

      // Parse tags
      let parsedTags = material.tags;
      if (tags !== undefined) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (e) {
          parsedTags = typeof tags === 'string' ? [tags] : [];
        }
      }

      // Update material
      const updateResult = await pool.query(`
        UPDATE course_materials 
        SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          folder_id = $3,
          visibility = COALESCE($4, visibility),
          scheduled_date = $5,
          tags = COALESCE($6, tags),
          updated_date = CURRENT_TIMESTAMP
        WHERE id = $7 AND course_id = $8
        RETURNING *
      `, [
        title,
        description,
        folderId || null,
        visibility,
        scheduledDate || null,
        parsedTags,
        materialId,
        courseId
      ]);

      res.json({
        message: 'Material updated successfully',
        material: updateResult.rows[0]
      });

    } catch (error) {
      console.error('Update material error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete material
router.delete('/courses/:courseId/materials/:materialId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const userId = req.user.id;

      // Verify access to course and material
      const materialCheck = await pool.query(`
        SELECT cm.*, c.instructor_id
        FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        WHERE cm.id = $1 AND cm.course_id = $2 AND cm.is_active = true
      `, [materialId, courseId]);

      if (materialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const material = materialCheck.rows[0];

      if (req.user.role !== 'admin' && material.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Soft delete the material
      await pool.query(`
        UPDATE course_materials 
        SET is_active = false, updated_date = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [materialId]);

      // Optionally delete the physical file
      try {
        const filePath = path.join(__dirname, '../../', material.file_path);
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error('Error deleting physical file:', fileError);
        // Continue even if file deletion fails
      }

      res.json({ message: 'Material deleted successfully' });

    } catch (error) {
      console.error('Delete material error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Move material to different folder
router.post('/courses/:courseId/materials/:materialId/move',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const { folderId } = req.body;
      const userId = req.user.id;

      // Verify access to course and material
      const materialCheck = await pool.query(`
        SELECT cm.*, c.instructor_id
        FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        WHERE cm.id = $1 AND cm.course_id = $2 AND cm.is_active = true
      `, [materialId, courseId]);

      if (materialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const material = materialCheck.rows[0];

      if (req.user.role !== 'admin' && material.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verify folder belongs to this course if specified
      if (folderId) {
        const folderCheck = await pool.query(`
          SELECT id FROM material_folders 
          WHERE id = $1 AND course_id = $2 AND is_active = true
        `, [folderId, courseId]);

        if (folderCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid folder for this course' });
        }
      }

      // Move material
      const updateResult = await pool.query(`
        UPDATE course_materials 
        SET folder_id = $1, updated_date = CURRENT_TIMESTAMP
        WHERE id = $2 AND course_id = $3
        RETURNING *
      `, [folderId || null, materialId, courseId]);

      res.json({
        message: 'Material moved successfully',
        material: updateResult.rows[0]
      });

    } catch (error) {
      console.error('Move material error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get folder structure for a course
router.get('/courses/:courseId/folders',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check access to course
      let accessQuery = '';
      let accessParams = [courseId];

      if (userRole === 'admin') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1';
      } else if (userRole === 'teacher') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2';
        accessParams.push(userId);
      } else {
        accessQuery = `
          SELECT c.id FROM courses c
          JOIN enrollments e ON c.id = e.course_id
          WHERE c.id = $1 AND e.student_id = $2 AND e.status = 'active'
        `;
        accessParams.push(userId);
      }

      const courseCheck = await pool.query(accessQuery, accessParams);
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Get folder structure
      const foldersResult = await pool.query(`
        SELECT 
          mf.*,
          u.name as created_by_name,
          COUNT(cm.id) as material_count
        FROM material_folders mf
        LEFT JOIN users u ON mf.created_by = u.id
        LEFT JOIN course_materials cm ON mf.id = cm.folder_id AND cm.is_active = true
        WHERE mf.course_id = $1 AND mf.is_active = true
        GROUP BY mf.id, u.name
        ORDER BY mf.sort_order, mf.name
      `, [courseId]);

      // Build hierarchical structure
      const folders = foldersResult.rows;
      const folderMap = {};
      const rootFolders = [];

      // Create folder map
      folders.forEach(folder => {
        folderMap[folder.id] = { ...folder, children: [] };
      });

      // Build hierarchy
      folders.forEach(folder => {
        if (folder.parent_folder_id) {
          if (folderMap[folder.parent_folder_id]) {
            folderMap[folder.parent_folder_id].children.push(folderMap[folder.id]);
          }
        } else {
          rootFolders.push(folderMap[folder.id]);
        }
      });

      res.json({ folders: rootFolders });

    } catch (error) {
      console.error('Get folders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create new folder
router.post('/courses/:courseId/folders',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { name, description, parentFolderId, sortOrder = 0 } = req.body;
      const userId = req.user.id;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Folder name is required' });
      }

      // Verify access to course
      const courseCheck = await pool.query(`
        SELECT id FROM courses 
        WHERE id = $1 AND (instructor_id = $2 OR $3 = 'admin')
      `, [courseId, userId, req.user.role]);

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Verify parent folder belongs to this course if specified
      if (parentFolderId) {
        const parentCheck = await pool.query(`
          SELECT id FROM material_folders 
          WHERE id = $1 AND course_id = $2 AND is_active = true
        `, [parentFolderId, courseId]);

        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid parent folder' });
        }
      }

      // Create folder
      const folderResult = await pool.query(`
        INSERT INTO material_folders (
          course_id, parent_folder_id, name, description, created_by, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [courseId, parentFolderId || null, name.trim(), description, userId, sortOrder]);

      res.status(201).json({
        message: 'Folder created successfully',
        folder: folderResult.rows[0]
      });

    } catch (error) {
      console.error('Create folder error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update folder
router.put('/courses/:courseId/folders/:folderId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, folderId } = req.params;
      const { name, description, parentFolderId, sortOrder } = req.body;
      const userId = req.user.id;

      // Verify access to course and folder
      const folderCheck = await pool.query(`
        SELECT mf.*, c.instructor_id
        FROM material_folders mf
        JOIN courses c ON mf.course_id = c.id
        WHERE mf.id = $1 AND mf.course_id = $2 AND mf.is_active = true
      `, [folderId, courseId]);

      if (folderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const folder = folderCheck.rows[0];

      if (req.user.role !== 'admin' && folder.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verify parent folder if specified
      if (parentFolderId && parentFolderId !== folderId) {
        const parentCheck = await pool.query(`
          SELECT id FROM material_folders 
          WHERE id = $1 AND course_id = $2 AND is_active = true
        `, [parentFolderId, courseId]);

        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid parent folder' });
        }
      }

      // Update folder
      const updateResult = await pool.query(`
        UPDATE material_folders 
        SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          parent_folder_id = $3,
          sort_order = COALESCE($4, sort_order)
        WHERE id = $5 AND course_id = $6
        RETURNING *
      `, [
        name?.trim(),
        description,
        parentFolderId || null,
        sortOrder,
        folderId,
        courseId
      ]);

      res.json({
        message: 'Folder updated successfully',
        folder: updateResult.rows[0]
      });

    } catch (error) {
      console.error('Update folder error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete folder
router.delete('/courses/:courseId/folders/:folderId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, folderId } = req.params;
      const { moveContentsTo } = req.query; // Optional: move contents to another folder
      const userId = req.user.id;

      // Verify access to course and folder
      const folderCheck = await pool.query(`
        SELECT mf.*, c.instructor_id
        FROM material_folders mf
        JOIN courses c ON mf.course_id = c.id
        WHERE mf.id = $1 AND mf.course_id = $2 AND mf.is_active = true
      `, [folderId, courseId]);

      if (folderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const folder = folderCheck.rows[0];

      if (req.user.role !== 'admin' && folder.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if folder has contents
      const contentsCheck = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM course_materials WHERE folder_id = $1 AND is_active = true) as materials,
          (SELECT COUNT(*) FROM material_folders WHERE parent_folder_id = $1 AND is_active = true) as subfolders
      `, [folderId]);

      const { materials, subfolders } = contentsCheck.rows[0];

      if (parseInt(materials) > 0 || parseInt(subfolders) > 0) {
        if (moveContentsTo) {
          // Verify destination folder
          const destCheck = await pool.query(`
            SELECT id FROM material_folders 
            WHERE id = $1 AND course_id = $2 AND is_active = true
          `, [moveContentsTo, courseId]);

          if (destCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid destination folder' });
          }

          // Move materials
          await pool.query(`
            UPDATE course_materials 
            SET folder_id = $1 
            WHERE folder_id = $2 AND is_active = true
          `, [moveContentsTo, folderId]);

          // Move subfolders
          await pool.query(`
            UPDATE material_folders 
            SET parent_folder_id = $1 
            WHERE parent_folder_id = $2 AND is_active = true
          `, [moveContentsTo, folderId]);
        } else {
          // Move contents to root (no folder)
          await pool.query(`
            UPDATE course_materials 
            SET folder_id = NULL 
            WHERE folder_id = $1 AND is_active = true
          `, [folderId]);

          await pool.query(`
            UPDATE material_folders 
            SET parent_folder_id = NULL 
            WHERE parent_folder_id = $1 AND is_active = true
          `, [folderId]);
        }
      }

      // Soft delete the folder
      await pool.query(`
        UPDATE material_folders 
        SET is_active = false 
        WHERE id = $1
      `, [folderId]);

      res.json({ message: 'Folder deleted successfully' });

    } catch (error) {
      console.error('Delete folder error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Learning Modules Management

// Get all modules for a course
router.get('/courses/:courseId/modules',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check access to course
      let accessQuery = '';
      let accessParams = [courseId];

      if (userRole === 'admin') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1';
      } else if (userRole === 'teacher') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2';
        accessParams.push(userId);
      } else if (userRole === 'student') {
        accessQuery = `
          SELECT c.id FROM courses c
          JOIN enrollments e ON c.id = e.course_id
          WHERE c.id = $1 AND e.student_id = $2 AND e.status = 'active'
        `;
        accessParams.push(userId);
      }

      const courseCheck = await pool.query(accessQuery, accessParams);
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Get modules with material count and student progress (if student)
      let moduleQuery = `
        SELECT 
          lm.*,
          u.name as created_by_name,
          COUNT(mm.material_id) as material_count,
          prerequisite.title as prerequisite_title
        FROM learning_modules lm
        LEFT JOIN users u ON lm.created_by = u.id
        LEFT JOIN module_materials mm ON lm.id = mm.module_id
        LEFT JOIN learning_modules prerequisite ON lm.prerequisite_module_id = prerequisite.id
        WHERE lm.course_id = $1 AND lm.is_active = true
        GROUP BY lm.id, u.name, prerequisite.title
        ORDER BY lm.sort_order, lm.created_date
      `;

      const modulesResult = await pool.query(moduleQuery, [courseId]);
      let modules = modulesResult.rows;

      // If student, add progress information
      if (userRole === 'student') {
        const moduleIds = modules.map(m => m.id);
        if (moduleIds.length > 0) {
          const progressResult = await pool.query(`
            SELECT module_id, progress_percentage, completed_date, last_accessed
            FROM module_progress
            WHERE module_id = ANY($1) AND student_id = $2
          `, [moduleIds, userId]);

          const progressMap = {};
          progressResult.rows.forEach(p => {
            progressMap[p.module_id] = p;
          });

          modules = modules.map(module => ({
            ...module,
            progress: progressMap[module.id] || {
              progress_percentage: 0,
              completed_date: null,
              last_accessed: null
            }
          }));
        }
      }

      res.json({ modules });

    } catch (error) {
      console.error('Get modules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get single module with materials
router.get('/courses/:courseId/modules/:moduleId',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId, moduleId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check access to course
      let accessQuery = '';
      let accessParams = [courseId];

      if (userRole === 'admin') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1';
      } else if (userRole === 'teacher') {
        accessQuery = 'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2';
        accessParams.push(userId);
      } else if (userRole === 'student') {
        accessQuery = `
          SELECT c.id FROM courses c
          JOIN enrollments e ON c.id = e.course_id
          WHERE c.id = $1 AND e.student_id = $2 AND e.status = 'active'
        `;
        accessParams.push(userId);
      }

      const courseCheck = await pool.query(accessQuery, accessParams);
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Get module details
      const moduleResult = await pool.query(`
        SELECT 
          lm.*,
          u.name as created_by_name,
          prerequisite.title as prerequisite_title
        FROM learning_modules lm
        LEFT JOIN users u ON lm.created_by = u.id
        LEFT JOIN learning_modules prerequisite ON lm.prerequisite_module_id = prerequisite.id
        WHERE lm.id = $1 AND lm.course_id = $2 AND lm.is_active = true
      `, [moduleId, courseId]);

      if (moduleResult.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }

      const module = moduleResult.rows[0];

      // Get module materials
      const materialsResult = await pool.query(`
        SELECT 
          cm.*,
          mm.sort_order as module_sort_order,
          mm.is_required,
          mf.name as folder_name,
          CASE 
            WHEN cm.file_size < 1024 THEN cm.file_size || ' B'
            WHEN cm.file_size < 1048576 THEN ROUND(cm.file_size / 1024.0, 1) || ' KB'
            WHEN cm.file_size < 1073741824 THEN ROUND(cm.file_size / 1048576.0, 1) || ' MB'
            ELSE ROUND(cm.file_size / 1073741824.0, 1) || ' GB'
          END as formatted_size
        FROM module_materials mm
        JOIN course_materials cm ON mm.material_id = cm.id
        LEFT JOIN material_folders mf ON cm.folder_id = mf.id
        WHERE mm.module_id = $1 AND cm.is_active = true
        ORDER BY mm.sort_order, cm.title
      `, [moduleId]);

      module.materials = materialsResult.rows;

      // If student, add progress and completion info
      if (userRole === 'student') {
        // Get module progress
        const progressResult = await pool.query(`
          SELECT progress_percentage, completed_date, last_accessed, started_date
          FROM module_progress
          WHERE module_id = $1 AND student_id = $2
        `, [moduleId, userId]);

        module.progress = progressResult.rows[0] || {
          progress_percentage: 0,
          completed_date: null,
          last_accessed: null,
          started_date: null
        };

        // Get material completion status
        const completionResult = await pool.query(`
          SELECT material_id, completed_date, time_spent_seconds
          FROM material_completion
          WHERE material_id = ANY($1) AND student_id = $2
        `, [module.materials.map(m => m.id), userId]);

        const completionMap = {};
        completionResult.rows.forEach(c => {
          completionMap[c.material_id] = c;
        });

        module.materials = module.materials.map(material => ({
          ...material,
          completion: completionMap[material.id] || null
        }));

        // Check if student can access this module (prerequisites)
        if (module.prerequisite_module_id) {
          const prerequisiteProgress = await pool.query(`
            SELECT progress_percentage
            FROM module_progress
            WHERE module_id = $1 AND student_id = $2
          `, [module.prerequisite_module_id, userId]);

          const prerequisiteCompleted = prerequisiteProgress.rows[0]?.progress_percentage === 100;
          module.can_access = prerequisiteCompleted;
        } else {
          module.can_access = true;
        }
      }

      res.json({ module });

    } catch (error) {
      console.error('Get module error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create new module
router.post('/courses/:courseId/modules',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { 
        title, 
        description, 
        sortOrder = 0, 
        prerequisiteModuleId, 
        isSequential = false 
      } = req.body;
      const userId = req.user.id;

      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Module title is required' });
      }

      // Verify access to course
      const courseCheck = await pool.query(`
        SELECT id FROM courses 
        WHERE id = $1 AND (instructor_id = $2 OR $3 = 'admin')
      `, [courseId, userId, req.user.role]);

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Verify prerequisite module if specified
      if (prerequisiteModuleId) {
        const prerequisiteCheck = await pool.query(`
          SELECT id FROM learning_modules 
          WHERE id = $1 AND course_id = $2 AND is_active = true
        `, [prerequisiteModuleId, courseId]);

        if (prerequisiteCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid prerequisite module' });
        }
      }

      // Create module
      const moduleResult = await pool.query(`
        INSERT INTO learning_modules (
          course_id, title, description, sort_order, prerequisite_module_id, 
          is_sequential, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        courseId, 
        title.trim(), 
        description, 
        sortOrder, 
        prerequisiteModuleId || null, 
        isSequential, 
        userId
      ]);

      res.status(201).json({
        message: 'Module created successfully',
        module: moduleResult.rows[0]
      });

    } catch (error) {
      console.error('Create module error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update module
router.put('/courses/:courseId/modules/:moduleId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, moduleId } = req.params;
      const { 
        title, 
        description, 
        sortOrder, 
        prerequisiteModuleId, 
        isSequential 
      } = req.body;
      const userId = req.user.id;

      // Verify access to course and module
      const moduleCheck = await pool.query(`
        SELECT lm.*, c.instructor_id
        FROM learning_modules lm
        JOIN courses c ON lm.course_id = c.id
        WHERE lm.id = $1 AND lm.course_id = $2 AND lm.is_active = true
      `, [moduleId, courseId]);

      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }

      const module = moduleCheck.rows[0];

      if (req.user.role !== 'admin' && module.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verify prerequisite module if specified
      if (prerequisiteModuleId && prerequisiteModuleId !== moduleId) {
        const prerequisiteCheck = await pool.query(`
          SELECT id FROM learning_modules 
          WHERE id = $1 AND course_id = $2 AND is_active = true
        `, [prerequisiteModuleId, courseId]);

        if (prerequisiteCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid prerequisite module' });
        }
      }

      // Update module
      const updateResult = await pool.query(`
        UPDATE learning_modules 
        SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          sort_order = COALESCE($3, sort_order),
          prerequisite_module_id = $4,
          is_sequential = COALESCE($5, is_sequential),
          updated_date = CURRENT_TIMESTAMP
        WHERE id = $6 AND course_id = $7
        RETURNING *
      `, [
        title?.trim(),
        description,
        sortOrder,
        prerequisiteModuleId || null,
        isSequential,
        moduleId,
        courseId
      ]);

      res.json({
        message: 'Module updated successfully',
        module: updateResult.rows[0]
      });

    } catch (error) {
      console.error('Update module error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete module
router.delete('/courses/:courseId/modules/:moduleId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, moduleId } = req.params;
      const userId = req.user.id;

      // Verify access to course and module
      const moduleCheck = await pool.query(`
        SELECT lm.*, c.instructor_id
        FROM learning_modules lm
        JOIN courses c ON lm.course_id = c.id
        WHERE lm.id = $1 AND lm.course_id = $2 AND lm.is_active = true
      `, [moduleId, courseId]);

      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }

      const module = moduleCheck.rows[0];

      if (req.user.role !== 'admin' && module.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if other modules depend on this one
      const dependentCheck = await pool.query(`
        SELECT id, title FROM learning_modules 
        WHERE prerequisite_module_id = $1 AND is_active = true
      `, [moduleId]);

      if (dependentCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete module with dependent modules',
          dependentModules: dependentCheck.rows
        });
      }

      // Soft delete the module
      await pool.query(`
        UPDATE learning_modules 
        SET is_active = false, updated_date = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [moduleId]);

      res.json({ message: 'Module deleted successfully' });

    } catch (error) {
      console.error('Delete module error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Add materials to module
router.post('/courses/:courseId/modules/:moduleId/materials',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, moduleId } = req.params;
      const { materialIds, isRequired = true } = req.body;
      const userId = req.user.id;

      if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
        return res.status(400).json({ error: 'Material IDs are required' });
      }

      // Verify access to course and module
      const moduleCheck = await pool.query(`
        SELECT lm.*, c.instructor_id
        FROM learning_modules lm
        JOIN courses c ON lm.course_id = c.id
        WHERE lm.id = $1 AND lm.course_id = $2 AND lm.is_active = true
      `, [moduleId, courseId]);

      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }

      const module = moduleCheck.rows[0];

      if (req.user.role !== 'admin' && module.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verify all materials belong to this course
      const materialsCheck = await pool.query(`
        SELECT id FROM course_materials 
        WHERE id = ANY($1) AND course_id = $2 AND is_active = true
      `, [materialIds, courseId]);

      if (materialsCheck.rows.length !== materialIds.length) {
        return res.status(400).json({ error: 'Some materials do not belong to this course' });
      }

      // Add materials to module (with conflict resolution)
      const addedMaterials = [];
      for (let i = 0; i < materialIds.length; i++) {
        const materialId = materialIds[i];
        try {
          const result = await pool.query(`
            INSERT INTO module_materials (module_id, material_id, sort_order, is_required)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (module_id, material_id) 
            DO UPDATE SET sort_order = $3, is_required = $4
            RETURNING *
          `, [moduleId, materialId, i, isRequired]);
          
          addedMaterials.push(result.rows[0]);
        } catch (error) {
          console.error(`Error adding material ${materialId}:`, error);
        }
      }

      res.json({
        message: 'Materials added to module successfully',
        addedMaterials
      });

    } catch (error) {
      console.error('Add materials to module error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Remove material from module
router.delete('/courses/:courseId/modules/:moduleId/materials/:materialId',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, moduleId, materialId } = req.params;
      const userId = req.user.id;

      // Verify access to course and module
      const moduleCheck = await pool.query(`
        SELECT lm.*, c.instructor_id
        FROM learning_modules lm
        JOIN courses c ON lm.course_id = c.id
        WHERE lm.id = $1 AND lm.course_id = $2 AND lm.is_active = true
      `, [moduleId, courseId]);

      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }

      const module = moduleCheck.rows[0];

      if (req.user.role !== 'admin' && module.instructor_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Remove material from module
      const deleteResult = await pool.query(`
        DELETE FROM module_materials 
        WHERE module_id = $1 AND material_id = $2
        RETURNING *
      `, [moduleId, materialId]);

      if (deleteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found in this module' });
      }

      res.json({ message: 'Material removed from module successfully' });

    } catch (error) {
      console.error('Remove material from module error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Mark material as completed (for students)
router.post('/courses/:courseId/materials/:materialId/complete',
  authenticateToken,
  requireRole(['student']),
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const { timeSpentSeconds = 0 } = req.body;
      const userId = req.user.id;

      // Verify student is enrolled and material exists
      const materialCheck = await pool.query(`
        SELECT cm.id
        FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE cm.id = $1 AND cm.course_id = $2 AND e.student_id = $3 
        AND e.status = 'active' AND cm.is_active = true
      `, [materialId, courseId, userId]);

      if (materialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found or access denied' });
      }

      // Check if student can access this material (prerequisites)
      const canAccess = await pool.query(`
        SELECT can_access_material($1, $2) as can_access
      `, [userId, materialId]);

      if (!canAccess.rows[0]?.can_access) {
        return res.status(403).json({ error: 'Prerequisites not met for this material' });
      }

      // Mark material as completed
      await pool.query(`
        INSERT INTO material_completion (material_id, student_id, time_spent_seconds)
        VALUES ($1, $2, $3)
        ON CONFLICT (material_id, student_id) 
        DO UPDATE SET 
          completed_date = CURRENT_TIMESTAMP,
          time_spent_seconds = material_completion.time_spent_seconds + $3
      `, [materialId, userId, timeSpentSeconds]);

      res.json({ message: 'Material marked as completed' });

    } catch (error) {
      console.error('Complete material error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get student progress for a module
router.get('/courses/:courseId/modules/:moduleId/progress/:studentId',
  authenticateToken,
  requireRole(['teacher', 'admin', 'parent']),
  async (req, res) => {
    try {
      const { courseId, moduleId, studentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verify access
      if (userRole === 'teacher') {
        const courseCheck = await pool.query(`
          SELECT id FROM courses WHERE id = $1 AND instructor_id = $2
        `, [courseId, userId]);
        if (courseCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else if (userRole === 'parent') {
        const childCheck = await pool.query(`
          SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2
        `, [userId, studentId]);
        if (childCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Get module progress
      const progressResult = await pool.query(`
        SELECT 
          mp.*,
          lm.title as module_title,
          u.name as student_name
        FROM module_progress mp
        JOIN learning_modules lm ON mp.module_id = lm.id
        JOIN users u ON mp.student_id = u.id
        WHERE mp.module_id = $1 AND mp.student_id = $2
      `, [moduleId, studentId]);

      // Get material completion details
      const completionResult = await pool.query(`
        SELECT 
          mc.*,
          cm.title as material_title,
          mm.is_required
        FROM material_completion mc
        JOIN course_materials cm ON mc.material_id = cm.id
        JOIN module_materials mm ON cm.id = mm.material_id
        WHERE mm.module_id = $1 AND mc.student_id = $2
        ORDER BY mc.completed_date
      `, [moduleId, studentId]);

      res.json({
        progress: progressResult.rows[0] || null,
        completedMaterials: completionResult.rows
      });

    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Analytics and Tracking

// Get material analytics for a course
router.get('/courses/:courseId/materials/analytics',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { startDate, endDate, materialId } = req.query;
      const userId = req.user.id;

      // Verify access to course
      const courseCheck = await pool.query(`
        SELECT id FROM courses 
        WHERE id = $1 AND (instructor_id = $2 OR $3 = 'admin')
      `, [courseId, userId, req.user.role]);

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Build analytics query
      let whereConditions = ['cm.course_id = $1', 'cm.is_active = true'];
      let queryParams = [courseId];
      let paramIndex = 2;

      if (startDate) {
        whereConditions.push(`mal.access_date >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions.push(`mal.access_date <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex++;
      }

      if (materialId) {
        whereConditions.push(`cm.id = $${paramIndex}`);
        queryParams.push(materialId);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get material usage statistics
      const analyticsResult = await pool.query(`
        SELECT 
          cm.id,
          cm.title,
          cm.file_type,
          cm.upload_date,
          cm.view_count,
          cm.download_count,
          COUNT(DISTINCT mal.user_id) as unique_users,
          COUNT(CASE WHEN mal.access_type = 'view' THEN 1 END) as total_views,
          COUNT(CASE WHEN mal.access_type = 'download' THEN 1 END) as total_downloads,
          COUNT(CASE WHEN mal.access_type = 'preview' THEN 1 END) as total_previews,
          AVG(CASE WHEN mal.duration_seconds > 0 THEN mal.duration_seconds END) as avg_view_duration,
          MAX(mal.access_date) as last_accessed,
          COUNT(DISTINCT mc.student_id) as completion_count
        FROM course_materials cm
        LEFT JOIN material_access_logs mal ON cm.id = mal.material_id
        LEFT JOIN material_completion mc ON cm.id = mc.material_id
        WHERE ${whereClause}
        GROUP BY cm.id, cm.title, cm.file_type, cm.upload_date, cm.view_count, cm.download_count
        ORDER BY total_views DESC, total_downloads DESC
      `, queryParams);

      // Get engagement trends (daily/weekly)
      const trendsResult = await pool.query(`
        SELECT 
          DATE(mal.access_date) as date,
          COUNT(*) as total_accesses,
          COUNT(DISTINCT mal.user_id) as unique_users,
          COUNT(CASE WHEN mal.access_type = 'view' THEN 1 END) as views,
          COUNT(CASE WHEN mal.access_type = 'download' THEN 1 END) as downloads
        FROM material_access_logs mal
        JOIN course_materials cm ON mal.material_id = cm.id
        WHERE cm.course_id = $1 
        ${startDate ? `AND mal.access_date >= '${startDate}'` : ''}
        ${endDate ? `AND mal.access_date <= '${endDate}'` : ''}
        GROUP BY DATE(mal.access_date)
        ORDER BY date DESC
        LIMIT 30
      `, [courseId]);

      // Get top performing materials
      const topMaterialsResult = await pool.query(`
        SELECT 
          cm.id,
          cm.title,
          cm.file_type,
          COUNT(DISTINCT mal.user_id) as unique_users,
          COUNT(mal.id) as total_accesses,
          AVG(CASE WHEN mal.duration_seconds > 0 THEN mal.duration_seconds END) as avg_duration
        FROM course_materials cm
        LEFT JOIN material_access_logs mal ON cm.id = mal.material_id
        WHERE cm.course_id = $1 AND cm.is_active = true
        GROUP BY cm.id, cm.title, cm.file_type
        HAVING COUNT(mal.id) > 0
        ORDER BY unique_users DESC, total_accesses DESC
        LIMIT 10
      `, [courseId]);

      // Get student engagement summary
      const studentEngagementResult = await pool.query(`
        SELECT 
          u.id,
          u.name,
          COUNT(DISTINCT mal.material_id) as materials_accessed,
          COUNT(mal.id) as total_accesses,
          COUNT(DISTINCT mc.material_id) as materials_completed,
          AVG(CASE WHEN mal.duration_seconds > 0 THEN mal.duration_seconds END) as avg_session_duration,
          MAX(mal.access_date) as last_activity
        FROM users u
        JOIN enrollments e ON u.id = e.student_id
        LEFT JOIN material_access_logs mal ON u.id = mal.user_id
        LEFT JOIN course_materials cm ON mal.material_id = cm.id AND cm.course_id = e.course_id
        LEFT JOIN material_completion mc ON u.id = mc.student_id
        LEFT JOIN course_materials cm2 ON mc.material_id = cm2.id AND cm2.course_id = e.course_id
        WHERE e.course_id = $1 AND e.status = 'active' AND u.role = 'student'
        GROUP BY u.id, u.name
        ORDER BY total_accesses DESC
      `, [courseId]);

      res.json({
        materials: analyticsResult.rows,
        trends: trendsResult.rows,
        topMaterials: topMaterialsResult.rows,
        studentEngagement: studentEngagementResult.rows,
        summary: {
          totalMaterials: analyticsResult.rows.length,
          totalViews: analyticsResult.rows.reduce((sum, m) => sum + parseInt(m.total_views || 0), 0),
          totalDownloads: analyticsResult.rows.reduce((sum, m) => sum + parseInt(m.total_downloads || 0), 0),
          uniqueUsers: Math.max(...analyticsResult.rows.map(m => parseInt(m.unique_users || 0)), 0)
        }
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Log material view (called when student views material)
router.post('/courses/:courseId/materials/:materialId/view',
  authenticateToken,
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const { durationSeconds, sessionId } = req.body;
      const userId = req.user.id;

      // Verify access to material
      const materialCheck = await pool.query(`
        SELECT cm.id
        FROM course_materials cm
        WHERE cm.id = $1 AND cm.course_id = $2 AND cm.is_active = true
      `, [materialId, courseId]);

      if (materialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      // For students, verify enrollment and access
      if (req.user.role === 'student') {
        const enrollmentCheck = await pool.query(`
          SELECT 1 FROM enrollments 
          WHERE student_id = $1 AND course_id = $2 AND status = 'active'
        `, [userId, courseId]);

        if (enrollmentCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Check if student can access this material
        const canAccess = await pool.query(`
          SELECT can_access_material($1, $2) as can_access
        `, [userId, materialId]);

        if (!canAccess.rows[0]?.can_access) {
          return res.status(403).json({ error: 'Prerequisites not met' });
        }
      }

      // Log the view
      await pool.query(`
        INSERT INTO material_access_logs (
          material_id, user_id, access_type, duration_seconds, 
          ip_address, user_agent, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        materialId,
        userId,
        'view',
        durationSeconds || null,
        req.ip,
        req.get('User-Agent'),
        sessionId
      ]);

      // Update view count
      await pool.query(`
        UPDATE course_materials 
        SET view_count = view_count + 1 
        WHERE id = $1
      `, [materialId]);

      res.json({ message: 'View logged successfully' });

    } catch (error) {
      console.error('Log view error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get student progress across all courses (for student dashboard)
router.get('/student/:studentId/progress',
  authenticateToken,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verify access
      if (userRole === 'student' && parseInt(studentId) !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      } else if (userRole === 'parent') {
        const childCheck = await pool.query(`
          SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2
        `, [userId, studentId]);
        if (childCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get course progress
      const courseProgressResult = await pool.query(`
        SELECT 
          c.id as course_id,
          c.title as course_title,
          COUNT(DISTINCT cm.id) as total_materials,
          COUNT(DISTINCT mc.material_id) as completed_materials,
          COUNT(DISTINCT lm.id) as total_modules,
          COUNT(DISTINCT CASE WHEN mp.progress_percentage = 100 THEN mp.module_id END) as completed_modules,
          AVG(mp.progress_percentage) as avg_module_progress,
          MAX(mal.access_date) as last_activity
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN course_materials cm ON c.id = cm.course_id AND cm.is_active = true
        LEFT JOIN material_completion mc ON cm.id = mc.material_id AND mc.student_id = e.student_id
        LEFT JOIN learning_modules lm ON c.id = lm.course_id AND lm.is_active = true
        LEFT JOIN module_progress mp ON lm.id = mp.module_id AND mp.student_id = e.student_id
        LEFT JOIN material_access_logs mal ON cm.id = mal.material_id AND mal.user_id = e.student_id
        WHERE e.student_id = $1 AND e.status = 'active'
        GROUP BY c.id, c.title
        ORDER BY c.title
      `, [studentId]);

      // Get recent activity
      const recentActivityResult = await pool.query(`
        SELECT 
          mal.access_date,
          mal.access_type,
          cm.title as material_title,
          c.title as course_title,
          mal.duration_seconds
        FROM material_access_logs mal
        JOIN course_materials cm ON mal.material_id = cm.id
        JOIN courses c ON cm.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id AND e.student_id = mal.user_id
        WHERE mal.user_id = $1 AND e.status = 'active'
        ORDER BY mal.access_date DESC
        LIMIT 20
      `, [studentId]);

      // Get completion statistics
      const completionStatsResult = await pool.query(`
        SELECT 
          cm.file_type,
          COUNT(*) as total_materials,
          COUNT(mc.material_id) as completed_materials
        FROM course_materials cm
        JOIN courses c ON cm.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN material_completion mc ON cm.id = mc.material_id AND mc.student_id = e.student_id
        WHERE e.student_id = $1 AND e.status = 'active' AND cm.is_active = true
        GROUP BY cm.file_type
        ORDER BY cm.file_type
      `, [studentId]);

      res.json({
        courseProgress: courseProgressResult.rows,
        recentActivity: recentActivityResult.rows,
        completionStats: completionStatsResult.rows,
        summary: {
          totalCourses: courseProgressResult.rows.length,
          totalMaterials: courseProgressResult.rows.reduce((sum, c) => sum + parseInt(c.total_materials || 0), 0),
          completedMaterials: courseProgressResult.rows.reduce((sum, c) => sum + parseInt(c.completed_materials || 0), 0),
          totalModules: courseProgressResult.rows.reduce((sum, c) => sum + parseInt(c.total_modules || 0), 0),
          completedModules: courseProgressResult.rows.reduce((sum, c) => sum + parseInt(c.completed_modules || 0), 0)
        }
      });

    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get detailed analytics for a specific material
router.get('/courses/:courseId/materials/:materialId/analytics',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params;
      const { startDate, endDate } = req.query;
      const userId = req.user.id;

      // Verify access to course
      const courseCheck = await pool.query(`
        SELECT id FROM courses 
        WHERE id = $1 AND (instructor_id = $2 OR $3 = 'admin')
      `, [courseId, userId, req.user.role]);

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      // Verify material belongs to course
      const materialCheck = await pool.query(`
        SELECT * FROM course_materials 
        WHERE id = $1 AND course_id = $2 AND is_active = true
      `, [materialId, courseId]);

      if (materialCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const material = materialCheck.rows[0];

      // Build date filter
      let dateFilter = '';
      let queryParams = [materialId];
      if (startDate && endDate) {
        dateFilter = 'AND mal.access_date BETWEEN $2 AND $3';
        queryParams.push(startDate, endDate);
      } else if (startDate) {
        dateFilter = 'AND mal.access_date >= $2';
        queryParams.push(startDate);
      } else if (endDate) {
        dateFilter = 'AND mal.access_date <= $2';
        queryParams.push(endDate);
      }

      // Get detailed access logs
      const accessLogsResult = await pool.query(`
        SELECT 
          mal.*,
          u.name as user_name,
          u.role as user_role
        FROM material_access_logs mal
        JOIN users u ON mal.user_id = u.id
        WHERE mal.material_id = $1 ${dateFilter}
        ORDER BY mal.access_date DESC
        LIMIT 100
      `, queryParams);

      // Get hourly access patterns
      const hourlyPatternResult = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM mal.access_date) as hour,
          COUNT(*) as access_count,
          COUNT(DISTINCT mal.user_id) as unique_users
        FROM material_access_logs mal
        WHERE mal.material_id = $1 ${dateFilter}
        GROUP BY EXTRACT(HOUR FROM mal.access_date)
        ORDER BY hour
      `, queryParams);

      // Get daily access trends
      const dailyTrendsResult = await pool.query(`
        SELECT 
          DATE(mal.access_date) as date,
          COUNT(*) as total_accesses,
          COUNT(DISTINCT mal.user_id) as unique_users,
          COUNT(CASE WHEN mal.access_type = 'view' THEN 1 END) as views,
          COUNT(CASE WHEN mal.access_type = 'download' THEN 1 END) as downloads,
          AVG(CASE WHEN mal.duration_seconds > 0 THEN mal.duration_seconds END) as avg_duration
        FROM material_access_logs mal
        WHERE mal.material_id = $1 ${dateFilter}
        GROUP BY DATE(mal.access_date)
        ORDER BY date DESC
        LIMIT 30
      `, queryParams);

      // Get user engagement details
      const userEngagementResult = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.role,
          COUNT(mal.id) as total_accesses,
          COUNT(CASE WHEN mal.access_type = 'view' THEN 1 END) as views,
          COUNT(CASE WHEN mal.access_type = 'download' THEN 1 END) as downloads,
          AVG(CASE WHEN mal.duration_seconds > 0 THEN mal.duration_seconds END) as avg_duration,
          MIN(mal.access_date) as first_access,
          MAX(mal.access_date) as last_access,
          CASE WHEN mc.material_id IS NOT NULL THEN true ELSE false END as completed
        FROM material_access_logs mal
        JOIN users u ON mal.user_id = u.id
        LEFT JOIN material_completion mc ON mal.material_id = mc.material_id AND mal.user_id = mc.student_id
        WHERE mal.material_id = $1 ${dateFilter}
        GROUP BY u.id, u.name, u.role, mc.material_id
        ORDER BY total_accesses DESC
      `, queryParams);

      res.json({
        material: material,
        accessLogs: accessLogsResult.rows,
        hourlyPattern: hourlyPatternResult.rows,
        dailyTrends: dailyTrendsResult.rows,
        userEngagement: userEngagementResult.rows,
        summary: {
          totalAccesses: accessLogsResult.rows.length,
          uniqueUsers: [...new Set(accessLogsResult.rows.map(log => log.user_id))].length,
          avgDuration: accessLogsResult.rows
            .filter(log => log.duration_seconds > 0)
            .reduce((sum, log, _, arr) => sum + log.duration_seconds / arr.length, 0),
          completionRate: userEngagementResult.rows.filter(u => u.completed).length / Math.max(userEngagementResult.rows.length, 1) * 100
        }
      });

    } catch (error) {
      console.error('Get material analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Export analytics data (CSV format)
router.get('/courses/:courseId/materials/analytics/export',
  authenticateToken,
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const { format = 'csv', startDate, endDate } = req.query;
      const userId = req.user.id;

      // Verify access to course
      const courseCheck = await pool.query(`
        SELECT title FROM courses 
        WHERE id = $1 AND (instructor_id = $2 OR $3 = 'admin')
      `, [courseId, userId, req.user.role]);

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }

      const courseTitle = courseCheck.rows[0].title;

      // Get analytics data for export
      let dateFilter = '';
      let queryParams = [courseId];
      if (startDate && endDate) {
        dateFilter = 'AND mal.access_date BETWEEN $2 AND $3';
        queryParams.push(startDate, endDate);
      }

      const exportDataResult = await pool.query(`
        SELECT 
          cm.title as material_title,
          cm.file_type,
          cm.upload_date,
          u.name as user_name,
          u.role as user_role,
          mal.access_type,
          mal.access_date,
          mal.duration_seconds,
          CASE WHEN mc.material_id IS NOT NULL THEN 'Yes' ELSE 'No' END as completed
        FROM material_access_logs mal
        JOIN course_materials cm ON mal.material_id = cm.id
        JOIN users u ON mal.user_id = u.id
        LEFT JOIN material_completion mc ON mal.material_id = mc.material_id AND mal.user_id = mc.student_id
        WHERE cm.course_id = $1 ${dateFilter}
        ORDER BY mal.access_date DESC
      `, queryParams);

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'Material Title,File Type,Upload Date,User Name,User Role,Access Type,Access Date,Duration (seconds),Completed\n';
        const csvRows = exportDataResult.rows.map(row => 
          `"${row.material_title}","${row.file_type}","${row.upload_date}","${row.user_name}","${row.user_role}","${row.access_type}","${row.access_date}","${row.duration_seconds || ''}","${row.completed}"`
        ).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${courseTitle}-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.json({
          course: courseTitle,
          exportDate: new Date().toISOString(),
          data: exportDataResult.rows
        });
      }

    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;