import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    nic: String,
    gender: String,
    dob: String,
    enrollmentDate: String,
    leaveDate: String,
    phone: String,
    email: String,
    address: String,
    location: String,
    district: String,
    pincode: String,
    street: String,
    username: String,
    password: String,
    subjects: [String],
    classRange: String,
  },
  { timestamps: true }
);

export default mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);
