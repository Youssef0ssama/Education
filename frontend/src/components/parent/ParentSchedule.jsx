import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Video, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

const ParentSchedule = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    child_id: '',
    date_from: '',
    date_to: ''
  });
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'list'

  useEffect(() => {
    fetchChildren();
    fetchSessions();
  }, [filters]);

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/children', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/parent/schedule?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      case 'excused': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSessionStatus = (session) => {
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'completed';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Schedule</h1>
          <p className="text-gray-600">View your children's class schedules and attendance</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              viewMode === 'week' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              viewMode === 'list' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={filters.child_id}
              onChange={(e) => setFilters({ ...filters, child_id: e.target.value })}
            >
              <option value="">All Children</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>

            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              placeholder="From Date"
            />

            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              placeholder="To Date"
            />
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : viewMode === 'week' ? (
        <WeekView sessions={sessions} getAttendanceColor={getAttendanceColor} getAttendanceIcon={getAttendanceIcon} getSessionStatus={getSessionStatus} getStatusColor={getStatusColor} />
      ) : (
        <ListView sessions={sessions} getAttendanceColor={getAttendanceColor} getAttendanceIcon={getAttendanceIcon} getSessionStatus={getSessionStatus} getStatusColor={getStatusColor} />
      )}
    </div>
  );
};

// Week View Component
const WeekView = ({ sessions, getAttendanceColor, getAttendanceIcon, getSessionStatus, getStatusColor }) => {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = format(new Date(session.scheduled_start), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
          <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySessions = sessionsByDate[dateKey] || [];
          const isToday = isSameDay(day, today);
          
          return (
            <div key={dateKey} className={`bg-white p-3 min-h-40 ${isToday ? 'bg-purple-50' : ''}`}>
              <div className={`text-sm font-medium mb-3 ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-2">
                {daySessions.map((session) => {
                  const status = getSessionStatus(session);
                  return (
                    <div
                      key={session.id}
                      className="text-xs p-2 rounded border-l-2 border-purple-400 bg-purple-25 hover:bg-purple-50 cursor-pointer"
                    >
                      <div className="font-medium text-gray-900 truncate mb-1">
                        {session.title}
                      </div>
                      <div className="text-gray-600 truncate mb-1">
                        {session.student_name}
                      </div>
                      <div className="text-gray-500 mb-1">
                        {format(new Date(session.scheduled_start), 'HH:mm')} - 
                        {format(new Date(session.scheduled_end), 'HH:mm')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs ${getStatusColor(status)}`}>
                          {status === 'live' && <div className="w-1 h-1 bg-green-500 rounded-full mr-1 animate-pulse"></div>}
                          {status}
                        </span>
                        {session.attendance_status && (
                          <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs ${getAttendanceColor(session.attendance_status)}`}>
                            {getAttendanceIcon(session.attendance_status)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// List View Component
const ListView = ({ sessions, getAttendanceColor, getAttendanceIcon, getSessionStatus, getStatusColor }) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No sessions found for the selected criteria</p>
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

  const sortedDates = Object.keys(sessionsByDate).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date} className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(new Date(date), 'EEEE, MMMM dd, yyyy')}
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {sessionsByDate[date].map((session) => {
                const status = getSessionStatus(session);
                return (
                  <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{session.title}</h4>
                        <p className="text-sm text-gray-600 mb-1">Course: {session.course_title}</p>
                        <p className="text-sm text-gray-600">Student: {session.student_name}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                          {status === 'live' && <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>}
                          {status}
                        </span>
                        {session.attendance_status && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getAttendanceColor(session.attendance_status)}`}>
                            {getAttendanceIcon(session.attendance_status)}
                            <span className="ml-1 capitalize">{session.attendance_status}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>
                            {format(new Date(session.scheduled_start), 'HH:mm')} - 
                            {format(new Date(session.scheduled_end), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>Instructor: {session.instructor_name}</span>
                        </div>
                      </div>
                      
                      {status === 'live' && (
                        <div className="flex items-center text-green-600">
                          <Video className="h-4 w-4 mr-1" />
                          <span className="font-medium">Live Now</span>
                        </div>
                      )}
                    </div>

                    {session.description && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">{session.description}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ParentSchedule;