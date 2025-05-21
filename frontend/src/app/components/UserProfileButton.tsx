'use client';

import { useAuth } from '../../hooks';
import { useState, useRef, useEffect } from 'react';

export default function UserProfileButton() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setShowDropdown(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="flex flex-col items-center relative">
      <div className="relative" ref={dropdownRef}>
        {/* User Icon Button */}
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center justify-center"
          aria-label="User menu"
        >
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name || 'User avatar'} 
              className="w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-gray-300"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
            <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-200 truncate">
              {user?.email || 'User'}
            </div>
            <button
              onClick={handleLogoutClick}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
          <div className="bg-[var(--chat-bg)] rounded-xl p-8 shadow-xl max-w-xs w-full border border-[var(--input-border)] animate-fadeIn flex flex-col" style={{ minHeight: '360px' }}>
            <div className="flex flex-col items-center text-center mb-8 flex-grow justify-center py-6">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Log out from ChatStack?</h3>
              <p className="mt-4 text-[var(--foreground)] opacity-70 text-sm">You'll need to sign in again to access your chats</p>
            </div>
            <div className="flex flex-col gap-4 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-[var(--primary)] rounded-md hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-50"
              >
                Log out
              </button>
              <button
                onClick={handleCancelLogout}
                className="w-full px-4 py-3 text-sm font-medium text-[var(--foreground)] bg-transparent hover:bg-[var(--sidebar-hover)] border border-[var(--input-border)] rounded-md transition-colors focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 