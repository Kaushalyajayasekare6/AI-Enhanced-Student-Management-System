import React, { useState } from "react";
import styles from "./TimetableModal.module.css";

const TimetableModal = ({ subjects, teachers, onClose, onSave }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [selectedTeacher, setSelectedTeacher] = useState(teachers[0]);

  const handleSave = () => {
    onSave(selectedSubject, selectedTeacher);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h3>Assign Subject & Teacher</h3>
        <label>
          Subject:
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Teacher:
          <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
            {teachers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={handleSave}>Save</button>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TimetableModal;
