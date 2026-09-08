import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const planTrip = (tripData) => {
  return api.post('/api/trips/plan/', tripData);
};

export const getTrips = () => {
  return api.get('/api/trips/');
};

export const getTrip = (id) => {
  return api.get(`/api/trips/${id}/`);
};

export const healthCheck = () => {
  return api.get('/api/health/');
};

export default api;
