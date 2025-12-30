import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./ProfilePage.module.css";
import { getStoredRole, getStoredToken } from "../../utils/auth";

const ProfilePage = () => {
  const role = getStoredRole() || "student";
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/students/me",
          {
            headers: {
              Authorization: `Bearer ${getStoredToken()}`,
            },
          }
        );
        setStudent(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };

    if (role === "student") fetchProfile();
  }, [role]);

  if (loading) return <p>Loading profile...</p>;
  if (!student) return <p>No profile data</p>;

  return (
    <div className={styles.page}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Profile" />

        <section className={styles.card}>
          <h3>Student Profile</h3>
          <div className={styles.grid}>
            <div><strong>Enrollment No</strong><div>{student.enrollmentNo}</div></div>
            <div><strong>Name</strong><div>{student.firstName} {student.lastName}</div></div>
            <div><strong>Grade</strong><div>{student.grade} - {student.section}</div></div>
            <div><strong>BC No</strong><div>{student.bcNumber}</div></div>
            <div><strong>DOB</strong><div>{student.dob}</div></div>
            <div><strong>Contact</strong><div>{student.contactNumber}</div></div>
            <div className={styles.full}>
              <strong>Address</strong>
              <div>{student.address}</div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h3>Parent / Guardian</h3>
          <div className={styles.grid}>
            <div><strong>Father</strong><div>{student.fatherName}</div></div>
            <div><strong>Contact</strong><div>{student.fatherContact}</div></div>
            <div><strong>Mother</strong><div>{student.motherName}</div></div>
            <div><strong>Contact</strong><div>{student.motherContact}</div></div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
