'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

interface AuthUser extends Omit<User, 'role'> {
  id: string;
  role: 'admin' | 'user' | 'client';
  empId?: string;
  designation?: string;
  vertex?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing authentication on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        console.log('AuthContext: Initializing authentication...');

        // Check if we're in the browser
        if (typeof window === 'undefined') {
          console.log('AuthContext: Server-side, skipping localStorage check');
          setIsLoading(false);
          return;
        }

        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        console.log('AuthContext: Stored user:', !!storedUser, 'Stored token:', !!storedToken);

        if (storedUser && storedToken) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('AuthContext: Loading user from storage:', userData.email, 'Role:', userData.role);
            setUser(userData);
          } catch (parseError) {
            console.error('AuthContext: Error parsing stored user data:', parseError);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        } else {
          console.log('AuthContext: No stored authentication found');
        }
      } catch (error) {
        console.error('AuthContext: Error loading auth state:', error);
        // Clear corrupted data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } finally {
        console.log('AuthContext: Authentication initialization complete');
        setIsLoading(false);
      }
    };

    // Delay initialization slightly to ensure proper hydration
    const timeoutId = setTimeout(initAuth, 10);
    return () => clearTimeout(timeoutId);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user data and token
      console.log('Storing user data:', data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      setUser(data.user);

      // Redirect to home page
      console.log('Redirecting to home page for user role:', data.user.role);
      router.push('/');

    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Call logout API to clear server-side cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setIsLoading(false);
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}