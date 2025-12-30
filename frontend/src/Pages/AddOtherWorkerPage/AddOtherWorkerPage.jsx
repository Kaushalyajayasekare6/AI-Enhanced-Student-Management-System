// src/Pages/OtherWorkers/AddOtherWorkerPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUserPlus, FaUserEdit } from "react-icons/fa";
import axios from "axios";
import styles from "./AddOtherWorkerPage.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const AddOtherWorkerPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { worker, mode } = location.state || { worker: null, mode: "add" };

  const [formData, setFormData] = useState({
    workerId: "",
    fullName: "",
    role: "",
    department: "",
    phone: "",
    email: "",
    address: "",
    joinedDate: "",
  });

  useEffect(() => {
    if (worker) setFormData(worker);
  }, [worker]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "add") {
        await axios.post(API_ENDPOINTS.WORKERS.BASE, formData, {
          headers: getAuthHeaders(),
        });
        alert("✅ Worker added successfully!");
      } else if (mode === "edit") {
        await axios.put(API_ENDPOINTS.WORKERS.BY_ID(formData._id), formData, {
          headers: getAuthHeaders(),
        });
        alert("✏️ Worker updated successfully!");
      }
      navigate("/OtherWorkerDetailsPage");
    } catch (err) {
      console.error("❌ Failed to save worker:", err);
      alert("❌ Failed to save worker. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/OtherWorkersList")}>
          <FaArrowLeft /> Back
        </button>
        <h1>{mode === "add" ? "Add New Worker" : mode === "edit" ? "Edit Worker" : "Worker Details"}</h1>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>Worker ID</label>
            <input
              type="text"
              name="workerId"
              value={formData.workerId}
              onChange={handleChange}
              disabled={mode !== "add"}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={mode === "view"}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={mode === "view"}
              required
            >
              <option value="">-- Select Role --</option>
              <option value="Clerk">Clerk</option>
              <option value="Librarian">Librarian</option>
              <option value="Security">Security</option>
              <option value="Janitor">Janitor</option>
              <option value="Accountant">Accountant</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              disabled={mode === "view"}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Phone</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={mode === "view"} required />
          </div>

          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={mode === "view"} required />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} disabled={mode === "view"} />
          </div>

          <div className={styles.formGroup}>
            <label>Joined Date</label>
            <input type="date" name="joinedDate" value={formData.joinedDate} onChange={handleChange} disabled={mode === "view"} required />
          </div>
        </div>

        <div className={styles.actions}>
          {mode !== "view" && (
            <button type="submit" className={styles.submitBtn}>
              {mode === "add" ? <><FaUserPlus /> Add Worker</> : <><FaUserEdit /> Update Worker</>}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddOtherWorkerPage;
