import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import { LayoutProvider, useLayout } from '../../contexts/LayoutContext';
import { getStoredRole } from '../../utils/auth';
import styles from './StudentLayout.module.css';

const StudentLayoutContent = ({ children, title, role = 'student' }) => {
  const { isSidebarOpen, closeSidebar, isMobile } = useLayout();

  return (
    <div className={styles.page}>
      <Sidebar role={role} isOpen={isSidebarOpen} onClose={closeSidebar} />
      {isSidebarOpen && isMobile && (
        <div className={styles.overlay} onClick={closeSidebar} />
      )}
      <main className={styles.main}>
        <Header title={title} />
        {children}
      </main>
    </div>
  );
};

const StudentLayout = ({ children, title, role }) => (
  <StudentLayoutContent role={role} title={title}>
    {children}
  </StudentLayoutContent>
);

export default StudentLayout;