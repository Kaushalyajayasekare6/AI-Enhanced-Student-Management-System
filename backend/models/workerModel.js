import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
  workerId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  joinedDate: { type: String },
}, { timestamps: true });

const Worker = mongoose.model("Worker", workerSchema);
export default Worker;
