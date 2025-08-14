import { useState, useEffect } from 'react';
import { BookOpen, Users, Calendar, TrendingUp, Award, Clock, CheckCircle, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';

const StudentCourses = ({ user }) => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' or 'available'
  const [filters, setFilters] = useState({
    search: '',
    instructor_id: '',
    price_max: ''
  });
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableCourses();
    }
  }, [activeTab, filters]);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnrolledCourses(data.courses);
      }
    } catch (error) {
      console.error('Failed to fetch enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      setAvailableLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/student/available-courses?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableCourses(data.courses);
      }
    } catch (error) {
      console.error('Failed to fetch available courses:', error);
    } finally {
      setAvailableLoading(false);
    }
  };

  const handleEnrollCourse = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/enroll/${courseId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Successfully enrolled in course!');
        fetchEnrolledCourses();
        fetchAvailableCourses();
        setShowEnrollModal(false);
        setSelectedCourse(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to enroll in course');
      }
    } catch (error) {
      console.error('Failed to enroll in course:', error);
      alert('Failed to enroll in course');
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 85) return 'text-blue-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-600">Manage your course enrollments and track progress</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'enrolled'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Enrolled Courses ({enrolledCourses.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available Courses
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'enrolled' ? (
            <EnrolledCoursesTab 
              courses={enrolledCourses}
              loading={loading}
              getProgressColor={getProgressColor}
              getGradeColor={getGradeColor}
              getAttendanceColor={getAttendanceColor}
            />
          ) : (
            <AvailableCoursesTab
              courses={availableCourses}
              loading={availableLoading}
              filters={filters}
              setFilters={setFilters}
              onEnroll={(course) => {
                setSelectedCourse(course);
                setShowEnrollModal(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Enrollment Confirmation Modal */}
      {showEnrollModal && selectedCourse && (
        <EnrollmentModal
          course={selectedCourse}
          onClose={() => {
            setShowEnrollModal(false);
            setSelectedCourse(null);
          }}
          onConfirm={() => handleEnrollCourse(selectedCourse.id)}
        />
      )}
    </div>
  );
};

// Enrolled Courses Tab Component
const EnrolledCoursesTab = ({ courses, loading, getProgressColor, getGradeColor, getAttendanceColor }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You're not enrolled in any courses yet</p>
        <p className="text-sm text-gray-500">Browse available courses to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div key={course.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {course.title}
            </h3>
            <span className="text-sm text-gray-500">{course.progress_percentage}%</span>
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {course.description}
          </p>

          <div className="space-y-3 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2" />
              <span>Instructor: {course.instructor_name}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Duration: {course.duration_weeks} weeks</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>Enrolled: {format(new Date(course.enrollment_date), 'MMM dd, yyyy')}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Course Progress</span>
              <span>{course.progress_percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getProgressColor(course.progress_percentage)}`}
                style={{ width: `${course.progress_percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-gray-600">Attendance</p>
              <p className={`font-bold ${getAttendanceColor(
                course.total_sessions > 0 
                  ? (course.attended_sessions / course.total_sessions) * 100 
                  : 0
              )}`}>
                {course.total_sessions > 0 
                  ? Math.round((course.attended_sessions / course.total_sessions) * 100)
                  : 0}%
              </p>
            </div>
            
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-gray-600">Avg Grade</p>
              <p className={`font-bold ${getGradeColor(course.avg_grade_percentage || 0)}`}>
                {Math.round(course.avg_grade_percentage || 0)}%
              </p>
            </div>
            
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-gray-600">Assignments</p>
              <p className="font-bold text-gray-900">
                {course.submitted_assignments}/{course.total_assignments}
              </p>
            </div>
            
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-gray-600">Graded</p>
              <p className="font-bold text-gray-900">
                {course.graded_assignments}/{course.total_assignments}
              </p>
            </div>
          </div>

          {/* Final Grade */}
          {course.final_grade && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md text-center">
              <p className="text-sm text-blue-600 font-medium">Final Grade</p>
              <p className="text-xl font-bold text-blue-800">{course.final_grade}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Available Courses Tab Component
const AvailableCoursesTab = ({ courses, loading, filters, setFilters, onEnroll }) => {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        
        <input
          type="number"
          placeholder="Max price ($)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.price_max}
          onChange={(e) => setFilters({ ...filters, price_max: e.target.value })}
        />

        <div className="text-sm text-gray-600 flex items-center">
          <BookOpen className="h-4 w-4 mr-2" />
          {courses.length} courses available
        </div>
      </div>

      {/* Available Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No available courses found</p>
          <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {course.title}
                </h3>
                <span className="text-lg font-bold text-green-600">
                  ${course.price}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {course.description}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Instructor: {course.instructor_name}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Duration: {course.duration_weeks} weeks</span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>
                    Enrollment: {course.enrolled_students}/{course.max_students}
                    ({course.available_spots} spots left)
                  </span>
                </div>
              </div>

              {/* Enrollment Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Enrollment</span>
                  <span>{Math.round((course.enrolled_students / course.max_students) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(course.enrolled_students / course.max_students) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Enroll Button */}
              <button
                onClick={() => onEnroll(course)}
                disabled={course.available_spots === 0}
                className={`w-full py-2 px-4 rounded-md font-medium ${
                  course.available_spots > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {course.available_spots > 0 ? 'Enroll Now' : 'Course Full'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Enrollment Confirmation Modal
const EnrollmentModal = ({ course, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Enrollment</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{course.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Instructor</p>
                  <p className="font-medium">{course.instructor_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Duration</p>
                  <p className="font-medium">{course.duration_weeks} weeks</p>
                </div>
                <div>
                  <p className="text-gray-600">Price</p>
                  <p className="font-medium text-green-600">${course.price}</p>
                </div>
                <div>
                  <p className="text-gray-600">Available Spots</p>
                  <p className="font-medium">{course.available_spots}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> By enrolling in this course, you'll gain access to all course materials, 
                assignments, and class sessions. You can track your progress through your dashboard.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Confirm Enrollment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCourses;