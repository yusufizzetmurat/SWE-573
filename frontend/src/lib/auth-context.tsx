import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { authAPI, userAPI, User } from './api';
import { logger } from './logger';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; first_name: string; last_name: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserOptimistically: (updates: Partial<User>) => void;
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
      logger.error('Failed to parse stored user data', e instanceof Error ? e : new Error(String(e)));
    }
    return null;
  };

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    return getStoredUser();
  });
  const [isLoading, setIsLoading] = useState(false);

  // Helper to save user to localStorage - memoized to prevent recreation on every render
  const saveUser = useCallback((userData: User | null) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user_data', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user_data');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!token) return;
      
      try {
        const userData = await userAPI.getMe();
        if (isMounted) {
          saveUser(userData);
        }
      } catch (error: unknown) {
        const apiError = error as { response?: { status?: number } };
        
        if (apiError.response?.status === 401 && refreshToken) {
          try {
            const response = await authAPI.refreshToken(refreshToken);
            if (response.access && isMounted) {
              localStorage.setItem('access_token', response.access);
              try {
                const userData = await userAPI.getMe();
                if (isMounted) {
                  saveUser(userData);
                }
              } catch {
                // Silent fail
              }
            }
          } catch (refreshError: unknown) {
            const refreshApiError = refreshError as { response?: { status?: number } };
            if (refreshApiError.response?.status === 401 || refreshApiError.response?.status === 400) {
              if (isMounted) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                saveUser(null);
              }
            }
          }
        } else if (apiError.response?.status === 401) {
          if (isMounted) {
            localStorage.removeItem('access_token');
            saveUser(null);
          }
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response.access) {
        localStorage.setItem('access_token', response.access);
        if (response.refresh) {
          localStorage.setItem('refresh_token', response.refresh);
        }
      }
      
      if (response.user) {
        saveUser(response.user);
        userAPI.getMe()
          .then(saveUser)
          .catch((error) => {
            logger.error('Failed to fetch full user profile after login', error instanceof Error ? error : new Error(String(error)));
          });
      } else {
        userAPI.getMe()
          .then(saveUser)
          .catch((error) => {
            logger.error('Failed to fetch user data after login', error instanceof Error ? error : new Error(String(error)));
          });
      }
    } catch (error: unknown) {
      logger.error('Login error', error instanceof Error ? error : new Error(String(error)), { email });
      throw error;
    }
  }, [saveUser]);

  const register = useCallback(async (data: { email: string; password: string; first_name: string; last_name: string }) => {
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
  }, [saveUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    saveUser(null);
  }, [saveUser]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await userAPI.getMe();
      saveUser(userData);
    } catch (error) {
      logger.error('Failed to refresh user data', error instanceof Error ? error : new Error(String(error)));
    }
  }, [saveUser]);

  const updateUserOptimistically = useCallback((updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      saveUser(updatedUser);
    }
  }, [user, saveUser]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      updateUserOptimistically,
    }),
    [user, isLoading, login, register, logout, refreshUser, updateUserOptimistically]
  );

  return (
    <AuthContext.Provider value={contextValue}>
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


