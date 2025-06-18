import React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../config/authConfig';
import { LogIn, LogOut, User } from 'lucide-react';

interface AuthButtonProps {
  onAuthChange?: (isAuthenticated: boolean, accessToken?: string) => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onAuthChange }) => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = accounts.length > 0;

  const handleLogin = async () => {
    try {
      const response = await instance.loginPopup(loginRequest);
      if (response && onAuthChange) {
        onAuthChange(true, response.accessToken);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await instance.logoutPopup();
      if (onAuthChange) {
        onAuthChange(false);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getAccessToken = async () => {
    if (accounts.length > 0) {
      try {
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        return response.accessToken;
      } catch (error) {
        console.error('Token acquisition failed:', error);
        try {
          const response = await instance.acquireTokenPopup(loginRequest);
          return response.accessToken;
        } catch (popupError) {
          console.error('Popup token acquisition failed:', popupError);
          return null;
        }
      }
    }
    return null;
  };

  React.useEffect(() => {
    if (isAuthenticated && onAuthChange) {
      getAccessToken().then(token => {
        if (token) {
          onAuthChange(true, token);
        }
      });
    }
  }, [isAuthenticated, onAuthChange]);

  if (inProgress === 'login') {
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
      >
        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
        Signing in...
      </button>
    );
  }

  if (isAuthenticated) {
    const account = accounts[0];
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>{account.name || account.username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign in with Microsoft
    </button>
  );
};