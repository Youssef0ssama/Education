import { useState } from 'react';
import { Home, Users, BookOpen, FileText, Calendar, BarChart3, Settings, Shield, User, Bell, LogOut } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import CourseManagement from '../shared/CourseManagement';
import AssignmentManagement from '../shared/AssignmentManagement';
import SessionManagement from '../shared/SessionManagement';

const AdminMain = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, component: AdminDashboard },
    { id: 'users', name: 'User Management', icon: Users, component: UserManagement },
    { id: 'courses', name: 'Course Management', icon: BookOpen, component: CourseManagement },
    { id: 'assignments', name: 'Assignments', icon: FileText, component: AssignmentManagement },
    { id: 'sessions', name: 'Sessions', icon: Calendar, component: SessionManagement },
    { id: 'analytics', name: 'System Analytics', icon: BarChart3, component: SystemAnalytics },
    { id: 'settings', name: 'System Settings', icon: Settings, component: SystemSettings },
  ];

  const ActiveComponent = navigation.find(nav => nav.id === activeTab)?.component || AdminDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold">ب</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">براعم النور</h1>
                  <p className="text-xs text-gray-600">Baraem Al-Noor</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-green-600">
                <Bell className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                </div>
                
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-green-600"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
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
                          ? 'bg-green-100 text-green-700 border border-green-200'
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

            {/* System Stats */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">System Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Users</span>
                  <span className="font-medium text-gray-900">1,247</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Courses</span>
                  <span className="font-medium text-gray-900">89</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">System Health</span>
                  <span className="font-medium text-green-600">Excellent</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">New User Registration</p>
                  <p className="text-xs text-blue-600">5 new students today</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Course Created</p>
                  <p className="text-xs text-green-600">Advanced Mathematics</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">System Backup</p>
                  <p className="text-xs text-gray-600">Completed successfully</p>
                </div>
              </div>
            </div>

            {/* System Alerts */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">System Alerts</h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 bg-yellow-50 px-2 py-1 rounded">
                    Server maintenance scheduled
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Sunday 2:00 AM - 4:00 AM</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-green-800 bg-green-50 px-2 py-1 rounded">
                    All systems operational
                  </p>
                  <p className="text-xs text-gray-600 mt-1">99.9% uptime this month</p>
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

// System Analytics Component
const SystemAnalytics = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
        <p className="text-gray-600">Monitor system performance, user engagement, and platform metrics</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">1,247</p>
              <p className="text-xs text-green-600">+12% this month</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Courses</p>
              <p className="text-2xl font-bold text-gray-900">89</p>
              <p className="text-xs text-green-600">+5% this month</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions Today</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-xs text-blue-600">Peak: 2-4 PM</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">System Load</p>
              <p className="text-2xl font-bold text-gray-900">23%</p>
              <p className="text-xs text-green-600">Optimal</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Detailed analytics dashboard coming soon!</p>
        <p className="text-sm text-gray-500">Advanced charts, reports, and system monitoring tools.</p>
      </div>
    </div>
  );
};

// System Settings Component
const SystemSettings = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">Configure system-wide settings and preferences</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">System Name</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                defaultValue="Baraem Al-Noor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time Zone</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                <option>UTC-5 (Eastern Time)</option>
                <option>UTC-8 (Pacific Time)</option>
                <option>UTC+0 (GMT)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
              <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">Enabled</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Session Timeout</span>
              <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>2 hours</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center py-8">
        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Advanced system configuration coming soon!</p>
        <p className="text-sm text-gray-500">Email settings, backup configuration, and more.</p>
      </div>
    </div>
  );
};

export default AdminMain;