import React, { useState, useMemo, useEffect } from "react";
import StudentLayout from "../../Components/StudentLayout/StudentLayout";
import styles from "./AttendancePage.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
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

const AttendancePage = () => {
  const [range, setRange] = useState("month");
  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [schoolDays, setSchoolDays] = useState([]);

  const role = getStoredRole() || "student";

  // Fetch student's attendance records
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.ATTENDANCE.STUDENT, {
        headers: getAuthHeaders(),
      });
      console.log("✅ Student attendance:", res.data);
      setAttendance(res.data?.attendance || []);
      setSchoolDays(res.data?.schoolDays || []);
    } catch (err) {
      console.error("❌ Error fetching attendance:", err);
      setAttendance([]);
      setSchoolDays([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance on component mount
  useEffect(() => {
    if (role === "student") {
      fetchAttendance();
    }
  }, [role]);

  // Check if a date is a holiday
  const isHoliday = (date) => {
    return schoolDays.some(
      (day) => day.date === date && !day.isSchoolDay
    );
  };

  // Build chart data based on range (week or month)
  const buildChartData = () => {
    if (!attendance || attendance.length === 0) {
      return [];
    }

    const today = new Date();
    let dates = [];

    if (range === "week") {
      // Get last 7 days, but only include Monday-Friday
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayOfWeek = d.getDay();
        
        // Skip Saturdays (6) and Sundays (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(d.toISOString().split('T')[0]);
        }
      }
    } else {
      // Monthly grouping - only count school days (Monday-Friday)
      const monthlyStats = {};
      
      attendance.forEach((record) => {
        const date = new Date(record.date);
        const dayOfWeek = date.getDay();
        
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return;
        }
        
        const monthKey = `${date.toLocaleString('default', { month: 'short' })}`;
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { present: 0, schoolDays: 0 };
        }
        
        // Only count if not a holiday
        if (!isHoliday(record.date)) {
          monthlyStats[monthKey].schoolDays++;
          if (record.status === "P") {
            monthlyStats[monthKey].present++;
          }
        }
      });

      return Object.entries(monthlyStats).map(([month, stats]) => ({
        month,
        percent: stats.schoolDays > 0 ? Math.round((stats.present / stats.schoolDays) * 100) : 0,
      }));
    }

    // For weekly view
    const dailyStats = {};
    attendance.forEach((record) => {
      dailyStats[record.date] = record.status;
    });

    return dates.map((date) => {
      const dayOfWeek = new Date(date).toLocaleDateString('default', { weekday: 'short' });
      const status = dailyStats[date];
      
      // Skip if it's a holiday
      if (isHoliday(date)) {
        return null;
      }

      return {
        day: dayOfWeek,
        date: date.slice(5),
        percent: status === "P" ? 100 : status === "A" ? 0 : 50,
      };
    }).filter(item => item !== null);
  };

  // Calculate overall attendance percentage (excluding holidays)
  const overall = useMemo(() => {
    if (!attendance || attendance.length === 0) return 0;
    
    const validAttendance = attendance.filter((a) => !isHoliday(a.date));
    const presentCount = validAttendance.filter((a) => a.status === "P").length;
    const total = validAttendance.length;
    
    return total > 0 ? Math.round((presentCount / total) * 100) : 0;
  }, [attendance, schoolDays]);

  // Filter daily records based on search date
  const filteredDaily = searchDate
    ? attendance.filter((d) => d.date === searchDate)
    : attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

  const chartData = buildChartData();

  return (
    <StudentLayout title="Attendance" role={role}>
      <div className={styles.top}>
        <div className={styles.overallCard}>
          <div className={styles.title}>Overall Attendance</div>
          <div className={styles.value}>{overall}%</div>
          <div className={styles.small}>
            {attendance.length > 0 
              ? `${attendance.filter(a => a.status === "P" && !isHoliday(a.date)).length} / ${attendance.filter(a => !isHoliday(a.date)).length} days`
              : "No records"}
          </div>
        </div>

        <div className={styles.controls}>
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
        </div>
      </div>

      {chartData.length > 0 && (
        <div className={styles.chartCard}>
          <h4>Attendance Trend {range === "week" ? "(Last 7 Days)" : "(Monthly)"}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={range === "week" ? "day" : "month"} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="percent"
                stroke="url(#colorLine)"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
              <defs>
                <linearGradient id="colorLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className={styles.daily}>
        <div className={styles.dailyHeader}>
          <h4>Attendance Records</h4>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className={styles.searchDate}
          />
        </div>

        {loading && !attendance.length ? (
          <p className={styles.noData}>Loading attendance records...</p>
        ) : filteredDaily.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredDaily.map((record, i) => {
                const holiday = isHoliday(record.date);
                const schoolDayRecord = schoolDays.find(sd => sd.date === record.date);
                
                return (
                  <tr key={i} className={holiday ? styles.holidayRow : ""}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td
                      className={
                        record.status === "A"
                          ? styles.absent
                          : record.status === "L"
                          ? styles.late
                          : styles.present
                      }
                    >
                      {record.status === "P" ? "Present" : record.status === "A" ? "Absent" : "Late"}
                    </td>
                    <td className={holiday ? styles.holidayText : ""}>
                      {holiday ? `Holiday (${schoolDayRecord?.description || "Closed"})` : "School Day"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className={styles.noData}>
            {searchDate ? "No records found for this date" : "No attendance records yet"}
          </p>
        )}
      </div>
    </StudentLayout>
  );
};

export default AttendancePage;
