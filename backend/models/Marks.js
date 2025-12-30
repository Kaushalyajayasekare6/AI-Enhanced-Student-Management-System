import mongoose from "mongoose";

const marksSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    term: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
    },
    // Marks organized by subject
    // For grades 1-5: maths, english, science, religion, language
    // For grades 6-9: english, sinhala, maths, science, religious, art, geography, citizenship, tamil, pts, health, history
    // For grades 10-11: english, sinhala, maths, science, buddhism, history, cat1, cat2, cat3
    marks: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
      validate: {
        validator: function(v) {
          // Allow empty object or object with numeric values 0-100
          if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
          // If object is empty, that's okay (will be validated in controller)
          if (Object.keys(v).length === 0) return true;
          // Validate all values are numbers between 0-100
          return Object.values(v).every(val => {
            if (val === null || val === undefined) return true; // Allow null/undefined
            const num = Number(val);
            return !isNaN(num) && num >= 0 && num <= 100;
          });
        },
        message: 'Marks must be an object with numeric values between 0-100'
      }
    },
    gradeLevel: {
      type: String,
      enum: ["1-5", "6-9", "10-11"],
      required: true,
    },
    totalMarks: Number, // Auto-calculated
    averageMarks: Number, // Auto-calculated
  },
  { timestamps: true }
);

// Middleware to calculate total and average marks before saving
marksSchema.pre("save", function (next) {
  const markValues = Object.values(this.marks).filter(
    (m) => m !== null && m !== undefined
  );
  if (markValues.length > 0) {
    this.totalMarks = markValues.reduce((a, b) => a + b, 0);
    this.averageMarks = Math.round(this.totalMarks / markValues.length);
  }
  next();
});

export default mongoose.models.Marks || mongoose.model("Marks", marksSchema);
