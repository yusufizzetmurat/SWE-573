import React from 'react';
import { Hexagon, Search, Plus, User, LogOut, MessageSquare, UserCircle, Bell, Grid3x3, Shield } from 'lucide-react';
import { formatTimebank } from '../lib/utils';
import { Button } from './ui/button';
import { useAuth } from '../lib/auth-context';
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'My Account';

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-12">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Go to home page"
            >
              <Hexagon className="w-8 h-8 fill-amber-500 text-amber-600" aria-hidden="true" />
              <span className="tracking-tight text-gray-900">The Hive</span>
            </button>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeLink === 'browse'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-label="Browse services"
                aria-current={activeLink === 'browse' ? 'page' : undefined}
              >
                <Grid3x3 className="w-4 h-4" aria-hidden="true" />
                Browse Services
              </button>
              <button
                onClick={() => onNavigate('forum')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeLink === 'forum'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-label="View forums"
                aria-current={activeLink === 'forum' ? 'page' : undefined}
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                Forums
              </button>
              <button
                onClick={() => onNavigate('messages')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeLink === 'messages'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-label="View messages"
                aria-current={activeLink === 'messages' ? 'page' : undefined}
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                Chat
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  activeLink === 'profile'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-label="View profile"
                aria-current={activeLink === 'profile' ? 'page' : undefined}
              >
                <UserCircle className="w-4 h-4" aria-hidden="true" />
                Profile
              </button>
              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    activeLink === 'admin'
                      ? 'bg-amber-50 text-amber-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-label="Moderator dashboard"
                  aria-current={activeLink === 'admin' ? 'page' : undefined}
                >
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  Moderator
                </button>
              )}
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
                  <button 
                    className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                    aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
                    aria-live="polite"
                  >
                    <Bell className="w-5 h-5 text-gray-600" aria-hidden="true" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs bg-red-500 text-white rounded-full" aria-label={`${unreadNotifications} unread notifications`}>
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </button>
                </NotificationDropdown>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                      data-testid="navbar-user-menu"
                      aria-label="Open user menu"
                    >
                      <User className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{displayName}</span>
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
