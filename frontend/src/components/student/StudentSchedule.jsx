import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, parseISO } from 'date-fns';

const StudentSchedule = ({ user }) => {
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchSchedule();
    fetchCourses();
  }, [currentWeek]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday start
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

      const response = await fetch(`/api/student/schedule?start_date=${weekStart.toISOString()}&end_date=${weekEnd.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchedule(data.schedule);
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
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

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 })
  });

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  const getScheduleForDay = (date) => {
    return schedule.filter(item => {
      const itemDate = parseISO(item.start_time);
      return isSameDay(itemDate, date);
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  const getScheduleForTimeSlot = (date, timeSlot) => {
    const daySchedule = getScheduleForDay(date);
    return daySchedule.filter(item => {
      const itemTime = format(parseISO(item.start_time), 'HH:mm');
      return itemTime === timeSlot;
    });
  };

  const getEventColor = (type) => {
    const colors = {
      'lecture': 'bg-blue-100 border-blue-300 text-blue-800',
      'lab': 'bg-green-100 border-green-300 text-green-800',
      'tutorial': 'bg-purple-100 border-purple-300 text-purple-800',
      'seminar': 'bg-yellow-100 border-yellow-300 text-yellow-800',
      'exam': 'bg-red-100 border-red-300 text-red-800',
      'assignment_due': 'bg-orange-100 border-orange-300 text-orange-800',
      'office_hours': 'bg-gray-100 border-gray-300 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'lecture': return '📚';
      case 'lab': return '🔬';
      case 'tutorial': return '👨‍🏫';
      case 'seminar': return '💬';
      case 'exam': return '📝';
      case 'assignment_due': return '📋';
      case 'office_hours': return '🏢';
      default: return '📅';
    }
  };

  const navigateWeek = (direction) => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-600">View your class schedule and upcoming events</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                viewMode === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                viewMode === 'day' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
          </div>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Today
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigateWeek('prev')}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'week' 
                ? `Week of ${format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}`
                : format(selectedDate, 'EEEE, MMM dd, yyyy')
              }
            </h2>
            <p className="text-sm text-gray-600">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
            </p>
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Schedule View */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'week' ? (
        <WeekView 
          weekDays={weekDays}
          timeSlots={timeSlots}
          getScheduleForTimeSlot={getScheduleForTimeSlot}
          getEventColor={getEventColor}
          getEventIcon={getEventIcon}
        />
      ) : (
        <DayView 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          weekDays={weekDays}
          getScheduleForDay={getScheduleForDay}
          getEventColor={getEventColor}
          getEventIcon={getEventIcon}
        />
      )}

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Event Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { type: 'lecture', label: 'Lecture' },
            { type: 'lab', label: 'Lab' },
            { type: 'tutorial', label: 'Tutorial' },
            { type: 'seminar', label: 'Seminar' },
            { type: 'exam', label: 'Exam' },
            { type: 'assignment_due', label: 'Assignment Due' },
            { type: 'office_hours', label: 'Office Hours' }
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded border-2 ${getEventColor(type)}`}></div>
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Week View Component
const WeekView = ({ weekDays, timeSlots, getScheduleForTimeSlot, getEventColor, getEventIcon }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-4 bg-gray-50 border-r">
              <span className="text-sm font-medium text-gray-600">Time</span>
            </div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-4 bg-gray-50 border-r last:border-r-0 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {format(day, 'EEE')}
                </div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {format(day, 'dd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="p-4 bg-gray-50 border-r text-center">
                <span className="text-sm text-gray-600">{timeSlot}</span>
              </div>
              {weekDays.map((day) => {
                const events = getScheduleForTimeSlot(day, timeSlot);
                return (
                  <div key={`${day.toISOString()}-${timeSlot}`} className="p-2 border-r last:border-r-0 min-h-[80px]">
                    {events.map((event) => (
                      <ScheduleEvent 
                        key={event.id} 
                        event={event} 
                        getEventColor={getEventColor}
                        getEventIcon={getEventIcon}
                        compact={true}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Day View Component
const DayView = ({ selectedDate, setSelectedDate, weekDays, getScheduleForDay, getEventColor, getEventIcon }) => {
  const daySchedule = getScheduleForDay(selectedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Day selector */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Select Day</h3>
          <div className="space-y-2">
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  isSameDay(day, selectedDate)
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="font-medium">{format(day, 'EEEE')}</div>
                <div className="text-sm text-gray-600">{format(day, 'MMM dd')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {getScheduleForDay(day).length} events
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day schedule */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {daySchedule.length} events scheduled
            </p>
          </div>
          
          <div className="p-6">
            {daySchedule.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No events scheduled for this day</p>
                <p className="text-sm text-gray-500">Enjoy your free time!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {daySchedule.map((event) => (
                  <ScheduleEvent 
                    key={event.id} 
                    event={event} 
                    getEventColor={getEventColor}
                    getEventIcon={getEventIcon}
                    compact={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Schedule Event Component
const ScheduleEvent = ({ event, getEventColor, getEventIcon, compact }) => {
  const startTime = format(parseISO(event.start_time), 'HH:mm');
  const endTime = format(parseISO(event.end_time), 'HH:mm');

  if (compact) {
    return (
      <div className={`p-2 rounded border-l-4 text-xs ${getEventColor(event.type)}`}>
        <div className="font-medium truncate">{event.title}</div>
        <div className="text-xs opacity-75">{startTime}-{endTime}</div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border-l-4 ${getEventColor(event.type)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{getEventIcon(event.type)}</span>
            <h4 className="font-medium text-gray-900">{event.title}</h4>
          </div>
          
          {event.description && (
            <p className="text-sm text-gray-600 mb-3">{event.description}</p>
          )}
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>{startTime} - {endTime}</span>
            </div>
            
            {event.location && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
            
            {event.instructor_name && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{event.instructor_name}</span>
              </div>
            )}
            
            {event.course_title && (
              <div className="text-xs text-gray-500 mt-2">
                Course: {event.course_title}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-gray-500 capitalize">
            {event.type.replace('_', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSchedule;