import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import StudentContentViewer from './StudentContentViewer';

const StudentMaterialsManager = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
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
        setCourses(data.courses || []);
        if (data.courses && data.courses.length > 0) {
          setSelectedCourse(data.courses[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <p className="text-gray-600">No courses found</p>
        <p className="text-sm text-gray-500">Enroll in courses to access materials</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Selector */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Course
        </label>
        <select
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedCourse?.id || ''}
          onChange={(e) => {
            const course = courses.find(c => c.id === parseInt(e.target.value));
            setSelectedCourse(course);
          }}
        >
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        {selectedCourse && (
          <p className="text-sm text-gray-600 mt-2">
            Instructor: {selectedCourse.instructor_name}
          </p>
        )}
      </div>

      {/* Content Viewer */}
      {selectedCourse && (
        <StudentContentViewer
          courseId={selectedCourse.id}
          user={user}
        />
      )}
    </div>
  );
};

export default StudentMaterialsManager;