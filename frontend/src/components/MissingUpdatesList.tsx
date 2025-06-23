import React from 'react';
import { UserX } from 'lucide-react'; // Using an icon for visual representation
import { ChatMemberInfo } from '../types'; // Assuming ChatMemberInfo is { id, name, email }

interface MissingUpdatesListProps {
  membersWithoutUpdates?: ChatMemberInfo[]; // Make it optional as it might not always be present
}

const MissingUpdatesList: React.FC<MissingUpdatesListProps> = ({ membersWithoutUpdates }) => {
  if (!membersWithoutUpdates || membersWithoutUpdates.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 border border-slate-200">
        <div className="flex items-center text-slate-700 mb-3">
          <UserX className="w-6 h-6 mr-3 text-green-600" />
          <h2 className="text-xl font-semibold">Users Without Updates</h2>
        </div>
        <p className="text-sm text-slate-500 italic">All members have submitted updates for the analyzed period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-slate-200">
      <div className="flex items-center text-slate-700 mb-4">
        <UserX className="w-6 h-6 mr-3 text-orange-600" />
        <h2 className="text-xl font-semibold">Users Without Updates</h2>
      </div>
      <div className="overflow-x-auto">
        <ul className="divide-y divide-slate-200">
          {membersWithoutUpdates.map((member) => (
            <li key={member.id || member.name} className="py-3 px-1 hover:bg-slate-50 transition-colors">
              <p className="text-sm font-medium text-slate-900">{member.name}</p>
              {member.email && <p className="text-xs text-slate-500">{member.email}</p>}
            </li>
          ))}
        </ul>
      </div>
       <p className="text-xs text-slate-400 mt-3">
        *This list includes members of the chat who did not submit a stand-up report during the analyzed period.
      </p>
    </div>
  );
};

export default MissingUpdatesList;
