import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/AdminLayout/AdminLayout";
import { FaSearch, FaEye } from "react-icons/fa";
import axios from "axios";
import styles from "./LeavedStudents.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const LeavedStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]); 
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Fetch leaved students from backend
  useEffect(() => {
    const fetchLeavedStudents = async () => {
      try {
        const res = await axios.get(`${API_ENDPOINTS.STUDENTS.BASE}/leaved`, {
          headers: getAuthHeaders(),
        });
        setStudents(res.data);
      } catch (error) {
        console.error("❌ Error fetching leaved students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeavedStudents();
  }, []);

  // ✅ Filter by search text and year
  const filtered = students.filter((s) => {
    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
    const enrollmentDate = s.enrollmentDate ? s.enrollmentDate.substring(0, 10) : "";
    const leaveDate = s.leaveDate ? s.leaveDate.substring(0, 10) : "";
    return (
      (fullName.includes(search.toLowerCase()) ||
        (s.enrollmentNo || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.bcNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        enrollmentDate.includes(search) ||
        leaveDate.includes(search)) &&
      (filterYear ? leaveDate.startsWith(filterYear) : true)
    );
  });

  const handleViewDetails = (student) => {
    navigate("/AddStudentPage", { state: { student, mode: "view", role: "admin" }, replace: true });
  };

  return (
    <AdminLayout title="Leaved Students" role="admin">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Leaved Students</h1>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search by name, enrollment no, BC no or date"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">Filter by Year</option>
            <option value="2020">2020</option>
            <option value="2021">2021</option>
            <option value="2022">2022</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <p>Loading leaved students...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Enrollment No</th>
                <th>Full Name</th>
                <th>Class</th>
                <th>BC Number</th>
                <th>Enrollment Date</th>
                <th>Leave Date</th>
                <th>Reason / AI Dropout Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student._id}>
                  <td>{student.enrollmentNo}</td>
                  <td>{student.firstName} {student.lastName}</td>
                  <td>{student.grade}</td>
                  <td>{student.bcNumber}</td>
                  <td>{student.enrollmentDate?.substring(0, 10)}</td>
                  <td>{student.leaveDate?.substring(0, 10)}</td>
                  <td>{"Predicted dropout risk: Medium"}</td>
                  <td className={styles.actionBtns}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => handleViewDetails(student)}
                    >
                      <FaEye /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default LeavedStudents;
