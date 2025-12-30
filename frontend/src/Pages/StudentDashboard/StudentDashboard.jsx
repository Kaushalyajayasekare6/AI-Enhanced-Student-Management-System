import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import NoticeBoard from "../../Components/NoticeBoard/NoticeBoard";
import styles from "./StudentDashboard.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const StudentDashboard = () => {
  const role = getStoredRole() || "student";
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [schoolDays, setSchoolDays] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch student data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch student attendance
        const attendanceRes = await axios.get(API_ENDPOINTS.ATTENDANCE.STUDENT, {
          headers: getAuthHeaders(),
        });
        setAttendance(attendanceRes.data?.attendance || []);
        setSchoolDays(attendanceRes.data?.schoolDays || []);
        
        if (attendanceRes.data?.student) {
          setStudent(attendanceRes.data.student);
        }

        // Fetch student marks using MY_MARKS endpoint
        const marksRes = await axios.get(API_ENDPOINTS.MARKS.MY_MARKS, {
          headers: getAuthHeaders(),
        });
        console.log("✅ Marks data:", marksRes.data);
        // Handle marks array from API response
        const marksData = marksRes.data?.marks || [];
        // Ensure it's an array
        const marksArray = Array.isArray(marksData) ? marksData : [marksData].filter(m => m);
        setMarks(marksArray);
        
      } catch (err) {
        console.error("Error fetching student data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check if a date is a holiday
  const isHoliday = (date) => {
    return schoolDays.some(
      (day) => day.date === date && !day.isSchoolDay
    );
  };

  // Calculate statistics from real data
  const stats = useMemo(() => {
    if (!student || !attendance.length) return {
      attendancePercent: 0,
      avgMarks: 0,
      riskLevel: "Low",
      presentDays: 0,
      totalSchoolDays: 0,
    };

    // Calculate attendance (excluding holidays and weekends)
    const validAttendance = attendance.filter((a) => {
      const dateObj = new Date(a.date);
      const dayOfWeek = dateObj.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      // Skip holidays
      if (isHoliday(a.date)) return false;
      return true;
    });

    const presentDays = validAttendance.filter((a) => a.status === "P").length;
    const totalSchoolDays = validAttendance.length;
    const attendancePercent = totalSchoolDays > 0 
      ? Math.round((presentDays / totalSchoolDays) * 100)
      : 0;

    // Calculate average marks
    const markValues = marks
      .map(m => {
        // Handle different mark formats from API
        if (typeof m.marks === 'object') {
          return Object.values(m.marks).map(v => Number(v)).filter(v => v > 0);
        }
        return Number(m.marks) > 0 ? [Number(m.marks)] : [];
      })
      .flat();

    const avgMarks = markValues.length > 0
      ? Math.round(markValues.reduce((a, b) => a + b, 0) / markValues.length)
      : 0;

    // Calculate risk level based on attendance and marks
    let riskLevel = "Low";
    if (attendancePercent < 60 || avgMarks < 50) {
      riskLevel = "High";
    } else if (attendancePercent < 75 || avgMarks < 60) {
      riskLevel = "Medium";
    }

    return {
      attendancePercent,
      avgMarks,
      riskLevel,
      presentDays,
      totalSchoolDays,
    };
  }, [student, attendance, marks, schoolDays]);

  const lowSubjects = useMemo(() => {
    return marks
      .filter(m => {
        const markValue = typeof m.marks === 'object' 
          ? Object.values(m.marks).map(v => Number(v)).reduce((a, b) => a + b, 0) / Object.keys(m.marks).length
          : Number(m.marks);
        return markValue < 60;
      })
      .map(m => {
        const markValue = typeof m.marks === 'object'
          ? Object.values(m.marks).map(v => Number(v)).reduce((a, b) => a + b, 0) / Object.keys(m.marks).length
          : Number(m.marks);
        return { subject: m.subject, avg: Math.round(markValue) };
      })
      .slice(0, 5);
  }, [marks]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Sidebar role={role} />
        <main className={styles.main}>
          <Header title="Student Dashboard" />
          <p>Loading dashboard...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Student Dashboard" />

        {/* Notice Board */}
        <NoticeBoard />

        {/* Top Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <div className={styles.statTitle}>Attendance</div>
            <div className={styles.statValue}>{stats.attendancePercent}%</div>
            <div className={styles.statNote}>
              {stats.totalSchoolDays > 0 
                ? `${stats.presentDays} / ${stats.totalSchoolDays} days`
                : "No records"}
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statTitle}>Average Marks</div>
            <div className={styles.statValue}>{stats.avgMarks}%</div>
            <div className={styles.statNote}>
              {marks.length > 0 ? "From all subjects" : "No marks recorded"}
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statTitle}>Dropout Risk</div>
            <div
              className={`${styles.statValue} ${
                stats.riskLevel === "High"
                  ? styles.high
                  : stats.riskLevel === "Medium"
                  ? styles.medium
                  : styles.low
              }`}
            >
              {stats.riskLevel}
            </div>
            <div className={styles.statNote}>Based on attendance & marks</div>
          </div>
        </div>

        {/* Low Marks Subjects */}
        {lowSubjects.length > 0 && (
          <div className={styles.section}>
            <h3>Subjects Needing Attention</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Average Marks</th>
                </tr>
              </thead>
              <tbody>
                {lowSubjects.map((s, i) => (
                  <tr key={i}>
                    <td>{s.subject}</td>
                    <td className={s.avg < 60 ? styles.lowMarks : ""}>
                      {s.avg}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
