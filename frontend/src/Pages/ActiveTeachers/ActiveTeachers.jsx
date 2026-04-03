import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/AdminLayout/AdminLayout";
import {
  FaSearch,
  FaEye,
  FaEdit,
  FaUsersSlash,
  FaPlus,
} from "react-icons/fa";
import styles from "./ActiveTeachers.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const ActiveTeachers = ({ role = "admin" }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [teachers, setTeachers] = useState([]);

  // 🔹 Fetch active teachers from backend
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await axios.get(`${API_ENDPOINTS.TEACHERS.BASE}/filter/active`, {
          headers: getAuthHeaders(),
        });
        setTeachers(res.data);
      } catch (err) {
        console.error("Error fetching teachers:", err);
      }
    };
    fetchTeachers();
  }, []);

  const filtered = teachers.filter((t) =>
    [t.fullName, t.teacherId, t.email, t.phone].some(
      (val) => val && val.toLowerCase().includes(search.toLowerCase())
    )
  );

  // 🔹 Handlers
  const handleView = (teacher) => {
    navigate("/AddTeacherPage", { state: { teacher, mode: "view", role } });
  };

  const handleEdit = (teacher) => {
    navigate("/AddTeacherPage", { state: { teacher, mode: "edit", role } });
  };

  const handleLeavedTeachers = () => {
    navigate("/LeavedTeachers", { state: { role } });
  };

  const handleAddTeacher = () => {
    navigate("/AddTeacherPage", { state: { mode: "add", role } });
  };

  // 🔹 Render
  return (
    <AdminLayout title="Active Teachers" role="admin">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Active Teachers</h1>

          <div className={styles.headerButtons}>
            {role === "admin" && (
              <>
                <button className={styles.addBtn} onClick={handleAddTeacher}>
                  <FaPlus /> Add Teacher
                </button>

                <button className={styles.leavedBtn} onClick={handleLeavedTeachers}>
                  <FaUsersSlash /> View Leaved Teachers
                </button>
              </>
            )}
          </div>
        </div>

      {/* Search Filter */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <FaSearch />
          <input
            type="text"
            placeholder="Search by name, ID, email or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Teacher ID</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Class Teacher Of</th>
            <th>Subjects</th>
            <th>AI Insights</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 ? (
            filtered.map((teacher, idx) => (
              <tr key={idx}>
                <td>{teacher.teacherId}</td>
                <td>{teacher.fullName}</td>
                <td>{teacher.email}</td>
                <td>{teacher.phone}</td>
                <td>{teacher.classTeacherOf}</td>
                <td>{teacher.subjects?.join(", ")}</td>
                <td>{"Predicted workload: Moderate"}</td>
                <td className={styles.actions}>
                  <button
                    className={styles.viewBtn}
                    onClick={() => handleView(teacher)}
                  >
                    <FaEye /> View
                  </button>
                  {role === "admin" && (
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEdit(teacher)}
                    >
                      <FaEdit /> Edit
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className={styles.noData}>
                No teachers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </AdminLayout>
  );
};

export default ActiveTeachers;
