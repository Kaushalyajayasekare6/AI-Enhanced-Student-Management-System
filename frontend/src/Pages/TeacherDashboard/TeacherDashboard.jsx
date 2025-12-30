import React, { useMemo, useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import NoticeBoard from "../../Components/NoticeBoard/NoticeBoard";
import styles from "./TeacherDashboard.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
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

  const getClassTeachersEndpoint = () => {
  return API_ENDPOINTS.CLASS_TEACHERS.MY_CLASS; // Simple!
};
    
  
  const getAttendanceEndpoint = () => {
    if (API_ENDPOINTS && API_ENDPOINTS.ATTENDANCE && API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS) {
      return API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS;
    }
    
    const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    return `${baseUrl}/attendance/teacher-students`;
  };

  // 1. First fetch teacher's assigned class
  useEffect(() => {
    const fetchAssignedClass = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Get the endpoint URL safely
        const endpoint = getClassTeachersEndpoint();
        console.log("🔹 [DEBUG] Using endpoint:", endpoint);
        console.log("🔹 [DEBUG] API_ENDPOINTS check:", {
          exists: !!API_ENDPOINTS,
          classTeachers: !!API_ENDPOINTS?.CLASS_TEACHERS,
          myClass: API_ENDPOINTS?.CLASS_TEACHERS?.MY_CLASS
        });
        
        const headers = getAuthHeaders();
        console.log("🔹 [DEBUG] Auth token present:", !!headers.Authorization);
        
        setDebugInfo(`Fetching from: ${endpoint}`);
        
        const classRes = await axios.get(
          endpoint,
          { 
            headers: headers,
            timeout: 10000
          }
        );
        
        console.log("✅ [DEBUG] Class response:", classRes.data);
        console.log("✅ [DEBUG] Assignment exists:", !!classRes.data.assignment);
        console.log("✅ [DEBUG] Full response:", JSON.stringify(classRes.data, null, 2));
        
        if (classRes.data.assignment) {
          setAssignedClass(classRes.data.assignment);
          setDebugInfo(`✅ Found class: Grade ${classRes.data.assignment.grade}, Section ${classRes.data.assignment.section}`);
          
          // Now fetch students for this class
          await fetchClassData(classRes.data.assignment);
        } else {
          setError("You are not assigned to any class. Please contact administrator.");
          setDebugInfo(`No assignment found. Response: ${JSON.stringify(classRes.data)}`);
        }
        
      } catch (err) {
        console.error("❌ Error fetching assigned class:", err);
        console.error("❌ Error message:", err.message);
        console.error("❌ Error response:", err.response?.data);
        console.error("❌ Error config URL:", err.config?.url);
        console.error("❌ Full error:", JSON.stringify(err.response?.data || err.message, null, 2));
        
        setDebugInfo(`Error: ${err.message}. URL: ${err.config?.url || 'Unknown URL'}. Response: ${JSON.stringify(err.response?.data || {})}`);
        
        if (err.response?.status === 404) {
          const errorData = err.response?.data;
          if (errorData?.error === "TEACHER_PROFILE_MISSING") {
            setError(
              `❌ Teacher Profile Missing: Your login account exists but your teacher profile is missing. ` +
              `This usually happens if the teacher profile was deleted. ` +
              `Please contact the administrator to: 1) Recreate your teacher profile, or 2) Relink your account. ` +
              `Your username: ${errorData.details?.username || 'unknown'}`
            );
          } else {
            setError(`You are not assigned to any class yet. Please contact administrator to assign you to a class.`);
          }
        } else if (err.code === 'ECONNREFUSED') {
          setError("Cannot connect to server. Make sure backend is running on localhost:5000");
        } else if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
        } else {
          setError(`Failed to load dashboard data: ${err.response?.data?.message || err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedClass();
  }, []);

  // 2. Fetch class data after we have the assigned class
  const fetchClassData = async (assignment) => {
    try {
      setDebugInfo(`Fetching data for class ${assignment.grade}-${assignment.section}...`);
      
      const endpoint = getAttendanceEndpoint();
      console.log("🔹 [DEBUG] Fetching students from:", endpoint);
      
      const studentsRes = await axios.get(
        endpoint,
        { 
          headers: getAuthHeaders(),
          timeout: 10000
        }
      );
      
      console.log("✅ [DEBUG] Students response:", studentsRes.data);
      setStudents(studentsRes.data.students || []);
      setDebugInfo(`✅ Found ${studentsRes.data.students?.length || 0} students`);

      // Fetch attendance for last 5 months
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      console.log("🔹 [DEBUG] Fetching attendance...");
      
      // Use BASE endpoint for attendance/class
      const attendanceBase = API_ENDPOINTS?.ATTENDANCE?.CLASS || `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/attendance/class`;
      
      const attendanceRes = await axios.get(
        attendanceBase,
        { 
          headers: getAuthHeaders(),
          params: {
            from,
            to,
            grade: assignment.grade,
            section: assignment.section,
            stream: assignment.stream || ""
          },
          timeout: 10000
        }
      );
      
      console.log("✅ [DEBUG] Attendance response:", attendanceRes.data);
      setAttendance(attendanceRes.data.attendance || []);

      // Calculate marks from students' terms
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
      
      setDebugInfo(`✅ Loaded ${attendanceRes.data.attendance?.length || 0} attendance records and ${allMarks.length} marks`);
      
    } catch (err) {
      console.error("❌ Error fetching class data:", err);
      console.error("❌ Error response:", err.response?.data);
      setError("Failed to load class data. Please try again.");
      setDebugInfo(`Failed to load class data: ${err.message}`);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalStudents = students.length;
    
    // Calculate average attendance
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

    // Calculate average marks
    const markValues = marks.map(m => m.mark).filter(m => m > 0);
    const avgMarks = markValues.length > 0
      ? Math.round(markValues.reduce((a, b) => a + b, 0) / markValues.length)
      : 0;

    // Calculate at-risk students (attendance < 70% or marks < 50)
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

    return { totalStudents, avgAttendance, avgMarks, atRisk };
  }, [students, attendance, marks]);

  // Subject performance data
  const subjectPerformance = useMemo(() => {
    const subjectMap = {};
    marks.forEach(({ subject, mark }) => {
      if (!subjectMap[subject]) {
        subjectMap[subject] = { total: 0, count: 0 };
      }
      subjectMap[subject].total += mark;
      subjectMap[subject].count += 1;
    });

    return Object.entries(subjectMap)
      .map(([subject, { total, count }]) => ({
        subject,
        avg: Math.round(total / count),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [marks]);

  // Attendance trend (last 5 months)
  const attendanceTrend = useMemo(() => {
    const monthMap = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    attendance.forEach(a => {
      const date = new Date(a.date);
      const monthKey = `${monthNames[date.getMonth()]}`;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { present: 0, total: 0 };
      }
      monthMap[monthKey].total += 1;
      if (a.status === "P") monthMap[monthKey].present += 1;
    });

    return Object.entries(monthMap)
      .map(([month, { present, total }]) => ({
        month,
        percent: total > 0 ? Math.round((present / total) * 100) : 0,
      }))
      .slice(-5);
  }, [attendance]);

  // Risk distribution
  const riskDistribution = useMemo(() => {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const recentAttendance = attendance.filter(a => {
      const date = new Date(a.date);
      return date >= monthAgo;
    });

    const riskCounts = { Low: 0, Medium: 0, High: 0 };
    
    students.forEach(s => {
      const studentAttendance = recentAttendance.filter(a => a.studentId === s._id);
      const present = studentAttendance.filter(a => a.status === "P").length;
      const attendancePercent = studentAttendance.length > 0
        ? (present / studentAttendance.length) * 100
        : 100;

      if (attendancePercent < 60) {
        riskCounts.High += 1;
      } else if (attendancePercent < 75) {
        riskCounts.Medium += 1;
      } else {
        riskCounts.Low += 1;
      }
    });

    return [
      { name: "Low", value: riskCounts.Low },
      { name: "Medium", value: riskCounts.Medium },
      { name: "High", value: riskCounts.High },
    ];
  }, [students, attendance]);
  
  // summary cards
  const cards = useMemo(
    () => [
      { title: "Students", value: stats.totalStudents, subtitle: "Total in your classes" },
      { title: "Avg Attendance", value: `${stats.avgAttendance}%`, subtitle: "Last month" },
      { title: "Avg Marks", value: `${stats.avgMarks}%`, subtitle: "Class average" },
      { title: "At-Risk", value: stats.atRisk, subtitle: "Need intervention" },
    ],
    [stats]
  );

  const notices = [
    { id: 1, title: "Parents meeting", date: "2025-06-06" },
    { id: 2, title: "Exam schedule released", date: "2025-05-28" },
  ];

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <Sidebar role={role} />
        <main className={styles.main}>
          <Header title="Teacher Dashboard" />
          <div className={styles.loadingMessage}>
            <p>Loading your dashboard...</p>
            {debugInfo && <p className={styles.debugInfo}>{debugInfo}</p>}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <Sidebar role={role} />
        <main className={styles.main}>
          <Header title="Teacher Dashboard" />
          <div className={styles.errorContainer}>
            <h2 className={styles.title}>Teacher Dashboard</h2>
            <div className={styles.errorCard}>
              <h3>⚠️ Dashboard Error</h3>
              <p>{error}</p>
              {debugInfo && (
                <div className={styles.debugInfo}>
                  <p><strong>Debug Info:</strong> {debugInfo}</p>
                </div>
              )}
              <div className={styles.troubleshooting}>
                <h4>Troubleshooting Steps:</h4>
                <ol>
                  <li>Make sure backend server is running on port 5000</li>
                  <li>Check if you have a valid JWT token in localStorage</li>
                  <li>Verify the teacher is assigned to a class in database</li>
                  <li>Check browser console for detailed error messages</li>
                  <li>Make sure your .env file has: REACT_APP_API_URL=http://localhost:5000/api</li>
                </ol>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Teacher Dashboard" />
        
        {/* Show assigned class info at the top */}
        {assignedClass && (
          <div className={styles.classHeader}>
            <h1 className={styles.title}>
              Teacher Dashboard - Grade {assignedClass.grade} - Section {assignedClass.section}
              {assignedClass.stream && ` (${assignedClass.stream})`}
            </h1>
            <p className={styles.subtitle}>Overview of your assigned class</p>
            {debugInfo && <p className={styles.debugInfoSmall}>{debugInfo}</p>}
          </div>
        )}

        {/* Notice Board */}
        <NoticeBoard />

        <div className={styles.cardRow}>
          {cards.map((c) => (
            <div key={c.title} className={styles.statCard}>
              <div className={styles.cardTitle}>{c.title}</div>
              <div className={styles.cardValue}>{c.value}</div>
              <div className={styles.cardSub}>{c.subtitle}</div>
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {subjectPerformance.length > 0 ? (
            <section className={styles.chartCard}>
              <h3>Subject Performance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subjectPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="subject" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          ) : (
            <section className={styles.chartCard}>
              <h3>Subject Performance</h3>
              <div className={styles.noData}>
                <p>No marks data available yet</p>
              </div>
            </section>
          )}

          {attendanceTrend.length > 0 ? (
            <section className={styles.chartCard}>
              <h3>Attendance Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="percent" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          ) : (
            <section className={styles.chartCard}>
              <h3>Attendance Trend</h3>
              <div className={styles.noData}>
                <p>No attendance data available yet</p>
              </div>
            </section>
          )}

          {riskDistribution.some(r => r.value > 0) ? (
            <section className={styles.pieCard}>
              <h3>Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </section>
          ) : (
            <section className={styles.pieCard}>
              <h3>Risk Distribution</h3>
              <div className={styles.noData}>
                <p>No risk assessment data available</p>
              </div>
            </section>
          )}

          <section className={styles.notices}>
            <h3>Recent Notices</h3>
            <ul>
              {notices.map((n) => (
                <li key={n.id}>
                  <strong>{n.title}</strong>
                  <div className={styles.noticeDate}>{n.date}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;