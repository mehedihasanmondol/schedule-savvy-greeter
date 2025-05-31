
import React from 'react';

const BackgroundPattern = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-0 w-full h-full">
        <svg
          className="absolute top-0 left-0 w-full h-full opacity-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
        >
          <defs>
            <pattern
              id="grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Floating circles */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full opacity-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-200 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-purple-200 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
    </div>
  );
};

export default BackgroundPattern;
