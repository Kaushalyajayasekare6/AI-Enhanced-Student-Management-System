import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TimetableCreation.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PREFERRED_TIME_ORDER = [
  "07:30-08:20",
  "08:20-09:10",
  "09:10-10:20",
  "10:40-11:30",
  "11:30-12:20",
  "12:30-13:30",
];
const INTERVAL_AFTER_FALLBACK = "09:10-10:20";
const INTERVAL_ROW = "__LUNCH_INTERVAL__";
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

const parseSlotStartMinutes = (timeSlot) => {
  const start = String(timeSlot).split("-")[0]?.trim();
  return parseTimeMinutes(start);
};

const addMinutesToTimeStr = (timeStr, add) => {
  return formatMinutes(parseTimeMinutes(timeStr) + add);
};

const getIntervalLabelFromAfterTime = (afterTime) => {
  if (!afterTime || !afterTime.includes("-")) return INTERVAL_LABEL_FALLBACK;
  const parts = String(afterTime).split("-");
  const endStr = parts[1]?.trim();
  if (!endStr) return INTERVAL_LABEL_FALLBACK;
  const endPlus20 = addMinutesToTimeStr(endStr, 20);
  return `Lunch Interval ${endStr}-${endPlus20}`;
};

const gradeGroupLabel = (grade) => {
  if (grade >= 1 && grade <= 5) return "Grades 1-5";
  if (grade >= 6 && grade <= 9) return "Grades 6-9";
  if (grade >= 10 && grade <= 11) return "Grades 10-11";
  return "Grades 12-13";
};

const timeSlotSort = (a, b) => {
  const ai = PREFERRED_TIME_ORDER.indexOf(a);
  const bi = PREFERRED_TIME_ORDER.indexOf(b);
  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }
  // Fallback: sort by start time so 6-9 (8 periods/day) works too
  return parseSlotStartMinutes(a) - parseSlotStartMinutes(b);
};

