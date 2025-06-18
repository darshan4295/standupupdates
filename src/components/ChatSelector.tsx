import React, { useState, useEffect } from 'react';
import { MessageSquare, ChevronDown, Loader2 } from 'lucide-react';

interface Chat {
  id: string;
  topic?: string;
  chatType: string;
  createdDateTime: string;
}

interface ChatSelectorProps {
  accessToken?: string;
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
}

export const ChatSelector: React.FC<ChatSelectorProps> = ({
  accessToken,
  selectedChatId,
  onChatSelect
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (accessToken) {
      fetchChats();
    }
  }, [accessToken]);

  const fetchChats = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/chats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChats(data.value || []);
      } else {
        console.error('Failed to fetch chats:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedChat = chats.find(chat => chat.id === selectedChatId);

  if (!accessToken) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <MessageSquare className="w-4 h-4 mr-2" />
        Sign in to select a chat
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-48"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        <span className="flex-1 text-left truncate">
          {loading ? 'Loading chats...' : selectedChat?.topic || 'Select a chat'}
        </span>
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="ml-2">Loading chats...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">No chats found</div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  onChatSelect(chat.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  selectedChatId === chat.id ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                }`}
              >
                <div className="truncate">
                  {chat.topic || `${chat.chatType} chat`}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {new Date(chat.createdDateTime).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};