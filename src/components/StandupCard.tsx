import React from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { StandupUpdate } from '../types';

interface StandupCardProps {
  update: StandupUpdate;
}

export const StandupCard: React.FC<StandupCardProps> = ({ update }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-4 mb-4">
        <div className="flex items-center space-x-4">
          <img
            src={update.member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(update.member.name)}&background=0078D4&color=fff`}
            alt={update.member.name}
            className="w-11 h-11 rounded-full object-cover"
          />
          <div>
            <h3 className="text-lg font-bold text-slate-900">{update.member.name}</h3>
            <p className="text-xs text-slate-600">{update.member.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-xs text-slate-600">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(update.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{update.timestamp}</span>
          </div>
        </div>
      </div>

      {/* Project Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 text-sky-800 tracking-wide">
          {update.projectName}
        </span>
      </div>

      {/* Accomplishments */}
      <div className="mb-5">
        <h4 className="font-bold text-slate-800 mb-2.5 flex items-center text-base">
          <CheckCircle className="w-5 h-5 mr-2.5 text-emerald-600" />
          Yesterday's Accomplishments
        </h4>
        <ul className="space-y-1.5">
          {update.accomplishments.map((accomplishment, index) => (
            <li key={index} className="text-sm text-slate-700 flex items-start leading-relaxed">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-[0.3rem] mr-2.5 flex-shrink-0"></span>
              {accomplishment}
            </li>
          ))}
        </ul>
      </div>

      {/* Tasks Status */}
      <div className="mb-5">
        <div className="flex items-center space-x-2">
          {update.tasksCompleted ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-600" />
          )}
          <span className={`text-sm font-semibold ${
            update.tasksCompleted ? 'text-emerald-800' : 'text-amber-800'
          }`}>
            {update.tasksCompleted ? 'All tasks completed' : 'Tasks carried forward'}
          </span>
        </div>
        
        {!update.tasksCompleted && update.carryForward && (
          <div className="mt-2.5 pl-[calc(1.25rem+0.625rem)]"> {/* 1.25rem is w-5, 0.625rem is mr-2.5 */}
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-medium">Carry forward:</span> {update.carryForward}
            </p>
            {update.carryForwardReason && (
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                <span className="font-medium">Reason:</span> {update.carryForwardReason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Today's Plans */}
      <div>
        <h4 className="font-bold text-slate-800 mb-2.5 flex items-center text-base">
          <ArrowRight className="w-5 h-5 mr-2.5 text-sky-600" />
          Today's Plans
        </h4>
        <ul className="space-y-1.5">
          {update.todayPlans.map((plan, index) => (
            <li key={index} className="text-sm text-slate-700 flex items-start leading-relaxed">
              <span className="w-2.5 h-2.5 bg-sky-500 rounded-full mt-[0.3rem] mr-2.5 flex-shrink-0"></span>
              {plan}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};