const TimetableCreation = () => {
  const [viewMode, setViewMode] = useState("teacher"); // teacher | class
  const [allTimetables, setAllTimetables] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const role = getStoredRole() || "admin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [timetableRes, teacherRes] = await Promise.all([
          axios.get(`${API_ENDPOINTS.TIMETABLE.ALL}?term=${selectedTerm}&year=${selectedYear}`, {
            headers: getAuthHeaders(),
          }),
          axios.get(API_ENDPOINTS.TEACHERS.BASE, { headers: getAuthHeaders() }),
        ]);

        const timetableList = timetableRes.data || [];
        setAllTimetables(timetableList);
        const teacherList = Array.isArray(teacherRes.data) ? teacherRes.data : [];
        setTeachers(teacherList.filter((t) => !t.leaveDate));

        if (timetableList.length > 0) {
          const firstClassId = `${timetableList[0].grade}-${timetableList[0].section}`;
          setSelectedClassId((prev) => prev || firstClassId);
        }
      } catch (err) {
        console.error("Error fetching timetables:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTerm, selectedYear]);

  const classOptions = allTimetables.map((t) => ({
    id: `${t.grade}-${t.section}`,
    label: `Grade ${t.grade}${t.section}`,
    grade: t.grade,
    section: t.section,
    timetable: t,
  })).sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return String(a.section).localeCompare(String(b.section));
  });

  const groupedClassOptions = classOptions.reduce((acc, option) => {
    const key = gradeGroupLabel(option.grade);
    if (!acc[key]) acc[key] = [];
    acc[key].push(option);
    return acc;
  }, {});

  const selectedClassTimetable =
    classOptions.find((item) => item.id === selectedClassId)?.timetable || null;

  const buildTeacherSlots = (teacherId) => {
    if (!teacherId) return [];
    const rows = [];
    allTimetables.forEach((timetable) => {
      (timetable.slots || []).forEach((slot) => {
        const slotTeacherId =
          typeof slot.teacherId === "object" && slot.teacherId !== null
            ? slot.teacherId._id
            : slot.teacherId;
        if (String(slotTeacherId) === String(teacherId)) {
          const teacherName =
            typeof slot.teacherId === "object" && slot.teacherId !== null
              ? `${slot.teacherId.firstName || ""} ${slot.teacherId.lastName || ""}`.trim()
              : "";
          rows.push({
            ...slot,
            classLabel: `Grade ${timetable.grade}${timetable.section}`,
            teacherName,
          });
        }
      });
    });
    return rows.sort((a, b) => {
      const dayIndex = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      if (dayIndex !== 0) return dayIndex;
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  };

  const teacherSlots = buildTeacherSlots(selectedTeacherId);
  const selectedTeacher = teachers.find((t) => String(t._id) === String(selectedTeacherId));

  const buildGridFromSlots = (slots = [], type = "class") => {
    const allTimes = Array.from(new Set((slots || []).map((slot) => slot.timeSlot))).sort(timeSlotSort);
    const timeRows = allTimes.length ? allTimes : PREFERRED_TIME_ORDER.slice(0, 6);
    const intervalAfterTime = timeRows.length >= 8 ? timeRows[3] : INTERVAL_AFTER_FALLBACK;
    const intervalLabel = getIntervalLabelFromAfterTime(intervalAfterTime);

    const rowsWithInterval = timeRows.flatMap((time) => (time === intervalAfterTime ? [time, INTERVAL_ROW] : [time]));
    const matrix = {};

    DAYS.forEach((day) => {
      matrix[day] = {};
    });

    slots.forEach((slot) => {
      if (!matrix[slot.day]) matrix[slot.day] = {};
      matrix[slot.day][slot.timeSlot] = slot;
    });

    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              {DAYS.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsWithInterval.map((time) => {
              if (time === INTERVAL_ROW) {
                return (
                  <tr key={INTERVAL_ROW}>
                    <td className={styles.breakRowCell}>{intervalLabel}</td>
                    {DAYS.map((day) => (
                      <td key={`${day}-${INTERVAL_ROW}`} className={styles.breakRowCell}>
                        {intervalLabel}
                      </td>
                    ))}
                  </tr>
                );
              }
              return (
                <tr key={time}>
                  <td className={styles.timeCell}>{time}</td>
                  {DAYS.map((day) => {
                    const slot = matrix[day]?.[time];
                    return (
                      <td key={`${day}-${time}`}>
                        {!slot ? (
                          <span className={styles.emptySlot}>-</span>
                        ) : (
                          <div className={styles.slotCard}>
                            <strong>{slot.subject || "-"}</strong>
                            {type === "class" && (
                              <div className={styles.slotMeta}>
                                {slot.teacherId
                                  ? `${slot.teacherId.firstName || ""} ${slot.teacherId.lastName || ""}`.trim()
                                  : "Unassigned"}
                              </div>
                            )}
                            {type === "teacher" && (
                              <div className={styles.slotMeta}>{slot.classLabel || "-"}</div>
                            )}
                            <div className={styles.slotMeta}>{slot.room || "-"}</div>
                          </div>
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

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="View All Timetables" />
        <div className={styles.toolbar}>
          <button onClick={() => setViewMode("teacher")}>Teacher Side</button>
          <button onClick={() => setViewMode("class")}>Class Side</button>

          <select value={selectedTerm} onChange={(e) => setSelectedTerm(Number(e.target.value))}>
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>

          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
          </select>
        </div>

        {loading && <p>Loading timetables...</p>}

        {!loading && viewMode === "class" && (
          <>
            <div className={styles.selectorPanel}>
              {Object.keys(groupedClassOptions).length === 0 && <p>No classes found.</p>}
              {Object.entries(groupedClassOptions).map(([group, options]) => (
                <div key={group} className={styles.groupBlock}>
                  <h3>{group}</h3>
                  <div className={styles.buttonRow}>
                    {options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`${styles.classBtn} ${selectedClassId === option.id ? styles.activeBtn : ""}`}
                        onClick={() => setSelectedClassId(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!selectedClassTimetable ? (
              <p>No class timetable found for selected term/year.</p>
            ) : (
              <>
                <h3 className={styles.selectionTitle}>
                  Class Timetable: Grade {selectedClassTimetable.grade}
                  {selectedClassTimetable.section}
                </h3>
                {buildGridFromSlots(selectedClassTimetable.slots || [], "class")}
              </>
            )}
          </>
        )}

        {!loading && viewMode === "teacher" && (
          <>
            <div className={styles.selectorPanel}>
              <div className={styles.buttonRow}>
                {teachers.map((teacher) => (
                  <button
                    key={teacher._id}
                    type="button"
                    className={`${styles.classBtn} ${selectedTeacherId === teacher._id ? styles.activeBtn : ""}`}
                    onClick={() => setSelectedTeacherId(teacher._id)}
                  >
                    {teacher.firstName} {teacher.lastName}
                  </button>
                ))}
              </div>
            </div>

            {!selectedTeacherId ? (
              <p>Select a teacher to view timetable.</p>
            ) : teacherSlots.length === 0 ? (
              <p>No timetable slots found for this teacher in selected term/year.</p>
            ) : (
              <>
                <h3 className={styles.selectionTitle}>
                  Teacher Timetable: {selectedTeacher?.firstName} {selectedTeacher?.lastName}
                </h3>
                {buildGridFromSlots(teacherSlots, "teacher")}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default TimetableCreation;
