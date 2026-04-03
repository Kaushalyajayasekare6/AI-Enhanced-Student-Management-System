import React, { useState } from "react";
import TeacherLayout from "../../Components/TeacherLayout/TeacherLayout";
import TeacherTimetable from "../../Components/TeacherTimetable/TeacherTimetable";
import styles from "./TeacherTimetablePage.module.css";
import jsPDF from "jspdf";
import { getStoredRole } from "../../utils/auth";

const TeacherTimetablePage = () => {
  const role = getStoredRole() || "teacher";
  const [view, setView] = useState("week"); // "day" or "week"
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const exportPDF = () => {
    const doc = new jsPDF();
    const table = document.getElementById("teacher-timetable-table");
    doc.html(table, {
      callback: function (doc) {
        doc.save("teacher_timetable.pdf");
      },
      x: 10,
      y: 10,
      html2canvas: { scale: 0.5 },
    });
  };

  return (
    <TeacherLayout title="Teacher Timetable" role={role}>
      <h2 className={styles.pageTitle}>Teacher Timetable</h2>
      <p className={styles.pageSubtitle}>
        View and manage your teaching schedule
      </p>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.viewToggle}>
          <button
            className={view === "day" ? styles.active : ""}
            onClick={() => setView("day")}
          >
            Daily
          </button>
          <button
            className={view === "week" ? styles.active : ""}
            onClick={() => setView("week")}
          >
            Weekly
          </button>
        </div>

        {view === "day" && (
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="Mon">Monday</option>
            <option value="Tue">Tuesday</option>
            <option value="Wed">Wednesday</option>
            <option value="Thu">Thursday</option>
            <option value="Fri">Friday</option>
          </select>
        )}

        <div className={styles.dateRange}>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange({ ...dateRange, from: e.target.value })
            }
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange({ ...dateRange, to: e.target.value })
            }
          />
        </div>

        <button onClick={exportPDF} className={styles.exportBtn}>
          Export PDF
        </button>
      </div>

      <TeacherTimetable view={view} selectedDay={selectedDay} />
    </TeacherLayout>
  );
};

export default TeacherTimetablePage;
