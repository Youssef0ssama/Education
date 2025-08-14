import { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, CheckCircle, Clock, TrendingUp, FileText, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const TeacherDashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/teacher', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { courses = [], upcomingSessions = [], pendingGrading = [], studentActivity = [] } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}! 👨‍🏫</h1>
        <p className="text-green-100">Ready to inspire and educate your students?</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {courses.reduce((total, course) => total + parseInt(course.enrolled_students || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Upcoming Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingSessions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Grading</p>
              <p className="text-2xl font-bold text-gray-900">{pendingGrading.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Courses */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
          </div>
          <div className="p-6">
            {courses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No courses assigned yet</p>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{course.title}</h3>
                      <span className="text-sm text-gray-500">${course.price}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          👥 {course.enrolled_students} students
                        </span>
                        <span className="text-sm text-gray-500">
                          📊 {Math.round(course.avg_progress || 0)}% avg progress
                        </span>
                      </div>
                      <button className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
          </div>
          <div className="p-6">
            {upcomingSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming sessions</p>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{session.title}</h3>
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{session.course_title}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      {format(new Date(session.scheduled_start), 'MMM dd, yyyy - HH:mm')}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Meeting ID: {session.zoom_meeting_id || 'Not set'}
                      </span>
                      <div className="space-x-2">
                        {session.zoom_join_url && (
                          <a 
                            href={session.zoom_join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Start Session
                          </a>
                        )}
                        <button className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Grading & Student Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Grading */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Pending Grading</h2>
          </div>
          <div className="p-6">
            {pendingGrading.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No submissions to grade</p>
            ) : (
              <div className="space-y-4">
                {pendingGrading.map((submission) => (
                  <div key={submission.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{submission.assignment_title}</h3>
                      <span className="text-sm text-gray-500">
                        {submission.max_points} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Student: {submission.student_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Course: {submission.course_title}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Submitted: {format(new Date(submission.submitted_at), 'MMM dd, HH:mm')}
                      </span>
                      <button className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                        Grade Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Student Activity */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Student Activity</h2>
          </div>
          <div className="p-6">
            {studentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {studentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {activity.student_name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.student_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.course_title} - {activity.progress_percentage}% complete
                      </p>
                      <p className="text-xs text-gray-500">
                        Last active: {format(new Date(activity.last_activity), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <BookOpen className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Create Course</span>
            </button>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <Calendar className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">Schedule Session</span>
            </button>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <FileText className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Create Assignment</span>
            </button>
            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <MessageSquare className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium">Message Students</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;