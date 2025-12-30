// src/Pages/OtherWorkers/OtherWorkersList.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaSearch, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import axios from "axios";
import styles from "./OtherWorkerDetailsPage.module.css";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

const OtherWorkerDetailsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState([]);

  // Fetch workers from backend
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.WORKERS.BASE, {
        headers: getAuthHeaders(),
      });
      setWorkers(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch workers:", err);
    }
  };

  const handleAddWorker = () => {
    navigate("/AddOtherWorkerPage", { state: { mode: "add" } });
  };

  const handleView = (worker) => {
    navigate("/AddOtherWorkerPage", { state: { worker, mode: "view" } });
  };

  const handleEdit = (worker) => {
    navigate("/AddOtherWorkerPage", { state: { worker, mode: "edit" } });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this worker?")) {
      try {
        await axios.delete(API_ENDPOINTS.WORKERS.BY_ID(id), {
          headers: getAuthHeaders(),
        });
        fetchWorkers(); // Refresh list
      } catch (err) {
        console.error("❌ Failed to delete worker:", err);
      }
    }
  };

  const filtered = workers.filter((w) =>
    [w.fullName, w.workerId, w.role, w.phone, w.email].some((val) =>
      val?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Other Workers</h1>
        <button className={styles.addBtn} onClick={handleAddWorker}>
          <FaPlus /> Add Worker
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <FaSearch />
          <input
            type="text"
            placeholder="Search by name, ID, role, phone or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Joined Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((worker) => (
            <tr key={worker._id}>
              <td>{worker.workerId}</td>
              <td>{worker.fullName}</td>
              <td>{worker.role}</td>
              <td>{worker.phone}</td>
              <td>{worker.email}</td>
              <td>{worker.joinedDate}</td>
              <td className={styles.actions}>
                <button className={styles.viewBtn} onClick={() => handleView(worker)}>
                  <FaEye /> View
                </button>
                <button className={styles.editBtn} onClick={() => handleEdit(worker)}>
                  <FaEdit /> Edit
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(worker._id)}>
                  <FaTrash /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OtherWorkerDetailsPage;
