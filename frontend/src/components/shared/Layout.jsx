import { useState } from 'react';
import { Menu, X, User, LogOut, Bell } from 'lucide-react';

const Layout = ({ children, user, onLogout, currentPath, onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = {
    student: [
      { name: 'Dashboard', href: '/dashboard', icon: '📊' },
      { name: 'My Courses', href: '/courses', icon: '📚' },
      { name: 'Schedule', href: '/schedule', icon: '📅' },
      { name: 'Assignments', href: '/assignments', icon: '📝' },
      { name: 'Grades', href: '/grades', icon: '🎯' },
    ],
    teacher: [
      { name: 'Dashboard', href: '/dashboard', icon: '📊' },
      { name: 'My Courses', href: '/courses', icon: '📚' },
      { name: 'Course Management', href: '/manage-courses', icon: '🎓' },
      { name: 'Assignment Management', href: '/manage-assignments', icon: '📝' },
      { name: 'Session Management', href: '/manage-sessions', icon: '📅' },
      { name: 'Students', href: '/students', icon: '👥' },
    ],
    parent: [
      { name: 'Dashboard', href: '/dashboard', icon: '📊' },
      { name: 'Children Management', href: '/manage-children', icon: '👶' },
      { name: 'Family Schedule', href: '/parent-schedule', icon: '📅' },
      { name: 'Communication', href: '/parent-communication', icon: '💬' },
      { name: 'Progress Reports', href: '/progress', icon: '📈' },
    ],
    admin: [
      { name: 'Dashboard', href: '/dashboard', icon: '📊' },
      { name: 'User Management', href: '/manage-users', icon: '👥' },
      { name: 'Course Management', href: '/manage-courses', icon: '📚' },
      { name: 'Analytics', href: '/analytics', icon: '📈' },
      { name: 'Settings', href: '/settings', icon: '⚙️' },
    ],
  };

  const currentNavigation = navigation[user?.role] || navigation.student;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <span className="text-xl font-bold text-blue-600">EduPlatform</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4">
            {currentNavigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  onNavigate(item.href);
                  setSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-2 text-left rounded-lg mb-1 transition-colors ${
                  currentPath === item.href
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <div className="flex h-16 items-center px-4 border-b">
            <span className="text-xl font-bold text-blue-600">🎓 EduPlatform</span>
          </div>
          <nav className="flex-1 px-4 py-4">
            {currentNavigation.map((item) => (
              <button
                key={item.name}
                onClick={() => onNavigate(item.href)}
                className={`flex items-center w-full px-4 py-2 text-left rounded-lg mb-1 transition-colors ${
                  currentPath === item.href
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-white px-4 shadow-sm">
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
              </button>

              <div className="flex items-center gap-x-3">
                <div className="flex items-center gap-x-2">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-gray-500"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;