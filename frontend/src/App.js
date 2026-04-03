// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute';
import Login from "./Pages/Login/Login";
import Role from "./Pages/Role/Role";
import StudentDashboard from "./Pages/StudentDashboard/StudentDashboard";
import AddStudentPage from "./Pages/AddStudentPage/AddStudentPage";
import AddTeacherPage from "./Pages/AddTeacherPage/AddTeacherPage";
import StudentTimetablePage from "./Pages/StudentTimetablePage/StudentTimetablePage";
import StudentMarksPage from "./Pages/StudentMarksPage/StudentMarksPage";
import DropoutRiskPage from "./Pages/DropoutRiskPage/DropoutRiskPage";
import TeacherDashboard from "./Pages/TeacherDashboard/TeacherDashboard";
import TeacherTimetablePage from "./Pages/TeacherTimetablePage/TeacherTimetablePage";
import TeacherMarksPage from "./Pages/TeacherMarksPage/TeacherMarksPage";
import TeacherAttendancePage from "./Pages/TeacherAttendancePage/TeacherAttendancePage";
import TeacherAtRiskStudentsPage from "./Pages/TeacherAtRiskStudentsPage/TeacherAtRiskStudentsPage";
import StudentDetailsPage from "./Pages/StudentDetailsPage/StudentDetailsPage";
import AdminDashboard from "./Pages/AdminDashboard/AdminDashboard";
import AdminReportsPage from "./Pages/AdminReportsPage/AdminReportsPage";
import AllStudents from "./Pages/AllStudents/AllStudents";
import LeavedStudents from "./Pages/LeavedStudents/LeavedStudents";
import ActiveTeachers from "./Pages/ActiveTeachers/ActiveTeachers";
import LeavedTeachers from "./Pages/LeavedTeachers/LeavedTeachers";
import NoticeManagement from "./Pages/NoticeManagement/NoticeManagement";
import TimetableCreation from "./Pages/TimetableCreation/TimetableCreation";
import OtherWorkerDetailsPage from "./Pages/OtherWorkerDetailsPage/OtherWorkerDetailsPage";
import AddOtherWorkerPage from "./Pages/AddOtherWorkerPage/AddOtherWorkerPage";
import ProfilePage from "./Pages/ProfilePage/ProfilePage";
import AttendancePage from "./Pages/AttendancePage/AttendancePage";
import TeacherProfilePage from "./Pages/TeacherProfilePage/TeacherProfilePage";
import TeacherClassStudentsPage from "./Pages/TeacherClassStudentsPage/TeacherClassStudentsPage";
import StudentOverviewPage from "./Pages/StudentOverviewPage/StudentOverviewPage";
import AdminAssignClassTeachers from "./Pages/AdminAssignClassTeachers/AdminAssignClassTeachers";
import AdminSchoolDays from "./Pages/AdminSchoolDays/AdminSchoolDays";
import AdminTimetableCreation from "./Pages/AdminTimetableCreation/AdminTimetableCreation";
import StudentCalendar from "./Pages/StudentCalendar/StudentCalendar";

import axios from "axios";
import { LayoutProvider } from './contexts/LayoutContext';

export const predictMarks = (data) => {
  return axios.post(
    "http://localhost:5000/api/ml/predict-marks",
    data
  );
};

export const predictTermMarks = (data) => {
  return axios.post(
    "http://localhost:5000/api/ml/predict-term-marks",
    data
  );
};

export const predictDropoutRisk = (data) => {
  return axios.post(
    "http://localhost:5000/api/ml/predict-dropout",
    data
  );
};


function App() {
  return (
    <LayoutProvider>
      <Router>
        <div className="app">
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/role" element={<Role />} />
          
          {/* Student Routes */}
          <Route 
            path="/StudentDashboard" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/StudentTimetablePage" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentTimetablePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/StudentMarksPage" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentMarksPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ProfilePage" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/StudentOverviewPage" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentOverviewPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Teacher Routes */}
          <Route 
            path="/TeacherDashboard" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/TeacherTimetablePage" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherTimetablePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/TeacherMarksPage" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherMarksPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/TeacherAttendancePage" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherAttendancePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/TeacherAtRiskStudentsPage" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherAtRiskStudentsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/TeacherProfilePage" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/TeacherClassStudentsPage" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherClassStudentsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/students/:id" 
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <StudentOverviewPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/AdminDashboard" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AddStudentPage" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AddStudentPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AddTeacherPage" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AddTeacherPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AllStudents" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AllStudents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AdminReportsPage" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminReportsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/LeavedStudents" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <LeavedStudents />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ActiveTeachers" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ActiveTeachers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/LeavedTeachers" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <LeavedTeachers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/NoticeManagement" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <NoticeManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/TimetableCreation" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <TimetableCreation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/OtherWorkerDetailsPage" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <OtherWorkerDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AddOtherWorkerPage" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AddOtherWorkerPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AttendancePage" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <AttendancePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/StudentCalendar" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentCalendar />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/StudentDetailsPage" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <StudentDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/DropoutRiskPage" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <DropoutRiskPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AdminAssignClassTeachers" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAssignClassTeachers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AdminSchoolDays" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminSchoolDays />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/AdminTimetableCreation" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminTimetableCreation />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
    </LayoutProvider>
  );
}



export default App;

//cd models/Dropout && uvicorn app:app --reload --port 8001