import api from './axios';

export const certificatesAPI = {
  getCertificates: () => api.get('/certificates/'),
  generateCertificate: (data) => api.post('/certificates/generate/', data),
  verifyCertificate: (id) => api.get(`/certificates/verify/${id}/`),

  // Notifications
  getNotifications: (params) => api.get('/certificates/notifications/', { params }),
  getUnreadCount: () => api.get('/certificates/notifications/count/'),
  markRead: (id) => api.post(`/certificates/notifications/${id}/read/`),
  markAllRead: () => api.post('/certificates/notifications/read-all/'),
};
