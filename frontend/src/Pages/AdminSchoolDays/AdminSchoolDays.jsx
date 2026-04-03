import React, { useState, useEffect } from "react";
import AdminLayout from "../../Components/AdminLayout/AdminLayout";
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
  const [generatedYears, setGeneratedYears] = useState(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState("");
  const role = getStoredRole() || "admin";
  const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get first and last day of current month
  const getMonthRange = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      from: toLocalDateString(firstDay),
      to: toLocalDateString(lastDay),
    };
  };

  const ensureYearGenerated = async (force = false) => {
    const year = currentMonth.getFullYear();
    if (!force && generatedYears.has(year)) return;

    try {
      await axios.post(
        API_ENDPOINTS.SCHOOL_DAYS.AUTO_GENERATE,
        { year },
        { headers: getAuthHeaders() }
      );
      setGeneratedYears((prev) => new Set([...prev, year]));
    } catch (error) {
      console.error("Error auto-generating school calendar:", error);
    }
  };

  // Fetch school days for current month
  const fetchSchoolDays = async () => {
    try {
      setLoading(true);
      await ensureYearGenerated();
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

  const regenerateSelectedYear = async () => {
    const year = currentMonth.getFullYear();
    try {
      setRegenerating(true);
      setGenerateMessage("");
      await ensureYearGenerated(true);
      await fetchSchoolDays();
      setGenerateMessage(`Holidays generated for ${year}`);
    } catch (error) {
      console.error("Error generating holidays:", error);
      setGenerateMessage(`Failed to generate holidays for ${year}`);
    } finally {
      setRegenerating(false);
    }
  };

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
      const dateString = toLocalDateString(date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const schoolDay = schoolDays[dateString];
      const isSchoolDay = schoolDay
        ? schoolDay.isSchoolDay
        : !isWeekend; // Default: weekdays Mon-Fri are school days

      const isToday = dateString === toLocalDateString(new Date());
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
              ? "Weekend Off - Double click to add note"
              : "School Day - Click to toggle - Double click to add note"
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
    <AdminLayout title="Manage School Days" role={role}>
      <div className={styles.container}>
        <h1 className={styles.title}>Manage School Days</h1>
        <p className={styles.subtitle}>
Manage school calendar: Mon-Fri school days by default, Sat/Sun weekends off by default. Add real holidays as needed. Click to toggle.
        </p>

          <div className={styles.calendarControls}>
            <button
              className={styles.regenerateButton}
              onClick={regenerateSelectedYear}
              disabled={regenerating}
            >
              {regenerating ? "Generating..." : "Generate Holidays"}
            </button>
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
          {generateMessage && (
            <p className={styles.generateMessage}>{generateMessage}</p>
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
              <span>Weekend Off (Sat/Sun Default)</span>
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
    </AdminLayout>
  );
};

export default AdminSchoolDays;

