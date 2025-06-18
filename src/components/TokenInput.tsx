import React, { useState } from 'react';
import { Key, Eye, EyeOff, X } from 'lucide-react';

interface TokenInputProps {
  onTokenSubmit: (token: string) => void;
  currentToken?: string;
}

export const TokenInput: React.FC<TokenInputProps> = ({ onTokenSubmit, currentToken }) => {
  const [token, setToken] = useState(currentToken || '');
  const [showToken, setShowToken] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onTokenSubmit(token.trim());
      setIsExpanded(false);
    }
  };

  const handleClear = () => {
    setToken('');
    onTokenSubmit('');
  };

  // Show current token status
  if (currentToken && !isExpanded) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Key className="w-4 h-4" />
          <span>Token Active</span>
        </div>
        <button
          onClick={handleClear}
          className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Clear
        </button>
      </div>
    );
  }

  // Show compact button when not expanded
  if (!isExpanded && !currentToken) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Key className="w-4 h-4 mr-2" />
        Use Token
      </button>
    );
  }

  // Show expanded form in a dropdown-style overlay
  return (
    <div className="relative">
      <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Key className="w-4 h-4 mr-2" />
            Access Token
          </h3>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste Microsoft Graph access token..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!token.trim()}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Use Token
          </button>
        </form>
        
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-800 font-medium mb-1">How to get a token:</p>
          <ol className="text-xs text-blue-700 space-y-0.5">
            <li>1. Visit <a href="https://developer.microsoft.com/en-us/graph/graph-explorer" target="_blank" rel="noopener noreferrer" className="underline">Graph Explorer</a></li>
            <li>2. Sign in with Microsoft account</li>
            <li>3. Copy token from "Access token" tab</li>
          </ol>
        </div>
      </div>
    </div>
  );
};