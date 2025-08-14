import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Calendar, Clock, Users, Video, CheckCircle, UserCheck } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';

const SessionManagement = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    course_id: '',
    status: '',
    date_from: '',
    date_to: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  useEffect(() => {
    fetchSessions();
    fetchCourses();
  }, [filters]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/sessions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/courses?limit=100';
      
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

  const handleCreateSession = async (sessionData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchSessions();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session');
    }
  };

  const handleUpdateSession = async (sessionId, sessionData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedSession(null);
        fetchSessions();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update session');
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      alert('Failed to update session');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchSessions();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isSessionLive = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);
    return now >= start && now <= end && session.status === 'in_progress';
  };

  const isSessionUpcoming = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_start);
    return start > now && session.status === 'scheduled';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Session Management</h1>
          <p className="text-gray-600">Schedule and manage class sessions</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                viewMode === 'calendar' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value, page: 1 })}
            placeholder="From Date"
          />

          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value, page: 1 })}
            placeholder="To Date"
          />

          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: e.target.value, page: 1 })}
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>
      </div>

      {/* Sessions Content */}
      {viewMode === 'list' ? (
        <SessionsList 
          sessions={sessions}
          loading={loading}
          onEdit={(session) => {
            setSelectedSession(session);
            setShowEditModal(true);
          }}
          onDelete={handleDeleteSession}
          onAttendance={(session) => {
            setSelectedSession(session);
            setShowAttendanceModal(true);
          }}
          isSessionLive={isSessionLive}
          isSessionUpcoming={isSessionUpcoming}
          getStatusColor={getStatusColor}
        />
      ) : (
        <SessionsCalendar 
          sessions={sessions}
          loading={loading}
          onEdit={(session) => {
            setSelectedSession(session);
            setShowEditModal(true);
          }}
          isSessionLive={isSessionLive}
          getStatusColor={getStatusColor}
        />
      )}

      {/* Pagination for List View */}
      {viewMode === 'list' && pagination.pages > 1 && (
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
              onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, filters.page + 1) })}
              disabled={filters.page === pagination.pages}
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
                  {Math.min(filters.page * filters.limit, pagination.total)}
                </span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <SessionModal
          title="Schedule New Session"
          courses={courses}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}

      {/* Edit Session Modal */}
      {showEditModal && selectedSession && (
        <SessionModal
          title="Edit Session"
          session={selectedSession}
          courses={courses}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSession(null);
          }}
          onSubmit={(sessionData) => handleUpdateSession(selectedSession.id, sessionData)}
        />
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedSession && (
        <AttendanceModal
          session={selectedSession}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedSession(null);
          }}
          onAttendanceMarked={() => {
            fetchSessions();
          }}
        />
      )}
    </div>
  );
};

