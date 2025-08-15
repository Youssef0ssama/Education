import React from 'react';

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-20 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="block text-green-600 mb-2">براعم النور</span>
            <span className="block text-2xl md:text-4xl text-gray-700">Baraem Al-Noor</span>
          </h1>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Nurturing Young Hearts with Islamic Knowledge
          </p>
          
          {/* Description */}
          <p className="text-lg text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed">
            Welcome to Baraem Al-Noor, where we provide comprehensive Islamic education for children. 
            Our platform offers Quran memorization, Arabic language learning, and Islamic studies 
            in a nurturing, age-appropriate environment that helps young minds grow in faith and knowledge.
          </p>
          
          {/* Call to action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl">
              Start Learning Journey
            </button>
            <button className="bg-white hover:bg-gray-50 text-green-600 font-semibold py-4 px-8 rounded-lg text-lg border-2 border-green-600 transition-colors duration-200">
              Learn More About Us
            </button>
          </div>
          

          
          {/* Features highlight */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quran Memorization</h3>
              <p className="text-gray-600">Structured programs for memorizing the Holy Quran with proper Tajweed</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔤</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Arabic Language</h3>
              <p className="text-gray-600">Learn to read, write, and understand Arabic with interactive lessons</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🕌</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Islamic Studies</h3>
              <p className="text-gray-600">Comprehensive Islamic education covering history, principles, and values</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;