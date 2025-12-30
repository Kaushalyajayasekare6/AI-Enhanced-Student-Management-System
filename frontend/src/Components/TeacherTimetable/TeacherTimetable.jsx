import React, { useState, useEffect } from "react";
import styles from "./TeacherTimetable.module.css";
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

const TeacherTimetable = ({ view, selectedDay }) => {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setLoading(true);
        const res = await axios.get(API_ENDPOINTS.TIMETABLE.TEACHER, {
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
            if (timeIndex >= 0 && formattedTimetable[dayShort] && slot.grade && slot.section) {
              formattedTimetable[dayShort][timeIndex] = {
                subject: slot.subject || "",
                class: `${slot.grade}${slot.section}`,
                room: slot.room || "",
                color: "blue", // Default color
              };
            }
          });
        }

        setTimetable(formattedTimetable);
      } catch (err) {
        console.error("Error fetching teacher timetable:", err);
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

  const filteredDays = view === "day" ? [selectedDay] : days;

  if (loading) {
    return <div className={styles.tableWrapper}><p>Loading timetable...</p></div>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table id="teacher-timetable-table" className={styles.table}>
        <thead>
          <tr>
            <th>Time</th>
            {filteredDays.map((day) => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time, rowIndex) => (
            <tr key={time}>
              <td className={styles.timeCell}>{time}</td>
              {filteredDays.map((day) => {
                const slot = timetable[day]?.[rowIndex];
                return (
                  <td key={day + rowIndex}>
                    {slot ? (
                      <div className={`${styles.subject} ${styles[slot.color] || styles.blue}`}>
                        <strong>{slot.subject}</strong>
                        {slot.class && <div className={styles.teacher}>📚 Class {slot.class}</div>}
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
    </div>
  );
};

export default TeacherTimetable;