// Sessions List Component
const SessionsList = ({ sessions, loading, onEdit, onDelete, onAttendance, isSessionLive, isSessionUpcoming, getStatusColor }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No sessions found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sessions.map((session) => (
        <div key={session.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {session.title}
              </h3>
              <div className="flex flex-col items-end space-y-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                  {session.status.replace('_', ' ')}
                </span>
                {isSessionLive(session) && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                    LIVE
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {session.description}
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Course: {session.course_title}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>
                  {format(new Date(session.scheduled_start), 'MMM dd, yyyy HH:mm')} - 
                  {format(new Date(session.scheduled_end), 'HH:mm')}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span>
                  Attendance: {session.present_count}/{session.attendance_count}
                </span>
              </div>

              {session.zoom_join_url && (
                <div className="flex items-center text-sm text-gray-600">
                  <Video className="h-4 w-4 mr-2" />
                  <span>Zoom Meeting Available</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(session)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Edit Session"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(session.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete Session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex space-x-2">
                {session.zoom_join_url && isSessionUpcoming(session) && (
                  <a
                    href={session.zoom_join_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    <Video className="h-3 w-3" />
                    <span>Join</span>
                  </a>
                )}
                <button
                  onClick={() => onAttendance(session)}
                  className="flex items-center space-x-1 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  <UserCheck className="h-3 w-3" />
                  <span>Attendance</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Instructor: {session.instructor_name}</span>
              <span>Meeting ID: {session.zoom_meeting_id || 'N/A'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Sessions Calendar Component (Simplified)
const SessionsCalendar = ({ sessions, loading, onEdit, isSessionLive, getStatusColor }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = format(new Date(session.scheduled_start), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  // Get current week
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySessions = sessionsByDate[dateKey] || [];
          const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          
          return (
            <div key={dateKey} className={`bg-white p-2 min-h-32 ${isToday ? 'bg-blue-50' : ''}`}>
              <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {daySessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onEdit(session)}
                    className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${getStatusColor(session.status)}`}
                  >
                    <div className="font-medium truncate">{session.title}</div>
                    <div className="truncate">{format(new Date(session.scheduled_start), 'HH:mm')}</div>
                    {isSessionLive(session) && (
                      <div className="text-red-600 font-bold">LIVE</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Session Modal Component
const SessionModal = ({ title, session, courses, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    course_id: session?.course_id || '',
    title: session?.title || '',
    description: session?.description || '',
    scheduled_start: session?.scheduled_start ? session.scheduled_start.slice(0, 16) : '',
    scheduled_end: session?.scheduled_end ? session.scheduled_end.slice(0, 16) : '',
    zoom_meeting_id: session?.zoom_meeting_id || '',
    zoom_join_url: session?.zoom_join_url || '',
    zoom_password: session?.zoom_password || '',
    status: session?.status || 'scheduled'
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
              <label className="block text-sm font-medium text-gray-700">Session Title</label>
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
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.scheduled_start}
                  onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="datetime-local"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.scheduled_end}
                  onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Zoom Meeting ID</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.zoom_meeting_id}
                onChange={(e) => setFormData({ ...formData, zoom_meeting_id: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Zoom Join URL</label>
              <input
                type="url"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.zoom_join_url}
                onChange={(e) => setFormData({ ...formData, zoom_join_url: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Zoom Password</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.zoom_password}
                onChange={(e) => setFormData({ ...formData, zoom_password: e.target.value })}
              />
            </div>

            {session && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

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
                {session ? 'Update' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Attendance Modal Component
const AttendanceModal = ({ session, onClose, onAttendanceMarked }) => {
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    fetchSessionDetails();
  }, []);

  const fetchSessionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${session.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data.session);
        
        // Initialize attendance data
        const initialData = {};
        data.session.attendance.forEach(att => {
          initialData[att.student_id] = {
            status: att.status,
            notes: att.notes || ''
          };
        });
        data.session.unmarked_students.forEach(student => {
          initialData[student.id] = {
            status: 'absent',
            notes: ''
          };
        });
        setAttendanceData(initialData);
      }
    } catch (error) {
      console.error('Failed to fetch session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const attendanceRecords = Object.entries(attendanceData).map(([studentId, data]) => ({
        student_id: parseInt(studentId),
        status: data.status,
        notes: data.notes
      }));

      const response = await fetch(`/api/sessions/${session.id}/attendance/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attendance_records: attendanceRecords })
      });

      if (response.ok) {
        onAttendanceMarked();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      alert('Failed to mark attendance');
    }
  };

  const updateAttendance = (studentId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const allStudents = [
    ...sessionDetails.attendance.map(att => ({
      id: att.student_id,
      name: att.student_name,
      email: att.student_email,
      hasRecord: true
    })),
    ...sessionDetails.unmarked_students.map(student => ({
      ...student,
      hasRecord: false
    }))
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Mark Attendance: {session.title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Course:</strong> {sessionDetails.course_title}<br />
              <strong>Time:</strong> {format(new Date(sessionDetails.scheduled_start), 'MMM dd, yyyy HH:mm')} - 
              {format(new Date(sessionDetails.scheduled_end), 'HH:mm')}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={attendanceData[student.id]?.status || 'absent'}
                        onChange={(e) => updateAttendance(student.id, 'status', e.target.value)}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={attendanceData[student.id]?.notes || ''}
                        onChange={(e) => updateAttendance(student.id, 'notes', e.target.value)}
                        placeholder="Optional notes..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAttendance}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionManagement;