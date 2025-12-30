// src/config/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
  },
  STUDENTS: {
    BASE: `${API_BASE_URL}/students`,
    BY_ID: (id) => `${API_BASE_URL}/students/${id}`,
    LEAVED: `${API_BASE_URL}/students/leaved`,
    ME: `${API_BASE_URL}/students/me`,
    BY_CLASS: `${API_BASE_URL}/students/by-class`,
    AUTO_UPDATE_CLASSES: `${API_BASE_URL}/students/auto-update-classes`,
  },
  TEACHERS: {
    BASE: `${API_BASE_URL}/teachers`,
    BY_ID: (id) => `${API_BASE_URL}/teachers/${id}`,
    ME: `${API_BASE_URL}/teachers/me`,
    FILTER: (type) => `${API_BASE_URL}/teachers/filter/${type}`,
  },
  ATTENDANCE: {
    BASE: `${API_BASE_URL}/attendance`,
    TEACHER_STUDENTS: `${API_BASE_URL}/attendance/teacher-students`,
    MARK: `${API_BASE_URL}/attendance/mark`,
    MARK_STUDENT: `${API_BASE_URL}/attendance/mark-student`,
    CLASS: `${API_BASE_URL}/attendance/class`,
    STUDENT: `${API_BASE_URL}/attendance/student`,
  },
  CLASS_TEACHERS: {
    BASE: `${API_BASE_URL}/class-teachers`,
    MY_CLASS: `${API_BASE_URL}/class-teachers/my-class`,
    ASSIGN: `${API_BASE_URL}/class-teachers`,
  },
  WORKERS: {
    BASE: `${API_BASE_URL}/workers`,
    BY_ID: (id) => `${API_BASE_URL}/workers/${id}`,
  },
  MARKS: {
    BASE: `${API_BASE_URL}/marks`,
    UPSERT: `${API_BASE_URL}/marks/upsert`,
    STUDENT: `${API_BASE_URL}/marks/student`,
    TEACHER_CLASS: `${API_BASE_URL}/marks/teacher-class`,
    ALL: `${API_BASE_URL}/marks/all`,
    MY_MARKS: `${API_BASE_URL}/marks/my-marks`,
  },
  TIMETABLE: {
    BASE: `${API_BASE_URL}/timetable`,
    GENERATE: `${API_BASE_URL}/timetable/generate`,
    SUGGESTIONS: `${API_BASE_URL}/timetable/suggestions`,
    GET: `${API_BASE_URL}/timetable/class`,
    CLASS: `${API_BASE_URL}/timetable/class`,
    TEACHER: `${API_BASE_URL}/timetable/teacher`,
    STUDENT: `${API_BASE_URL}/timetable/student`,
    ALL: `${API_BASE_URL}/timetable/all`,
    UPDATE: `${API_BASE_URL}/timetable`,
    DELETE: `${API_BASE_URL}/timetable`,
  },
  SCHOOL_DAYS: {
    BASE: `${API_BASE_URL}/school-days`,
    BY_DATE: (date) => `${API_BASE_URL}/school-days/${date}`,
    BULK: `${API_BASE_URL}/school-days/bulk`,
  },
  NOTICES: {
    BASE: `${API_BASE_URL}/notices`,
    BY_ID: (id) => `${API_BASE_URL}/notices/${id}`,
  },
  ML: {
    PREDICT_MARKS: `${API_BASE_URL}/ml/predict-marks`,
    PREDICT_DROPOUT: `${API_BASE_URL}/ml/predict-dropout`,
  },
};
export const getAuthToken = () => {
  return localStorage.getItem("token");
};

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export default API_BASE_URL;