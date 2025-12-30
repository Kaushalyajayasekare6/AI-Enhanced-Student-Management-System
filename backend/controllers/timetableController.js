import Timetable from "../models/Timetable.js";
import Teacher from "../models/teacherModel.js";
import Student from "../models/studentModel.js";
import ClassTeacher from "../models/ClassTeacher.js";

// Intelligent time slots with breaks
// 10-10-20 interval: 10min break after slot 2, 20min lunch after slot 4
const INTELLIGENT_TIME_SLOTS = [
  "08:00-09:00",  // 1
  "09:00-10:00",  // 2
  // 10 min break
  "10:10-11:10",  // 3
  "11:10-12:10",  // 4
  // 20 min lunch
  "12:30-13:30",  // 5
  "13:30-14:30",  // 6
  "14:30-15:30",  // 7
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Define core and categorical subjects
const CORE_SUBJECTS = ["English", "Sinhala", "Maths", "Science"];
const CATEGORICAL_SUBJECTS = {
  10: ["Physics", "Chemistry", "Biology"],
  11: ["Physics", "Chemistry", "Biology"],
  12: ["Physics", "Chemistry", "Biology"],
  13: ["Physics", "Chemistry", "Biology"],
};

// Common subjects by grade level
// Subjects by grade. Added primary grades 1-5 and kept junior/senior lists.
const GRADE_SUBJECTS = {
  1: ["Sinhala", "English", "Maths", "EVS", "Religion", "Art", "Music", "PE"],
  2: ["Sinhala", "English", "Maths", "EVS", "Religion", "Art", "Music", "PE"],
  3: ["Sinhala", "English", "Maths", "EVS", "Religion", "Art", "Music", "PE"],
  4: ["Sinhala", "English", "Maths", "EVS", "Religion", "Art", "Music", "PE"],
  5: ["Sinhala", "English", "Maths", "EVS", "Religion", "Art", "Music", "PE"],
  6: ["Maths", "Science", "English", "Sinhala", "History", "Geography", "ICT", "Art"],
  7: ["Maths", "Science", "English", "Sinhala", "History", "Geography", "ICT", "Art"],
  8: ["Maths", "Science", "English", "Sinhala", "History", "Geography", "ICT", "Art"],
  9: ["Maths", "Science", "English", "Sinhala", "History", "Geography", "ICT", "Art"],
  10: ["Maths", "Science", "English", "Sinhala", "History", "Geography", "ICT", "Physics", "Chemistry", "Biology", "Commerce", "Art"],
  11: ["Maths", "Science", "English", "Sinhala", "History", "Geography", "ICT", "Physics", "Chemistry", "Biology", "Commerce", "Art"],
  12: ["Maths", "English", "General English", "Physics", "Chemistry", "Biology", "Commerce", "ICT"],
  13: ["Maths", "English", "General English", "Physics", "Chemistry", "Biology", "Commerce", "ICT"],
};

// Grade rule defaults (periods per day and notes). These follow the Sri Lankan-style rules described by the user.
const GRADE_RULES = {
  primary: { grades: [1,2,3,4,5], periodsPerDay: 6, lightSubjectsPerDay: 1 },
  junior: { grades: [6,7,8,9], periodsPerDay: 8 },
  ol: { grades: [10,11], periodsPerDay: 8 },
  al: { grades: [12,13], periodsPerDay: 6 }
};

// Helper: choose rule set for a grade
function getGradeRule(gradeNum) {
  if (GRADE_RULES.primary.grades.includes(gradeNum)) return GRADE_RULES.primary;
  if (GRADE_RULES.junior.grades.includes(gradeNum)) return GRADE_RULES.junior;
  if (GRADE_RULES.ol.grades.includes(gradeNum)) return GRADE_RULES.ol;
  return GRADE_RULES.al;
}

/**
 * Helper to generate slots for a class given grade-specific rules.
 * - Ensures Maths + language daily for primary
 * - Spreads heavy subjects across the week
 * - Adds double periods for practicals where possible
 * - Includes unassigned subjects if no teacher available
 */
async function generateSlotsForGrade(gradeNum, section, allSubjects, teacherSubjectMap, teachers) {
  const slots = [];
  const rule = getGradeRule(gradeNum);

  // Determine periods per day
  const periodsPerDay = rule.periodsPerDay || 6;
  const timeSlotsPerDay = INTELLIGENT_TIME_SLOTS.slice(0, periodsPerDay);

  // Build global teacher schedule
  const globalTeacherSchedule = {};
  teachers.forEach(t => {
    globalTeacherSchedule[t._id.toString()] = {};
    DAYS.forEach(day => {
      globalTeacherSchedule[t._id.toString()][day] = [];
    });
  });

  // Track counts per subject per day
  const subjectDayCount = {};
  allSubjects.forEach(subject => {
    subjectDayCount[subject] = {};
    DAYS.forEach(d => subjectDayCount[subject][d] = 0);
  });

  // Utilities
  const findTeacherFor = (subject, day, timeSlot) => {
    const teachersFor = teacherSubjectMap[subject] || [];
    return teachersFor.find(teacher => !globalTeacherSchedule[teacher._id.toString()][day].includes(timeSlot));
  };

  // Primary rules (1-5): Maths + Language daily, 1 light subject per day, avoid two heavy subjects
  if (GRADE_RULES.primary.grades.includes(gradeNum)) {
    const language = allSubjects.find(s => /(Sinhala|Tamil|English)/i.test(s)) || allSubjects[0];
    const maths = allSubjects.find(s => /Maths|Mathematics/i.test(s)) || null;
    const lightSubjects = allSubjects.filter(s => /(Art|Music|PE|EVS|Religion)/i.test(s));

    DAYS.forEach(day => {
      // Slot 0: Language
      const ts0 = timeSlotsPerDay[0];
      const langTeacher = findTeacherFor(language, day, ts0);
      if (langTeacher) {
        slots.push({ day, timeSlot: ts0, subject: language, teacherId: langTeacher._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
        globalTeacherSchedule[langTeacher._id.toString()][day].push(ts0);
        subjectDayCount[language][day]++;
      } else {
        slots.push({ day, timeSlot: ts0, subject: language, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
        subjectDayCount[language][day]++;
      }

      // Slot 1: Maths
      if (maths) {
        const ts1 = timeSlotsPerDay[1] || ts0;
        const mathTeacher = findTeacherFor(maths, day, ts1);
        if (mathTeacher) {
          slots.push({ day, timeSlot: ts1, subject: maths, teacherId: mathTeacher._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
          globalTeacherSchedule[mathTeacher._id.toString()][day].push(ts1);
          subjectDayCount[maths][day]++;
        } else {
          slots.push({ day, timeSlot: ts1, subject: maths, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
          subjectDayCount[maths][day]++;
        }
      }

      // Remaining slots: fill with one light subject and others
      for (let i = 2; i < timeSlotsPerDay.length; i++) {
        const timeSlot = timeSlotsPerDay[i];
        let subject = null;

        if (i === 2 && lightSubjects.length > 0) {
          subject = lightSubjects[(i - 2) % lightSubjects.length];
        } else {
          // pick any subject not overloaded today
          subject = allSubjects.find(s => subjectDayCount[s][day] < 2);
        }

        if (subject) {
          const teacher = findTeacherFor(subject, day, timeSlot);
          if (teacher) {
            slots.push({ day, timeSlot, subject, teacherId: teacher._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
            globalTeacherSchedule[teacher._id.toString()][day].push(timeSlot);
            subjectDayCount[subject][day]++;
          } else {
            slots.push({ day, timeSlot, subject, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
            subjectDayCount[subject][day]++;
          }
        }
      }
    });

    return slots;
  }

  // Junior (6-9) and O/L rules: languages and maths almost daily, practicals get double periods
  if (GRADE_RULES.junior.grades.includes(gradeNum) || GRADE_RULES.ol.grades.includes(gradeNum)) {
    const maths = allSubjects.find(s => /Maths|Mathematics/i.test(s));
    const language = allSubjects.find(s => /(Sinhala|Tamil|English)/i.test(s));
    const practicals = allSubjects.filter(s => /(ICT|Art|Music|Dancing|Practical)/i.test(s));

    DAYS.forEach(day => {
      // Ensure maths appears early in day
      if (maths) {
        const ts = timeSlotsPerDay[0];
        const t = findTeacherFor(maths, day, ts);
        if (t) {
          slots.push({ day, timeSlot: ts, subject: maths, teacherId: t._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
          globalTeacherSchedule[t._id.toString()][day].push(ts);
          subjectDayCount[maths][day]++;
        } else {
          slots.push({ day, timeSlot: ts, subject: maths, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
          subjectDayCount[maths][day]++;
        }
      }

      // Ensure language appears
      if (language) {
        const ts = timeSlotsPerDay[1] || timeSlotsPerDay[0];
        const t = findTeacherFor(language, day, ts);
        if (t) {
          slots.push({ day, timeSlot: ts, subject: language, teacherId: t._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
          globalTeacherSchedule[t._id.toString()][day].push(ts);
          subjectDayCount[language][day]++;
        } else {
          slots.push({ day, timeSlot: ts, subject: language, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
          subjectDayCount[language][day]++;
        }
      }

      // Place practicals as double periods (adjacent slots) on selected days
      practicals.forEach((practical, idx) => {
        // Spread practicals across the week
        const shouldPlace = (DAYS.indexOf(day) + idx) % 3 === 0; // simple spread
        if (shouldPlace) {
          const slotA = timeSlotsPerDay[2];
          const slotB = timeSlotsPerDay[3] || timeSlotsPerDay[2];
          const tA = findTeacherFor(practical, day, slotA);
          const tB = findTeacherFor(practical, day, slotB);
          const teacher = tA || tB;
          if (teacher) {
            slots.push({ day, timeSlot: slotA, subject: practical, teacherId: teacher._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
            if (slotB && !globalTeacherSchedule[teacher._id.toString()][day].includes(slotB)) {
              slots.push({ day, timeSlot: slotB, subject: practical, teacherId: teacher._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
              globalTeacherSchedule[teacher._id.toString()][day].push(slotB);
              subjectDayCount[practical][day] += 2;
            }
            globalTeacherSchedule[teacher._id.toString()][day].push(slotA);
            subjectDayCount[practical][day]++;
          } else {
            slots.push({ day, timeSlot: slotA, subject: practical, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
            subjectDayCount[practical][day]++;
          }
        }
      });

      // Fill remaining slots with other subjects avoiding heavy clustering
      for (const timeSlot of timeSlotsPerDay) {
        if (slots.find(s => s.day === day && s.timeSlot === timeSlot)) continue; // occupied

        const candidate = allSubjects.find(s => {
          // Avoid placing Science and Maths together on same day consecutively
          if (/Science/i.test(s) && maths && subjectDayCount[maths][day] > 0) return false;
          return subjectDayCount[s][day] < 2;
        });

        if (candidate) {
          const teacher = findTeacherFor(candidate, day, timeSlot);
          if (teacher) {
            slots.push({ day, timeSlot, subject: candidate, teacherId: teacher._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
            globalTeacherSchedule[teacher._id.toString()][day].push(timeSlot);
            subjectDayCount[candidate][day]++;
          } else {
            slots.push({ day, timeSlot, subject: candidate, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
            subjectDayCount[candidate][day]++;
          }
        }
      }
    });

    return slots;
  }

  // A/L (12-13): focus on 3 main subjects (pick top 3 available), give them 2-3 periods per day
  if (GRADE_RULES.al.grades.includes(gradeNum)) {
    // choose 3 main subjects that have teachers
    const candidates = allSubjects.filter(s => teacherSubjectMap[s]);
    const main = candidates.slice(0, 3);

    DAYS.forEach(day => {
      // For each main subject give 2 periods if possible
      let placed = 0;
      for (const subject of main) {
        const times = timeSlotsPerDay.slice(0, 3); // prefer morning slots
        let placedToday = 0;
        for (const ts of times) {
          if (placedToday >= 2) break;
          const t = findTeacherFor(subject, day, ts);
          if (t) {
            slots.push({ day, timeSlot: ts, subject, teacherId: t._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
            globalTeacherSchedule[t._id.toString()][day].push(ts);
            subjectDayCount[subject][day]++;
            placedToday++;
            placed++;
          }
        }
      }

      // Fill the rest with support subjects
      for (const ts of timeSlotsPerDay) {
        if (slots.find(s => s.day === day && s.timeSlot === ts)) continue;
        const subject = allSubjects.find(s => subjectDayCount[s][day] < 2);
        if (subject) {
          const t = findTeacherFor(subject, day, ts);
          if (t) {
            slots.push({ day, timeSlot: ts, subject, teacherId: t._id, teacherStatus: "assigned", room: `Room ${gradeNum}${section}` });
            globalTeacherSchedule[t._id.toString()][day].push(ts);
            subjectDayCount[subject][day]++;
          } else {
            slots.push({ day, timeSlot: ts, subject, teacherId: null, teacherStatus: "unassigned", room: `Room ${gradeNum}${section}` });
            subjectDayCount[subject][day]++;
          }
        }
      }
    });

    return slots;
  }

  return slots;
}

/**
 * 🔹 Generate timetable intelligently with specific rules
 */
export const generateTimetable = async (req, res) => {
  try {
    const { grade, section, stream, term, year } = req.body;

    if (!grade || !section || !term || !year) {
      return res.status(400).json({ message: "Missing required fields: grade, section, term, year" });
    }

    const gradeNum = Number(grade);

    // Check if timetable already exists
    const existing = await Timetable.findOne({ grade: gradeNum, section, stream: stream || null, term: Number(term), year: Number(year) });
    if (existing) {
      return res.status(400).json({ message: "Timetable already exists. Delete it first to regenerate." });
    }

    // Get all active teachers
    const teachers = await Teacher.find({ leaveDate: { $in: [null, "", undefined] } });
    
    // Get subjects for this grade
    const allSubjects = GRADE_SUBJECTS[gradeNum] || GRADE_SUBJECTS[10];

    if (!allSubjects || allSubjects.length === 0) {
      return res.status(400).json({ message: "No subjects defined for this grade level" });
    }

    // Create teacher-subject mapping
    const teacherSubjectMap = {};
    teachers.forEach(teacher => {
      if (teacher.subjects && teacher.subjects.length > 0) {
        teacher.subjects.forEach(subject => {
          if (!teacherSubjectMap[subject]) {
            teacherSubjectMap[subject] = [];
          }
          teacherSubjectMap[subject].push(teacher);
        });
      }
    });

    // Log which subjects have teachers and which don't
    const subjectsWithTeachers = Object.keys(teacherSubjectMap);
    const subjectsWithoutTeachers = allSubjects.filter(s => !subjectsWithTeachers.includes(s));
    
    if (subjectsWithoutTeachers.length > 0) {
      console.warn(`⚠️ No teachers assigned for subjects: ${subjectsWithoutTeachers.join(", ")}`);
    }

    // Generate slots using grade-specific rules
    const slots = await generateSlotsForGrade(gradeNum, section, allSubjects, teacherSubjectMap, teachers);

    // Create and save timetable
    const timetable = new Timetable({
      grade: gradeNum,
      section,
      stream: stream || null,
      term: Number(term),
      year: Number(year),
      slots,
      autoGenerated: true,
    });

    await timetable.save();

    res.json({
      success: true,
      message: "✅ Intelligent timetable generated successfully!",
      timetable,
      stats: {
        totalSlots: slots.length,
        coreSubjectsDaily: true,
        categoricalSubjects: (gradeNum >= 10) ? "2 periods in 2 days" : "N/A",
        intervals: "10-10-20 (10min break, 20min lunch)",
        daysPerWeek: 5,
        unassignedSubjects: subjectsWithoutTeachers.length > 0 ? subjectsWithoutTeachers : [],
        warning: subjectsWithoutTeachers.length > 0 ? `⚠️ ${subjectsWithoutTeachers.length} subject(s) have no teacher assigned: ${subjectsWithoutTeachers.join(", ")}` : null,
      }
    });
  } catch (err) {
    console.error("❌ Error generating timetable:", err.message);
    res.status(500).json({ message: "Failed to generate timetable: " + err.message });
  }
};

/**
 * 🔹 Get timetable for a class
 */
export const getTimetable = async (req, res) => {
  try {
    const { grade, section, stream, term, year } = req.query;

    const query = { grade: Number(grade), section, term: Number(term), year: Number(year) };
    if (stream) query.stream = stream;

    const timetable = await Timetable.findOne(query).populate("slots.teacherId", "firstName lastName");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json(timetable);
  } catch (err) {
    console.error("❌ Error fetching timetable:", err.message);
    res.status(500).json({ message: "Failed to fetch timetable" });
  }
};

/**
 * 🔹 Get timetable for a teacher
 */
export const getTeacherTimetable = async (req, res) => {
  try {
    const teacherId = req.user.id; // From JWT

    // Find user to get userId reference
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(teacherId);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Find all timetables where this teacher has slots
    const timetables = await Timetable.find({
      "slots.teacherId": user.userId,
    }).populate("slots.teacherId", "firstName lastName");

    // Filter slots for this teacher only
    const teacherSlots = [];
    const teacherObjectId = user.userId.toString();
    
    timetables.forEach(timetable => {
      timetable.slots.forEach(slot => {
        // Check if slot belongs to this teacher
        let slotTeacherId = null;
        if (slot.teacherId) {
          if (slot.teacherId._id) {
            slotTeacherId = slot.teacherId._id.toString();
          } else if (typeof slot.teacherId.toString === 'function') {
            slotTeacherId = slot.teacherId.toString();
          } else {
            slotTeacherId = String(slot.teacherId);
          }
        }
        
        if (slotTeacherId && slotTeacherId === teacherObjectId) {
          teacherSlots.push({
            day: slot.day,
            timeSlot: slot.timeSlot,
            subject: slot.subject,
            room: slot.room,
            grade: timetable.grade,
            section: timetable.section,
            stream: timetable.stream,
          });
        }
      });
    });

    res.json({ slots: teacherSlots });
  } catch (err) {
    console.error("❌ Error fetching teacher timetable:", err.message);
    res.status(500).json({ message: "Failed to fetch teacher timetable" });
  }
};

/**
 * 🔹 Get timetable for a student
 */
export const getStudentTimetable = async (req, res) => {
  try {
    const studentId = req.user.id; // From JWT

    // Find user to get userId reference
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(studentId);
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Find student to get grade and section
    const student = await Student.findById(user.userId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const grade = parseInt(student.grade) || 10;
    const currentYear = new Date().getFullYear();
    const currentTerm = 1; // Default to term 1, can be made dynamic

    const query = { grade, section: student.section, year: currentYear, term: currentTerm };
    if (student.stream) query.stream = student.stream;

    const timetable = await Timetable.findOne(query).populate("slots.teacherId", "firstName lastName");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found for your class" });
    }

    res.json(timetable);
  } catch (err) {
    console.error("❌ Error fetching student timetable:", err.message);
    res.status(500).json({ message: "Failed to fetch student timetable" });
  }
};

/**
 * 🔹 Delete timetable
 */
export const deleteTimetable = async (req, res) => {
  try {
    const { grade, section, stream, term, year } = req.body;

    const query = { grade: Number(grade), section, term: Number(term), year: Number(year) };
    if (stream) query.stream = stream;

    const timetable = await Timetable.findOneAndDelete(query);

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json({ message: "Timetable deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting timetable:", err.message);
    res.status(500).json({ message: "Failed to delete timetable" });
  }
};

/**
 * 🔹 Update timetable (regenerate with new constraints)
 */
export const updateTimetable = async (req, res) => {
  try {
    const { grade, section, stream, term, year } = req.body;

    if (!grade || !section || !term || !year) {
      return res.status(400).json({ message: "Missing required fields: grade, section, term, year" });
    }

    const gradeNum = Number(grade);
    const query = { 
      grade: gradeNum, 
      section, 
      stream: stream || null, 
      term: Number(term), 
      year: Number(year) 
    };

    // Check if timetable exists
    const existingTimetable = await Timetable.findOne(query);
    if (!existingTimetable) {
      return res.status(404).json({ message: "Timetable not found. Cannot update." });
    }

    // Get all active teachers
    const teachers = await Teacher.find({ leaveDate: { $in: [null, "", undefined] } });
    
    // Get subjects for this grade
    const allSubjects = GRADE_SUBJECTS[gradeNum] || GRADE_SUBJECTS[10];

    if (!allSubjects || allSubjects.length === 0) {
      return res.status(400).json({ message: "No subjects defined for this grade level" });
    }

    // Create teacher-subject mapping
    const teacherSubjectMap = {};
    teachers.forEach(teacher => {
      if (teacher.subjects && teacher.subjects.length > 0) {
        teacher.subjects.forEach(subject => {
          if (!teacherSubjectMap[subject]) {
            teacherSubjectMap[subject] = [];
          }
          teacherSubjectMap[subject].push(teacher);
        });
      }
    });

    // Verify we have teachers for core subjects (only enforce for secondary and above)
    if (gradeNum >= 6) {
      const coreWithTeachers = CORE_SUBJECTS.filter(s => teacherSubjectMap[s]);
      if (coreWithTeachers.length < 3) {
        return res.status(400).json({ message: "Not enough teachers for core subjects" });
      }
    }

    // Generate slots using grade-specific helper
    const slots = await generateSlotsForGrade(gradeNum, section, allSubjects, teacherSubjectMap, teachers);

    // Update the timetable
    const updatedTimetable = await Timetable.findOneAndUpdate(
      query,
      { slots, updatedAt: new Date() },
      { new: true }
    ).populate("slots.teacherId", "firstName lastName");

    res.json({
      success: true,
      message: "✅ Timetable updated successfully!",
      timetable: updatedTimetable,
      stats: {
        totalSlots: slots.length,
        coreSubjectsDaily: true,
        categoricalSubjects: (gradeNum >= 10) ? "2 periods in 2 days" : "N/A",
        intervals: "10-10-20 (10min break, 20min lunch)",
        daysPerWeek: 5,
      }
    });
  } catch (err) {
    console.error("❌ Error updating timetable:", err.message);
    res.status(500).json({ message: "Failed to update timetable: " + err.message });
  }
};

/**
 * 🔹 Get all timetables (admin view)
 */
export const getAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find().populate("slots.teacherId", "firstName lastName");
    res.json(timetables);
  } catch (err) {
    console.error("❌ Error fetching timetables:", err.message);
    res.status(500).json({ message: "Failed to fetch timetables" });
  }
};

/**
 * 🔹 Generate intelligent suggestions for timetable
 */
export const generateTimetableSuggestions = async (req, res) => {
  try {
    const { grade, section, stream, term, year } = req.body;

    if (!grade || !section || !term || !year) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Get all active teachers
    const teachers = await Teacher.find({ leaveDate: { $in: [null, "", undefined] } });

    // Get subjects for this grade
    const subjects = GRADE_SUBJECTS[grade] || GRADE_SUBJECTS[10];

    // Create teacher-subject mapping
    const teacherSubjectMap = {};
    teachers.forEach(teacher => {
      if (teacher.subjects && teacher.subjects.length > 0) {
        teacher.subjects.forEach(subject => {
          if (!teacherSubjectMap[subject]) {
            teacherSubjectMap[subject] = [];
          }
          teacherSubjectMap[subject].push(teacher);
        });
      }
    });

    // Calculate teacher load (how many classes each teacher currently teaches)
    const existingTimetables = await Timetable.find({ year });
    const teacherLoad = {};
    teachers.forEach(t => {
      teacherLoad[t._id.toString()] = {
        name: `${t.firstName} ${t.lastName}`,
        classes: 0,
        subjects: t.subjects || []
      };
    });

    existingTimetables.forEach(tt => {
      tt.slots.forEach(slot => {
        const teacherId = slot.teacherId.toString();
        if (teacherLoad[teacherId]) {
          teacherLoad[teacherId].classes += 1;
        }
      });
    });

    // Generate recommendations
    const recommendations = [];
    const subjectsWithTeachers = Object.keys(teacherSubjectMap).filter(s => subjects.includes(s));
    const missingSubjects = subjects.filter(s => !teacherSubjectMap[s]);

    if (subjectsWithTeachers.length === subjects.length) {
      recommendations.push({
        type: "success",
        message: "✅ All required subjects have assigned teachers"
      });
    } else {
      recommendations.push({
        type: "warning",
        message: `⚠️ ${missingSubjects.length} subjects missing teachers: ${missingSubjects.join(", ")}`
      });
    }

    // Check teacher availability
    const overloadedTeachers = Object.values(teacherLoad).filter(t => t.classes > 20);
    if (overloadedTeachers.length > 0) {
      recommendations.push({
        type: "warning",
        message: `⚠️ Teachers ${overloadedTeachers.map(t => t.name).join(", ")} are overloaded (${overloadedTeachers[0].classes} classes)`
      });
    } else {
      recommendations.push({
        type: "success",
        message: "✅ Teacher workload is balanced"
      });
    }

    // Calculate balance score
    const allClasses = Object.values(teacherLoad).map(t => t.classes);
    const avgClasses = allClasses.reduce((a, b) => a + b, 0) / allClasses.length;
    const variance = allClasses.reduce((sum, c) => sum + Math.pow(c - avgClasses, 2), 0) / allClasses.length;
    const balanceScore = Math.max(0, 100 - variance);

    // Subject coverage analysis
    const subjectCoverage = subjectsWithTeachers.map(subject => ({
      name: subject,
      hoursPerWeek: 2, // Default 2 hours per week
      teachers: teacherSubjectMap[subject].length
    }));

    res.json({
      success: true,
      recommendations,
      teacherLoad: Object.values(teacherLoad).filter(t => t.subjects.length > 0).slice(0, 5),
      subjectCoverage,
      balanceScore: Math.round(balanceScore),
      stats: {
        totalTeachers: teachers.length,
        activeTeachers: teachers.filter(t => !t.leaveDate).length,
        requiredSubjects: subjects.length,
        assignedSubjects: subjectsWithTeachers.length,
        missingSubjects: missingSubjects.length
      }
    });
  } catch (err) {
    console.error("❌ Error generating suggestions:", err.message);
    res.status(500).json({ message: "Failed to generate suggestions" });
  }
};
