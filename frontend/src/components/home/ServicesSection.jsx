import React from 'react';

const ServicesSection = () => {
  const services = [
    {
      title: "Quran Memorization",
      description: "Our structured Hifz program helps children memorize the Holy Quran with proper pronunciation and understanding. We use proven techniques that make memorization enjoyable and effective.",
      features: [
        "Age-appropriate memorization techniques",
        "Proper Tajweed instruction",
        "Regular revision schedules",
        "Individual progress tracking"
      ],
      icon: "📖",
      color: "green"
    },
    {
      title: "Arabic Language Learning",
      description: "Comprehensive Arabic language program covering reading, writing, speaking, and comprehension. Our interactive approach makes learning Arabic engaging and fun for children.",
      features: [
        "Interactive learning methods",
        "Reading and writing skills",
        "Vocabulary building",
        "Grammar fundamentals"
      ],
      icon: "🔤",
      color: "blue"
    },
    {
      title: "Islamic Studies",
      description: "Complete Islamic education covering the fundamentals of faith, Islamic history, prophetic stories, and moral values that shape character and strengthen faith.",
      features: [
        "Stories of the Prophets",
        "Islamic history and civilization",
        "Moral and ethical teachings",
        "Prayer and worship guidance"
      ],
      icon: "🕌",
      color: "purple"
    },
    {
      title: "Age-Appropriate Learning",
      description: "Our curriculum is carefully designed for different age groups, ensuring that each child receives education that matches their developmental stage and learning capacity.",
      features: [
        "Little Stars (Ages 4-6)",
        "Young Learners (Ages 7-9)",
        "Junior Students (Ages 10-12)",
        "Senior Students (Ages 13-16)"
      ],
      icon: "👶",
      color: "yellow"
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      green: "bg-green-100 text-green-600 border-green-200",
      blue: "bg-blue-100 text-blue-600 border-blue-200",
      purple: "bg-purple-100 text-purple-600 border-purple-200",
      yellow: "bg-yellow-100 text-yellow-600 border-yellow-200"
    };
    return colorMap[color] || colorMap.green;
  };

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Our Educational Programs
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive Islamic education designed to nurture young minds and hearts 
            with knowledge, wisdom, and strong moral foundations.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow duration-300">
              {/* Service icon and title */}
              <div className="flex items-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${getColorClasses(service.color)}`}>
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 ml-4">{service.title}</h3>
              </div>
              
              {/* Service description */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                {service.description}
              </p>
              
              {/* Service features */}
              <ul className="space-y-3">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Begin Your Child's Islamic Education Journey?
          </h3>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Join thousands of families who trust Baraem Al-Noor for their children's Islamic education. 
            Our experienced teachers and proven curriculum ensure quality learning in a nurturing environment.
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200">
            Get Started Today
          </button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;