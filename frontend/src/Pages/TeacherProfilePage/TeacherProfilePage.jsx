import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import Header from "../../Components/Header/Header";
import styles from "./TeacherProfilePage.module.css";
import axios from "axios";
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";
import { getStoredRole } from "../../utils/auth";

const TeacherProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const role = getStoredRole() || "teacher";

  // 🔹 Fetch teacher profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(`${API_ENDPOINTS.TEACHERS.BASE}/me`, {
          headers: getAuthHeaders(),
        });
        setProfile(res.data);
      } catch (err) {
        console.error("Error fetching teacher profile:", err);
        setError(err.response?.data?.message || "Failed to load teacher profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 🔹 Handle save (PUT)
  const save = async () => {
    try {
      setError("");
      await axios.put(`${API_ENDPOINTS.TEACHERS.BASE}/me`, profile, {
        headers: getAuthHeaders(),
      });
      alert("✅ Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.response?.data?.message || "Failed to update profile.");
    }
  };

  if (loading) return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Profile" />
        <p>Loading profile...</p>
      </main>
    </div>
  );

  if (error && !profile) return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Profile" />
        <div className={styles.error}>{error}</div>
      </main>
    </div>
  );

  if (!profile) return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Profile" />
        <p>No profile found.</p>
      </main>
    </div>
  );

  return (
    <div className={styles.dashboard}>
      <Sidebar role={role} />
      <main className={styles.main}>
        <Header title="Profile" />
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>Personal and contact details — edit to update</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.card}>
          <div className={styles.row}>
            <label>First Name</label>
            <input
              value={profile.firstName || ""}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className={styles.row}>
            <label>Last Name</label>
            <input
              value={profile.lastName || ""}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className={styles.row}>
            <label>NIC</label>
            <input
              value={profile.nic || ""}
              onChange={(e) => setProfile({ ...profile, nic: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className={styles.row}>
            <label>Email</label>
            <input
              type="email"
              value={profile.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className={styles.row}>
            <label>Phone</label>
            <input
              type="tel"
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className={styles.row}>
            <label>Address</label>
            <textarea
              value={profile.address || ""}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className={styles.row}>
            <label>District</label>
            <input
              value={profile.district || ""}
              onChange={(e) => setProfile({ ...profile, district: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className={styles.row}>
            <label>Subjects</label>
            <input
              value={profile.subjects?.join(", ") || ""}
              onChange={(e) => setProfile({ 
                ...profile, 
                subjects: e.target.value.split(",").map(s => s.trim()).filter(s => s) 
              })}
              disabled={!editing}
              placeholder="Comma separated subjects"
            />
          </div>
          <div className={styles.row}>
            <label>Class Range</label>
            <input
              value={profile.classRange || ""}
              onChange={(e) => setProfile({ ...profile, classRange: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className={styles.actions}>
            {editing ? (
              <>
                <button className={styles.cancel} onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className={styles.save} onClick={save}>
                  Save
                </button>
              </>
            ) : (
              <button className={styles.edit} onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherProfilePage;



