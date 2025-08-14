import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, Upload, Calendar, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

const StudentAssignments = ({ user }) => {
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        course_id: '',
        status: '',
        due_date_filter: ''
    });
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    useEffect(() => {
        fetchAssignments();
        fetchCourses();
    }, [filters]);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();

            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const response = await fetch(`/api/student/assignments?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAssignments(data.assignments);
            }
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
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

    const handleSubmitAssignment = async (assignmentId, submissionData) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/student/assignments/${assignmentId}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submissionData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.isPastDue) {
                    alert('Assignment submitted successfully, but it was past the due date.');
                } else {
                    alert('Assignment submitted successfully!');
                }
                setShowSubmissionModal(false);
                setSelectedAssignment(null);
                fetchAssignments();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to submit assignment');
            }
        } catch (error) {
            console.error('Failed to submit assignment:', error);
            alert('Failed to submit assignment');
        }
    };

    const getStatusColor = (assignment) => {
        if (assignment.submission_status === 'graded') {
            const percentage = (assignment.grade / assignment.max_points) * 100;
            if (percentage >= 90) return 'bg-green-100 text-green-800';
            if (percentage >= 80) return 'bg-blue-100 text-blue-800';
            if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
            return 'bg-red-100 text-red-800';
        }

        if (assignment.submission_status === 'submitted') return 'bg-blue-100 text-blue-800';
        if (assignment.is_overdue) return 'bg-red-100 text-red-800';

        const now = new Date();
        const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
        if (dueDate && dueDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
            return 'bg-yellow-100 text-yellow-800';
        }

        return 'bg-gray-100 text-gray-800';
    };

    const getStatusText = (assignment) => {
        if (assignment.submission_status === 'graded') {
            return `Graded: ${assignment.grade}/${assignment.max_points}`;
        }
        if (assignment.submission_status === 'submitted') return 'Submitted';
        if (assignment.is_overdue) return 'Overdue';

        const now = new Date();
        const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
        if (dueDate && dueDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
            return 'Due Soon';
        }

        return 'Not Submitted';
    };

    const getStatusIcon = (assignment) => {
        if (assignment.submission_status === 'graded') return <CheckCircle className="h-4 w-4" />;
        if (assignment.submission_status === 'submitted') return <Clock className="h-4 w-4" />;
        if (assignment.is_overdue) return <AlertCircle className="h-4 w-4" />;
        return <FileText className="h-4 w-4" />;
    };

    // Group assignments by status for better organization
    const groupedAssignments = {
        overdue: assignments.filter(a => a.is_overdue && a.submission_status === 'not_submitted'),
        due_soon: assignments.filter(a => {
            if (a.is_overdue || a.submission_status !== 'not_submitted') return false;
            const now = new Date();
            const dueDate = a.due_date ? new Date(a.due_date) : null;
            return dueDate && dueDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }),
        submitted: assignments.filter(a => a.submission_status === 'submitted'),
        graded: assignments.filter(a => a.submission_status === 'graded'),
        other: assignments.filter(a => {
            if (a.is_overdue || a.submission_status !== 'not_submitted') return false;
            const now = new Date();
            const dueDate = a.due_date ? new Date(a.due_date) : null;
            return !dueDate || dueDate >= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        })
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
                <p className="text-gray-600">Track and submit your course assignments</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center space-x-4">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
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
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Status</option>
                            <option value="not_submitted">Not Submitted</option>
                            <option value="submitted">Submitted</option>
                            <option value="graded">Graded</option>
                            <option value="overdue">Overdue</option>
                        </select>

                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filters.due_date_filter}
                            onChange={(e) => setFilters({ ...filters, due_date_filter: e.target.value })}
                        >
                            <option value="">All Due Dates</option>
                            <option value="upcoming">Due This Week</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Assignment Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <p className="text-2xl font-bold text-red-600">{groupedAssignments.overdue.length}</p>
                    <p className="text-sm text-gray-600">Overdue</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <p className="text-2xl font-bold text-yellow-600">{groupedAssignments.due_soon.length}</p>
                    <p className="text-sm text-gray-600">Due Soon</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <p className="text-2xl font-bold text-blue-600">{groupedAssignments.submitted.length}</p>
                    <p className="text-sm text-gray-600">Submitted</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <p className="text-2xl font-bold text-green-600">{groupedAssignments.graded.length}</p>
                    <p className="text-sm text-gray-600">Graded</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <p className="text-2xl font-bold text-gray-600">{assignments.length}</p>
                    <p className="text-sm text-gray-600">Total</p>
                </div>
            </div>

            {/* Assignments List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : assignments.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No assignments found</p>
                    <p className="text-sm text-gray-500">Check back later for new assignments</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Overdue Assignments */}
                    {groupedAssignments.overdue.length > 0 && (
                        <AssignmentSection
                            title="Overdue Assignments"
                            assignments={groupedAssignments.overdue}
                            getStatusColor={getStatusColor}
                            getStatusText={getStatusText}
                            getStatusIcon={getStatusIcon}
                            onSubmit={(assignment) => {
                                setSelectedAssignment(assignment);
                                setShowSubmissionModal(true);
                            }}
                            priority="high"
                        />
                    )}

                    {/* Due Soon Assignments */}
                    {groupedAssignments.due_soon.length > 0 && (
                        <AssignmentSection
                            title="Due This Week"
                            assignments={groupedAssignments.due_soon}
                            getStatusColor={getStatusColor}
                            getStatusText={getStatusText}
                            getStatusIcon={getStatusIcon}
                            onSubmit={(assignment) => {
                                setSelectedAssignment(assignment);
                                setShowSubmissionModal(true);
                            }}
                            priority="medium"
                        />
                    )}

                    {/* Submitted Assignments */}
                    {groupedAssignments.submitted.length > 0 && (
                        <AssignmentSection
                            title="Submitted Assignments"
                            assignments={groupedAssignments.submitted}
                            getStatusColor={getStatusColor}
                            getStatusText={getStatusText}
                            getStatusIcon={getStatusIcon}
                            onSubmit={(assignment) => {
                                setSelectedAssignment(assignment);
                                setShowSubmissionModal(true);
                            }}
                        />
                    )}

                    {/* Graded Assignments */}
                    {groupedAssignments.graded.length > 0 && (
                        <AssignmentSection
                            title="Graded Assignments"
                            assignments={groupedAssignments.graded}
                            getStatusColor={getStatusColor}
                            getStatusText={getStatusText}
                            getStatusIcon={getStatusIcon}
                            showGrades={true}
                        />
                    )}

                    {/* Other Assignments */}
                    {groupedAssignments.other.length > 0 && (
                        <AssignmentSection
                            title="Other Assignments"
                            assignments={groupedAssignments.other}
                            getStatusColor={getStatusColor}
                            getStatusText={getStatusText}
                            getStatusIcon={getStatusIcon}
                            onSubmit={(assignment) => {
                                setSelectedAssignment(assignment);
                                setShowSubmissionModal(true);
                            }}
                        />
                    )}
                </div>
            )}

            {/* Submission Modal */}
            {showSubmissionModal && selectedAssignment && (
                <SubmissionModal
                    assignment={selectedAssignment}
                    onClose={() => {
                        setShowSubmissionModal(false);
                        setSelectedAssignment(null);
                    }}
                    onSubmit={(submissionData) => handleSubmitAssignment(selectedAssignment.id, submissionData)}
                />
            )}
        </div>
    );
};

// Assignment Section Component
const AssignmentSection = ({ title, assignments, getStatusColor, getStatusText, getStatusIcon, onSubmit, showGrades, priority }) => {
    const priorityColors = {
        high: 'border-red-200 bg-red-50',
        medium: 'border-yellow-200 bg-yellow-50',
        low: 'border-gray-200 bg-white'
    };

    return (
        <div className={`rounded-lg shadow-sm border p-6 ${priorityColors[priority] || priorityColors.low}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{title} ({assignments.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((assignment) => (
                    <div key={assignment.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-medium text-gray-900 line-clamp-2">{assignment.title}</h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(assignment)}`}>
                                {getStatusIcon(assignment)}
                                <span className="ml-1">{getStatusText(assignment)}</span>
                            </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{assignment.description}</p>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-600">
                                <FileText className="h-4 w-4 mr-2" />
                                <span>Course: {assignment.course_title}</span>
                            </div>

                            <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>
                                    Due: {assignment.due_date
                                        ? format(new Date(assignment.due_date), 'MMM dd, yyyy HH:mm')
                                        : 'No due date'
                                    }
                                </span>
                            </div>

                            <div className="flex items-center text-gray-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                <span>Points: {assignment.max_points}</span>
                            </div>

                            <div className="flex items-center text-gray-600">
                                <span className="capitalize">{assignment.assignment_type}</span>
                            </div>
                        </div>

                        {/* Submission Info */}
                        {assignment.submitted_at && (
                            <div className="mt-3 p-2 bg-blue-50 rounded-md">
                                <p className="text-xs text-blue-800">
                                    Submitted: {format(new Date(assignment.submitted_at), 'MMM dd, yyyy HH:mm')}
                                </p>
                            </div>
                        )}

                        {/* Grade Info */}
                        {showGrades && assignment.grade !== null && (
                            <div className="mt-3 p-3 bg-green-50 rounded-md">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-green-800">Grade</span>
                                    <span className="text-lg font-bold text-green-800">
                                        {assignment.grade}/{assignment.max_points}
                                    </span>
                                </div>
                                <div className="text-xs text-green-700">
                                    {Math.round((assignment.grade / assignment.max_points) * 100)}%
                                </div>
                                {assignment.feedback && (
                                    <div className="mt-2 text-sm text-green-800">
                                        <strong>Feedback:</strong> {assignment.feedback}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Button */}
                        {onSubmit && assignment.submission_status !== 'graded' && (
                            <button
                                onClick={() => onSubmit(assignment)}
                                className="mt-3 w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <Upload className="h-4 w-4" />
                                <span>{assignment.submission_status === 'submitted' ? 'Update Submission' : 'Submit Assignment'}</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Submission Modal Component
const SubmissionModal = ({ assignment, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        submission_text: assignment.submission_text || '',
        file_url: assignment.file_url || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.submission_text.trim() && !formData.file_url.trim()) {
            alert('Please provide either text submission or file URL');
            return;
        }
        onSubmit(formData);
    };

    const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Submit Assignment</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-1">{assignment.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                        <div className="text-xs text-gray-500">
                            <p>Course: {assignment.course_title}</p>
                            <p>Max Points: {assignment.max_points}</p>
                            {assignment.due_date && (
                                <p className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                    Due: {format(new Date(assignment.due_date), 'MMM dd, yyyy HH:mm')}
                                    {isOverdue && ' (OVERDUE)'}
                                </p>
                            )}
                        </div>
                    </div>

                    {isOverdue && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-800">
                                <strong>Warning:</strong> This assignment is past its due date. Late submissions may be penalized.
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Submission Text
                            </label>
                            <textarea
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.submission_text}
                                onChange={(e) => setFormData({ ...formData, submission_text: e.target.value })}
                                placeholder="Enter your assignment submission here..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                File URL (Optional)
                            </label>
                            <input
                                type="url"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.file_url}
                                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                                placeholder="https://example.com/your-file.pdf"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Provide a link to your file (Google Drive, Dropbox, etc.)
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {assignment.submission_status === 'submitted' ? 'Update Submission' : 'Submit Assignment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default StudentAssignments;