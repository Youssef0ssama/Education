import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from './Header';
import HeroSection from './HeroSection';
import ServicesSection from './ServicesSection';
import AboutSection from './AboutSection';
import Footer from './Footer';

const HomePage = ({ onLoginClick }) => {
    return (
        <>
            <Helmet>
                <title>Baraem Al-Noor - Islamic Educational Platform</title>
                <meta name="description" content="Baraem Al-Noor offers comprehensive Islamic education including Quran memorization, Arabic language learning, and Islamic studies for children of all ages." />
                <meta name="keywords" content="Islamic education, Quran memorization, Arabic learning, Islamic studies, children education" />
            </Helmet>

            <div className="min-h-screen bg-gray-50">
                <Header onLoginClick={onLoginClick} />
                <main>
                    <HeroSection />
                    <ServicesSection />
                    <AboutSection />
                </main>
                <Footer />
            </div>
        </>
    );
};

export default HomePage;