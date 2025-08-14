import { useState, useEffect } from 'react';
import { Award, TrendingUp, BarChart3, Filter, Calendar, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

const StudentGrades = ({ user }) => {
  const [grades, setGrades] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    course_id: '',
    assignment_type: ''
  });

  useEffect(() => {
    fetchGrades();
    fetchCourses();
  }, [filters]);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/student/grades?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGrades(data.grades);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-blue-600 bg-blue-50';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 65) return 'D';
    return 'F';
  };

  const getPerformanceIcon = (percentage) => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 80) return '🥇';
    if (percentage >= 70) return '🥈';
    return '📚';
  };

  // Calculate overall statistics
  const overallStats = {
    totalGrades: grades.length,
    averageGrade: grades.length > 0 ? grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length : 0,
    highestGrade: grades.length > 0 ? Math.max(...grades.map(g => g.percentage)) : 0,
    lowestGrade: grades.length > 0 ? Math.min(...grades.map(g => g.percentage)) : 0
  };

  // Group grades by assignment type
  const gradesByType = grades.reduce((acc, grade) => {
    if (!acc[grade.assignment_type]) {
      acc[grade.assignment_type] = [];
    }
    acc[grade.assignment_type].push(grade);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
        <p className="text-gray-600">Track your academic performance and progress</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.course_id}
              onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>

            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.assignment_type}
              onChange={(e) => setFilters({ ...filters, assignment_type: e.target.value })}
            >
              <option value="">All Assignment Types</option>
              <option value="homework">Homework</option>
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
              <option value="project">Project</option>
              <option value="lab">Lab</option>
              <option value="presentation">Presentation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <div className="text-2xl font-bold text-blue-600">{overallStats.totalGrades}</div>
          <div className="text-sm text-gray-600">Total Grades</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <div className="text-2xl font-bold text-green-600">
            {overallStats.averageGrade.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Average Grade</div>
          <div className="text-xs text-gray-500 mt-1">
            {getGradeLetter(overallStats.averageGrade)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <div className="text-2xl font-bold text-green-600">
            {overallStats.highestGrade.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Highest Grade</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <div className="text-2xl font-bold text-red-600">
            {overallStats.lowestGrade.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Lowest Grade</div>
        </div>
      </div>

      {/* Course Statistics */}
      {statistics.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Course Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statistics.map((stat) => (
              <div key={stat.course_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{stat.course_title}</h3>
                  <span className="text-2xl">{getPerformanceIcon(stat.average_grade)}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Average:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${getGradeColor(stat.average_grade)}`}>
                      {stat.average_grade.toFixed(1)}% ({getGradeLetter(stat.average_grade)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Assignments:</span>
                    <span className="text-sm text-gray-900">{stat.total_assignments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Graded:</span>
                    <span className="text-sm text-gray-900">{stat.graded_assignments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grades List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No grades found</p>
          <p className="text-sm text-gray-500">Grades will appear here once assignments are graded</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grades by Assignment Type */}
          {Object.entries(gradesByType).map(([type, typeGrades]) => (
            <div key={type} className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                {type} ({typeGrades.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {typeGrades.map((grade) => (
                  <div key={grade.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-900 line-clamp-2">{grade.assignment_title}</h3>
                      <div className="text-right">
                        <div className={`text-lg font-bold px-3 py-1 rounded ${getGradeColor(grade.percentage)}`}>
                          {grade.percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getGradeLetter(grade.percentage)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="text-gray-900">{grade.course_title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points:</span>
                        <span className="text-gray-900">{grade.grade}/{grade.max_points}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Graded:</span>
                        <span className="text-gray-900">
                          {format(new Date(grade.graded_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    {grade.feedback && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <strong>Feedback:</strong> {grade.feedback}
                        </p>
                      </div>
                    )}

                    {/* Performance indicator */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-2xl">{getPerformanceIcon(grade.percentage)}</span>
                      <div className="text-xs text-gray-500">
                        {grade.percentage >= 90 ? 'Excellent' :
                         grade.percentage >= 80 ? 'Good' :
                         grade.percentage >= 70 ? 'Satisfactory' : 'Needs Improvement'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentGrades;