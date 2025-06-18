import React from 'react';
import { StandupUpdate, TeamMember } from '../types';

interface DashboardViewProps {
  updates: StandupUpdate[];
  teamMembers: TeamMember[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ updates, teamMembers }) => {
  const totalUpdates = updates.length;

  const userUpdatesCount = teamMembers.reduce((acc, member) => {
    acc[member.name] = updates.filter(update => update.member.id === member.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-800 border-b border-gray-300 pb-3 mb-6">
        Dashboard
      </h2>

      <div className="mb-8 p-4 bg-blue-50 rounded-lg shadow">
        <h3 className="text-lg font-medium text-blue-700 mb-1">Total Updates</h3>
        <p className="text-4xl font-bold text-blue-600">{totalUpdates}</p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-700 mb-4">User-wise Updates</h3>
        {teamMembers.length > 0 ? (
          <ul className="space-y-3">
            {teamMembers.map(member => (
              <li
                key={member.id}
                className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-md shadow-sm border border-gray-200 transition-colors duration-150"
              >
                <span className="text-gray-800 font-medium">{member.name}</span>
                <span className="text-gray-600 bg-gray-200 px-3 py-1 rounded-full text-sm font-semibold">
                  {userUpdatesCount[member.name] || 0} updates
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No team member data available.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
