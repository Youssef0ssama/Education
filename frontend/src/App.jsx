import { useState, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { LoginForm } from './components/auth';
import { Router } from './components/shared';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      validateToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (savedToken) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setShowLogin(false);
  };

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <div className="App">
        {showLogin ? (
          <LoginForm onLogin={handleLogin} onClose={() => setShowLogin(false)} />
        ) : (
          <Router 
            user={user} 
            onLogin={handleLoginClick}
          />
        )}
      </div>
    </HelmetProvider>
  );
}

export default App;
