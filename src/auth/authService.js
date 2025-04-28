import axios from '../api/axios';

export const register = async (data) => {
  const res = await axios.post('/auth/register', data);
  return res.data;
};

export const login = async (data) => {
  const res = await axios.post('/auth/login', data);
  const { token, user } = res.data;
  localStorage.setItem('token', token);
  return user;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getToken = () => localStorage.getItem('token');
