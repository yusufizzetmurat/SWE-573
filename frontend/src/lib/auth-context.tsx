import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, userAPI, User } from './api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to restore user from localStorage on mount
  const getStoredUser = (): User | null => {
    try {
      const stored = localStorage.getItem('user_data');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored user data:', e);
    }
    return null;
  };

  const [user, setUser] = useState<User | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  // Helper to save user to localStorage
  const saveUser = (userData: User | null) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user_data', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user_data');
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!token) {
        // No token - clear any stored user data
        if (isMounted) {
          saveUser(null);
          setIsLoading(false);
        }
        return;
      }
      
      // If we have stored user data, use it immediately (optimistic)
      const storedUser = getStoredUser();
      if (storedUser && isMounted) {
        setUser(storedUser); // Set immediately for fast UI, will be updated by saveUser below
      }
      
      try {
        const userData = await userAPI.getMe();
        if (isMounted) {
          saveUser(userData);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        // If token expired (401), try to refresh
        const apiError = error as { response?: { status?: number } };
        if (apiError.response?.status === 401 && refreshToken) {
          try {
            const response = await authAPI.refreshToken(refreshToken);
            if (response.access) {
              localStorage.setItem('access_token', response.access);
              const userData = await userAPI.getMe();
              if (isMounted) {
                saveUser(userData);
                setIsLoading(false);
              }
            }
          } catch (refreshError: unknown) {
            const refreshApiError = refreshError as { response?: { status?: number; data?: unknown } };
            console.error('Token refresh failed:', refreshApiError.response?.status, refreshApiError.response?.data);
            // Only clear tokens if refresh token is invalid (401/400)
            if (refreshApiError.response?.status === 401 || refreshApiError.response?.status === 400) {
              if (isMounted) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                saveUser(null);
                setIsLoading(false);
              }
            } else {
              // Network error - keep tokens and stored user data
              if (isMounted) {
                setIsLoading(false);
              }
            }
          }
        } else if (apiError.response?.status === 401 && !refreshToken) {
          // 401 but no refresh token - clear tokens
          if (isMounted) {
            localStorage.removeItem('access_token');
            saveUser(null);
            setIsLoading(false);
          }
        } else {
          // Network error or other non-auth error - keep tokens and user data
          // User stays logged in with stored data
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response.access) {
        localStorage.setItem('access_token', response.access);
        if (response.refresh) {
          localStorage.setItem('refresh_token', response.refresh);
        }
      }
      
      const userData = await userAPI.getMe();
      saveUser(userData);
    } catch (error: unknown) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: { email: string; password: string; first_name: string; last_name: string }) => {
    const response = await authAPI.register(data);
    if (response.access) {
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
    }
    
    if (response.user) {
      saveUser(response.user);
    } else {
      const userData = await userAPI.getMe();
      saveUser(userData);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    saveUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await userAPI.getMe();
      saveUser(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


