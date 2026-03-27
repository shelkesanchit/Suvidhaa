import React, { createContext, useContext, useState, useEffect } from 'react';
import electricityApi from '../utils/electricity/api';
import gasApi from '../utils/gas/api';
import waterApi from '../utils/water/api';
import municipalApi from '../utils/municipal/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [department, setDepartment] = useState(localStorage.getItem('admin_department') || null);

  // Get the appropriate API based on department
  const getApi = () => {
    switch (department) {
      case 'gas':
        return gasApi;
      case 'water':
        return waterApi;
      case 'municipal':
        return municipalApi;
      case 'electricity':
      default:
        return electricityApi;
    }
  };

  useEffect(() => {
    if (token && department) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, department]);

  const fetchUser = async () => {
    try {
      const api = getApi();
      const endpoint = department === 'gas' || department === 'water'
        ? `/${department}/admin/auth/me`
        : department === 'municipal'
        ? '/municipal/auth/me'
        : '/auth/me';
      
      const response = await api.get(endpoint);
      const userData = response.data;
      
      // Validate user role based on department
      if (department === 'electricity') {
        if (userData.role !== 'admin') {
          toast.error('Access denied. Admin only.');
          logout();
          return;
        }
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Fetch user error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials, dept) => {
    try {
      let response;
      
      if (dept === 'gas' || dept === 'water' || dept === 'municipal') {
        // Gas, Water and Municipal admin login
        const apiMap = { gas: gasApi, water: waterApi, municipal: municipalApi };
        const endpoint = dept === 'municipal' ? '/municipal/auth/login' : `/${dept}/admin/login`;
        response = await apiMap[dept].post(endpoint, credentials);
        // Validate role for municipal
        if (dept === 'municipal') {
          const u = response.data.user || response.data.admin;
          if (u?.role !== 'admin' && u?.role !== 'staff') {
            toast.error('Access denied. Admin or staff only.');
            throw new Error('Unauthorized');
          }
        }
      } else {
        // Electricity admin login
        response = await electricityApi.post('/auth/login', credentials);
        
        // Validate role for electricity
        const { user: userData } = response.data;
        if (userData.role !== 'admin') {
          toast.error('Access denied. Admin only.');
          throw new Error('Unauthorized access');
        }
      }
      
      const { token, user, admin } = response.data;
      const userData = user || admin;
      
      // Update localStorage first
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(userData));
      localStorage.setItem('admin_department', dept);
      
      // Then update state
      setToken(token);
      setUser(userData);
      setDepartment(dept);
      
      toast.success(`Welcome back, ${userData.full_name || userData.username}!`);
      return userData;
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_department');
    setToken(null);
    setUser(null);
    setDepartment(null);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    token,
    loading,
    department,
    login,
    logout,
    getApi,
    isAuthenticated: !!token && !!department,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isStaff: user?.role === 'staff',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
