import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./StudentCalendar.module.css";
import axios from "axios";
import { getStoredRole } from "../../utils/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const StudentCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolDays, setSchoolDays] = useState({});
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const role = getStoredRole() || "student";

  // Get first and last day of current month
  const getMonthRange = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      from: firstDay.toISOString().slice(0, 10),
      to: lastDay.toISOString().slice(0, 10),
    };
  };

  // Fetch school days for current month
  const fetchSchoolDays = useCallback(async () => {
    try {
      const { from, to } = getMonthRange();
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
  }, [currentMonth]);

  // Fetch student attendance
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getMonthRange();
      const res = await axios.get(
        `${API_ENDPOINTS.ATTENDANCE.STUDENT}?from=${from}&to=${to}`,
        { headers: getAuthHeaders() }
      );

      const attendanceMap = {};
      res.data.attendance?.forEach((record) => {
        attendanceMap[record.date] = record.status;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchSchoolDays();
    fetchAttendance();
  }, [fetchSchoolDays, fetchAttendance]);

  // Generate calendar grid
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const calendar = [];

    // Add header
    calendar.push(
      <div key="header" className={styles.calendarHeader}>
        {weekDays.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>
    );

    // Add empty cells for days before month starts
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.dayCell}></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const schoolDay = schoolDays[dateString];
      const isSchoolDay = schoolDay ? schoolDay.isSchoolDay : !isWeekend;
      const isToday = dateString === new Date().toISOString().slice(0, 10);
      const attendanceStatus = attendance[dateString];
      const hasNote = schoolDay?.description && schoolDay.description.trim() !== "";

      days.push(
        <div
          key={day}
          className={`${styles.dayCell} ${
            isSchoolDay ? styles.schoolDay : styles.holiday
          } ${isWeekend && !schoolDay ? styles.weekend : ""} ${
            isToday ? styles.today : ""
          } ${hasNote ? styles.hasNote : ""} ${
            attendanceStatus ? styles[`attendance${attendanceStatus}`] : ""
          }`}
          onClick={() => setSelectedDate(dateString)}
          onDoubleClick={() => {
            setModalDate(dateString);
            setShowDetailModal(true);
          }}
          title={
            hasNote
              ? schoolDay.description
              : attendanceStatus
              ? `Attendance: ${attendanceStatus === "P" ? "Present" : attendanceStatus === "A" ? "Absent" : ""}`
              : isWeekend
              ? "Weekend - Double click for details"
              : "Click for details - Double click for more info"
          }
        >
          <div className={styles.dayNumber}>{day}</div>
          {hasNote && (
            <div className={styles.noteIndicator} title={schoolDay.description}>
              📝
            </div>
          )}
          {attendanceStatus && attendanceStatus !== "L" && (
            <div
              className={`${styles.attendanceBadge} ${
                attendanceStatus === "P"
                  ? styles.present
                  : styles.absent
              }`}
            >
              {attendanceStatus === "P" ? "✓" : "✗"}
            </div>
          )}
          {!isSchoolDay && !attendanceStatus && (
            <div className={styles.holidayBadge}>H</div>
          )}
        </div>
      );
    }

    // Group days into weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(
        <div key={`week-${i}`} className={styles.week}>
          {days.slice(i, i + 7)}
        </div>
      );
    }

    calendar.push(...weeks);
    return calendar;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const selectedDayInfo = selectedDate
    ? {
        date: selectedDate,
        schoolDay: schoolDays[selectedDate],
        attendance: attendance[selectedDate],
        isWeekend:
          new Date(selectedDate).getDay() === 0 ||
          new Date(selectedDate).getDay() === 6,
      }
    : null;

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <div className={styles.content}>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>My Attendance Calendar</h1>
          <p className={styles.subtitle}>
            View your attendance and school holidays
          </p>

          <div className={styles.calendarControls}>
            <button
              className={styles.navArrow}
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className={styles.monthHeader}>
              <h2 className={styles.monthTitle}>
                {monthNames[currentMonth.getMonth()]}
              </h2>
              <span className={styles.yearTitle}>
                {currentMonth.getFullYear()}
              </span>
            </div>
            <button
              className={styles.navArrow}
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading calendar...</div>
          ) : (
            <div className={styles.calendar}>{generateCalendar()}</div>
          )}

          {selectedDayInfo && (
            <div className={styles.dayInfo}>
              <h3>
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Type:</span>
                  <span
                    className={`${styles.infoValue} ${
                      selectedDayInfo.schoolDay?.isSchoolDay !== false &&
                      !selectedDayInfo.isWeekend
                        ? styles.schoolDay
                        : styles.holiday
                    }`}
                  >
                    {selectedDayInfo.schoolDay?.isSchoolDay !== false &&
                    !selectedDayInfo.isWeekend
                      ? "School Day"
                      : selectedDayInfo.schoolDay?.description || "Holiday"}
                  </span>
                </div>
                {selectedDayInfo.attendance && selectedDayInfo.attendance !== "L" && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Your Status:</span>
                    <span
                      className={`${styles.infoValue} ${
                        selectedDayInfo.attendance === "P"
                          ? styles.present
                          : styles.absent
                      }`}
                    >
                      {selectedDayInfo.attendance === "P"
                        ? "Present ✓"
                        : "Absent ✗"}
                    </span>
                  </div>
                )}
                {selectedDayInfo.schoolDay?.description && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Note:</span>
                    <span className={styles.infoValue}>
                      {selectedDayInfo.schoolDay.description}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.schoolDay}`}></div>
              <span>School Day</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.holiday}`}></div>
              <span>Holiday</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.present}`}></div>
              <span>Present</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.absent}`}></div>
              <span>Absent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal for Double-Click */}
      {showDetailModal && modalDate && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Date Details</h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowDetailModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.dateDisplay}>
                {new Date(modalDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Type:</span>
                  <span
                    className={`${styles.detailValue} ${
                      schoolDays[modalDate]?.isSchoolDay !== false &&
                      !(new Date(modalDate).getDay() === 0 || new Date(modalDate).getDay() === 6)
                        ? styles.schoolDay
                        : styles.holiday
                    }`}
                  >
                    {schoolDays[modalDate]?.isSchoolDay !== false &&
                    !(new Date(modalDate).getDay() === 0 || new Date(modalDate).getDay() === 6)
                      ? "School Day"
                      : schoolDays[modalDate]?.description || "Holiday"}
                  </span>
                </div>

                {attendance[modalDate] && attendance[modalDate] !== "L" && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Your Attendance:</span>
                    <span
                      className={`${styles.detailValue} ${
                        attendance[modalDate] === "P"
                          ? styles.present
                          : styles.absent
                      }`}
                    >
                      {attendance[modalDate] === "P" ? "Present ✓" : "Absent ✗"}
                    </span>
                  </div>
                )}

                {schoolDays[modalDate]?.description && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Admin Note:</span>
                    <span className={styles.detailValue}>
                      {schoolDays[modalDate].description}
                    </span>
                  </div>
                )}

                {!schoolDays[modalDate]?.description && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailNote}>
                      No additional notes for this date.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCalendar;





