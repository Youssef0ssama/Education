import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Users, 
  DollarSign, 
  Clock, 
  Star,
  CheckCircle,
  AlertCircle,
  Eye,
  UserPlus,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

const StudentCourseBrowser = ({ user }) => {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    difficulty_level: '',
    min_price: '',
    max_price: '',
    has_spots: true,
    sort_by: 'title',
    sort_order: 'asc'
  });

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableCourses();
    } else if (activeTab === 'enrolled') {
      fetchEnrolledCourses();
    } else if (activeTab === 'waitlist') {
      fetchWaitlist();
    }
  }, [activeTab, filters]);

  const fetchAvailableCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null) queryParams.append(key, value);
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
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/enrolled-courses', {
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

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/waitlist', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWaitlist(data.waitlist_entries);
      }
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollCourse = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        if (result.enrolled) {
          alert('Successfully enrolled in course!');
          fetchAvailableCourses();
          fetchEnrolledCourses();
        } else if (result.waitlisted) {
          alert(`Course is full. You've been added to the waitlist at position ${result.waitlist_position}.`);
          fetchAvailableCourses();
          fetchWaitlist();
        }
      } else {
        alert(result.error || 'Failed to enroll in course');
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Failed to enroll in course');
    }
  };

  const handleDropCourse = async (courseId) => {
    if (!confirm('Are you sure you want to drop this course?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/courses/${courseId}/drop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Student requested drop' })
      });

      if (response.ok) {
        alert('Successfully dropped from course');
        fetchEnrolledCourses();
        fetchAvailableCourses();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to drop course');
      }
    } catch (error) {
      console.error('Drop course error:', error);
      alert('Failed to drop course');
    }
  };

  const getDifficultyBadge = (level) => {
    const config = {
      beginner: { color: 'bg-green-100 text-green-800', text: 'Beginner' },
      intermediate: { color: 'bg-yellow-100 text-yellow-800', text: 'Intermediate' },
      advanced: { color: 'bg-red-100 text-red-800', text: 'Advanced' }
    };
    
    const { color, text } = config[level] || config.intermediate;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
        {text}
      </span>
    );
  };

  const getEnrollmentStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Completed' },
      dropped: { color: 'bg-red-100 text-red-800', text: 'Dropped' }
    };
    
    const { color, text } = config[status] || config.active;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
        {text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Course Catalog</h1>
        <p className="text-gray-600">Browse and enroll in available courses</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Available Courses
          </button>
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'enrolled'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Courses
          </button>
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'waitlist'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Waitlist
          </button>
        </nav>
      </div>    
  {/* Filters (only for available courses) */}
      {activeTab === 'available' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Search courses..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={filters.difficulty_level}
                onChange={(e) => setFilters({...filters, difficulty_level: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.min_price}
                  onChange={(e) => setFilters({...filters, min_price: e.target.value})}
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={filters.max_price}
                  onChange={(e) => setFilters({...filters, max_price: e.target.value})}
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sort_by}
                onChange={(e) => setFilters({...filters, sort_by: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="title">Title</option>
                <option value="price">Price</option>
                <option value="duration_weeks">Duration</option>
                <option value="created_at">Newest</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.has_spots}
                onChange={(e) => setFilters({...filters, has_spots: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Only show courses with available spots</span>
            </label>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'available' && (
            <AvailableCoursesTab 
              courses={availableCourses}
              onEnroll={handleEnrollCourse}
              onViewDetails={setSelectedCourse}
              getDifficultyBadge={getDifficultyBadge}
            />
          )}
          {activeTab === 'enrolled' && (
            <EnrolledCoursesTab 
              courses={enrolledCourses}
              onDrop={handleDropCourse}
              onViewDetails={setSelectedCourse}
              getDifficultyBadge={getDifficultyBadge}
              getEnrollmentStatusBadge={getEnrollmentStatusBadge}
            />
          )}
          {activeTab === 'waitlist' && (
            <WaitlistTab 
              waitlist={waitlist}
              onViewDetails={setSelectedCourse}
              getDifficultyBadge={getDifficultyBadge}
            />
          )}
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCourse && (
        <CourseDetailsModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onEnroll={handleEnrollCourse}
          userRole="student"
        />
      )}
    </div>
  );
};

// Available Courses Tab
const AvailableCoursesTab = ({ courses, onEnroll, onViewDetails, getDifficultyBadge }) => {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No courses available</p>
        <p className="text-sm text-gray-500">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div key={course.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
              </div>
              <div className="ml-4">
                {getDifficultyBadge(course.difficulty_level)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium text-gray-900">${course.price}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium text-gray-900">{course.duration_weeks} weeks</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Available Spots:</span>
                <span className="font-medium text-gray-900">{course.available_spots}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Instructors:</span>
                <span className="font-medium text-gray-900">{course.instructor_count}</span>
              </div>
            </div>

            {/* Instructors */}
            {course.instructors && course.instructors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-600 mb-2">Instructors:</p>
                <div className="flex flex-wrap gap-1">
                  {course.instructors.slice(0, 2).map(instructor => (
                    <span key={instructor.id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {instructor.name}
                    </span>
                  ))}
                  {course.instructors.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{course.instructors.length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex space-x-2">
              <button
                onClick={() => onViewDetails(course)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
              >
                <Eye className="h-4 w-4" />
                <span>Details</span>
              </button>
              <button
                onClick={() => onEnroll(course.id)}
                disabled={course.available_spots === 0}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm ${
                  course.available_spots === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                <span>{course.available_spots === 0 ? 'Join Waitlist' : 'Enroll'}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Enrolled Courses Tab
const EnrolledCoursesTab = ({ courses, onDrop, onViewDetails, getDifficultyBadge, getEnrollmentStatusBadge }) => {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No enrolled courses</p>
        <p className="text-sm text-gray-500">Browse available courses to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div key={course.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
              </div>
              <div className="ml-4 space-y-2">
                {getDifficultyBadge(course.difficulty_level)}
                {getEnrollmentStatusBadge(course.enrollment_status)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Enrolled:</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(course.enrollment_date), 'MMM dd, yyyy')}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress:</span>
                <span className="font-medium text-gray-900">{course.progress_percentage || 0}%</span>
              </div>

              {course.completion_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(course.completion_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{course.progress_percentage || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${course.progress_percentage || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex space-x-2">
              <button
                onClick={() => onViewDetails(course)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>
              {course.enrollment_status === 'active' && (
                <button
                  onClick={() => onDrop(course.id)}
                  className="flex items-center justify-center px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm"
                >
                  Drop
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Waitlist Tab
const WaitlistTab = ({ waitlist, onViewDetails, getDifficultyBadge }) => {
  if (waitlist.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No courses on waitlist</p>
        <p className="text-sm text-gray-500">You'll be notified when spots become available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {waitlist.map((entry) => (
        <div key={entry.id} className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{entry.course_title}</h3>
              <p className="text-sm text-gray-600 mb-4">{entry.course_description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Position:</span>
                  <span className="font-medium text-gray-900 ml-2">#{entry.position}</span>
                </div>
                <div>
                  <span className="text-gray-600">Added:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {format(new Date(entry.added_date), 'MMM dd')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium text-gray-900 ml-2">${entry.course_price}</span>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900 ml-2">{entry.course_duration} weeks</span>
                </div>
              </div>
            </div>
            
            <div className="ml-6 flex flex-col items-end space-y-2">
              {getDifficultyBadge(entry.course_difficulty)}
              <button
                onClick={() => onViewDetails({...entry, id: entry.course_id})}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
              >
                <Eye className="h-4 w-4" />
                <span>View Course</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Course Details Modal
const CourseDetailsModal = ({ course, onClose, onEnroll, userRole }) => {
  const [courseDetails, setCourseDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetails();
  }, [course.id]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/student/courses/${course.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourseDetails(data.course);
      }
    } catch (error) {
      console.error('Failed to fetch course details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{course.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : courseDetails ? (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <p className="text-gray-700">{courseDetails.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Course Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600">Duration:</span> {courseDetails.duration_weeks} weeks</div>
                  <div><span className="text-gray-600">Price:</span> ${courseDetails.price}</div>
                  <div><span className="text-gray-600">Difficulty:</span> {courseDetails.difficulty_level}</div>
                  <div><span className="text-gray-600">Max Students:</span> {courseDetails.max_students}</div>
                  <div><span className="text-gray-600">Available Spots:</span> {courseDetails.available_spots}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Instructors</h4>
                <div className="space-y-2">
                  {courseDetails.instructors && courseDetails.instructors.map(instructor => (
                    <div key={instructor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-900">{instructor.name}</span>
                      {instructor.is_primary && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {userRole === 'student' && courseDetails.available_spots >= 0 && (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    onEnroll(course.id);
                    onClose();
                  }}
                  disabled={courseDetails.available_spots === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                    courseDetails.available_spots === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{courseDetails.available_spots === 0 ? 'Join Waitlist' : 'Enroll Now'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Failed to load course details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCourseBrowser;