import mongoose from "mongoose";

const classTeacherSchema = new mongoose.Schema(
  {
    grade: {
      type: Number,
      required: true,
    },
    section: {
      type: String,
      required: true,
    },
    stream: {
      type: String,
      default: null, // Only used for Grades 12–13
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate combinations of grade + section + stream
classTeacherSchema.index({ grade: 1, section: 1, stream: 1 }, { unique: true });

const ClassTeacher =
  mongoose.models.ClassTeacher ||
  mongoose.model("ClassTeacher", classTeacherSchema);

export default ClassTeacher;
