import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import styles from "./Sidebar.module.css";
import { getStoredRole, clearAuth } from "../../utils/auth";

const Sidebar = ({ role }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Get role from localStorage (stored during login)
  const storedRole = getStoredRole();
  const userRole = role || storedRole || "student";

  const navMap = {
    student: [
      { label: "Overview", icon: "📊", path: "/StudentDashboard" },
      { label: "Timetable", icon: "📅", path: "/StudentTimetablePage" },
      { label: "Marks", icon: "📑", path: "/StudentMarksPage" },
      { label: "Attendance", icon: "📝", path: "/AttendancePage" },
      { label: "Calendar", icon: "📆", path: "/StudentCalendar" },
      { label: "Dropout Risk", icon: "⚠️", path: "/DropoutRiskPage" },
      { label: "Profile", icon: "👤", path: "/ProfilePage" },
    ],
    teacher: [
      { label: "Dashboard", icon: "📊", path: "/TeacherDashboard" },
      { label: "Timetable", icon: "📅", path: "/TeacherTimetablePage" },
      { label: "Marks", icon: "📑", path: "/TeacherMarksPage" },
      { label: "Attendance", icon: "📝", path: "/TeacherAttendancePage" },
      { label: "At Risk", icon: "⚠️", path: "/TeacherAtRiskStudentsPage" },
      { label: "Class Students", icon: "👥", path: "/TeacherClassStudentsPage" },
      { label: "Profile", icon: "👤", path: "/TeacherProfilePage" },
    ],
    admin: [
      { label: "Dashboard", icon: "🛠", path: "/AdminDashboard" },
      { label: "Students", icon: "🎓", path: "/AllStudents", submenu: [
        { label: "All Students", path: "/AllStudents" },
        { label: "Add Student", path: "/AddStudentPage" },
        { label: "Leaved Students", path: "/LeavedStudents" },
        { label: "Student Reports", path: "/AdminReportsPage" },
      ]},
      { label: "Teachers", icon: "👩‍🏫", path: "/ActiveTeachers", submenu: [
        { label: "Active Teachers", path: "/ActiveTeachers" },
        { label: "Add Teacher", path: "/AddTeacherPage" },
        { label: "Leaved Teachers", path: "/LeavedTeachers" },
        { label: "Assign Class", path: "/AdminAssignClassTeachers" },
      ]},
      { label: "Other Workers", icon: "🧑‍🔧", path: "/OtherWorkerDetailsPage", submenu: [
        { label: "All Workers", path: "/OtherWorkerDetailsPage" },
        { label: "Add Worker", path: "/AddOtherWorkerPage" },
      ]},
      { label: "Timetable", icon: "📅", path: "/AdminTimetableCreation", submenu: [
        { label: "Create Timetable", path: "/AdminTimetableCreation" },
        { label: "View Timetables", path: "/TimetableCreation" },
      ]},
      { label: "School Days", icon: "📆", path: "/AdminSchoolDays" },
      { label: "Notices", icon: "📢", path: "/NoticeManagement" },
    ],
  };

  const navItems = navMap[userRole] || navMap.student;

  const handleNavigation = (path) => {
    navigate(path, {
      state: {
        role: userRole,
      },
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const username = localStorage.getItem("username") || "";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>My School</div>
        <div className={styles.role}>
          {userRole.toUpperCase()}
          {username ? ` — ${username}` : ""}
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <div key={item.path} className={styles.navItem}>
            <Link
              to={item.path}
              className={`${styles.navBtn} ${
                location.pathname === item.path || 
                (item.submenu && item.submenu.some(sub => location.pathname === sub.path))
                  ? styles.active 
                  : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(item.path);
              }}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
            {item.submenu && (
              <div className={styles.submenu}>
                {item.submenu.map((subItem) => (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    className={`${styles.submenuBtn} ${
                      location.pathname === subItem.path ? styles.active : ""
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(subItem.path);
                    }}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span className={styles.icon}>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
