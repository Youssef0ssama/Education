import { useState } from 'react';
import { Home, Users, Calendar, MessageSquare, BarChart3, User, Bell, Settings, LogOut } from 'lucide-react';
import ParentDashboard from './ParentDashboard';
import ChildrenManagement from './ChildrenManagement';
import ParentSchedule from './ParentSchedule';
import ParentCommunication from './ParentCommunication';

const ParentMain = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, component: ParentDashboard },
    { id: 'children', name: 'My Children', icon: Users, component: ChildrenManagement },
    { id: 'schedule', name: 'Schedule', icon: Calendar, component: ParentSchedule },
    { id: 'communication', name: 'Messages', icon: MessageSquare, component: ParentCommunication },
    { id: 'progress', name: 'Progress Reports', icon: BarChart3, component: ProgressReports },
  ];

  const ActiveComponent = navigation.find(nav => nav.id === activeTab)?.component || ParentDashboard;

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
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">Parent</p>
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
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
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
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Children</span>
                  <span className="font-medium text-gray-900">2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Courses</span>
                  <span className="font-medium text-gray-900">6</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Attendance</span>
                  <span className="font-medium text-green-600">92%</span>
                </div>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Updates</h3>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Math Test Results</p>
                  <p className="text-xs text-green-600">Sarah scored 95%</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Parent-Teacher Meeting</p>
                  <p className="text-xs text-blue-600">Scheduled for Friday</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Assignment Due</p>
                  <p className="text-xs text-yellow-600">History project tomorrow</p>
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

// Progress Reports Component
const ProgressReports = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Progress Reports</h1>
        <p className="text-gray-600">Track your children's academic progress and performance</p>
      </div>
      
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Progress reports feature coming soon!</p>
        <p className="text-sm text-gray-500">Detailed analytics and performance tracking will be available here.</p>
      </div>
    </div>
  );
};

export default ParentMain;