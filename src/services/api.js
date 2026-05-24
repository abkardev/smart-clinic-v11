import axios from 'axios';

// Next.js: API routes live at /api on the same origin — no separate backend needed
const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const getBookings       = (params, signal) => API.get('/bookings', { params, signal });
export const createBooking     = (data)           => API.post('/bookings', data);
export const updateBooking     = (id, data)       => API.put(`/bookings/${id}`, data);
export const deleteBooking     = (id)             => API.delete(`/bookings/${id}`);
export const dragDropBooking   = (id, data)       => API.patch(`/bookings/${id}/drag-drop`, data);
export const getAvailableSlots = (doctorId, date) => API.get('/bookings/available-slots', { params: { doctorId, date } });

// ─── Doctors ──────────────────────────────────────────────────────────────────
export const getDoctors   = (signal)     => API.get('/doctors', { signal });
export const createDoctor = (data)       => API.post('/doctors', data);
export const updateDoctor = (id, data)   => API.put(`/doctors/${id}`, data);
export const deleteDoctor = (id)         => API.delete(`/doctors/${id}`);

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats = ()           => API.get('/dashboard/stats');
export const sendReminder      = (id)         => API.post(`/whatsapp/reminder/${id}`);
export const syncFromGoogle    = (doctorId)   => API.post(`/google/sync/${doctorId}`);
export const syncAllDoctors    = ()           => API.post('/google/sync-all');

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authLogin          = (data)        => API.post('/auth/login', data);
export const authRegister       = (data)        => API.post('/auth/register', data);
export const authForgotPassword = (data)        => API.post('/auth/forgot-password', data);
export const authResetPassword  = (token, data) => API.post(`/auth/reset-password/${token}`, data);
export const getUsers           = (params)      => API.get('/auth/users', { params });
export const updateUserStatus   = (id, status)  => API.patch(`/auth/users/${id}/status`, { status });
export const updateUserRole     = (id, role)    => API.patch(`/auth/users/${id}/role`, { role });
export const deleteUser         = (id)          => API.delete(`/auth/users/${id}`);

// ─── Audit logs ───────────────────────────────────────────────────────────────
export const getAuditLogs = (params) => API.get('/audit-logs', { params });

// ─── Blocked slots ────────────────────────────────────────────────────────────
export const getBlockedSlots = (params) => API.get('/blocked-slots', { params });
export const blockSlot       = (data)   => API.post('/blocked-slots', data);
export const unblockSlot     = (id)     => API.delete(`/blocked-slots/${id}`);

// ─── Offers ───────────────────────────────────────────────────────────────────
export const getOffers   = (params)   => API.get('/offers', { params });
export const createOffer = (data)     => API.post('/offers', data);
export const updateOffer = (id, data) => API.put(`/offers/${id}`, data);
export const deleteOffer = (id)       => API.delete(`/offers/${id}`);

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const getHolidays   = ()     => API.get('/holidays');
export const createHoliday = (data) => API.post('/holidays', data);
export const deleteHoliday = (id)   => API.delete(`/holidays/${id}`);

export default API;
