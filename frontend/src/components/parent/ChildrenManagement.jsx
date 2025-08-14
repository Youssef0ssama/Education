import { useState, useEffect } from 'react';
import { Users, TrendingUp, Calendar, Award, BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const ChildrenManagement = ({ user }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childProgress, setChildProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildProgress(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/children', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children);
        if (data.children.length > 0 && !selectedChild) {
          setSelectedChild(data.children[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildProgress = async (childId) => {
    try {
      setProgressLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/parent/children/${childId}/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChildProgress(data);
      }
    } catch (error) {
      console.error('Failed to fetch child progress:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 95) return 'bg-green-100 text-green-800';
    if (percentage >= 85) return 'bg-blue-100 text-blue-800';
    if (percentage >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Children Linked</h2>
        <p className="text-gray-600">Contact support to link your children's accounts to your parent account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Children's Progress</h1>
        <p className="text-gray-600">Monitor your children's academic performance and attendance</p>
      </div>

      {/* Children Selector */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Child</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedChild?.id === child.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
              }`}
            >
              <div className="flex items-center mb-3">
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
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Courses</p>
                  <p className="font-semibold">{child.enrolled_courses}</p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Progress</p>
                  <p className="font-semibold">{Math.round(child.avg_progress || 0)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Attendance</p>
                  <p className="font-semibold">
                    {child.total_sessions > 0 
                      ? Math.round((child.attended_sessions / child.total_sessions) * 100)
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Grade</p>
                  <p className={`font-semibold ${getGradeColor(child.avg_grade_percentage || 0)}`}>
                    {Math.round(child.avg_grade_percentage || 0)}%
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Child Details */}
      {selectedChild && (
        <div className="space-y-6">
          {/* Child Overview */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {selectedChild.name.charAt(0)}
                </span>
              </div>
              <div className="ml-4">
                <h2 className="text-2xl font-bold">{selectedChild.name}</h2>
                <p className="text-purple-100">{selectedChild.email}</p>
                <p className="text-purple-100 capitalize">{selectedChild.relationship_type}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{selectedChild.enrolled_courses}</p>
                <p className="text-purple-100">Enrolled Courses</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{Math.round(selectedChild.avg_progress || 0)}%</p>
                <p className="text-purple-100">Average Progress</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {selectedChild.total_sessions > 0 
                    ? Math.round((selectedChild.attended_sessions / selectedChild.total_sessions) * 100)
                    : 0}%
                </p>
                <p className="text-purple-100">Attendance Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{Math.round(selectedChild.avg_grade_percentage || 0)}%</p>
                <p className="text-purple-100">Average Grade</p>
              </div>
            </div>
          </div>

          {/* Detailed Progress */}
          {progressLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : childProgress && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Course Progress */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Course Progress</h3>
                </div>
                <div className="p-6">
                  {childProgress.courses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No courses enrolled</p>
                  ) : (
                    <div className="space-y-4">
                      {childProgress.courses.map((course) => (
                        <div key={course.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{course.title}</h4>
                            <span className="text-sm text-gray-500">{course.progress_percentage}%</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">Instructor: {course.instructor_name}</p>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${course.progress_percentage}%` }}
                            ></div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Attendance</p>
                              <p className="font-semibold">
                                {course.attended_sessions}/{course.total_sessions}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Assignments</p>
                              <p className="font-semibold">
                                {course.graded_assignments}/{course.total_assignments}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Avg Grade</p>
                              <p className={`font-semibold ${getGradeColor(course.avg_grade_percentage || 0)}`}>
                                {Math.round(course.avg_grade_percentage || 0)}%
                              </p>
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
                  <h3 className="text-lg font-semibold text-gray-900">Recent Grades</h3>
                </div>
                <div className="p-6">
                  {childProgress.recentGrades.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No grades yet</p>
                  ) : (
                    <div className="space-y-4">
                      {childProgress.recentGrades.slice(0, 10).map((grade) => (
                        <div key={grade.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{grade.assignment_title}</h4>
                            <div className="text-right">
                              <span className={`text-lg font-bold ${getGradeColor((grade.grade / grade.max_points) * 100)}`}>
                                {grade.grade}/{grade.max_points}
                              </span>
                              <p className="text-xs text-gray-500">
                                {Math.round((grade.grade / grade.max_points) * 100)}%
                              </p>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">Course: {grade.course_title}</p>
                          <p className="text-sm text-gray-600 mb-2">Type: {grade.assignment_type}</p>
                          
                          {grade.feedback && (
                            <div className="bg-gray-50 p-3 rounded-md mb-2">
                              <p className="text-sm text-gray-700">{grade.feedback}</p>
                            </div>
                          )}
                          
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Graded by: {grade.graded_by_name}</span>
                            <span>Date: {format(new Date(grade.graded_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Summary */}
          {childProgress && childProgress.attendanceSummary.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Attendance Summary</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {childProgress.attendanceSummary.map((attendance) => (
                    <div key={attendance.status} className="text-center">
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold mb-2 ${getAttendanceColor(attendance.percentage)}`}>
                        {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{attendance.count}</p>
                      <p className="text-sm text-gray-600">{attendance.percentage}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium">View Schedule</span>
                </button>
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <BookOpen className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium">View Assignments</span>
                </button>
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <CheckCircle className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium">Attendance Report</span>
                </button>
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <Users className="h-8 w-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium">Contact Teachers</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildrenManagement;