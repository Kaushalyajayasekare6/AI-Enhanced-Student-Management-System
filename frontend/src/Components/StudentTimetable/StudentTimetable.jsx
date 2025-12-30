import React, { useState, useEffect } from "react";
import styles from "./StudentTimetable.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const times = [
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "13:00-14:00",
  "14:00-15:00",
];

const dayMap = {
  "Monday": "Mon",
  "Tuesday": "Tue",
  "Wednesday": "Wed",
  "Thursday": "Thu",
  "Friday": "Fri",
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const StudentTimetable = ({ view, selectedDay }) => {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setLoading(true);
        const res = await axios.get(API_ENDPOINTS.TIMETABLE.STUDENT, {
          headers: getAuthHeaders(),
        });

        // Transform database format to display format
        const formattedTimetable = {};
        days.forEach(day => {
          formattedTimetable[day] = new Array(times.length).fill(null);
        });

        if (res.data && res.data.slots && Array.isArray(res.data.slots)) {
          res.data.slots.forEach(slot => {
            const dayShort = dayMap[slot.day] || slot.day;
            const timeIndex = times.indexOf(slot.timeSlot);
            if (timeIndex >= 0 && formattedTimetable[dayShort]) {
              formattedTimetable[dayShort][timeIndex] = {
                subject: slot.subject || "",
                teacher: slot.teacherStatus === "unassigned" 
                  ? "No teacher assigned yet" 
                  : (slot.teacherId ? `${slot.teacherId.firstName || ""} ${slot.teacherId.lastName || ""}`.trim() : ""),
                room: slot.room || "",
                color: slot.teacherStatus === "unassigned" ? "gray" : "blue",
              };
            }
          });
        }

        setTimetable(formattedTimetable);
      } catch (err) {
        console.error("Error fetching student timetable:", err);
        // Initialize empty timetable
        const emptyTimetable = {};
        days.forEach(day => {
          emptyTimetable[day] = new Array(times.length).fill(null);
        });
        setTimetable(emptyTimetable);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
    
    // Auto-refresh timetable every 30 seconds to pick up admin changes
    const interval = setInterval(fetchTimetable, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const sampleSubjects = [
    { name: "Maths", type: "heavy", periods_per_week: 5, teacher: "T1" },
    { name: "English", type: "language", periods_per_week: 5, teacher: "T2" },
    { name: "Science", type: "heavy", periods_per_week: 4, teacher: "T3" },
    { name: "History", type: "heavy", periods_per_week: 2, teacher: "T4" },
    { name: "IT", type: "practical", periods_per_week: 2, teacher: "T5", practical_double: true },
    { name: "PE", type: "activity", periods_per_week: 2, teacher: "T6" },
  ];

  const generateTimetable = async () => {
    try {
      setGenerating(true);
      // Example payload; in a full UI you would collect subjects/grade from user
      const payload = {
        grade: 7,
        subjects: sampleSubjects,
        periods_per_day: 8,
        solver: "greedy"
      };

      const res = await axios.post(API_ENDPOINTS.TIMETABLE.GENERATE, payload, { headers: getAuthHeaders() });
      if (res.data && res.data.timetable) {
        // Convert to display format: short day keys
        const formatted = {};
        Object.entries(res.data.timetable).forEach(([day, periods]) => {
          const short = dayMap[day] || day;
          formatted[short] = periods.map(p => (typeof p === 'string' ? { subject: p, teacher: "" } : p));
        });
        setTimetable(formatted);
      }
    } catch (err) {
      console.error('Error generating timetable', err);
    } finally {
      setGenerating(false);
    }
  };

  const filteredDays = view === "day" ? [selectedDay] : days;

  if (loading) {
    return <div className={styles.tableWrapper}><p>Loading timetable...</p></div>;
  }

  // Determine times based on timetable first day length (dynamic)
  const dynamicTimes = (() => {
    const firstDay = Object.keys(timetable)[0];
    const count = firstDay && timetable[firstDay] ? timetable[firstDay].length : times.length;
    // generate time slots between 07:30 and 13:30 evenly
    const start = new Date();
    start.setHours(7, 30, 0, 0);
    const end = new Date();
    end.setHours(13, 30, 0, 0);
    const totalMinutes = (end - start) / 60000;
    const slotMinutes = Math.floor(totalMinutes / count);
    const labels = [];
    let cur = new Date(start);
    for (let i = 0; i < count; i++) {
      const next = new Date(cur.getTime() + slotMinutes * 60000);
      const pad = (n) => (n < 10 ? '0' + n : n);
      labels.push(`${pad(cur.getHours())}:${pad(cur.getMinutes())}-${pad(next.getHours())}:${pad(next.getMinutes())}`);
      cur = next;
    }
    return labels;
  })();

  return (
    <div className={styles.tableWrapper}>
      <table id="timetable-table" className={styles.table}>
        <thead>
          <tr>
            <th>Time</th>
            {filteredDays.map((day) => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dynamicTimes.map((time, rowIndex) => (
            <tr key={time}>
                  <td className={styles.timeCell}>{time}</td>
                  {filteredDays.map((day) => {
                    const slot = timetable[day]?.[rowIndex];
                return (
                  <td key={day + rowIndex}>
                    {slot ? (
                      <div className={`${styles.subject} ${styles[slot.color] || styles.blue}`}>
                        <strong>{slot.subject}</strong>
                        {slot.teacher && <div className={styles.teacher}>👨‍🏫 {slot.teacher}</div>}
                        {slot.room && <div className={styles.room}>📍 {slot.room}</div>}
                      </div>
                    ) : (
                      <span style={{ color: "#ccc" }}>-</span>
                    )}
                  </td>
                );
              })}
            </tr>
              ))}
        </tbody>
      </table>
          <div style={{ marginTop: 12 }}>
            <button onClick={generateTimetable} disabled={generating}>
              {generating ? "Generating..." : "Generate Timetable (Grade 7)"}
            </button>
          </div>
    </div>
  );
};

export default StudentTimetable;
