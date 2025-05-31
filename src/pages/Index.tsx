
import React from 'react';
import WelcomeCard from '@/components/WelcomeCard';
import BackgroundPattern from '@/components/BackgroundPattern';

const Index = () => {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <BackgroundPattern />
      
      <div className="relative z-10 w-full">
        <div className="container mx-auto">
          <WelcomeCard />
          
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 font-medium">
              Version 5.0 • Ready to schedule your success
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
