import axios from "axios";
import Student from "../models/studentModel.js";
import Marks from "../models/Marks.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

export const predictDropoutRisk = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { studentId, year, term } = req.body;

    // If studentId is provided (for admin/teacher), use it; otherwise use logged-in student
    let targetStudentId = studentId;
    
    if (!targetStudentId && userId) {
      // Get current logged-in student
      const user = await User.findById(userId);
      if (user && user.role === "student") {
        targetStudentId = user.userId;
      }
    }

    if (!targetStudentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    // Get student data
    const student = await Student.findById(targetStudentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get current year and term if not provided
    const currentYear = year || new Date().getFullYear();
    const currentTerm = term || 1;

    // Fetch latest marks for the student
    const marksQuery = { studentId: targetStudentId };
    if (year) marksQuery.year = Number(year);
    if (term) marksQuery.term = Number(term);

    const marksRecords = await Marks.find(marksQuery)
      .sort({ year: -1, term: -1 })
      .limit(1);

    // Get the most recent marks record
    const latestMarks = marksRecords.length > 0 ? marksRecords[0] : null;
    const marks = latestMarks?.marks || {};

    // Map subjects from database to ML model format
    // ML model expects: english, math, sinhala, tamil, env, attendance
    const english = marks.english || marks.English || 0;
    const math = marks.maths || marks.Maths || marks.math || 0;
    const sinhala = marks.sinhala || marks.Sinhala || 0;
    const tamil = marks.tamil || marks.Tamil || 0;
    // Map science/environment to env
    const env = marks.science || marks.Science || marks.environment || marks.Environment || 0;

    // Calculate attendance percentage for current year
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;
    
    const attendanceRecords = await Attendance.find({
      studentId: targetStudentId,
      date: { $gte: yearStart, $lte: yearEnd }
    });

    const presentCount = attendanceRecords.filter(a => a.status === "P").length;
    const totalDays = attendanceRecords.length;
    const attendance = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    // Prepare data for ML model
    const mlInput = {
      english: Number(english) || 0,
      math: Number(math) || 0,
      sinhala: Number(sinhala) || 0,
      tamil: Number(tamil) || 0,
      env: Number(env) || 0,
      attendance: attendance
    };

    // Call FastAPI ML service for dropout prediction
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8001";
    const mlResponse = await axios.post(
      `${mlServiceUrl}/predict-dropout`,
      mlInput,
      {
        timeout: 10000 // 10 second timeout
      }
    );

    // Extract risk data and prepare comprehensive response
    const riskData = mlResponse.data;
    const isAtRisk = riskData.risk_level === "High" || riskData.risk_level === "Medium";

    res.json({
      success: true,
      prediction: riskData,
      inputData: {
        current_marks: mlInput,
        attendance_percentage: mlInput.attendance
      },
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        grade: student.grade
      },
      riskAssessment: {
        isAtRisk: isAtRisk,
        level: riskData.risk_level,
        score: riskData.risk_score,
        factors: riskData.factors,
        recommendations: riskData.recommendations || []
      }
    });

  } catch (error) {
    console.error("Dropout Prediction Error:", error.message);
    console.error("Error Stack:", error.stack);
    
    // If ML service is not available, return a default prediction
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        success: false,
        message: "ML prediction service is currently unavailable",
        error: "Service connection failed"
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Dropout risk prediction failed",
      error: error.message 
    });
  }
};
