
import React from 'react';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const WelcomeCard = () => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-2xl">
      <CardContent className="p-12 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-6 shadow-lg">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-4">
            Hello World!
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Welcome to Scheduler 5
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Your next-generation scheduling solution is ready to help you organize your time and boost your productivity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="flex flex-col items-center p-4 bg-white/50 rounded-lg backdrop-blur-sm">
            <Clock className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Time Management</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white/50 rounded-lg backdrop-blur-sm">
            <Calendar className="w-8 h-8 text-indigo-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Smart Scheduling</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white/50 rounded-lg backdrop-blur-sm">
            <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Task Completion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;
