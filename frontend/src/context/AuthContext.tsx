import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('bugtracker_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('bugtracker_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem('bugtracker_token');
    localStorage.removeItem('bugtracker_user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    setIsLoading(false);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { user: authUser, token: authToken } = response.data;
    localStorage.setItem('bugtracker_token', authToken);
    localStorage.setItem('bugtracker_user', JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await authApi.signup(name, email, password);
    const { user: authUser, token: authToken } = response.data;
    localStorage.setItem('bugtracker_token', authToken);
    localStorage.setItem('bugtracker_user', JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
