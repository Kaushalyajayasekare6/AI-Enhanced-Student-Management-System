import React, { useState, useEffect } from "react";
import AdminLayout from "../../Components/AdminLayout/AdminLayout";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import { getStoredRole } from "../../utils/auth";
import styles from "./AdminTimetableCreation.module.css";

const AdminTimetableCreation = () => {
  const [formData, setFormData] = useState({
    term: "1",
    year: new Date().getFullYear(),
  });
  const [teacherCount, setTeacherCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [middleClassCount, setMiddleClassCount] = useState(0);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const role = getStoredRole() || "admin";

  // Fetch active teachers and primary classes for quick info
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [teachersRes, studentsRes] = await Promise.all([
          axios.get(API_ENDPOINTS.TEACHERS.BASE, { headers: getAuthHeaders() }),
          axios.get(API_ENDPOINTS.STUDENTS.BASE, { headers: getAuthHeaders() }),
        ]);

        const allTeachers = Array.isArray(teachersRes.data) ? teachersRes.data : [];
        setTeacherCount(allTeachers.filter((t) => !t.leaveDate).length);

        const primaryClassSet = new Set();
        const middleClassSet = new Set();
        (studentsRes.data || []).forEach((student) => {
          const gradeText = String(student.grade || "");
          const match = gradeText.match(/\d+/);
          const gradeNum = match ? parseInt(match[0], 10) : NaN;
          if (!Number.isNaN(gradeNum) && student.section) {
            const section = String(student.section).toUpperCase();
            if (gradeNum >= 1 && gradeNum <= 5) {
              primaryClassSet.add(`${gradeNum}${section}`);
            } else if (gradeNum >= 6 && gradeNum <= 9) {
              middleClassSet.add(`${gradeNum}${section}`);
            }
          }
        });
        setClassCount(primaryClassSet.size);
        setMiddleClassCount(middleClassSet.size);
      } catch (err) {
        console.error("Error fetching initial timetable data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleGenerateAllPrimary = async () => {
    setBulkLoading(true);
    setMessage("");
    setResult(null);
    try {
      const payload = {
        term: parseInt(formData.term, 10),
        year: parseInt(formData.year, 10),
      };
      const res = await axios.post(API_ENDPOINTS.TIMETABLE.GENERATE_PRIMARY_ALL, payload, {
        headers: getAuthHeaders(),
      });

      const generatedCount = res.data?.generated?.length || 0;
      const failedCount = res.data?.failed?.length || 0;
      setResult(res.data);
      if (failedCount > 0) {
        setMessage(`Generated ${generatedCount} timetables. ${failedCount} class(es) skipped due to teacher conflicts.`);
      } else {
        setMessage(`Generated ${generatedCount} timetables for grades 1-5 with no teacher conflicts.`);
      }
    } catch (err) {
      setMessage("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleGenerateAllMiddle = async () => {
    setBulkLoading(true);
    setMessage("");
    setResult(null);
    try {
      const payload = {
        term: parseInt(formData.term, 10),
        year: parseInt(formData.year, 10),
      };
      const res = await axios.post(API_ENDPOINTS.TIMETABLE.GENERATE_MIDDLE_ALL, payload, {
        headers: getAuthHeaders(),
      });

      const generatedCount = res.data?.generated?.length || 0;
      const failedCount = res.data?.failed?.length || 0;
      setResult(res.data);
      if (failedCount > 0) {
        setMessage(`Generated ${generatedCount} timetables. ${failedCount} class(es) skipped due to missing teachers/conflicts.`);
      } else {
        setMessage(`Generated ${generatedCount} timetables for grades 6-9 with no conflicts.`);
      }
    } catch (err) {
      setMessage("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <AdminLayout title="AI Timetable - Grades 1-5 & 6-9" role={role}>
      <div className={styles.content}>
        <h1>One Click Timetable Creation</h1>
        <p className={styles.subtitle}>
          Create Grade 1-5 and Grades 6-9 class timetables automatically in one click (separate generators).
        </p>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Term</label>
            <select
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              min="2020"
              max="2035"
            />
          </div>
        </div>

        <div className={styles.subtitle}>
          Active teachers: <strong>{teacherCount}</strong> | Primary classes found: <strong>{classCount}</strong> | Grades 6-9 classes found: <strong>{middleClassCount}</strong>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={handleGenerateAllPrimary}
            disabled={bulkLoading}
          >
            {bulkLoading ? "Generating all Grade 1-5..." : "One Click: Generate All Grades 1-5"}
          </button>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={handleGenerateAllMiddle}
            disabled={bulkLoading}
          >
            {bulkLoading ? "Generating all Grades 6-9..." : "One Click: Generate All Grades 6-9"}
          </button>
        </div>

        {message && (
          <div className={styles.message}>
            {message.toLowerCase().startsWith("error") || message.toLowerCase().startsWith("❌") ? "❌ " : "✅ "} {message}
          </div>
        )}
        {result && (
          <div className={styles.timetablePreview}>
            <h2>Generation Summary</h2>
            <p>
              Term {result.term} - {result.year}
            </p>
            <p>Created: {result.generated?.length || 0}</p>
            <p>Skipped: {result.failed?.length || 0}</p>
            {!!result.failed?.length && (
              <div style={{ marginTop: "10px" }}>
                <strong>Classes with no available teacher:</strong>
                <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                  {result.failed.map((item, index) => (
                    <li key={`${item.grade}-${item.section}-${index}`}>
                      Grade {item.grade}{item.section} - {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTimetableCreation;
