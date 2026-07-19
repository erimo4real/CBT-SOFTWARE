import api from './axios';

export const coursesAPI = {
  // Categories
  getCategories: () => api.get('/courses/categories/'),
  getCategory: (id) => api.get(`/courses/categories/${id}/`),
  createCategory: (data) => api.post('/courses/categories/', data),
  updateCategory: (id, data) => api.patch(`/courses/categories/${id}/`, data),
  deleteCategory: (id) => api.delete(`/courses/categories/${id}/`),

  // Courses
  getCourses: (params) => api.get('/courses/', { params }),
  getCourse: (id) => api.get(`/courses/${id}/`),
  createCourse: (data) => api.post('/courses/', data),
  updateCourse: (id, data) => api.patch(`/courses/${id}/`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}/`),
  getMyCourses: () => api.get('/courses/my-courses/'),

  // Lessons
  getLessons: (courseId) => api.get(`/courses/${courseId}/lessons/`),
  getLesson: (courseId, lessonId) => api.get(`/courses/${courseId}/lessons/${lessonId}/`),
  createLesson: (courseId, data) => api.post(`/courses/${courseId}/lessons/`, data),
  updateLesson: (courseId, lessonId, data) => api.patch(`/courses/${courseId}/lessons/${lessonId}/`, data),
  deleteLesson: (courseId, lessonId) => api.delete(`/courses/${courseId}/lessons/${lessonId}/`),

  // Enrollments
  getEnrollments: () => api.get('/courses/enrollments/'),
  enroll: (courseId) => api.post('/courses/enrollments/', { course: courseId }),
  getEnrollment: (id) => api.get(`/courses/enrollments/${id}/`),
  unenroll: (id) => api.delete(`/courses/enrollments/${id}/`),

  // Progress
  getLessonProgress: (courseId, lessonId) => api.get(`/courses/${courseId}/lessons/${lessonId}/progress/`),
  updateLessonProgress: (courseId, lessonId, data) => api.patch(`/courses/${courseId}/lessons/${lessonId}/progress/`, data),
  completeLesson: (courseId, lessonId) => api.post(`/courses/${courseId}/lessons/${lessonId}/complete/`),
};
