import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// User type definition
interface User {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  profileImage?: string;
  bio?: string;
  website?: string;
  followers?: number;
  following?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (userData: { username: string; email: string; password: string; fullName: string }) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  sendOtp: (email: string) => Promise<void>;
  confirmResetPassword: (token: string, otp: string, newPassword: string) => Promise<void>;
}

// Create the Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Authentication status
  const isAuthenticated = !!user;

  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Verifying stored token:', token.substring(0, 10) + '...');
        try {
          setIsLoading(true);
          const response = await authAPI.getCurrentUser();
          setUser(response.data);
          console.log('User authenticated successfully');
        } catch (error) {
          console.error('Auth token invalid or expired:', error);
          localStorage.removeItem('token');
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('No token found in localStorage');
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  // Set up token refresh mechanism
  useEffect(() => {
    const handleFocus = async () => {
      if (isAuthenticated) {
        try {
          const response = await authAPI.getCurrentUser();
          if (response.data) {
            setUser(response.data);
          }
        } catch (error) {
          console.error('Session validation failed on focus:', error);
          if (error.response && error.response.status === 401) {
            logout();
          }
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  // Before unload listener to persist auth state
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAuthenticated && !localStorage.getItem('token')) {
        const token = localStorage.getItem('token');
        if (token) {
          localStorage.setItem('token', token);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  // Login function
  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/');
      toast.success('Logged in successfully!');
    } catch (error: any) {
      console.error('Login failed:', error);
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: { username: string; email: string; password: string; fullName: string }) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;
      localStorage.setItem('token', token);
      setUser(newUser);
      navigate('/');
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Registration failed:', error);
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    queryClient.removeQueries({ queryKey: ['profile'] });
    queryClient.removeQueries({ queryKey: ['feed'] });
    navigate('/auth/login');
    toast.success('Logged out successfully');
  };

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...userData } : null));
    queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  // Send OTP for password reset
  const sendOtp = async (email: string) => {
    try {
      setIsLoading(true);
      await authAPI.forgotPassword(email);
      toast.success('OTP sent successfully. Please check your inbox.');
    } catch (error: any) {
      console.error('OTP send failed:', error);
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm password reset using OTP
  const confirmResetPassword = async (token: string, otp: string, newPassword: string) => {
    try {
      setIsLoading(true);
      await authAPI.resetPassword(token, otp, newPassword);
      toast.success('Password reset successful. You can now log in with your new password.');
    } catch (error: any) {
      console.error('Password reset confirmation failed:', error);
      let errorMessage = 'Failed to reset password. The link may be invalid or expired.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    sendOtp,
    confirmResetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
