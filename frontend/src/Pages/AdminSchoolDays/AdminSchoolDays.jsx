import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./AdminSchoolDays.module.css";
import axios from "axios";
import { getStoredRole } from "../../utils/auth";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const AdminSchoolDays = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolDays, setSchoolDays] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSchoolDay, setIsSchoolDay] = useState(true);
  const role = getStoredRole() || "admin";

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
  const fetchSchoolDays = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  // Open note modal for a date
  const openNoteModal = (date) => {
    const current = schoolDays[date];
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    setSelectedDate(date);
    setIsSchoolDay(current ? current.isSchoolDay : !isWeekend);
    setNoteText(current?.description || "");
    setNoteModalOpen(true);
  };

  // Save school day with note
  const saveSchoolDay = async () => {
    if (!selectedDate) return;

    try {
      await axios.post(
        API_ENDPOINTS.SCHOOL_DAYS.BASE,
        {
          date: selectedDate,
          isSchoolDay,
          description: noteText.trim(),
        },
        { headers: getAuthHeaders() }
      );

      // Update local state
      setSchoolDays((prev) => ({
        ...prev,
        [selectedDate]: {
          date: selectedDate,
          isSchoolDay,
          description: noteText.trim(),
        },
      }));

      setNoteModalOpen(false);
      setSelectedDate(null);
      setNoteText("");
    } catch (error) {
      console.error("Error updating school day:", error);
      alert("Failed to update school day. Please try again.");
    }
  };

  // Quick toggle (without opening modal)
  const quickToggle = async (date, e) => {
    if (e.detail === 2) {
      // Double click opens modal
      openNoteModal(date);
      return;
    }

    const current = schoolDays[date];
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const newIsSchoolDay = current ? !current.isSchoolDay : !isWeekend;

    try {
      await axios.post(
        API_ENDPOINTS.SCHOOL_DAYS.BASE,
        {
          date,
          isSchoolDay: newIsSchoolDay,
          description: current?.description || "",
        },
        { headers: getAuthHeaders() }
      );

      setSchoolDays((prev) => ({
        ...prev,
        [date]: {
          date,
          isSchoolDay: newIsSchoolDay,
          description: current?.description || "",
        },
      }));
    } catch (error) {
      console.error("Error updating school day:", error);
    }
  };

  // Generate calendar grid
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar = [];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      const isSchoolDay = schoolDay
        ? schoolDay.isSchoolDay
        : !isWeekend; // Default: weekdays are school days

      const isToday = dateString === new Date().toISOString().slice(0, 10);
      const hasNote = schoolDay?.description && schoolDay.description.trim() !== "";

      days.push(
        <div
          key={day}
          className={`${styles.dayCell} ${
            isSchoolDay ? styles.schoolDay : styles.holiday
          } ${isWeekend && !schoolDay ? styles.weekend : ""} ${
            isToday ? styles.today : ""
          } ${hasNote ? styles.hasNote : ""}`}
          onClick={(e) => quickToggle(dateString, e)}
          onDoubleClick={() => openNoteModal(dateString)}
          title={
            hasNote
              ? schoolDay.description
              : isWeekend
              ? "Weekend - Double click to add note"
              : "Click to toggle - Double click to add note"
          }
        >
          <div className={styles.dayNumber}>{day}</div>
          {hasNote && (
            <div className={styles.noteIndicator} title={schoolDay.description}>
              📝
            </div>
          )}
          <div className={styles.dayStatus}>
            {isSchoolDay ? "✓" : "✗"}
          </div>
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

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <div className={styles.content}>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>Manage School Days</h1>
          <p className={styles.subtitle}>
            Click on any date to toggle it as a school day or holiday
          </p>

          <div className={styles.calendarControls}>
            <button
              className={styles.navArrow}
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div className={styles.monthHeader}>
              <h2 className={styles.monthTitle}>
                {monthNames[currentMonth.getMonth()]}
              </h2>
              <span className={styles.yearTitle}>{currentMonth.getFullYear()}</span>
            </div>
            <button
              className={styles.navArrow}
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading calendar...</div>
          ) : (
            <div className={styles.calendar}>{generateCalendar()}</div>
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
              <div className={`${styles.legendColor} ${styles.weekend}`}></div>
              <span>Weekend (Default)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.noteIndicator}>📝</span>
              <span>Has Note</span>
            </div>
          </div>

          <p className={styles.helpText}>
            💡 Click a date to toggle school day/holiday • Double-click to add/edit note
          </p>
        </div>
      </div>

      {/* Note Modal */}
      {noteModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setNoteModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Day Details</h3>
              <button
                className={styles.closeButton}
                onClick={() => setNoteModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.dateDisplay}>
                {selectedDate && new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={isSchoolDay}
                    onChange={(e) => setIsSchoolDay(e.target.checked)}
                    className={styles.toggleCheckbox}
                  />
                  <span className={styles.toggleText}>
                    {isSchoolDay ? "✓ School Day" : "✗ Holiday"}
                  </span>
                </label>
              </div>

              <div className={styles.noteInputGroup}>
                <label className={styles.noteLabel}>
                  Note / Description
                  <span className={styles.noteHint}>
                    (e.g., "Christmas Holiday", "Exam Day", "Public Holiday")
                  </span>
                </label>
                <textarea
                  className={styles.noteTextarea}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note about this day..."
                  rows="4"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setNoteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={saveSchoolDay}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchoolDays;

