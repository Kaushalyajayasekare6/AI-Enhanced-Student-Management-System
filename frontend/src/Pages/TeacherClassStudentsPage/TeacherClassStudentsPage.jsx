import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TeacherClassStudentsPage.module.css";
import { getStoredRole } from "../../utils/auth";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import jsPDF from "jspdf";

// will be fetched from API

const TeacherClassStudentsPage = () => {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentMarks, setStudentMarks] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const navigate = useNavigate();
  const role = getStoredRole() || "teacher";

  // Fetch teacher's assigned class students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS, {
          headers: getAuthHeaders(),
        });
        const classStudents = res.data.students || [];
        setStudents(classStudents);
      } catch (err) {
        console.error("Error fetching teacher students:", err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      (s.firstName || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.lastName || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.enrollmentNo || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.enrollmentNo || s.enrolment || "").toLowerCase().includes(search.toLowerCase())
  );

  // Fetch details for a single student (personal, marks, attendance)
  const openStudentDetails = async (student) => {
    setSelectedStudent(student);
    setDetailLoading(true);
    setStudentDetails(null);
    setStudentMarks([]);
    setStudentAttendance([]);

    try {
      // Personal / parent details
      const studentRes = await axios.get(API_ENDPOINTS.STUDENTS.BY_ID(student._id), {
        headers: getAuthHeaders(),
      });
      setStudentDetails(studentRes.data);

      // Marks for student
      const marksRes = await axios.get(API_ENDPOINTS.MARKS.STUDENT, {
        headers: getAuthHeaders(),
        params: { studentId: student._id },
      });
      setStudentMarks(marksRes.data.marks || []);

      // Class attendance (teacher endpoint) and filter for this student
      const now = new Date();
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;
      const attRes = await axios.get(API_ENDPOINTS.ATTENDANCE.CLASS, {
        headers: getAuthHeaders(),
        params: { from: yearStart, to: yearEnd },
      });
      const attendance = (attRes.data.attendance || []).filter(
        (a) => String(a.studentId) === String(student._id)
      );
      setStudentAttendance(attendance);
    } catch (err) {
      console.error("Error loading student details:", err);
      alert("Failed to load student details: " + (err.response?.data?.message || err.message));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
    setStudentMarks([]);
    setStudentAttendance([]);
  };

  // Export student list as PDF
  const exportStudentsPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Class Students List", 105, 20, { align: "center" });
    
    let yPos = 35;
    
    // Table header
    doc.setFontSize(12);
    doc.text("Name", 14, yPos);
    doc.text("Grade", 60, yPos);
    doc.text("Section", 85, yPos);
    doc.text("Enrolment", 110, yPos);
    doc.text("BC Number", 150, yPos);
    yPos += 10;
    
    // Draw line
    doc.line(14, yPos - 5, 190, yPos - 5);
    yPos += 5;
    
    // Student data
    doc.setFontSize(10);
    filteredStudents.forEach((student, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(`${student.firstName || ""} ${student.lastName || ""}`.trim(), 14, yPos);
      doc.text(student.grade || "N/A", 60, yPos);
      doc.text(student.section || "N/A", 85, yPos);
      doc.text(student.enrollmentNo || student.enrolment || "N/A", 110, yPos);
      doc.text(student.bcNumber || "N/A", 150, yPos);
      yPos += 8;
    });
    
    doc.save("class_students.pdf");
  };

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Class Students" />

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search by name or enrolment number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={exportStudentsPDF} className={styles.exportBtn}>
            📄 Export PDF
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Grade</th>
                <th>Section</th>
                <th>Enrolment No</th>
                <th>BC Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading students...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6}>No students found</td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s._id}>
                    <td>{`${s.firstName || ""} ${s.lastName || ""}`.trim()}</td>
                    <td>{s.grade}</td>
                    <td>{s.section}</td>
                    <td>{s.enrollmentNo || s.enrolment}</td>
                    <td>{s.bcNumber}</td>
                    <td>
                      <button
                        className={styles.viewBtn}
                        onClick={() => openStudentDetails(s)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Student Details Modal */}
        {selectedStudent && (
          <div className={styles.modalBackdrop} onClick={closeDetails}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Student Details</h3>
                <button className={styles.closeBtn} onClick={closeDetails}>✕</button>
              </div>
              {detailLoading ? (
                <div>Loading...</div>
              ) : (
                <div className={styles.modalBody}>
                  {studentDetails ? (
                    <>
                      <section className={styles.section}>
                        <h4>Personal</h4>
                        <p><strong>Name:</strong> {studentDetails.firstName} {studentDetails.lastName}</p>
                        <p><strong>Grade:</strong> {studentDetails.grade} / <strong>Section:</strong> {studentDetails.section}</p>
                        <p><strong>DOB:</strong> {studentDetails.dob}</p>
                        <p><strong>Gender:</strong> {studentDetails.gender}</p>
                        <p><strong>Contact:</strong> {studentDetails.contactNumber}</p>
                        <p><strong>Address:</strong> {studentDetails.address}</p>
                      </section>

                      <section className={styles.section}>
                        <h4>Parent / Guardian</h4>
                        <p><strong>Father:</strong> {studentDetails.fatherName} ({studentDetails.fatherContact})</p>
                        <p><strong>Mother:</strong> {studentDetails.motherName} ({studentDetails.motherContact})</p>
                      </section>

                      <section className={styles.section}>
                        <h4>Marks</h4>
                        {studentMarks.length === 0 ? (
                          <p>No marks available</p>
                        ) : (
                          <ul>
                            {studentMarks.map((m) => (
                              <li key={m._id}>{m.year} - Term {m.term}: {JSON.stringify(m.marks)}</li>
                            ))}
                          </ul>
                        )}
                      </section>

                      <section className={styles.section}>
                        <h4>Attendance (current year)</h4>
                        {studentAttendance.length === 0 ? (
                          <p>No attendance records</p>
                        ) : (
                          <table className={styles.smallTable}>
                            <thead>
                              <tr><th>Date</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                              {studentAttendance.map((a) => (
                                <tr key={a._id}><td>{a.date}</td><td>{a.status}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </section>
                    </>
                  ) : (
                    <p>No details available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherClassStudentsPage;
