import api from './axios';

export const aiAPI = {
  chat: (data) => api.post('/ai/tutor/', data),
  generateQuestions: (data) => api.post('/ai/generate-questions/', data),
  generateQuiz: (data) => api.post('/ai/generate-quiz/', data),
  getStudyPlan: (data) => api.post('/ai/study-plan/', data),
  getWeaknessAnalysis: () => api.get('/ai/weakness-analysis/'),
};
