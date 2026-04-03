import axios from "axios";
import Student from "../models/studentModel.js";
import Marks from "../models/Marks.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

const fetchStudentMlInput = async (studentId, year, term) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error("Student not found");

  const currentYear = year || new Date().getFullYear();

  const marksQuery = { studentId };
  if (year) marksQuery.year = Number(year);
  if (term) marksQuery.term = Number(term);

  const marksRecords = await Marks.find(marksQuery)
    .sort({ year: -1, term: -1 })
    .limit(1);

  const latestMarks = marksRecords.length > 0 ? marksRecords[0] : null;
  const marks = latestMarks?.marks || {};

  const english = marks.english || marks.English || 0;
  const math = marks.maths || marks.Maths || marks.math || 0;
  const sinhala = marks.sinhala || marks.Sinhala || 0;
  const tamil = marks.tamil || marks.Tamil || 0;
  const env = marks.science || marks.Science || marks.environment || marks.Environment || 0;

  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const attendanceRecords = await Attendance.find({
    studentId,
    date: { $gte: yearStart, $lte: yearEnd },
  });

  const presentCount = attendanceRecords.filter((a) => a.status === "P").length;
  const totalDays = attendanceRecords.length;
  const attendance = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

  return {
    student,
    mlInput: {
      english: Number(english) || 0,
      math: Number(math) || 0,
      sinhala: Number(sinhala) || 0,
      tamil: Number(tamil) || 0,
      env: Number(env) || 0,
      attendance,
    },
    attendancePercentage: attendance,
  };
};

const callMlService = async (mlInput) => {
  const mlServiceUrl = process.env.ML_SERVICE_URL_DROPOUT || process.env.ML_SERVICE_URL || "http://localhost:8001";
  const mlResponse = await axios.post(`${mlServiceUrl}/predict-dropout`, mlInput, { timeout: 10000 });
  return mlResponse.data;
};

const formatGradeForStudentQuery = (grade) => {
  if (!grade && grade !== 0) return grade;
  const asNum = Number(String(grade).replace(/[^0-9]/g, ""));
  if (Number.isFinite(asNum) && !Number.isNaN(asNum)) return `Grade ${asNum}`;
  return String(grade);
};

const buildPrediction = (student, mlInput, mlResult, attendancePercentage) => {
  const rawRisk = (mlResult.risk_level || mlResult.riskLevel || "Low").toString().trim();
  const normalizedRisk = rawRisk.toLowerCase();
  let riskLevel = normalizedRisk.includes("high")
    ? "High"
    : normalizedRisk.includes("medium")
    ? "Medium"
    : "Low";

  const avgMarks =
    (Number(mlInput.english || 0) +
      Number(mlInput.math || 0) +
      Number(mlInput.sinhala || 0) +
      Number(mlInput.tamil || 0) +
      Number(mlInput.env || 0)) /
    5;

  const failedSubjects = [
    Number(mlInput.english || 0),
    Number(mlInput.math || 0),
    Number(mlInput.sinhala || 0),
    Number(mlInput.tamil || 0),
    Number(mlInput.env || 0),
  ].filter((mark) => mark < 50).length;

  const dbForcedHighRisk = attendancePercentage < 50 || avgMarks < 20 || failedSubjects >= 4;
  if (dbForcedHighRisk) {
    riskLevel = "High";
  }

  const riskScore = dbForcedHighRisk
    ? 1.0
    : mlResult.risk_score ?? mlResult.riskScore ?? (riskLevel === "High" ? 1.0 : riskLevel === "Medium" ? 0.5 : 0);

  const predictionRaw = dbForcedHighRisk
    ? 2
    : mlResult.prediction_raw ?? mlResult.predictionRaw ?? mlResult.prediction_raw ?? (riskLevel === "High" ? 2 : riskLevel === "Medium" ? 1 : 0);

  return {
    success: true,
    student: {
      id: student._id,
      name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      grade: student.grade,
    },
    inputData: {
      current_marks: mlInput,
      attendance_percentage: attendancePercentage,
    },
    prediction: {
      ...mlResult,
      risk_level: riskLevel,
      risk_score: riskScore,
      prediction_raw: predictionRaw,
    },
    riskAssessment: {
      isAtRisk: riskLevel === "High" || riskLevel === "Medium",
      level: riskLevel,
      score: riskScore,
      factors: mlResult.factors || [],
      recommendations: mlResult.recommendations || [],
    },
  };
};

