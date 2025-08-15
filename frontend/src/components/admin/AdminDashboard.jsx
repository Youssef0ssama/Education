import { useState, useEffect } from 'react';
import { Users, BookOpen, DollarSign, TrendingUp, UserPlus, Settings, BarChart3, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = ({ user }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/dashboard/admin', {
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    const { stats = {}, recentUsers = [], enrollmentTrends = [], recentTransactions = [] } = dashboardData || {};

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
                <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}! ⚡</h1>
                <p className="text-red-100">Manage and monitor your education platform</p>
            </div>

            {/* Platform Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Students</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_students || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <UserPlus className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_teachers || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <BookOpen className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Active Courses</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_courses || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-yellow-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ${(stats.total_revenue || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <Activity className="h-8 w-8 text-orange-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Active Enrollments</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.active_enrollments || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <Users className="h-8 w-8 text-indigo-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Parents</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_parents || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Platform Growth</p>
                            <p className="text-2xl font-bold text-green-600">+12%</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent User Registrations */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">Recent User Registrations</h2>
                    </div>
                    <div className="p-6">
                        {recentUsers.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No recent registrations</p>
                        ) : (
                            <div className="space-y-4">
                                {recentUsers.map((user) => (
                                    <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-shrink-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'student' ? 'bg-blue-500' :
                                                    user.role === 'teacher' ? 'bg-green-500' :
                                                        user.role === 'parent' ? 'bg-purple-500' :
                                                            'bg-red-500'
                                                }`}>
                                                <span className="text-white text-sm font-medium">
                                                    {user.name.charAt(0)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                            <p className="text-sm text-gray-600">{user.email}</p>
                                            <p className="text-xs text-gray-500">
                                                {user.created_at || user.createdAt
                                                    ? format(new Date(user.created_at || user.createdAt), 'MMM dd, yyyy')
                                                    : 'Unknown date'
                                                }
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'student' ? 'bg-blue-100 text-blue-800' :
                                                    user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                                                        user.role === 'parent' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Course Enrollment Trends */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">Popular Courses</h2>
                    </div>
                    <div className="p-6">
                        {enrollmentTrends.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No enrollment data</p>
                        ) : (
                            <div className="space-y-4">
                                {enrollmentTrends.map((course, index) => (
                                    <div key={course.course_title} className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-bold">{index + 1}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{course.course_title}</p>
                                            <div className="flex items-center space-x-4 mt-1">
                                                <span className="text-sm text-gray-600">
                                                    👥 {course.enrollment_count} students
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    📊 {Math.round(course.avg_progress || 0)}% avg progress
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <BarChart3 className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                </div>
                <div className="p-6">
                    {recentTransactions.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No recent transactions</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Course
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {recentTransactions.map((transaction) => (
                                        <tr key={transaction.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {transaction.user_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {transaction.course_title || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ${transaction.amount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : transaction.status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {transaction.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {transaction.created_at || transaction.createdAt
                                                    ? format(new Date(transaction.created_at || transaction.createdAt), 'MMM dd, yyyy')
                                                    : 'Unknown date'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* System Status & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Status */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-900">Database</span>
                                </div>
                                <span className="text-sm text-green-600">Operational</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-900">API Services</span>
                                </div>
                                <span className="text-sm text-green-600">Operational</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-900">Payment Gateway</span>
                                </div>
                                <span className="text-sm text-green-600">Operational</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                                    <span className="text-sm font-medium text-gray-900">Email Service</span>
                                </div>
                                <span className="text-sm text-yellow-600">Degraded</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                                <UserPlus className="h-8 w-8 text-blue-600 mb-2" />
                                <span className="text-sm font-medium">Add User</span>
                            </button>
                            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                                <BookOpen className="h-8 w-8 text-green-600 mb-2" />
                                <span className="text-sm font-medium">Manage Courses</span>
                            </button>
                            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                                <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
                                <span className="text-sm font-medium">View Reports</span>
                            </button>
                            <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                                <Settings className="h-8 w-8 text-gray-600 mb-2" />
                                <span className="text-sm font-medium">System Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;