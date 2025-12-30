import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TeacherAttendancePage.module.css";
import axios from "axios";
import { getStoredRole } from "../../utils/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// (Removed mock data helpers) Real data is fetched from the API.

const buildChartData = (records, dates, schoolDays = {}, students = []) => {
  // If no records, show zeroed datapoints for school days
  if (!records || Object.keys(records).length === 0) {
    const totalStudents = students.length || 0;
    return dates
      .map((d) => {
        const schoolDay = schoolDays[d];
        const dayOfWeek = new Date(d).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isSchoolDay = schoolDay ? schoolDay.isSchoolDay : !isWeekend;
        if (!isSchoolDay) return null;
        return { date: d.slice(5), percent: 0 };
      })
      .filter((item) => item !== null);
  }
  
  // Get total students count
  const totalStudents = students.length || Object.keys(records).length;
  
  return dates.map((d) => {
    // Check if this is a school day
    const schoolDay = schoolDays[d];
    const dayOfWeek = new Date(d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isSchoolDay = schoolDay ? schoolDay.isSchoolDay : !isWeekend;
    
    if (!isSchoolDay) {
      // Skip holidays - don't include in chart data
      return null;
    }
    
    // Count students present on this day
    const presentCount = Object.keys(records).reduce(
      (acc, sid) => acc + (records[sid]?.[d] === "P" ? 1 : 0),
      0
    );
    
    return {
      date: d.slice(5),
      percent: totalStudents ? Math.round((presentCount / totalStudents) * 100) : 0,
    };
  }).filter(item => item !== null); // Remove null entries for holidays
};

const TeacherAttendancePage = () => {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [range, setRange] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [schoolDays, setSchoolDays] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState("table"); // "table" or "calendar"
  const role = getStoredRole() || "teacher";

  const today = new Date();

  // Generate date range for chart and table
  const generateDates = () => {
    const dates = [];
    if (range === "week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
    } else if (range === "month") {
      const year = today.getFullYear(),
        month = today.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= days; i++) {
        const d = new Date(year, month, i);
        dates.push(d.toISOString().slice(0, 10));
      }
    } else {
      if (!customFrom || !customTo) return [];
      const start = new Date(customFrom),
        end = new Date(customTo);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().slice(0, 10));
      }
    }
    return dates;
  };

  const dates = generateDates();

  // 🔹 Fetch students of this teacher's class
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS, {
        headers: getAuthHeaders(),
      });

      console.log("🔹 [DEBUG] TEACHER_STUDENTS Response:", res.data);
      setStudents(res.data?.students || []);
    } catch (err) {
      console.error("❌ [DEBUG] Error fetching students:", err.message);
      console.error("❌ [DEBUG] Error response:", err.response?.data);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch attendance records for this class
  const fetchAttendance = useCallback(async () => {
    try {
      const dates = generateDates();
      if (dates.length === 0) return;
      
      const from = dates[0];
      const to = dates[dates.length - 1];
      
      console.log("🔹 [DEBUG] Fetching attendance from", from, "to", to);
      console.log("🔹 [DEBUG] Using endpoint:", `${API_ENDPOINTS.ATTENDANCE.CLASS}?from=${from}&to=${to}`);

      const res = await axios.get(
        `${API_ENDPOINTS.ATTENDANCE.CLASS}?from=${from}&to=${to}`,
        { headers: getAuthHeaders() }
      );

      console.log("✅ [DEBUG] Attendance response:", res.data);

      // Support both shapes: array (legacy) or { attendance, students }
      const attendanceArray = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.attendance)
        ? res.data.attendance
        : [];

      if (attendanceArray.length > 0) {
        // Filter attendance for students in this class
        const studentIds = new Set(students.map((s) => s._id));
        const classAttendance = attendanceArray.filter((a) => studentIds.has(a.studentId));

        console.log("✅ [DEBUG] Found", classAttendance.length, "attendance records for class");

        const grouped = {};
        classAttendance.forEach((a) => {
          if (!grouped[a.studentId]) grouped[a.studentId] = {};
          grouped[a.studentId][a.date] = a.status;
        });

        console.log("✅ [DEBUG] Grouped records:", grouped);
        setRecords(grouped);
      } else {
        // No attendance - set empty records
        console.log("📝 [DEBUG] No attendance data from API");
        setRecords({});
      }
    } catch (err) {
      console.error("❌ [DEBUG] Error fetching attendance:", err.message);
      console.error("❌ [DEBUG] Error response:", err.response?.data);
      // On error, clear records
      console.log("📝 [DEBUG] Clearing attendance records due to API error");
      setRecords({});
    }
  }, [range, customFrom, customTo, students]);

  // 🔹 Fetch school days for calendar view
  const fetchSchoolDays = useCallback(async () => {
    try {
      const dates = generateDates();
      if (dates.length === 0) return;
      
      const from = dates[0];
      const to = dates[dates.length - 1];
      const res = await axios.get(
        `${API_ENDPOINTS.SCHOOL_DAYS.BASE}?from=${from}&to=${to}`,
        { headers: getAuthHeaders() }
      );

      const daysMap = {};
      res.data.forEach((day) => {
        daysMap[day.date] = day;
      });
      setSchoolDays(daysMap);
    } catch (error) {
      console.error("Error fetching school days:", error);
    }
  }, [range, customFrom, customTo]);

  // 🔹 Refresh school days periodically (every 30 seconds) to sync with admin updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === "calendar") {
        fetchSchoolDays();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [viewMode, fetchSchoolDays]);

  // 🔹 On first load
  useEffect(() => {
    fetchStudents();
  }, []);

  // 🔹 Fetch school days when date range changes
  useEffect(() => {
    fetchSchoolDays();
  }, [fetchSchoolDays]);

  // 🔹 Refetch attendance whenever date range changes
  useEffect(() => {
    if (students.length) fetchAttendance();
  }, [students, fetchAttendance]);

  const filteredStudents = students.filter((s) => {
    const studentName = s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "";
    return studentName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const chartData = buildChartData(records, dates, schoolDays, students);

  // 🔹 Toggle attendance locally + send to backend
  const toggleRecord = async (studentId, date) => {
    // Calculate next status first (toggle between P and A only)
    const current = records[studentId]?.[date];
    const next = current === "P" ? "A" : "P";

    // Optimistic update: save previous state to revert on failure
    const prevRecords = records;
    setRecords((prev) => {
      const studentRecords = { ...(prev[studentId] || {}) };
      studentRecords[date] = next;
      return { ...prev, [studentId]: studentRecords };
    });

    try {
      await axios.post(
        API_ENDPOINTS.ATTENDANCE.MARK,
        {
          date,
          records: { [studentId]: next },
        },
        { headers: getAuthHeaders() }
      );
    } catch (err) {
      console.error("Failed to save attendance:", err.message);
      alert("Failed to save attendance. Reverting change.");
      setRecords(prevRecords);
    }
  };

  const exportCSV = () => {
    const header = ["Student", ...dates];
    const rows = filteredStudents.map((s) => {
      const row = [s.name, ...dates.map((d) => records[s._id]?.[d] ?? "")];
      return row;
    });
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${range}_real.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🔹 Generate calendar view
  const generateCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const calendar = [];
    
    // Header
    calendar.push(
      <div key="header" className={styles.calendarHeader}>
        {weekDays.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>
    );

    const days = [];
    // Empty cells
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarDayCell}></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const schoolDay = schoolDays[dateString];
      const isSchoolDay = schoolDay ? schoolDay.isSchoolDay : !isWeekend;
      const isSelected = dateString === selectedDate;
      const isToday = dateString === today.toISOString().slice(0, 10);

      // Count attendance for this date
      const attendanceCount = Object.keys(records).reduce((acc, sid) => {
        return acc + (records[sid]?.[dateString] === "P" ? 1 : 0);
      }, 0);
      const totalStudents = students.length;
      const attendancePercent = totalStudents > 0 ? Math.round((attendanceCount / totalStudents) * 100) : 0;

      days.push(
        <div
          key={day}
          className={`${styles.calendarDayCell} ${
            isSchoolDay ? styles.schoolDay : styles.holiday
          } ${isSelected ? styles.selected : ""} ${isToday ? styles.today : ""}`}
          onClick={() => {
            setSelectedDate(dateString);
            setViewMode("table");
            // Scroll to table
            setTimeout(() => {
              const tableElement = document.querySelector(`[data-date="${dateString}"]`);
              if (tableElement) {
                tableElement.scrollIntoView({ behavior: "smooth", block: "center" });
                tableElement.style.backgroundColor = "#fef3c7";
                setTimeout(() => {
                  tableElement.style.backgroundColor = "";
                }, 2000);
              }
            }, 100);
          }}
          title={`${dateString} - ${isSchoolDay ? "School Day" : "Holiday"} - ${attendancePercent}% present`}
        >
          <div className={styles.calendarDayNumber}>{day}</div>
          {isSchoolDay && (
            <div className={styles.calendarDayAttendance}>
              {attendancePercent}%
            </div>
          )}
          {!isSchoolDay && (
            <div className={styles.calendarDayStatus}>✗</div>
          )}
        </div>
      );
    }

    // Group into weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(
        <div key={`week-${i}`} className={styles.calendarWeek}>
          {days.slice(i, i + 7)}
        </div>
      );
    }

    calendar.push(...weeks);
    return calendar;
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header />
        <h1 className={styles.title}>Manage Attendance</h1>
        <p className={styles.subtitle}></p>

        <div className={styles.controls}>
          <div className={styles.left}>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewButton} ${viewMode === "calendar" ? styles.active : ""}`}
                onClick={() => setViewMode("calendar")}
              >
                📅 Calendar
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === "table" ? styles.active : ""}`}
                onClick={() => setViewMode("table")}
              >
                📊 Table
              </button>
            </div>
            <label>
              <input
                type="radio"
                checked={range === "week"}
                onChange={() => setRange("week")}
              />{" "}
              Week
            </label>
            <label>
              <input
                type="radio"
                checked={range === "month"}
                onChange={() => setRange("month")}
              />{" "}
              Month
            </label>
            <label>
              <input
                type="radio"
                checked={range === "custom"}
                onChange={() => setRange("custom")}
              />{" "}
              Custom
            </label>
            {range === "custom" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </>
            )}
          </div>

          <div className={styles.right}>
            <input
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className={styles.export} onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>

        {viewMode === "calendar" && (
          <div className={styles.calendarContainer}>
            <h3 className={styles.calendarTitle}>School Calendar - Click a date to mark attendance</h3>
            <div className={styles.calendar}>{generateCalendar()}</div>
            <div className={styles.calendarLegend}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.schoolDay}`}></div>
                <span>School Day</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.holiday}`}></div>
                <span>Holiday</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.selected}`}></div>
                <span>Selected Date</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.today}`}></div>
                <span>Today</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.chartCard}>
          <h4>Class Presence Trend</h4>
          {chartData && chartData.length > 0 && (
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "5px 0" }}>
              Data points: {chartData.length} | All values: {chartData.map(d => d.percent).join(", ")}%
            </p>
          )}
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis 
                domain={[0, 100]} 
                ticks={[0, 25, 50, 75, 100]}
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                label={{ value: "Attendance %", angle: -90, position: "insideLeft" }}
              />
              <Tooltip 
                formatter={(value) => value !== null ? [`${value}%`, "Attendance"] : ["Holiday", "Status"]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #4b5563",
                  borderRadius: "8px",
                  color: "#f3f4f6",
                  padding: "8px"
                }}
              />
              <Line
                type="linear"
                dataKey="percent"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5, fill: "#3b82f6" }}
                activeDot={{ r: 7, fill: "#1e40af" }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                {dates.map((d) => (
                  <th key={d}>{d.slice(5)}</th>
                ))}
                <th>Present %</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const rec = records[s._id] || {};
                
                // Count only school days (not holidays)
                let totalSchoolDays = 0;
                let presentCount = 0;
                
                dates.forEach((d) => {
                  const schoolDay = schoolDays[d];
                  const dayOfWeek = new Date(d).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isSchoolDay = schoolDay ? schoolDay.isSchoolDay : !isWeekend;
                  
                  if (isSchoolDay) {
                    totalSchoolDays++;
                    if (rec[d] === "P") presentCount++;
                  }
                });
                
                const percent = totalSchoolDays > 0 ? Math.round((presentCount / totalSchoolDays) * 100) : 0;
                return (
                  <tr key={s._id}>
                    <td className={styles.studentName}>
                      {s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim()}
                    </td>
                    {dates.map((d) => {
                      const schoolDay = schoolDays[d];
                      const dayOfWeek = new Date(d).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const isSchoolDay = schoolDay ? schoolDay.isSchoolDay : !isWeekend;
                      
                      return (
                        <td 
                          key={d} 
                          data-date={d}
                          className={!isSchoolDay ? styles.holidayCell : ""}
                        >
                          <button
                            className={`${styles.badge} ${
                              rec[d] === "P"
                                ? styles.present
                                : styles.absent
                            } ${!isSchoolDay ? styles.disabled : ""}`}
                            onClick={() => isSchoolDay && toggleRecord(s._id, d)}
                            disabled={!isSchoolDay}
                            title={
                              !isSchoolDay 
                                ? "Holiday - No attendance marking" 
                                : `Click to toggle: ${rec[d] || "-"} → ${rec[d] === "P" ? "A" : "P"}`
                            }
                          >
                            {rec[d] || (isSchoolDay ? "-" : "H")}
                          </button>
                        </td>
                      );
                    })}
                    <td className={styles.percentCell}>
                      {percent}%
                      <div className={styles.percentageBar}>
                        <div
                          className={styles.percentageFill}
                          style={{ 
                            width: `${percent}%`,
                            backgroundColor: percent >= 80 ? "#10b981" : 
                                           percent >= 60 ? "#f59e0b" : "#ef4444"
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredStudents.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
              No students found matching "{searchQuery}"
            </div>
          )}
        </div>
        
        {/* Mock info removed - using real API data only */}
      </main>
    </div>
  );
};

export default TeacherAttendancePage;