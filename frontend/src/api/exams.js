import api from './axios';

export const examsAPI = {
  // Questions
  getQuestions: (params) => api.get('/exams/questions/', { params }),
  getQuestion: (id) => api.get(`/exams/questions/${id}/`),
  createQuestion: (data) => api.post('/exams/questions/', data),
  updateQuestion: (id, data) => api.patch(`/exams/questions/${id}/`, data),
  deleteQuestion: (id) => api.delete(`/exams/questions/${id}/`),
  getQuestionBank: () => api.get('/exams/questions/bank/'),
  bulkImportQuestions: (formData) => api.post('/exams/questions/bulk-import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Exams
  getExams: (params) => api.get('/exams/exams/', { params }),
  getExam: (id) => api.get(`/exams/exams/${id}/`),
  createExam: (data) => api.post('/exams/exams/', data),
  updateExam: (id, data) => api.patch(`/exams/exams/${id}/`, data),
  deleteExam: (id) => api.delete(`/exams/exams/${id}/`),
  addExamQuestion: (examId, data) => api.post(`/exams/exams/${examId}/questions/`, data),
  removeExamQuestion: (examId, questionId) => api.delete(`/exams/exams/${examId}/questions/${questionId}/`),
  getExamResults: (examId) => api.get(`/exams/exams/${examId}/results/`),

  // Exam engine
  startExam: (examId) => api.post(`/exams/exams/${examId}/start/`),
  saveAnswer: (attemptId, data) => api.post(`/exams/attempts/${attemptId}/save/`, data),
  flagQuestion: (attemptId, data) => api.post(`/exams/attempts/${attemptId}/flag/`, data),
  submitExam: (attemptId, data) => api.post(`/exams/attempts/${attemptId}/submit/`, data),
  autoSubmit: (attemptId) => api.post(`/exams/attempts/${attemptId}/auto-submit/`),

  // List aliases (used by student pages)
  list: (params) => api.get('/exams/exams/', { params }),
  myAttempts: (params) => api.get('/exams/attempts/', { params }),

  // Attempts
  getAttempts: (params) => api.get('/exams/attempts/', { params }),
  getAttempt: (id) => api.get(`/exams/attempts/${id}/`),
  reviewAttempt: (id) => api.get(`/exams/attempts/${id}/review/`),

  // Practice
  startPractice: (data) => api.post('/exams/practice/start/', data),
  practiceAnswer: (data) => api.post('/exams/practice/answer/', data),
  getPracticeHistory: () => api.get('/exams/practice/history/'),

  // Bookmarks
  getBookmarks: () => api.get('/exams/bookmarks/'),
  createBookmark: (data) => api.post('/exams/bookmarks/', data),
  deleteBookmark: (id) => api.delete(`/exams/bookmarks/${id}/`),
};