export const predictDropoutRisk = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { studentId, year, term } = req.body;

    let targetStudentId = studentId;
    if (!targetStudentId && userId) {
      const user = await User.findById(userId);
      if (user && user.role === "student") {
        targetStudentId = user.userId;
      }
    }

    if (!targetStudentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    const { student, mlInput, attendancePercentage } = await fetchStudentMlInput(targetStudentId, year, term);
    const mlResult = await callMlService(mlInput);
    const prediction = buildPrediction(student, mlInput, mlResult, attendancePercentage);

    return res.json(prediction);
  } catch (error) {
    console.error("Dropout Prediction Error:", error.message);
    if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      return res.status(503).json({ success: false, message: "ML prediction service is currently unavailable", error: "Service connection failed" });
    }
    return res.status(500).json({ success: false, message: "Dropout risk prediction failed", error: error.message });
  }
};

export const predictDropoutRiskForClass = async (req, res) => {
  try {
    let { grade, section, stream } = req.query;
    const userId = req.user?.id;

    if ((!grade || !section) && userId) {
      const user = await User.findById(userId);
      if (user && user.role === "teacher") {
        const ClassTeacher = (await import("../models/ClassTeacher.js")).default;
        const assignment = await ClassTeacher.findOne({ teacherId: user.userId });

    if (assignment) {
      console.log("🔹 [DEBUG] Assignment found: true");
      if (!grade) grade = String(assignment.grade);
      if (!section) section = assignment.section;
      if (!stream && assignment.stream) stream = assignment.stream;
    } else {
      console.log("🔹 [DEBUG] Assignment found: false");
    }
      }
    }

    if (!grade || !section) {
      return res.status(400).json({ message: "Grade and section are required for class risk analysis" });
    }

    const formattedGrade = formatGradeForStudentQuery(grade);
    const classQuery = { grade: formattedGrade, section: String(section) };
    if (stream) classQuery.stream = String(stream);

    console.log("🔹 [DEBUG] predictDropoutRiskForClass query", classQuery);

    const students = await Student.find(classQuery);
    if (!students || students.length === 0) {
      return res.status(200).json({ success: true, data: [], distribution: { High: 0, Medium: 0, Low: 0 }, message: "No students found in class" });
    }

    const predictions = await Promise.allSettled(students.map(async (student) => {
      try {
        const { mlInput, attendancePercentage } = await fetchStudentMlInput(student._id, req.query.year, req.query.term);
        console.log(`🔹 [DEBUG] Student ${student._id} mlInput:`, mlInput);
        const mlResult = await callMlService(mlInput);
        console.log(`🔹 [DEBUG] Student ${student._id} mlResult:`, mlResult);
        const compiled = buildPrediction(student, mlInput, mlResult, attendancePercentage);

        return {
          studentId: student._id,
          id: student._id,
          name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
          firstName: student.firstName,
          lastName: student.lastName,
          grade: student.grade,
          section: student.section,
          riskLevel: compiled.riskAssessment.level,
          riskScore: compiled.riskAssessment.score,
          attendance: attendancePercentage,
          averageMarks:
            mlInput && Object.values(mlInput).length > 0
              ? ((Number(mlInput.english || 0) + Number(mlInput.math || 0) + Number(mlInput.sinhala || 0) + Number(mlInput.tamil || 0) + Number(mlInput.env || 0)) / 5).toFixed(1)
              : "N/A",
          factors: compiled.riskAssessment.factors,
          recommendations: compiled.riskAssessment.recommendations,
          rawPrediction: compiled.prediction,
          parents: {
            father: {
              name: student.fatherName || "Not Available",
              contact: student.fatherContact || null,
            },
            mother: {
              name: student.motherName || "Not Available",
              contact: student.motherContact || null,
            },
          },
        };
      } catch (subError) {
        return { studentId: student._id, name: `${student.firstName || ""} ${student.lastName || ""}`.trim(), error: subError.message };
      }
    }));

    const validPredictions = predictions
      .filter((p) => p.status === "fulfilled" && !p.value.error)
      .map((p) => p.value);

    const distribution = { High: 0, Medium: 0, Low: 0 };
    validPredictions.forEach((item) => {
      if (item.riskLevel === "High") distribution.High += 1;
      else if (item.riskLevel === "Medium") distribution.Medium += 1;
      else distribution.Low += 1;
    });

    console.log("🔹 [DEBUG] Total students found:", students.length);
    console.log("🔹 [DEBUG] Valid predictions:", validPredictions.length);
    console.log("🔹 [DEBUG] Distribution:", distribution);
    console.log("🔹 [DEBUG] Sample prediction:", validPredictions.slice(0, 2));

    res.json({ success: true, data: validPredictions, distribution });
  } catch (error) {
    console.error("Class Dropout Risk Error:", error.message);
    res.status(500).json({ success: false, message: "Class dropout risk prediction failed", error: error.message });
  }
};

