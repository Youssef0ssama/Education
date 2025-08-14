import { useState, useEffect } from 'react';
import { MessageCircle, Send, Users, Mail, Phone, Search, Plus, Filter } from 'lucide-react';
import { format } from 'date-fns';

const ParentCommunication = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    teacher_id: '',
    child_id: ''
  });
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    fetchMessages();
    fetchTeachers();
    fetchChildren();
  }, [filters]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/parent/messages?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/teachers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/children', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    }
  };

  const handleSendMessage = async (messageData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parent/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        setShowComposeModal(false);
        fetchMessages();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const getMessageDirection = (message) => {
    return message.sender_id === user.id ? 'sent' : 'received';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
          <p className="text-gray-600">Communicate with your children's teachers</p>
        </div>
        <button
          onClick={() => setShowComposeModal(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Message</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teachers List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Your Children's Teachers</h2>
          </div>
          <div className="p-6">
            {teachers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No teachers found</p>
            ) : (
              <div className="space-y-4">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {teacher.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900">{teacher.name}</h3>
                        <p className="text-sm text-gray-600">{teacher.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-600">Courses:</p>
                        <p className="font-medium">{teacher.courses.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Teaching:</p>
                        <p className="font-medium">{teacher.students.join(', ')}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => setShowComposeModal(true)}
                        className="flex items-center space-x-1 text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>Message</span>
                      </button>
                      {teacher.phone && (
                        <a
                          href={`tel:${teacher.phone}`}
                          className="flex items-center space-x-1 text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                        >
                          <Phone className="h-3 w-3" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Message History</h2>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={filters.teacher_id}
                  onChange={(e) => setFilters({ ...filters, teacher_id: e.target.value })}
                >
                  <option value="">All Teachers</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No messages yet</p>
                <p className="text-sm text-gray-500">Start a conversation with your children's teachers</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => {
                  const direction = getMessageDirection(message);
                  return (
                    <div
                      key={message.id}
                      className={`flex ${direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          direction === 'sent'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {direction === 'sent' ? 'You' : message.sender_name}
                          </span>
                          <span className={`text-xs ${direction === 'sent' ? 'text-purple-200' : 'text-gray-500'}`}>
                            {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        
                        {message.subject && (
                          <p className={`text-sm font-medium mb-1 ${direction === 'sent' ? 'text-purple-100' : 'text-gray-700'}`}>
                            {message.subject}
                          </p>
                        )}
                        
                        <p className="text-sm">{message.content}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${direction === 'sent' ? 'text-purple-200' : 'text-gray-500'}`}>
                            {direction === 'received' ? `To: ${message.recipient_name}` : `To: ${message.recipient_name}`}
                          </span>
                          {!message.is_read && direction === 'received' && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Message Modal */}
      {showComposeModal && (
        <ComposeMessageModal
          teachers={teachers}
          children={children}
          onClose={() => setShowComposeModal(false)}
          onSend={handleSendMessage}
        />
      )}
    </div>
  );
};

// Compose Message Modal Component
const ComposeMessageModal = ({ teachers, children, onClose, onSend }) => {
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    content: '',
    child_id: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Compose Message</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">To (Teacher)</label>
              <select
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.recipient_id}
                onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Regarding Child (Optional)</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.child_id}
                onChange={(e) => setFormData({ ...formData, child_id: e.target.value })}
              >
                <option value="">Select Child</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Message subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <textarea
                required
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Type your message here..."
              />
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
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Send className="h-4 w-4" />
                <span>Send Message</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ParentCommunication;