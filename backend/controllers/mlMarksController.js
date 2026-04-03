import axios from "axios";
import Student from "../models/studentModel.js";
import Marks from "../models/Marks.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

// Original prediction endpoint
export const predictMarksML = async (req, res) => {
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

    // Restrict grade 1-5 only for mark prediction
    const studentGrade = student.grade ? String(student.grade).match(/(\d+)/) : null;
    const gradeValue = studentGrade ? Number(studentGrade[1]) : null;
    if (!gradeValue || gradeValue < 1 || gradeValue > 5) {
      return res.status(400).json({ success: false, message: "Marks prediction is available only for grades 1 to 5." });
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

    // Debug logging
    console.log("Student marks from DB:", marks);

    // Map subjects from database to ML model format
    // ML model expects: english, math, sinhala, tamil, env, attendance
    // Try multiple possible field names for each subject
    const english = (marks.english !== undefined && marks.english !== null) ? marks.english :
                    (marks.English !== undefined && marks.English !== null) ? marks.English :
                    (marks.ENGLISH !== undefined && marks.ENGLISH !== null) ? marks.ENGLISH : 50;
    
    const math = (marks.math !== undefined && marks.math !== null) ? marks.math :
                 (marks.Maths !== undefined && marks.Maths !== null) ? marks.Maths :
                 (marks.maths !== undefined && marks.maths !== null) ? marks.maths :
                 (marks.MATH !== undefined && marks.MATH !== null) ? marks.MATH : 50;
    
    const sinhala = (marks.sinhala !== undefined && marks.sinhala !== null) ? marks.sinhala :
                    (marks.Sinhala !== undefined && marks.Sinhala !== null) ? marks.Sinhala :
                    (marks.SINHALA !== undefined && marks.SINHALA !== null) ? marks.SINHALA : 50;
    
    const tamil = (marks.tamil !== undefined && marks.tamil !== null) ? marks.tamil :
                  (marks.Tamil !== undefined && marks.Tamil !== null) ? marks.Tamil :
                  (marks.TAMIL !== undefined && marks.TAMIL !== null) ? marks.TAMIL : 50;
    
    // Map science/environment to env (try multiple variations)
    const env = (marks.env !== undefined && marks.env !== null) ? marks.env :
                (marks.ENV !== undefined && marks.ENV !== null) ? marks.ENV :
                (marks.science !== undefined && marks.science !== null) ? marks.science :
                (marks.Science !== undefined && marks.Science !== null) ? marks.Science :
                (marks.environment !== undefined && marks.environment !== null) ? marks.environment :
                (marks.Environment !== undefined && marks.Environment !== null) ? marks.Environment : 50;
    
    // Map religion (try multiple variations)
    const religion = (marks.religion !== undefined && marks.religion !== null) ? marks.religion :
                     (marks.Religion !== undefined && marks.Religion !== null) ? marks.Religion :
                     (marks.RELIGION !== undefined && marks.RELIGION !== null) ? marks.RELIGION : 50;
    
    console.log("Extracted marks:", { english, math, sinhala, tamil, env, religion });

    // Calculate attendance percentage for current year
    const yearStart = new Date(`${currentYear}-01-01`);
    const yearEnd = new Date(`${currentYear}-12-31`);
    
    const attendanceRecords = await Attendance.find({
      studentId: targetStudentId,
      date: { $gte: yearStart, $lte: yearEnd }
    });

    const presentCount = attendanceRecords.filter(a => a.status === "P" || a.status === "Present").length;
    const totalDays = attendanceRecords.length;
    const attendance = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 75; // Default 75% if no records

    console.log("Attendance calc - Present:", presentCount, "Total:", totalDays, "Percentage:", attendance);

    // Prepare data for ML model
    const mlInput = {
      english: Number(english),
      math: Number(math),
      sinhala: Number(sinhala),
      tamil: Number(tamil),
      env: Number(env),
      religion: Number(religion),
      attendance: attendance
    };
    
    console.log("ML Input:", mlInput);

    // Call FastAPI ML service for marks prediction
    const mlServiceUrlMarks = process.env.ML_SERVICE_URL_MARKS || "http://localhost:8003";
    const mlResponse = await axios.post(
      `${mlServiceUrlMarks}/predict`,
      mlInput,
      {
        timeout: 10000 // 10 second timeout
      }
    );

    // Analyze if student needs improvement based on predictions
    let shouldUpdate = false;
    let updateRecommendations = [];
    
    console.log("ML Response data:", mlResponse.data);
    console.log("Predicted marks field:", mlResponse.data);
    
    if (mlResponse.data && typeof mlResponse.data === 'object') {
      const subjects = Object.keys(mlResponse.data);
      
      subjects.forEach(subject => {
        const prediction = mlResponse.data[subject];
        if (prediction && typeof prediction === 'object' && prediction.predicted !== undefined) {
          if (prediction.predicted < mlInput[subject]) {
            shouldUpdate = true;
            updateRecommendations.push({
              subject: subject.toUpperCase(),
              message: `Predicted decline in ${subject}. Current: ${mlInput[subject]}, Predicted: ${prediction.predicted}`,
              action: "Increase practice and tutoring"
            });
          }
          
          if (prediction.predicted < 50) {
            shouldUpdate = true;
            updateRecommendations.push({
              subject: subject.toUpperCase(),
              message: `Low prediction for ${subject}: ${prediction.predicted}`,
              action: "Urgent intervention needed"
            });
          }
        }
      });
    }

    // Transform the response to frontend-friendly format
    const predictionData = mlResponse.data;
    
    console.log("Final response - predicted_marks:", predictionData);
    
    res.json({
      success: true,
      prediction: predictionData,
      predicted_marks: predictionData,
      inputData: mlInput,
      input_marks: mlInput,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        grade: student.grade
      },
      modelUpdate: {
        shouldUpdate: shouldUpdate,
        reason: shouldUpdate ? "Student performance declining or at risk" : "Student performance is stable",
        recommendations: updateRecommendations.length > 0 ? updateRecommendations : "Continue current approach"
      }
    });

  } catch (error) {
    console.error("ML Error:", error.message);
    console.error("ML Error Stack:", error.stack);

    if (error.response) {
      const status = error.response.status || 500;
      const remoteMessage = error.response.data?.message || error.response.data?.error || JSON.stringify(error.response.data);
      console.error("ML service response error:", status, remoteMessage);
      return res.status(status).json({
        success: false,
        message: "ML prediction service returned an error",
        error: remoteMessage,
        details: error.response.data,
      });
    }

    // If ML service is not available, return a clear service unavailable error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        success: false,
        message: "ML prediction service is currently unavailable",
        error: "Service connection failed"
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Marks prediction failed",
      error: error.message 
    });
  }
};

