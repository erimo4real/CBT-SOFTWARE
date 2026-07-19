import api from './axios';

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getWeakTopics: () => api.get('/analytics/weak-topics/'),
  getItemAnalysis: (examId) => api.get('/analytics/item-analysis/', { params: { exam: examId } }),
  getQuestionAnalysis: (questionId) => api.get(`/analytics/item-analysis/${questionId}/`),
  getLeaderboard: (params) => api.get('/analytics/leaderboard/', { params }),
  getStudyAnalytics: (params) => api.get('/analytics/study/', { params }),
};
