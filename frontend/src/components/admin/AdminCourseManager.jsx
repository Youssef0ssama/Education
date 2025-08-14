import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Eye,
  UserPlus,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

const AdminCourseManager = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/admin/courses?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/available-teachers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const handleCreateCourse = async (courseData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchCourses();
        alert('Course created successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create course');
      }
    } catch (error) {
      console.error('Create course error:', error);
      alert('Failed to create course');
    }
  };

  const handleAssignTeachers = async (courseId, teacherIds, primaryTeacherId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/courses/${courseId}/instructors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instructor_ids: teacherIds,
          primary_instructor_id: primaryTeacherId
        })
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedCourse(null);
        fetchCourses();
        alert('Teachers assigned successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign teachers');
      }
    } catch (error) {
      console.error('Assign teachers error:', error);
      alert('Failed to assign teachers');
    }
  };

  const handleUpdateCourse = async (courseId, courseData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });

      if (response.ok) {
        alert('Course updated successfully!');
        fetchCourses();
        setShowEditModal(false);
        setSelectedCourse(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update course');
      }
    } catch (error) {
      console.error('Update course error:', error);
      alert('Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!confirm(`Are you sure you want to permanently delete "${courseTitle}"? This action cannot be undone and will remove all associated data.`)) {
      return;
    }

    try {
      console.log('Deleting course:', courseId, courseTitle);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Delete result:', result);
        alert(result.message || 'Course deleted successfully');
        fetchCourses(); // Refresh the list
      } else {
        const error = await response.json();
        console.error('Delete error response:', error);
        alert(error.error || 'Failed to delete course');
      }
    } catch (error) {
      console.error('Delete course error:', error);
      alert('Failed to delete course');
    }
  };

  const handleViewCourse = (course) => {
    // For now, just show an alert with course details
    // In a real app, this would open a detailed view modal
    alert(`Course Details:\n\nTitle: ${course.title}\nStatus: ${course.status}\nPrice: $${course.price}\nDuration: ${course.is_lifetime ? 'Lifetime' : `${course.duration_weeks} weeks`}\nEnrollments: ${course.active_enrollments}/${course.max_students}`);
  };

  const handleToggleCourseStatus = async (courseId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchCourses();
        alert(`Course ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update course status');
      }
    } catch (error) {
      console.error('Update course status error:', error);
      alert('Failed to update course status');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      archived: { color: 'bg-red-100 text-red-800', text: 'Archived' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
          <p className="text-gray-600">Create and manage courses, assign teachers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          <span>Create Course</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Course Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Courses</p>
              <p className="text-2xl font-bold text-gray-900">
                {courses.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
              <p className="text-2xl font-bold text-gray-900">
                {courses.reduce((sum, c) => sum + (c.active_enrollments || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Course Price</p>
              <p className="text-2xl font-bold text-gray-900">
                ${courses.length > 0 ? (courses.reduce((sum, c) => sum + (c.price || 0), 0) / courses.length).toFixed(0) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No courses found</p>
          <p className="text-sm text-gray-500">Create your first course to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instructors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{course.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{course.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          ${course.price} • Max: {course.max_students}
                          {course.is_lifetime && (
                            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                              ♾️ Lifetime
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{course.instructor_count || 0}</span>
                        {course.instructors && course.instructors.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {course.instructors.slice(0, 2).map(i => i.name).join(', ')}
                            {course.instructors.length > 2 && ` +${course.instructors.length - 2}`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {course.active_enrollments || 0} / {course.max_students}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${course.max_students > 0 ? ((course.active_enrollments || 0) / course.max_students) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(course.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowAssignModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Assign Teachers"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Course"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Course Permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewCourse(course)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <CreateCourseModal
          teachers={teachers}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCourse}
        />
      )}

      {/* Edit Course Modal */}
      {showEditModal && selectedCourse && (
        <EditCourseModal
          course={selectedCourse}
          teachers={teachers}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCourse(null);
          }}
          onUpdate={handleUpdateCourse}
        />
      )}

      {/* Assign Teachers Modal */}
      {showAssignModal && selectedCourse && (
        <AssignTeachersModal
          course={selectedCourse}
          teachers={teachers}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedCourse(null);
          }}
          onAssign={handleAssignTeachers}
        />
      )}
    </div>
  );
};

// Create Course Modal Component
const CreateCourseModal = ({ teachers, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    max_students: 50,
    difficulty_level: 'intermediate',
    instructor_ids: [],
    is_lifetime: false
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Title and description are required');
      return;
    }

    try {
      setCreating(true);
      await onCreate(formData);
    } catch (error) {
      console.error('Create course error:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Course</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_lifetime}
                  onChange={(e) => setFormData({
                    ...formData,
                    is_lifetime: e.target.checked,
                    duration_weeks: e.target.checked ? 0 : 12
                  })}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Lifetime Course (No time limit or expiration)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Lifetime courses have no duration limit and remain accessible indefinitely
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Students
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Teachers (Optional)
              </label>
              <select
                multiple
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.instructor_ids}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                  setFormData({ ...formData, instructor_ids: selectedIds });
                }}
              >
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple teachers</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {creating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{creating ? 'Creating...' : 'Create Course'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assign Teachers Modal Component
const AssignTeachersModal = ({ course, teachers, onClose, onAssign }) => {
  const [selectedTeachers, setSelectedTeachers] = useState(
    course.instructors ? course.instructors.map(i => i.id) : []
  );
  const [primaryTeacher, setPrimaryTeacher] = useState(
    course.instructors ? course.instructors.find(i => i.is_primary)?.id : null
  );
  const [assigning, setAssigning] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTeachers.length === 0) {
      alert('Please select at least one teacher');
      return;
    }

    try {
      setAssigning(true);
      await onAssign(course.id, selectedTeachers, primaryTeacher);
    } catch (error) {
      console.error('Assign teachers error:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleTeacherToggle = (teacherId) => {
    if (selectedTeachers.includes(teacherId)) {
      const newSelected = selectedTeachers.filter(id => id !== teacherId);
      setSelectedTeachers(newSelected);
      if (primaryTeacher === teacherId) {
        setPrimaryTeacher(newSelected.length > 0 ? newSelected[0] : null);
      }
    } else {
      const newSelected = [...selectedTeachers, teacherId];
      setSelectedTeachers(newSelected);
      if (!primaryTeacher) {
        setPrimaryTeacher(teacherId);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Assign Teachers to {course.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Teachers
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
              {teachers.map(teacher => (
                <div key={teacher.id} className="flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0">
                  <input
                    type="checkbox"
                    id={`teacher-${teacher.id}`}
                    checked={selectedTeachers.includes(teacher.id)}
                    onChange={() => handleTeacherToggle(teacher.id)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`teacher-${teacher.id}`} className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                    <div className="text-sm text-gray-500">{teacher.email}</div>
                    <div className="text-xs text-gray-400">
                      Currently assigned to {teacher.assigned_courses_count} courses
                    </div>
                  </label>
                  {selectedTeachers.includes(teacher.id) && (
                    <div className="ml-3">
                      <input
                        type="radio"
                        name="primary_teacher"
                        checked={primaryTeacher === teacher.id}
                        onChange={() => setPrimaryTeacher(teacher.id)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500"
                      />
                      <label className="ml-1 text-xs text-gray-600">Primary</label>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select teachers to assign to this course. Choose one as the primary instructor.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={assigning}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning || selectedTeachers.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {assigning && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{assigning ? 'Assigning...' : 'Assign Teachers'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Course Modal Component
const EditCourseModal = ({ course, teachers, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: course.title || '',
    description: course.description || '',
    price: course.price || 0,
    duration_weeks: course.duration_weeks || 12,
    max_students: course.max_students || 50,
    difficulty_level: course.difficulty_level || 'intermediate',
    status: course.status || 'draft',
    is_lifetime: course.is_lifetime || false
  });
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Title and description are required');
      return;
    }

    try {
      setUpdating(true);
      await onUpdate(course.id, formData);
    } catch (error) {
      console.error('Update course error:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Course</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>



            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Students
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_lifetime}
                  onChange={(e) => setFormData({
                    ...formData,
                    is_lifetime: e.target.checked,
                    duration_weeks: e.target.checked ? 0 : 12
                  })}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Lifetime Course (No time limit or expiration)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Lifetime courses have no duration limit and remain accessible indefinitely
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCourseManager;