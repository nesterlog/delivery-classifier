import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface AuthUser {
  role: string;
  user: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 토큰을 axios 기본 헤더에 설정
  const setAuthToken = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('admin_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('admin_token');
    }
  };

  // 페이지 로드 시 토큰 확인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          setAuthToken(token);
          const response = await axios.get('/api/auth/verify');
          if (response.data.success) {
            setIsAuthenticated(true);
            setUser(response.data.user);
          } else {
            throw new Error('Token verification failed');
          }
        } catch (error) {
          console.log('토큰 검증 실패:', error);
          setAuthToken(null);
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/auth/login', { password });
      if (response.data.success && response.data.access_token) {
        setAuthToken(response.data.access_token);
        setIsAuthenticated(true);
        setUser({ role: 'admin', user: 'admin' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('로그인 실패:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.log('로그아웃 API 호출 실패:', error);
    } finally {
      setAuthToken(null);
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 