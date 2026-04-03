import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./AddStudentForm.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const GRADE_OPTIONS = [
 1,2,3,4,5,6,7,8,9,10,11,12
];

const SECTION_OPTIONS = ["A", "B", "C", "D"];
const STREAM_OPTIONS = ["Arts", "Commerce", "Tech", "Math", "Science"];
const TERM_OPTIONS = ["Term 1", "Term 2", "Term 3"];

const AddStudentForm = ({ student = {}, mode = "add", role }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    enrollmentNo: "",
    firstName: "",
    lastName: "",
    gender: "",
    dob: "",
    bcNumber: "",
    enrollmentDate: "",
    leaveDate: "",
    grade: "",
    section: "",
    stream: "",
    term: "",
    contactNumber: "",
    address: "",
    district: "",
    pincode: "",
    username: "",
    password: "",
    fatherName: "",
    fatherContact: "",
    motherName: "",
    motherContact: "",
  });

  useEffect(() => {
    if (student) setFormData((prev) => ({ ...prev, ...student }));
  }, [student]);

  const isViewMode =
    mode === "view" || role === "student" || role === "teacher";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    try {
      if (mode === "add") {
        await axios.post(API_ENDPOINTS.STUDENTS.BASE, formData, {
          headers: getAuthHeaders(),
        });
        alert("✅ Student added successfully!");
      } else {
        await axios.put(
          API_ENDPOINTS.STUDENTS.BY_ID(student._id),
          formData,
          {
            headers: getAuthHeaders(),
          }
        );
        alert("✅ Student updated successfully!");
      }

      setFormData({
        enrollmentNo: "",
        firstName: "",
        lastName: "",
        gender: "",
        dob: "",
        bcNumber: "",
        enrollmentDate: "",
        leaveDate: "",
        grade: "",
        section: "",
        stream: "",
        term: "",
        contactNumber: "",
        address: "",
        district: "",
        pincode: "",
        username: "",
        password: "",
        fatherName: "",
        fatherContact: "",
        motherName: "",
        motherContact: "",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("❌ Failed to save student. Please try again.");
    }
  };

  const showStream =
    formData.grade === "Grade 12" || formData.grade === "Grade 13";

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* STUDENT INFORMATION */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Student Information</h3>
        <div className={styles.grid}>
          {/* Basic Info */}
          <div className={styles.formGroup}>
            <label>Enrollment Number</label>
            <input
              type="text"
              name="enrollmentNo"
              value={formData.enrollmentNo}
              onChange={handleChange}
              disabled={isViewMode}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              disabled={isViewMode}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>

          {/* Gender & DOB */}
          <div className={styles.formGroup}>
            <label>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={isViewMode}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>

          <div className={styles.formGroup}>
            <label>BC Number</label>
            <input
              type="text"
              name="bcNumber"
              value={formData.bcNumber}
              onChange={handleChange}
              disabled={isViewMode}
              required
              placeholder="Enter BC Number"
            />
          </div>

          {/* Enrollment Info */}
          <div className={styles.formGroup}>
            <label>Enrollment Date</label>
            <input
              type="date"
              name="enrollmentDate"
              value={formData.enrollmentDate}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Leave Date</label>
            <input
              type="date"
              name="leaveDate"
              value={formData.leaveDate}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>

          {/* Grade */}
          <div className={styles.formGroup}>
            <label>Grade</label>
            <select
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              disabled={isViewMode}
              required
            >
              <option value="">Select Grade</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Section or Stream */}
          {!showStream ? (
            <div className={styles.formGroup}>
              <label>Section</label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                disabled={isViewMode}
                required
              >
                <option value="">Select Section</option>
                {SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label>Stream</label>
              <select
                name="stream"
                value={formData.stream}
                onChange={handleChange}
                disabled={isViewMode}
                required
              >
                <option value="">Select Stream</option>
                {STREAM_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Term */}
          <div className={styles.formGroup}>
            <label>Term</label>
            <select
              name="term"
              value={formData.term}
              onChange={handleChange}
              disabled={isViewMode}
            >
              <option value="">Select Term</option>
              {TERM_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* CONTACT INFORMATION */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Contact Information</h3>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>Contact Number</label>
            <input
              type="text"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
          <div className={styles.formGroup}>
            <label>District</label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Postal Code</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
        </div>
      </section>

      {/* LOGIN ACCOUNT */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Login Account</h3>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <div className={styles.passwordRow}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isViewMode}
              />
              {role === "admin" && (
                <button
                  type="button"
                  className={styles.viewPasswordBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "View"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PARENT INFORMATION */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Parent Information</h3>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>Father's Name</label>
            <input
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Father's Contact</label>
            <input
              type="text"
              name="fatherContact"
              value={formData.fatherContact}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Mother's Name</label>
            <input
              type="text"
              name="motherName"
              value={formData.motherName}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Mother's Contact</label>
            <input
              type="text"
              name="motherContact"
              value={formData.motherContact}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
        </div>
      </section>

      {!isViewMode && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => window.location.reload()}
          >
            Cancel
          </button>
          <button type="submit" className={styles.submit}>
            {mode === "add" ? "Add Student" : "Update Student"}
          </button>
        </div>
      )}
    </form>
  );
};

export default AddStudentForm;
