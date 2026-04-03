import React, { useState, useEffect } from "react";
import styles from "./StudentTimetable.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const defaultTimes = [
  "07:30-08:20",
  "08:20-09:10",
  "09:10-10:20",
  "10:40-11:30",
  "11:30-12:20",
  "12:30-13:30",
];

const dayMap = {
  "Monday": "Mon",
  "Tuesday": "Tue",
  "Wednesday": "Wed",
  "Thursday": "Thu",
  "Friday": "Fri",
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const INTERVAL_ROW = "__LUNCH_INTERVAL__";
const INTERVAL_AFTER_FALLBACK = "09:10-10:20";
const INTERVAL_LABEL_FALLBACK = "Lunch Interval 10:20-10:40";

const parseTimeMinutes = (timeStr) => {
  const [h, m] = String(timeStr).split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const formatMinutes = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const addMinutesToTimeStr = (timeStr, add) => {
  return formatMinutes(parseTimeMinutes(timeStr) + add);
};

const parseSlotStartMinutes = (timeSlot) => {
  const start = String(timeSlot).split("-")[0]?.trim();
  return parseTimeMinutes(start);
};

const StudentTimetable = ({ view, selectedDay }) => {
  const [timetable, setTimetable] = useState({});
  const [timeSlots, setTimeSlots] = useState(defaultTimes);
  const [loading, setLoading] = useState(true);

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
          formattedTimetable[day] = new Array(defaultTimes.length).fill(null);
        });

        if (res.data && res.data.slots && Array.isArray(res.data.slots)) {
          const uniqueTimes = Array.from(new Set(res.data.slots.map((slot) => slot.timeSlot)));
          const sortedTimes = uniqueTimes.slice().sort(
            (a, b) => parseSlotStartMinutes(a) - parseSlotStartMinutes(b)
          );
          if (sortedTimes.length) {
            setTimeSlots(sortedTimes);
            days.forEach((day) => {
              formattedTimetable[day] = new Array(sortedTimes.length).fill(null);
            });
          }

          res.data.slots.forEach((slot) => {
            const dayShort = dayMap[slot.day] || slot.day;
            const timeIndex = (sortedTimes.length ? sortedTimes : defaultTimes).indexOf(slot.timeSlot);
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
          emptyTimetable[day] = new Array(defaultTimes.length).fill(null);
        });
        setTimetable(emptyTimetable);
        setTimeSlots(defaultTimes);
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

  const intervalAfterTime =
    timeSlots.length >= 8 ? timeSlots[3] : INTERVAL_AFTER_FALLBACK;

  const intervalLabel = (() => {
    if (timeSlots.length >= 8 && intervalAfterTime && intervalAfterTime.includes("-")) {
      const parts = intervalAfterTime.split("-");
      const endStr = parts[1]?.trim();
      if (!endStr) return INTERVAL_LABEL_FALLBACK;
      const endPlus20 = addMinutesToTimeStr(endStr, 20);
      return `Lunch Interval ${endStr}-${endPlus20}`;
    }
    return INTERVAL_LABEL_FALLBACK;
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
          {timeSlots
            .flatMap((time) => (time === intervalAfterTime ? [time, INTERVAL_ROW] : [time]))
            .map((row, visualIndex) => {
              if (row === INTERVAL_ROW) {
                return (
                  <tr key={INTERVAL_ROW}>
                    <td className={styles.breakCell}>{intervalLabel}</td>
                    {filteredDays.map((day) => (
                      <td key={`${day}-${INTERVAL_ROW}`} className={styles.breakCell}>
                        {intervalLabel}
                      </td>
                    ))}
                  </tr>
                );
              }

              const rowIndex = timeSlots.indexOf(row);
              return (
                <tr key={`${row}-${visualIndex}`}>
                  <td className={styles.timeCell}>{row}</td>
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
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTimetable;
