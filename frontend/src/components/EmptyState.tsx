import React from 'react';
import { Search, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-data' | 'no-results';
  onClearFilters?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onClearFilters }) => {
  if (type === 'no-results') {
    return (
      <div className="text-center py-12">
        <Search className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No matching updates found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your search criteria or filters.
        </p>
        {onClearFilters && (
          <div className="mt-6">
            <button
              onClick={onClearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No standup updates found</h3>
      <p className="mt-1 text-sm text-gray-500">
        Connect to Microsoft Teams to start scanning messages.
      </p>
      <div className="mt-6">
        <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Connect to Teams
        </button>
      </div>
    </div>
  );
};