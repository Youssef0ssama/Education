import { useState, useEffect } from 'react';
import { Users, TrendingUp, Calendar, Award, MessageCircle, Bell, BookOpen, Clock } from 'lucide-react';
import { format } from 'date-fns';

const ParentDashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/parent', {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const { children = [], upcomingSessions = [], recentGrades = [] } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}! 👨‍👩‍👧‍👦</h1>
        <p className="text-purple-100">Stay connected with your children's educational journey</p>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {children.map((child) => (
          <div key={child.id} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {child.name.charAt(0)}
                </span>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">{child.name}</h3>
                <p className="text-sm text-gray-600">{child.email}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Enrolled Courses</span>
                <span className="font-semibold text-gray-900">{child.enrolled_courses}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Progress</span>
                <span className="font-semibold text-gray-900">
                  {Math.round(child.avg_progress || 0)}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${child.avg_progress || 0}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Attendance</span>
                <span className="font-semibold text-gray-900">
                  {child.total_attendance}/{child.total_sessions}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Attendance Rate</span>
                <span className={`font-semibold ${
                  (child.total_attendance / child.total_sessions) > 0.8 
                    ? 'text-green-600' 
                    : 'text-orange-600'
                }`}>
                  {child.total_sessions > 0 
                    ? Math.round((child.total_attendance / child.total_sessions) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <button className="w-full text-sm bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
                View Details
              </button>
            </div>
          </div>
        ))}
        
        {children.length === 0 && (
          <div className="col-span-3 text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No children linked to your account</p>
            <p className="text-sm text-gray-500">Contact support to link student accounts</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <p className="text-sm text-gray-600 mb-1">
                      Course: {session.course_title}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Student: {session.student_name}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {format(new Date(session.scheduled_start), 'MMM dd, yyyy - HH:mm')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {format(new Date(session.scheduled_start), 'HH:mm')} - 
                          {format(new Date(session.scheduled_end), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Grades */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Grades</h2>
          </div>
          <div className="p-6">
            {recentGrades.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent grades</p>
            ) : (
              <div className="space-y-4">
                {recentGrades.map((grade, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{grade.assignment_title}</h3>
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span className={`font-semibold ${
                          (grade.grade / grade.max_points) >= 0.8 
                            ? 'text-green-600' 
                            : (grade.grade / grade.max_points) >= 0.6 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                        }`}>
                          {grade.grade}/{grade.max_points}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Course: {grade.course_title}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Student: {grade.student_name}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Graded: {format(new Date(grade.graded_at), 'MMM dd, yyyy')}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        (grade.grade / grade.max_points) >= 0.8 
                          ? 'bg-green-100 text-green-800' 
                          : (grade.grade / grade.max_points) >= 0.6 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {Math.round((grade.grade / grade.max_points) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Communication & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                <MessageCircle className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium">Message Teachers</span>
              </button>
              <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                <Calendar className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium">View Schedule</span>
              </button>
              <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium">Progress Reports</span>
              </button>
              <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                <BookOpen className="h-8 w-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium">Course Materials</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Notifications</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Assignment Due Reminder
                  </p>
                  <p className="text-sm text-gray-600">
                    John has an assignment due tomorrow in Math class
                  </p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <Award className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Great Performance!
                  </p>
                  <p className="text-sm text-gray-600">
                    Mary scored 95% on her Science quiz
                  </p>
                  <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Schedule Change
                  </p>
                  <p className="text-sm text-gray-600">
                    Tomorrow's English class moved to 2:00 PM
                  </p>
                  <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <button className="w-full text-sm text-purple-600 hover:text-purple-800">
                View All Notifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;