// New term-based prediction endpoint
export const predictTermMarksML = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { studentId, predictTerm, year } = req.body;

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
      return res.status(400).json({ success: false, message: "Student ID is required" });
    }

    if (!predictTerm || ![2, 3].includes(predictTerm)) {
      return res.status(400).json({ success: false, message: "predictTerm must be 2 or 3" });
    }

    // Get student data
    const student = await Student.findById(targetStudentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const studentGrade = student.grade ? String(student.grade).match(/(\d+)/) : null;
    const gradeValue = studentGrade ? Number(studentGrade[1]) : null;
    if (!gradeValue || gradeValue < 1 || gradeValue > 5) {
      return res.status(400).json({ success: false, message: "Term prediction for marks is available only for grades 1 to 5." });
    }

    const currentYear = year || new Date().getFullYear();

    // Helper function to get attendance for a specific term
    const getTermAttendance = async (termNum) => {
      const startMonth = (termNum - 1) * 4 + 1;  // Term 1: 1-4, Term 2: 5-8, Term 3: 9-12
      const endMonth = termNum * 4;
      
      const startDate = new Date(currentYear, startMonth - 1, 1);
      const endDate = new Date(currentYear, endMonth, 0);
      
      const attendanceRecords = await Attendance.find({
        studentId: targetStudentId,
        date: { $gte: startDate, $lte: endDate }
      });
      
      const presentCount = attendanceRecords.filter(a => a.status === "P").length;
      const totalDays = attendanceRecords.length;
      
      return totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
    };

    // Helper function to get marks for a specific term
    const getTermMarks = async (termNum) => {
      const marksRecord = await Marks.findOne({
        studentId: targetStudentId,
        year: currentYear,
        term: termNum
      });

      if (!marksRecord) return null;

      const m = marksRecord.marks || {};
      return {
        english: Number(m.english || m.English || 0),
        math: Number(m.maths || m.Maths || m.math || 0),
        sinhala: Number(m.sinhala || m.Sinhala || 0),
        tamil: Number(m.tamil || m.Tamil || 0),
        env: Number(m.science || m.Science || m.environment || m.Environment || 0)
      };
    };

    // Prepare data based on prediction term
    let mlInput = {
      target_term: predictTerm
    };

    if (predictTerm === 2) {
      // Predict Term 2: Need Term 1 marks + Term 1 & 2 attendance
      const term1Marks = await getTermMarks(1);
      if (!term1Marks) {
        return res.status(400).json({ 
          success: false, 
          message: "Term 1 marks not found" 
        });
      }

      const term1Attendance = await getTermAttendance(1);
      const term2Attendance = await getTermAttendance(2);

      mlInput = {
        ...mlInput,
        term1_english: term1Marks.english,
        term1_math: term1Marks.math,
        term1_sinhala: term1Marks.sinhala,
        term1_tamil: term1Marks.tamil,
        term1_env: term1Marks.env,
        term1_attendance: term1Attendance,
        term2_attendance: term2Attendance
      };

    } else if (predictTerm === 3) {
      // Predict Term 3: Need Term 1 & 2 marks + Term 1, 2 & 3 attendance
      const term1Marks = await getTermMarks(1);
      const term2Marks = await getTermMarks(2);

      if (!term1Marks || !term2Marks) {
        return res.status(400).json({ 
          success: false, 
          message: "Term 1 and Term 2 marks required for Term 3 prediction" 
        });
      }

      const term1Attendance = await getTermAttendance(1);
      const term2Attendance = await getTermAttendance(2);
      const term3Attendance = await getTermAttendance(3);

      mlInput = {
        ...mlInput,
        term1_english: term1Marks.english,
        term1_math: term1Marks.math,
        term1_sinhala: term1Marks.sinhala,
        term1_tamil: term1Marks.tamil,
        term1_env: term1Marks.env,
        term2_english: term2Marks.english,
        term2_math: term2Marks.math,
        term2_sinhala: term2Marks.sinhala,
        term2_tamil: term2Marks.tamil,
        term2_env: term2Marks.env,
        term1_attendance: term1Attendance,
        term2_attendance: term2Attendance,
        term3_attendance: term3Attendance
      };
    }

    // Call FastAPI ML service for term-based prediction
    const mlServiceUrl = process.env.ML_SERVICE_URL_MARKS || process.env.ML_SERVICE_URL || "http://localhost:8002";
    const mlResponse = await axios.post(
      `${mlServiceUrl}/predict-term`,
      mlInput,
      {
        timeout: 10000 // 10 second timeout
      }
    );

    res.json({
      success: true,
      prediction: mlResponse.data,
      inputData: mlInput,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        grade: student.grade
      },
      message: `Term ${predictTerm} marks predicted based on previous performance and attendance`
    });

  } catch (error) {
    console.error("Term Prediction Error:", error.message);
    console.error("Error Stack:", error.stack);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        success: false,
        message: "ML prediction service is currently unavailable",
        error: "Service connection failed"
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Term marks prediction failed",
      error: error.message 
    });
  }
};
