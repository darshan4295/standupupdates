import React from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { StandupUpdate } from '../types';

interface StandupCardProps {
  update: StandupUpdate;
}

export const StandupCard: React.FC<StandupCardProps> = ({ update }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img
            src={update.member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(update.member.name)}&background=0078D4&color=fff`}
            alt={update.member.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-gray-900">{update.member.name}</h3>
            <p className="text-sm text-gray-500">{update.member.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(update.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{update.timestamp}</span>
          </div>
        </div>
      </div>

      {/* Project Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {update.projectName}
        </span>
      </div>

      {/* Accomplishments */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          Yesterday's Accomplishments
        </h4>
        <ul className="space-y-1">
          {update.accomplishments.map((accomplishment, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
              {accomplishment}
            </li>
          ))}
        </ul>
      </div>

      {/* Tasks Status */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          {update.tasksCompleted ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-orange-500" />
          )}
          <span className={`text-sm font-medium ${
            update.tasksCompleted ? 'text-green-700' : 'text-orange-700'
          }`}>
            {update.tasksCompleted ? 'All tasks completed' : 'Tasks carried forward'}
          </span>
        </div>
        
        {!update.tasksCompleted && update.carryForward && (
          <div className="mt-2 pl-6">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Carry forward:</span> {update.carryForward}
            </p>
            {update.carryForwardReason && (
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium">Reason:</span> {update.carryForwardReason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Today's Plans */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
          <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
          Today's Plans
        </h4>
        <ul className="space-y-1">
          {update.todayPlans.map((plan, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
              {plan}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};