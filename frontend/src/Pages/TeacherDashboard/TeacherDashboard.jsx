import React, { useMemo, useState, useCallback, useEffect } from "react";
import TeacherLayout from "../../Components/TeacherLayout/TeacherLayout";
import NoticeBoard from "../../Components/NoticeBoard/NoticeBoard";
import styles from "./TeacherDashboard.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

const TeacherDashboard = () => {
  const role = getStoredRole() || "teacher";
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedClass, setAssignedClass] = useState(null);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [modelRiskDistribution, setModelRiskDistribution] = useState([]);

  const getClassTeachersEndpoint = () => {
    return API_ENDPOINTS.CLASS_TEACHERS.MY_CLASS;
  };
    
  const getAttendanceEndpoint = () => {
    if (API_ENDPOINTS?.ATTENDANCE?.TEACHER_STUDENTS) {
      return API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS;
    }
    const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    return `${baseUrl}/attendance/teacher-students`;
  };

  const fetchClassData = useCallback(async (assignment) => {
    try {
      setDebugInfo(`Fetching data for class ${assignment.grade}-${assignment.section}...`);
      
      const endpoint = getAttendanceEndpoint();
      const studentsRes = await axios.get(endpoint, { 
        headers: getAuthHeaders(),
        timeout: 10000
      });
      
      setStudents(studentsRes.data.students || []);

      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      const attendanceBase = API_ENDPOINTS?.ATTENDANCE?.CLASS || `http://localhost:5000/api/attendance/class`;
      
      const attendanceRes = await axios.get(attendanceBase, { 
        headers: getAuthHeaders(),
        params: {
          from,
          to,
          grade: assignment.grade,
          section: assignment.section,
          stream: assignment.stream || ""
        },
        timeout: 10000
      });
      
      setAttendance(attendanceRes.data.attendance || []);

      const currentYear = today.getFullYear();
      const allMarks = [];
      (studentsRes.data.students || []).forEach(student => {
        student.terms?.forEach(term => {
          if (term.year === currentYear && term.marks) {
            Object.entries(term.marks).forEach(([subject, mark]) => {
              allMarks.push({ subject, mark: Number(mark) });
            });
          }
        });
      });
      setMarks(allMarks);

      try {
        const modelQuery = `grade=${assignment.grade}&section=${assignment.section}${assignment.stream ? `&stream=${assignment.stream}` : ""}`;
        const mlRes = await axios.get(`${API_ENDPOINTS.ML.PREDICT_DROPOUT_CLASS}?${modelQuery}`, { headers: getAuthHeaders() });

        if (mlRes.data?.success) {
          const mlData = Array.isArray(mlRes.data.data) ? mlRes.data.data : [];
          const highCount = mlData.filter((x) => (x.riskLevel || x.prediction?.risk_level || "").toLowerCase().includes("high")).length;
          const medCount = mlData.filter((x) => (x.riskLevel || x.prediction?.risk_level || "").toLowerCase().includes("medium")).length;
          const lowCount = mlData.filter((x) => (x.riskLevel || x.prediction?.risk_level || "").toLowerCase().includes("low")).length;
          setModelRiskDistribution([
            { name: "Low", value: lowCount },
            { name: "Medium", value: medCount },
            { name: "High", value: highCount },
          ]);
        }
      } catch (mlErr) {
        console.warn("ML data unavailable:", mlErr.message);
      }

    } catch (err) {
      console.error("❌ Class data error:", err);
      setError("Failed to load class data.");
    }
  }, []);

  useEffect(() => {
    const fetchAssignedClass = async () => {
      try {
        setLoading(true);
        setError("");
        
        const endpoint = getClassTeachersEndpoint();
        console.log("🔹 Using endpoint:", endpoint);
        
        const headers = getAuthHeaders();
        
        setDebugInfo(`Fetching from: ${endpoint}`);
        
        const classRes = await axios.get(endpoint, { 
          headers: headers,
          timeout: 10000
        });
        
        if (classRes.data.assignment) {
          setAssignedClass(classRes.data.assignment);
          setDebugInfo(`✅ Found class: Grade ${classRes.data.assignment.grade}, Section ${classRes.data.assignment.section}`);
          
          fetchClassData(classRes.data.assignment);
        } else {
          setError("You are not assigned to any class. Please contact administrator.");
          setDebugInfo("No assignment found.");
        }
        
      } catch (err) {
        console.error("❌ Error fetching assigned class:", err);
        
        setDebugInfo(`Error: ${err.message}`);
        
        if (err.response?.status === 404 && err.response?.data?.error === "TEACHER_PROFILE_MISSING") {
          setError(
            `Teacher Profile Missing: Please contact administrator. Username: ${err.response.data.details?.username || 'unknown'}.`
          );
        } else if (err.code === 'ECONNREFUSED') {
          setError("Backend not running. Start 'cd backend && node server.js'");
        } else if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
        } else {
          setError(`Failed to load: ${err.response?.data?.message || err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedClass();
  }, [fetchClassData]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    
    const attendanceRecords = attendance.filter(a => {
      const date = new Date(a.date);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    });
    const presentCount = attendanceRecords.filter(a => a.status === "P").length;
    const avgAttendance = attendanceRecords.length > 0 
      ? Math.round((presentCount / attendanceRecords.length) * 100) 
      : 0;

    const markValues = marks.map(m => m.mark).filter(m => m > 0);
    const avgMarks = markValues.length > 0
      ? Math.round(markValues.reduce((a, b) => a + b, 0) / markValues.length)
      : 0;

    const atRisk = students.filter(s => {
      const studentAttendance = attendanceRecords.filter(a => a.studentId === s._id);
      const studentPresent = studentAttendance.filter(a => a.status === "P").length;
      const studentAttendancePercent = studentAttendance.length > 0
        ? (studentPresent / studentAttendance.length) * 100
        : 100;
      
      const studentMarks = marks.filter(m => {
        const term = s.terms?.find(t => t.year === new Date().getFullYear());
        return term?.marks && Object.keys(term.marks).some(subj => subj === m.subject);
      });
      const studentAvgMarks = studentMarks.length > 0
        ? studentMarks.reduce((a, b) => a + b.mark, 0) / studentMarks.length
        : 100;

      return studentAttendancePercent < 70 || studentAvgMarks < 50;
    }).length;

    const highRisk = modelRiskDistribution.find(d => d.name === 'High')?.value || 0;
    return { totalStudents, avgAttendance, avgMarks, atRisk, highRisk };
  }, [students, attendance, marks, modelRiskDistribution]);

  const subjectPerformance = useMemo(() => {
    const subjectMap = {};
    marks.forEach(({ subject, mark }) => {
      if (!subjectMap[subject]) {
        subjectMap[subject] = { total: 0, count: 0 };
      }
      subjectMap[subject].total += mark;
      subjectMap[subject].count++;
    });

    return Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      average: Math.round(data.total / data.count),
    })).sort((a, b) => b.average - a.average).slice(0, 5);
  }, [marks]);

  if (loading) return <div className={styles.loading}>Loading dashboard...</div>;

  return (
    <TeacherLayout title="Teacher Dashboard" role={role}>
      <div className={styles.dashboard}>
        {error && (
          <div className={styles.error}>
            <h3>⚠️ {error}</h3>
            <details>
              <summary>Debug</summary>
              <pre>{debugInfo}</pre>
            </details>
          </div>
        )}

        {assignedClass && (
          <div className={styles.classInfo}>
            <h2>Class: Grade {assignedClass.grade} - {assignedClass.section}{assignedClass.stream ? ` (${assignedClass.stream})` : ""}</h2>
          </div>
        )}

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Total Students</h3>
            <div className={styles.statNumber}>{stats.totalStudents}</div>
          </div>
          <div className={styles.statCard}>
            <h3>Avg Attendance</h3>
            <div className={styles.statNumber}>{stats.avgAttendance}%</div>
          </div>
          <div className={styles.statCard}>
            <h3>Avg Marks</h3>
            <div className={styles.statNumber}>{stats.avgMarks}%</div>
          </div>
          <div className={styles.statCard} style={{ '--card-accent': '#ef4444', '--card-accent-end': '#dc2626' }}>
            <h3>ML High Risk</h3>
            <div className={styles.statNumber}>{stats.highRisk}</div>
            <span className={styles.statLink} onClick={() => window.location.href='/TeacherAtRiskStudentsPage'}>View All →</span>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3>Subject Performance (Top 5)</h3>
            {subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No marks data</p>
            )}
          </div>

          {modelRiskDistribution.length > 0 && (
            <div className={styles.chartCard}>
              <h3>Dropout Risk</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={modelRiskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {modelRiskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <NoticeBoard />
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;

