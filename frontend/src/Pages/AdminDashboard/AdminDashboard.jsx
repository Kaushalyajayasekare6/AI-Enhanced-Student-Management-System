import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./AdminDashboard.module.css";
import { getStoredRole } from "../../utils/auth";

const categories = [
  { title: "Students", description: "Manage students, view details & analytics", path: "/Allstudents", icon: "🎓" },
  { title: "Teachers", description: "Manage teachers & profiles", path: "/ActiveTeachers", icon: "👩‍🏫" },
  { title: "Other Staff", description: "Manage non-teaching staff", path: "/OtherWorkerDetailsPage", icon: "🧑‍🔧" },
  { title: "Timetable", description: "Create and analyze timetables", path: "/TimetableCreation", icon: "🗓️" },
  { title: "Reports", description: "Attendance, marks & dropout analytics", path: "/AdminReportsPage", icon: "📊" },
  { title: "Notice Board", description: "Post and view important notices", path: "/NoticeManagement", icon: "📢" },
  { title: "Settings", description: "Admin profile and app settings", path: "/admin/settings", icon: "⚙️" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const role = getStoredRole() || "admin";

  return (
    <div className={styles.page}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Admin Dashboard" />

        <div className={styles.grid}>
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className={styles.card}
              onClick={() => navigate(cat.path)}
            >
              <div className={styles.icon}>{cat.icon}</div>
              <h3>{cat.title}</h3>
              <p>{cat.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
