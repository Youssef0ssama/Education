import { useState } from 'react';
import { Home, BookOpen, Users, FileText, Calendar, BarChart3, FolderOpen, User, Bell, Settings, LogOut } from 'lucide-react';
import TeacherDashboard from './TeacherDashboard';
import CourseManagement from '../shared/CourseManagement';
import AssignmentManagement from '../shared/AssignmentManagement';
import SessionManagement from '../shared/SessionManagement';
import TeacherContentManager from './TeacherContentManager';

const TeacherMain = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, component: TeacherDashboard },
    { id: 'courses', name: 'My Courses', icon: BookOpen, component: CourseManagement },
    { id: 'content', name: 'Course Materials', icon: FolderOpen, component: TeacherContentManager },
    { id: 'students', name: 'Students', icon: Users, component: StudentManagement },
    { id: 'assignments', name: 'Assignments', icon: FileText, component: AssignmentManagement },
    { id: 'sessions', name: 'Sessions', icon: Calendar, component: SessionManagement },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, component: TeacherAnalytics },
  ];

  const ActiveComponent = navigation.find(nav => nav.id === activeTab)?.component || TeacherDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">EduManage</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">Teacher</p>
                  </div>
                </div>
                
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === item.id
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Teaching Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Courses</span>
                  <span className="font-medium text-gray-900">4</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Students</span>
                  <span className="font-medium text-gray-900">127</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending Grades</span>
                  <span className="font-medium text-orange-600">23</span>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Today's Sessions</h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Mathematics 101</p>
                  <p className="text-xs text-blue-600">10:00 AM - 11:30 AM</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Physics Lab</p>
                  <p className="text-xs text-green-600">2:00 PM - 4:00 PM</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Office Hours</p>
                  <p className="text-xs text-gray-600">4:30 PM - 5:30 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <ActiveComponent user={user} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Student Management Component
const StudentManagement = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
        <p className="text-gray-600">Manage your students, track attendance, and monitor progress</p>
      </div>
      
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Student management feature coming soon!</p>
        <p className="text-sm text-gray-500">View student profiles, attendance records, and performance analytics.</p>
      </div>
    </div>
  );
};

// Teacher Analytics Component
const TeacherAnalytics = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teaching Analytics</h1>
        <p className="text-gray-600">Analyze your teaching performance and student engagement</p>
      </div>
      
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Analytics dashboard coming soon!</p>
        <p className="text-sm text-gray-500">Detailed insights into student performance, engagement metrics, and course analytics.</p>
      </div>
    </div>
  );
};

export default TeacherMain;