import React from 'react';
import { AuthButton } from './AuthButton';
import { TokenInput } from './TokenInput';

interface AuthSectionProps {
  onAuthChange?: (isAuthenticated: boolean, accessToken?: string) => void;
  currentToken?: string;
}

export const AuthSection: React.FC<AuthSectionProps> = ({ onAuthChange, currentToken }) => {
  const handleTokenSubmit = (token: string) => {
    if (onAuthChange) {
      onAuthChange(!!token, token);
    }
  };

  const handleAuthChange = (isAuthenticated: boolean, token?: string) => {
    if (onAuthChange) {
      onAuthChange(isAuthenticated, token);
    }
  };

  // If we have a current token, determine the source and show appropriate UI
  if (currentToken) {
    // Check if it's from OAuth (longer tokens) or direct input
    const isOAuthToken = currentToken.length > 1000;
    
    if (isOAuthToken) {
      return <AuthButton onAuthChange={handleAuthChange} />;
    } else {
      return <TokenInput onTokenSubmit={handleTokenSubmit} currentToken={currentToken} />;
    }
  }

  // Show both options when not authenticated
  return (
    <div className="flex items-center space-x-3">
      <AuthButton onAuthChange={handleAuthChange} />
      <div className="text-gray-300">|</div>
      <TokenInput onTokenSubmit={handleTokenSubmit} />
    </div>
  );
};