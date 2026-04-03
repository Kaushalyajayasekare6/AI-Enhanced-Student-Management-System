import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./AddTeacherForm.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const subjectsList = [
  "Sinhala", "Tamil", "English", "Science", "Maths", "Geography", "History",
  // Religion teachers (faith-specific)
  "Buddhism", "Hinduism", "Islam", "Catholicism", "Christianity",
  // Other compulsory / middle level subjects
  "ICT", "Advanced Maths", "BIO", "Physics", "Chemistry", "Technology", "Commerce", "ART",
  "Dancing", "Music", "Art", "Literature English", "Literature Sinhala", "Health",
  "Civilization", "Social Science",
  // Civic education aliases
  "Civic Education", "Citizenship", "Life Competencies",
  // PTS
  "PTS (Physical Training)",
  // Elective
  "Drama and Theatre"
];

const classesList = ["1-5 Grades", "6-9 Grades", "10-11 Grade", "A/L Classes"];

const AddTeacherForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode = "add", teacher = {} } = location.state || {};
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: teacher.firstName || "",
    lastName: teacher.lastName || "",
    nic: teacher.nic || "",
    gender: teacher.gender || "",
    dob: teacher.dob || "",
    enrollmentDate: teacher.enrollmentDate || "",
    leaveDate: teacher.leaveDate || "",
    phone: teacher.phone || "",
    email: teacher.email || "",
    address: teacher.address || "",
    location: teacher.location || "",
    district: teacher.district || "",
    pincode: teacher.pincode || "",
    street: teacher.street || "",
    username: teacher.username || "",
    password: teacher.password || "",
    subjects: teacher.subjects || [],
    classRange: teacher.classRange || "",
  });

  const isViewMode = mode === "view";
  const role = location.state?.role || "admin";
  const isEditMode = mode === "edit";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (subject) => {
    setFormData((prev) => {
      const alreadySelected = prev.subjects.includes(subject);
      return {
        ...prev,
        subjects: alreadySelected
          ? prev.subjects.filter((s) => s !== subject)
          : [...prev.subjects, subject],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await axios.put(API_ENDPOINTS.TEACHERS.BY_ID(teacher._id), formData, {
          headers: getAuthHeaders(),
        });
        alert("✅ Teacher updated successfully!");
      } else {
        await axios.post(API_ENDPOINTS.TEACHERS.BASE, formData, {
          headers: getAuthHeaders(),
        });
        alert("✅ Teacher added successfully!");
      }
      navigate("/ActiveTeachers");
    } catch (error) {
      console.error("Error saving teacher:", error);
      alert("❌ Failed to save teacher. Please try again.");
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.pageTitle}>
        {isEditMode ? "Edit Teacher" : isViewMode ? "View Teacher" : "Add New Teacher"}
      </h2>

      {/* Teacher Info */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Teacher Information</h3>
        <div className={styles.grid}>
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="text"
            name="nic"
            placeholder="NIC Number"
            value={formData.nic}
            onChange={handleChange}
            disabled={isViewMode}
          />

          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                name="gender"
                value="Male"
                checked={formData.gender === "Male"}
                onChange={handleChange}
                disabled={isViewMode}
              />
              Male
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="Female"
                checked={formData.gender === "Female"}
                onChange={handleChange}
                disabled={isViewMode}
              />
              Female
            </label>
          </div>

          {/* 🔹 Date Fields with Labels */}
          <div>
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>

          <div>
            <label>Enrollment Date</label>
            <input
              type="date"
              name="enrollmentDate"
              value={formData.enrollmentDate}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>

          <div>
            <label>Leave Date</label>
            <input
              type="date"
              name="leaveDate"
              value={formData.leaveDate}
              onChange={handleChange}
              disabled={isViewMode}
            />
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Contact Information</h3>
        <div className={styles.grid}>
          <input
            type="text"
            name="phone"
            placeholder="Contact Number"
            value={formData.phone}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="text"
            name="address"
            placeholder="Address (Area and Street)"
            className={styles.fullWidth}
            value={formData.address}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="text"
            name="district"
            placeholder="District"
            value={formData.district}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="text"
            name="pincode"
            placeholder="Pincode"
            value={formData.pincode}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <input
            type="text"
            name="street"
            placeholder="Street"
            value={formData.street}
            onChange={handleChange}
            disabled={isViewMode}
          />
        </div>
      </section>

      {/* Login */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Login Account Details</h3>
        <div className={styles.grid}>
          <input
            type="text"
            name="username"
            placeholder="User Name"
            value={formData.username}
            onChange={handleChange}
            disabled={isViewMode}
          />
          <div className={styles.passwordRow}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
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
      </section>

      {/* Assigned Subjects */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Assigned Subjects</h3>
        <div className={styles.toggleList}>
          {subjectsList.map((subj) => (
            <label key={subj} className={styles.toggleItem}>
              <span>{subj}</span>
              <input
                type="checkbox"
                checked={formData.subjects.includes(subj)}
                onChange={() => handleCheckbox(subj)}
                disabled={isViewMode}
              />
              <span className={styles.switch}></span>
            </label>
          ))}
        </div>
      </section>

      {/* Assigned Class Range */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Assigned Class Range</h3>
        <div className={styles.toggleList}>
          {classesList.map((cls) => (
            <label key={cls} className={styles.toggleItem}>
              <span>{cls}</span>
              <input
                type="radio"
                name="classRange"
                checked={formData.classRange === cls}
                onChange={() => setFormData((p) => ({ ...p, classRange: cls }))}
                disabled={isViewMode}
              />
              <span className={styles.switch}></span>
            </label>
          ))}
        </div>
      </section>

      {/* Actions */}
      {!isViewMode && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => navigate("/ActiveTeachers")}
          >
            Cancel
          </button>
          <button type="submit" className={styles.submit}>
            {isEditMode ? "Update" : "Add"}
          </button>
        </div>
      )}
    </form>
  );
};

export default AddTeacherForm;
