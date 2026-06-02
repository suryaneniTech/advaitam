import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';

const AuthContext = createContext(null);

function homeFor(user) {
  if (user.mustChangePassword) return '/change-password';
  if (user.role === 'admin') return '/admin';
  return '/dashboard';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(({ user }) => setUser(user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('token');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('token', token);
    setUser(user);
    navigate(homeFor(user), { replace: true });
    return user;
  };

  const loginWithOtp = async (email, otp) => {
    const { token, user } = await api.verifyOtp(email, otp);
    localStorage.setItem('token', token);
    setUser(user);
    navigate(homeFor(user), { replace: true });
    return user;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const { user } = await api.changePassword(currentPassword, newPassword);
    setUser(user);
    navigate(homeFor(user), { replace: true });
    return user;
  };

  const uploadAvatar = async (file) => {
    const { user } = await api.uploadAvatar(file);
    setUser(user);
    return user;
  };

  const removeAvatar = async () => {
    const { user } = await api.removeAvatar();
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithOtp, changePassword, uploadAvatar, removeAvatar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
