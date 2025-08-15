import React from 'react';

const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              About Baraem Al-Noor
            </h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Baraem Al-Noor (براعم النور) means "Buds of Light" - representing our mission to nurture 
              young minds as they grow in Islamic knowledge and character. We believe that every child 
              is a precious gift from Allah, and it is our responsibility to provide them with the 
              best Islamic education possible.
            </p>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Our platform combines traditional Islamic teaching methods with modern educational 
              technology to create an engaging and effective learning experience. We are committed 
              to helping children develop a strong foundation in their faith while fostering a 
              love for learning that will benefit them throughout their lives.
            </p>
            
            {/* Mission points */}
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Quality Islamic Education</h3>
                  <p className="text-gray-600">Providing authentic Islamic knowledge based on Quran and Sunnah</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Experienced Teachers</h3>
                  <p className="text-gray-600">Qualified instructors with deep knowledge and passion for teaching</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Nurturing Environment</h3>
                  <p className="text-gray-600">Safe, supportive atmosphere that encourages learning and growth</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 mr-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Modern Technology</h3>
                  <p className="text-gray-600">Interactive online platform with engaging educational tools</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Visual element */}
          <div className="relative">
            <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-6">🌟</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
              <p className="text-gray-700 leading-relaxed">
                To be the leading platform for Islamic education, empowering children with 
                knowledge, wisdom, and strong moral character that will guide them throughout 
                their lives and help them become righteous members of the Muslim community.
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">1000+</div>
                  <div className="text-sm text-gray-600">Students Enrolled</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">50+</div>
                  <div className="text-sm text-gray-600">Qualified Teachers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;