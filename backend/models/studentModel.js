// models/studentModel.js
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    enrollmentNo: { type: String, required: true, unique: true },
    firstName: String,
    lastName: String,
    gender: String,
    dob: String,
    grade: { 
      type: String,  // Stored as "Grade 8" format
      required: true 
    },
    section: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
    stream: String, // For Grade 12-13
    term: String,
    contactNumber: String,
    address: String,
    district: String,
    pincode: String,
    username: String,
    password: String,
    fatherName: String,
    fatherContact: String,
    motherName: String,
    motherContact: String,
    bcNumber: { type: String, required: true },
    enrollmentDate: String,
    leaveDate: String,
    terms: [{
      year: Number,
      term: Number,
      marks: mongoose.Schema.Types.Mixed, // { subject: mark }
    }],
  },
  { timestamps: true }
);

export default mongoose.models.Student ||
  mongoose.model("Student", studentSchema);