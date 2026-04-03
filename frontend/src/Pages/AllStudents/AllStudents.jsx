import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../Components/AdminLayout/AdminLayout";
import { FaPlus, FaUserSlash, FaSearch, FaEye, FaEdit } from "react-icons/fa";
import axios from "axios";
import styles from "./AllStudents.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const AllStudents = ({ role = "admin" }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ Fetch students from backend
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.STUDENTS.BASE, {
          headers: getAuthHeaders(),
        });
        setStudents(res.data);
      } catch (error) {
        console.error("❌ Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // ✅ Filter students by search, year, grade, and section
  const filtered = students.filter((s) => {
    const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
    const enrollmentDate = s.enrollmentDate ? s.enrollmentDate.substring(0, 10) : "";
    const gradeStr = String(s.grade || "");
    
    return (
      (fullName.includes(search.toLowerCase()) ||
        (s.enrollmentNo || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.bcNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        enrollmentDate.includes(search)) &&
      (filterYear ? enrollmentDate.startsWith(filterYear) : true) &&
      (filterGrade ? gradeStr.includes(filterGrade) : true) &&
      (filterSection ? s.section === filterSection : true)
    );
  });

  // Get unique grades and sections for filters
  const uniqueGrades = [...new Set(students.map(s => {
    const gradeStr = String(s.grade || "");
    const match = gradeStr.match(/\d+/);
    return match ? `Grade ${match[0]}` : gradeStr;
  }).filter(Boolean))].sort();

  const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  const handleAddStudent = () => {
    navigate("/AddStudentPage", { state: { mode: "add", role } });
  };

  const handleLeavedStudents = () => {
    navigate("/LeavedStudents", { state: { role } });
  };

  const handleViewDetails = (student) => {
    navigate("/AddStudentPage", { state: { student, mode: "view", role } });
  };

  const handleEdit = (student) => {
    navigate("/AddStudentPage", { state: { student, mode: "edit", role } });
  };

  return (
    <AdminLayout title="All Students" role="admin">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>All Students</h1>
          {role === "admin" && (
            <div className={styles.actions}>
              <button className={styles.addBtn} onClick={handleAddStudent}>
                <FaPlus /> Add Student
              </button>
              <button className={styles.leaveBtn} onClick={handleLeavedStudents}>
                <FaUserSlash /> Leaved Students
              </button>
            </div>
          )}
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
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="">All Grades</option>
            {uniqueGrades.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
          >
            <option value="">All Sections</option>
            {uniqueSections.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <p>Loading students...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Enrollment No</th>
                <th>Full Name</th>
                <th>Grade</th>
                <th>BC Number</th>
                <th>Enrollment Date</th>
                <th>Status</th>
                <th>AI Prediction</th>
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
                  <td className={student.leaveDate ? styles.inactive : styles.active}>
                    {student.leaveDate ? "Left" : "Active"}
                  </td>
                  <td>
                    {student.leaveDate ? "—" : "Stable Performance"}
                  </td>
                  <td className={styles.actionBtns}>
                    <button className={styles.viewBtn} onClick={() => handleViewDetails(student)}>
                      <FaEye /> View
                    </button>
                    {role === "admin" && (
                      <button className={styles.editBtn} onClick={() => handleEdit(student)}>
                        <FaEdit /> Edit
                      </button>
                    )}
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

export default AllStudents;
