import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/AdminLayout/AdminLayout";
import { FaSearch, FaEye } from "react-icons/fa";
import styles from "./LeavedTeachers.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const LeavedTeachers = ({ role = "admin" }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await axios.get(`${API_ENDPOINTS.TEACHERS.BASE}/filter/leaved`, {
          headers: getAuthHeaders(),
        });
        setTeachers(res.data);
      } catch (err) {
        console.error("Error fetching leaved teachers:", err);
      }
    };
    fetchTeachers();
  }, []);

  const filtered = teachers.filter((t) =>
    [t.fullName, t.teacherId, t.email, t.phone, t.leaveDate].some(
      (val) => val && val.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleView = (teacher) => {
    navigate("/AddTeacherPage", { state: { teacher, mode: "view", role } });
  };

  return (
    <AdminLayout title="Leaved Teachers" role="admin">
      <div className={styles.container}>
        <h1>Leaved Teachers</h1>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search by name, ID, email, phone or date"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Teacher ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Class Teacher Of</th>
              <th>Leave Date</th>
              <th>AI Insight</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((teacher, idx) => (
              <tr key={idx}>
                <td>{teacher.teacherId}</td>
                <td>{teacher.fullName}</td>
                <td>{teacher.email}</td>
                <td>{teacher.phone}</td>
                <td>{teacher.classTeacherOf}</td>
                <td>{teacher.leaveDate}</td>
                <td>{"Possible reason: transfer / workload"}</td>
                <td className={styles.actions}>
                  <button className={styles.viewBtn} onClick={() => handleView(teacher)}>
                    <FaEye /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default LeavedTeachers;
