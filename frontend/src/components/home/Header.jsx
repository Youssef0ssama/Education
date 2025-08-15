import React from 'react';

const Header = ({ onLoginClick }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">ب</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">براعم النور</h1>
                <p className="text-sm text-gray-600">Baraem Al-Noor</p>
              </div>
            </div>
          </div>
          
          {/* Navigation and Login */}
          <div className="flex items-center space-x-8">
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Our Programs
              </a>
              <a href="#about" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                About Us
              </a>
              <a href="#contact" className="text-gray-700 hover:text-green-600 font-medium transition-colors">
                Contact
              </a>
            </nav>
            
            {/* Login Button */}
            <button
              onClick={onLoginClick}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              Login
            </button>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="text-gray-700 hover:text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;