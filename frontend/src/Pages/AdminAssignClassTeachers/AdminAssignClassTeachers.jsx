import React, { useState, useEffect } from "react";
import styles from "./AdminAssignClassTeachers.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const AdminAssignClassTeachers = () => {
  const [grades] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const [sections] = useState(["A", "B", "C", "D"]);
  const [streams] = useState([
    "Arts",
    "Commerce",
    "Technology",
    "Mathematics",
    "Science",
  ]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");

  // Fetch all teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.TEACHERS.BASE, {
          headers: getAuthHeaders(),
        });
        setTeachers(res.data);
      } catch (err) {
        console.error("Error fetching teachers:", err.message);
      }
    };

    const fetchAssignments = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.CLASS_TEACHERS.BASE, {
          headers: getAuthHeaders(),
        });
        setAssignments(res.data);
      } catch (err) {
        console.error("Error fetching assignments:", err.message);
      }
    };

    fetchTeachers();
    fetchAssignments();
  }, []);

  const handleAssign = async () => {
    if (!selectedGrade || !selectedTeacher)
      return alert("Please select grade and teacher.");

    // For Grades 12–13, section can default to 'General'
    const isSenior = parseInt(selectedGrade) >= 12;
    const section = isSenior ? "General" : selectedSection;
    if (!section) return alert("Please select section.");

    const payload = {
      grade: Number(selectedGrade),
      section,
      stream: isSenior ? selectedStream : null,
      teacherId: selectedTeacher,
    };

    try {
      await axios.post(API_ENDPOINTS.CLASS_TEACHERS.BASE, payload, {
        headers: getAuthHeaders(),
      });
      alert("✅ Teacher assigned successfully!");
      const { data } = await axios.get(API_ENDPOINTS.CLASS_TEACHERS.BASE, {
        headers: getAuthHeaders(),
      });
      setAssignments(data);
    } catch (err) {
      alert(err.response?.data?.message || "❌ Failed to assign teacher");
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Assign Class Teachers</h2>

      <div className={styles.formGrid}>
        {/* Grade */}
        <div className={styles.formGroup}>
          <label>Grade</label>
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setSelectedStream("");
              setSelectedSection("");
            }}
          >
            <option value="">Select Grade</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Section */}
        {parseInt(selectedGrade) < 12 && (
          <div className={styles.formGroup}>
            <label>Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="">Select Section</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stream (only 12–13) */}
        {parseInt(selectedGrade) >= 12 && (
          <div className={styles.formGroup}>
            <label>Stream</label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
            >
              <option value="">Select Stream</option>
              {streams.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Teacher */}
        <div className={styles.formGroup}>
          <label>Teacher</label>
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
          >
            <option value="">Select Teacher</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleAssign} className={styles.assignBtn}>
          Assign Teacher
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <h3>Assigned Classes</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Grade</th>
              <th>Section</th>
              <th>Stream</th>
              <th>Teacher</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length > 0 ? (
              assignments.map((a, i) => (
                <tr key={i}>
                  <td>{a.grade}</td>
                  <td>{a.section}</td>
                  <td>{a.stream || "-"}</td>
                  <td>
                    {a.teacherId?.firstName} {a.teacherId?.lastName}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className={styles.empty}>
                  No classes assigned yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAssignClassTeachers;
