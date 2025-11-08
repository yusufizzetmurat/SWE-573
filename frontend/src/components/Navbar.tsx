import React from 'react';
import { Hexagon, Search, Plus, User, LogOut, MessageSquare, UserCircle, Bell } from 'lucide-react';
import { formatTimebank } from '../lib/utils';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  activeLink?: string;
  showPostButton?: boolean;
  userBalance?: number;
  unreadNotifications?: number;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

export function Navbar({ 
  activeLink = 'browse', 
  showPostButton = true, 
  userBalance = 1,
  unreadNotifications = 0,
  onNavigate = () => {},
  onLogout = () => {},
  isAuthenticated = false
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-12">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Hexagon className="w-8 h-8 fill-amber-500 text-amber-600" />
              <span className="tracking-tight text-gray-900">The Hive</span>
            </button>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeLink === 'browse'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Browse Services
              </button>
              <button
                onClick={() => onNavigate('forum')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeLink === 'forum'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Forums
              </button>
              <button
                onClick={() => onNavigate('messages')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeLink === 'messages'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeLink === 'profile'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <UserCircle className="w-4 h-4" />
                Profile
              </button>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {showPostButton && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Post a Service
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onNavigate('post-offer')}>
                        Post an Offer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigate('post-need')}>
                        Post a Want
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Notifications Bell */}
                <NotificationDropdown
                  unreadCount={unreadNotifications}
                  onNotificationClick={(notification) => {
                    if (notification.link) {
                      onNavigate(notification.link);
                    }
                  }}
                >
                  <button className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors">
                    <Bell className="w-5 h-5 text-gray-600" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs bg-red-500 text-white rounded-full">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>
                </NotificationDropdown>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                      <User className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>My Account</span>
                        <span className="text-xs text-gray-500 mt-1">
                          Balance: {formatTimebank(userBalance)} TimeBank {formatTimebank(userBalance) === '1' ? 'Hour' : 'Hours'}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onNavigate('profile')}>
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNavigate('messages')}>
                      Messages
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => onNavigate('login')}
                  className="text-gray-700 hover:text-gray-900"
                >
                  Log In
                </Button>
                <Button 
                  onClick={() => onNavigate('register')}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
