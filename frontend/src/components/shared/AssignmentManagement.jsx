import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, FileText, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const AssignmentManagement = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    course_id: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    fetchAssignments();
    fetchCourses();
  }, [filters]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/assignments?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/courses?limit=100';
      
      // Teachers only see their own courses
      if (user.role === 'teacher') {
        url += `&instructor_id=${user.id}`;
      }

      const response = await fetch(url, {
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
    }
  };

  const handleCreateAssignment = async (assignmentData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchAssignments();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment');
    }
  };

  const handleUpdateAssignment = async (assignmentId, assignmentData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentData)
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedAssignment(null);
        fetchAssignments();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Failed to update assignment:', error);
      alert('Failed to update assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchAssignments();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      alert('Failed to delete assignment');
    }
  };

  const getStatusColor = (assignment) => {
    const now = new Date();
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    
    if (!dueDate) return 'bg-gray-100 text-gray-800';
    if (dueDate < now) return 'bg-red-100 text-red-800';
    if (dueDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (assignment) => {
    const now = new Date();
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    
    if (!dueDate) return 'No Due Date';
    if (dueDate < now) return 'Overdue';
    if (dueDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) return 'Due Soon';
    return 'Active';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Management</h1>
          <p className="text-gray-600">Create and manage course assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.course_id}
            onChange={(e) => setFilters({ ...filters, course_id: e.target.value, page: 1 })}
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>

          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: e.target.value, page: 1 })}
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Total: {pagination?.total || 0} assignments
          </div>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No assignments found</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {assignment.title}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment)}`}>
                    {getStatusText(assignment)}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {assignment.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Course: {assignment.course_title}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      Due: {assignment.due_date 
                        ? format(new Date(assignment.due_date), 'MMM dd, yyyy HH:mm')
                        : 'No due date'
                      }
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{assignment.submission_count} submissions</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>{assignment.graded_count} graded</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Grading Progress</span>
                    <span>
                      {assignment.submission_count > 0 
                        ? Math.round((assignment.graded_count / assignment.submission_count) * 100)
                        : 0
                      }%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${assignment.submission_count > 0 
                          ? (assignment.graded_count / assignment.submission_count) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Assignment"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Assignment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setShowGradingModal(true);
                    }}
                    className="flex items-center space-x-1 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>Grade</span>
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Created: {format(new Date(assignment.created_at), 'MMM dd, yyyy')}</span>
                  <span>Max Points: {assignment.max_points}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border border-gray-200 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
              disabled={filters.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setFilters({ ...filters, page: Math.min(pagination?.pages || 1, filters.page + 1) })}
              disabled={filters.page === (pagination?.pages || 1)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((filters.page - 1) * filters.limit) + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(filters.page * filters.limit, pagination?.total || 0)}
                </span> of{' '}
                <span className="font-medium">{pagination?.total || 0}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {Array.from({ length: Math.min(pagination?.pages || 0, 5) }, (_, i) => {
                  const page = i + Math.max(1, filters.page - 2);
                  return page <= (pagination?.pages || 0) ? (
                    <button
                      key={page}
                      onClick={() => setFilters({ ...filters, page })}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === filters.page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ) : null;
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <AssignmentModal
          title="Create New Assignment"
          courses={courses}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAssignment}
        />
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && selectedAssignment && (
        <AssignmentModal
          title="Edit Assignment"
          assignment={selectedAssignment}
          courses={courses}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
          onSubmit={(assignmentData) => handleUpdateAssignment(selectedAssignment.id, assignmentData)}
        />
      )}

      {/* Grading Modal */}
      {showGradingModal && selectedAssignment && (
        <GradingModal
          assignment={selectedAssignment}
          onClose={() => {
            setShowGradingModal(false);
            setSelectedAssignment(null);
          }}
          onGraded={() => {
            fetchAssignments();
            setShowGradingModal(false);
            setSelectedAssignment(null);
          }}
        />
      )}
    </div>
  );
};

// Assignment Modal Component
const AssignmentModal = ({ title, assignment, courses, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    course_id: assignment?.course_id || '',
    title: assignment?.title || '',
    description: assignment?.description || '',
    due_date: assignment?.due_date ? assignment.due_date.slice(0, 16) : '',
    max_points: assignment?.max_points || 100,
    assignment_type: assignment?.assignment_type || 'homework'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Course</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                required
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Points</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.max_points}
                  onChange={(e) => setFormData({ ...formData, max_points: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.assignment_type}
                onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value })}
              >
                <option value="homework">Homework</option>
                <option value="quiz">Quiz</option>
                <option value="exam">Exam</option>
                <option value="project">Project</option>
                <option value="essay">Essay</option>
              </select>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {assignment ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Grading Modal Component
const GradingModal = ({ assignment, onClose, onGraded }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.assignment.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId, grade, feedback) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grade, feedback })
      });

      if (response.ok) {
        fetchSubmissions();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to grade submission');
      }
    } catch (error) {
      console.error('Failed to grade submission:', error);
      alert('Failed to grade submission');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Grade Assignment: {assignment.title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {submissions.map((submission) => (
                <SubmissionGradeCard
                  key={submission.id}
                  submission={submission}
                  maxPoints={assignment.max_points}
                  onGrade={handleGradeSubmission}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onGraded}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Submission Grade Card Component
const SubmissionGradeCard = ({ submission, maxPoints, onGrade }) => {
  const [grade, setGrade] = useState(submission.grade || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [isEditing, setIsEditing] = useState(!submission.grade);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (grade !== '' && grade >= 0 && grade <= maxPoints) {
      onGrade(submission.id, parseFloat(grade), feedback);
      setIsEditing(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{submission.student_name}</h4>
          <p className="text-sm text-gray-600">{submission.student_email}</p>
          <p className="text-xs text-gray-500">
            Submitted: {format(new Date(submission.submitted_at), 'MMM dd, yyyy HH:mm')}
          </p>
        </div>
        <div className="text-right">
          {submission.grade !== null ? (
            <div>
              <span className="text-lg font-bold text-green-600">
                {submission.grade}/{maxPoints}
              </span>
              <p className="text-xs text-gray-500">
                Graded: {format(new Date(submission.graded_at), 'MMM dd, yyyy')}
              </p>
            </div>
          ) : (
            <span className="text-sm text-yellow-600">Not graded</span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-700">{submission.submission_text}</p>
        {submission.file_url && (
          <a 
            href={submission.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            📎 View Attachment
          </a>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Grade (0-{maxPoints})</label>
              <input
                type="number"
                min="0"
                max={maxPoints}
                step="0.1"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Save Grade
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Feedback</label>
            <textarea
              rows={2}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional feedback for the student..."
            />
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {submission.feedback && (
            <div>
              <p className="text-sm font-medium text-gray-700">Feedback:</p>
              <p className="text-sm text-gray-600">{submission.feedback}</p>
            </div>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Edit Grade
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentManagement;