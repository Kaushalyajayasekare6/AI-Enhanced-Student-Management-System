import React, { useState, useEffect } from "react";
import styles from "./AdminTimetableForm.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const defaultHours = ["08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00","13:00-14:00"];

const AdminTimetableForm = ({ selectedClass, term, year, grade, section, editable=false }) => {
  const [hours, setHours] = useState([...defaultHours]);
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch timetable from database
  useEffect(() => {
    const fetchTimetable = async () => {
      if (!grade || !section || !term || !year) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const res = await axios.get(
          `${API_ENDPOINTS.TIMETABLE.CLASS}?grade=${grade}&section=${section}&term=${term}&year=${year}`,
          { headers: getAuthHeaders() }
        );
        
        // Transform database format to display format
        const slotsByDay = {};
        days.forEach(day => {
          slotsByDay[day] = {};
        });

        if (res.data && res.data.slots && Array.isArray(res.data.slots)) {
          res.data.slots.forEach(slot => {
            if (!slotsByDay[slot.day]) {
              slotsByDay[slot.day] = {};
            }
            slotsByDay[slot.day][slot.timeSlot] = {
              subject: slot.subject || "",
              teacher: slot.teacherId ? `${slot.teacherId.firstName || ""} ${slot.teacherId.lastName || ""}`.trim() : "",
              room: slot.room || "",
            };
          });
        }

        // Convert to array format
        const formattedTimetable = {};
        days.forEach(day => {
          formattedTimetable[day] = defaultHours.map(time => {
            const slot = slotsByDay[day]?.[time];
            return slot ? { time, subject: slot.subject, teacher: slot.teacher, room: slot.room } : { time, subject: "", teacher: "", room: "" };
          });
        });

        setTimetable(formattedTimetable);
      } catch (err) {
        console.error("Error fetching timetable:", err);
        if (err.response?.status === 404) {
          setError("Timetable not found. Click 'Auto-Generate Timetable' to create one.");
        } else {
          setError("Failed to load timetable. " + (err.response?.data?.message || err.message));
        }
        // Initialize empty timetable
        const initial = {};
        days.forEach(day => {
          initial[day] = defaultHours.map(time => ({ time, subject: "", teacher: "", room: "" }));
        });
        setTimetable(initial);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [grade, section, term, year]);

  if (loading) {
    return (
      <div className={styles.timetableCard}>
        <p>Loading timetable...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.timetableCard}>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className={styles.timetableCard}>
        <p>No timetable data available.</p>
      </div>
    );
  }

  return (
    <div className={styles.timetableCard}>
      <h2>Class: Grade {selectedClass} - Term {term} ({year})</h2>
      {editable && <p style={{ color: "#666", fontSize: "14px" }}>Note: Manual editing not yet implemented. Use Auto-Generate to create timetables.</p>}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Day / Time</th>
            {hours.map((h, idx) => (
              <th key={idx}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day}>
              <td className={styles.day}>{day}</td>
              {hours.map((h, idx) => {
                const slot = timetable[day]?.[idx];
                return (
                  <td key={idx}>
                    {slot?.subject ? (
                      <div>
                        <strong>{slot.subject}</strong>
                        <br />
                        {slot.teacher && <span style={{ fontSize: "12px", color: "#666" }}>{slot.teacher}</span>}
                        {slot.room && <span style={{ fontSize: "11px", color: "#999" }}> • {slot.room}</span>}
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

export default AdminTimetableForm;
