// src/api/axios.js
import axios from 'axios';

const instance = axios.create({
  //cambiar la ruta :https://figmaproclone-backend-vow0.onrender.com 
  baseURL: 'https://figmaproclone-backend-vow0.onrender.com/api',
});

// Añadir token a cada request automáticamente
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default instance;
