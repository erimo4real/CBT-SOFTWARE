import api from './axios';

// ── Staff Auth ──
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  googleLogin: (token) => api.post('/auth/login/google/', { token }),
  refreshToken: (refresh) => api.post('/auth/refresh/', { refresh }),
  getProfile: () => api.get('/auth/me/'),
  updateProfile: (data) => api.put('/auth/me/update/', data),
  uploadAvatar: (data) => api.post('/auth/me/avatar/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  requestPasswordReset: (data) => api.post('/auth/password-reset/', data),
  confirmPasswordReset: (data) => api.post('/auth/password-reset/confirm/', data),
};

// ── Student Auth Flow ──
export const studentAuthAPI = {
  login: (data) => api.post('/auth/student/login/', data),
  requestOTP: (data) => api.post('/auth/student/otp/request/', data),
  verifyOTP: (data) => api.post('/auth/student/otp/verify/', data),
  examAccess: (data) => api.post('/auth/student/exam-access/', data),
};

// ── Student Management (Staff) ──
export const studentsAPI = {
  list: (params) => api.get('/auth/students/', { params }),
  get: (id) => api.get(`/auth/students/${id}/`),
  create: (data) => api.post('/auth/students/', data),
  update: (id, data) => api.put(`/auth/students/${id}/`, data),
  patch: (id, data) => api.patch(`/auth/students/${id}/`, data),
  delete: (id) => api.delete(`/auth/students/${id}/`),
  bulkImport: (formData) => api.post('/auth/students/bulk-import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ── Exam PINs (Staff) ──
export const examPinsAPI = {
  list: (params) => api.get('/auth/exam-pins/', { params }),
  create: (data) => api.post('/auth/exam-pins/', data),
  get: (id) => api.get(`/auth/exam-pins/${id}/`),
  delete: (id) => api.delete(`/auth/exam-pins/${id}/`),
  printSlipUrl: (id) => `${api.defaults.baseURL}/auth/exam-pins/${id}/print-slip/`,
};

// ── Audit Logs (Admin) ──
export const auditLogAPI = {
  list: (params) => api.get('/auth/audit-logs/', { params }),
};

// ── Admin User Management ──
export const adminUsersAPI = {
  list: (params) => api.get('/auth/admin/users/', { params }),
  update: (id, data) => api.patch(`/auth/admin/users/${id}/`, data),
};
