import { StudentMain } from '../student';
import { TeacherMain } from '../teacher';
import { ParentMain } from '../parent';
import { AdminMain } from '../admin';

const Router = ({ user }) => {
  // All user roles now use their own main components with consistent theming
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  switch (user?.role) {
    case 'student':
      return <StudentMain user={user} onLogout={handleLogout} />;
    case 'teacher':
      return <TeacherMain user={user} onLogout={handleLogout} />;
    case 'parent':
      return <ParentMain user={user} onLogout={handleLogout} />;
    case 'admin':
      return <AdminMain user={user} onLogout={handleLogout} />;
    default:
      return <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome!</h2>
        <p className="text-gray-600">Dashboard loading...</p>
      </div>;
  }
};

const UnauthorizedPage = () => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">🚫</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
    <p className="text-gray-600">You don't have permission to access this page.</p>
  </div>
);

const ComingSoonPage = ({ title }) => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">🚧</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
    <p className="text-gray-600">This feature is coming soon!</p>
    <p className="text-sm text-gray-500 mt-2">We're working hard to bring you this functionality.</p>
  </div>
);

export default Router;