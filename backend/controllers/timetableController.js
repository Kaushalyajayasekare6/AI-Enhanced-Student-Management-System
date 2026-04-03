import Timetable from "../models/Timetable.js";
import Teacher from "../models/teacherModel.js";
import ClassTeacher from "../models/ClassTeacher.js";
import Student from "../models/studentModel.js";

const INTELLIGENT_TIME_SLOTS = [
  "07:30-08:20",
  "08:20-09:10",
  "09:10-10:20",
  "10:40-11:30",
  "11:30-12:20",
  "12:30-13:30"
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const GRADE_SUBJECTS = {
  1: ["English", "Sinhala", "Maths", "EVS", "Religion", "Art"],
  2: ["English", "Sinhala", "Maths", "EVS", "Religion", "Art"],
  3: ["English", "Sinhala", "Maths", "EVS", "Religion", "Art"],
  4: ["English", "Sinhala", "Maths", "EVS", "Religion", "Art"],
  5: ["English", "Sinhala", "Maths", "EVS", "Religion", "Art"],
  6: ["English", "Sinhala", "Maths", "Science", "Religion", "Art"],
  7: ["English", "Sinhala", "Maths", "Science", "Religion", "Art"],
  8: ["English", "Sinhala", "Maths", "Science", "Religion", "Art"],
  9: ["English", "Sinhala", "Maths", "Science", "Religion", "Art"],
  10: ["English", "Sinhala", "Maths", "Science", "Religion", "History"],
  11: ["English", "Sinhala", "Maths", "Science", "Religion", "History"],
  12: ["English", "Sinhala", "Maths", "Science", "Religion", "History"],
  13: ["English", "Sinhala", "Maths", "Science", "Religion", "History"]
};

const GRADE_RULES = {
  primary: { grades: [1,2,3,4,5], periodsPerDay: 6 }
};

const DEFAULT_PRIMARY_SECTIONS = ["A", "B", "C", "D"];

// -------------------- Grades 6-9 (Middle) --------------------
// 8 periods per day
const MIDDLE_TIME_SLOTS_6_9 = [
  "07:30-08:10",
  "08:10-08:50",
  "08:50-09:30",
  "09:30-10:10",
  "10:30-11:10",
  "11:10-11:50",
  "11:50-12:30",
  "12:30-13:10",
];

const MIDDLE_SECTIONS = ["A", "B", "C", "D"];

// Core compulsory subjects (excluding the aesthetic elective)
const MIDDLE_CORE_SUBJECTS = [
  // Languages
  "Sinhala",
  "Tamil",
  "English",

  // Academics
  "Maths",
  "Science",
  "History",
  "Geography",

  // Other compulsory
  "Religion",
  "Civic Education",
  "Health",
  "ICT",
  "PTS (Physical Training)",
];

const MIDDLE_RELIGION_TEACHER_SUBJECTS = [
  "Buddhism",
  "Hinduism",
  "Islam",
  "Catholicism",
  "Christianity",
];

const MIDDLE_CIVIC_ALIASES = [
  "Civic Education",
  "Citizenship",
  "Civilization",
  "Social Science",
  "Life Competencies",
];

const MIDDLE_PTS_ALIASES = ["PTS (Physical Training)", "Technology"];

const MIDDLE_ELECTIVES_BY_SECTION = {
  A: "Art",
  B: "Music",
  C: "Dancing",
  D: "Drama and Theatre",
};

const getMiddleElectiveForSection = (section) => {
  const normalized = normalizeSection(section);
  return MIDDLE_ELECTIVES_BY_SECTION[normalized] || "Art";
};

const getMiddleSubjectsCycle = (electiveSubject) => {
  return [...MIDDLE_CORE_SUBJECTS, electiveSubject];
};

const getMiddleTeacherCandidates = (slotSubject, teachers) => {
  if (!slotSubject || !Array.isArray(teachers)) return [];

  // For most subjects, the teacher must explicitly teach that subject name.
  const has = (t, allowed) => (t?.subjects || []).some((s) => allowed.includes(s));

  switch (slotSubject) {
    case "Religion":
      return teachers.filter((t) => has(t, MIDDLE_RELIGION_TEACHER_SUBJECTS));
    case "Civic Education":
      return teachers.filter((t) => has(t, MIDDLE_CIVIC_ALIASES));
    case "PTS (Physical Training)":
      return teachers.filter((t) => has(t, MIDDLE_PTS_ALIASES));
    case "Art":
      return teachers.filter((t) => has(t, ["Art", "ART"]));
    default:
      return teachers.filter((t) => (t?.subjects || []).includes(slotSubject));
  }
};

const buildMiddleSlots = ({ gradeNum, section, electiveSubject }) => {
  const timeSlots = MIDDLE_TIME_SLOTS_6_9;
  const subjectsCycle = getMiddleSubjectsCycle(electiveSubject);

  const slots = [];
  DAYS.forEach((day, dayIndex) => {
    timeSlots.forEach((timeSlot, slotIndex) => {
      const globalIndex = dayIndex * timeSlots.length + slotIndex;
      const subject = subjectsCycle[globalIndex % subjectsCycle.length];
      slots.push({
        day,
        timeSlot,
        subject,
        teacherId: null,
        teacherStatus: "unassigned",
        room: `Room ${gradeNum}${section}`,
      });
    });
  });

  return slots;
};

const normalizeSection = (section = "") => String(section).trim().toUpperCase();

const isPrimaryTeacher = (teacher) => {
  const range = String(teacher?.classRange || "").toLowerCase();
  if (!range) return true;
  return (
    range.includes("1-5") ||
    range.includes("1 to 5") ||
    range.includes("grade 1") ||
    range.includes("primary")
  );
};

const isMiddleTeacher = (teacher) => {
  const range = String(teacher?.classRange || "").toLowerCase();
  if (!range) return true;
  return (
    range.includes("6-9") ||
    range.includes("6 to 9") ||
    range.includes("grade 6") ||
    range.includes("middle")
  );
};

const parseGradeValue = (gradeValue) => {
  if (typeof gradeValue === "number") return gradeValue;
  const match = String(gradeValue || "").match(/\d+/);
  return match ? parseInt(match[0], 10) : NaN;
};

const parseTermYear = (term, year) => ({
  term: Number.parseInt(term, 10) || 1,
  year: Number.parseInt(year, 10) || new Date().getFullYear(),
});

/* -------------------- CONFLICT CHECKING -------------------- */

const checkTeacherConflicts = async (slots, term, year, excludeTimetableId = null) => {
  const conflicts = [];

  // Get all existing timetables for this term/year (excluding the one being updated if provided)
  const query = { term, year };
  if (excludeTimetableId) {
    query._id = { $ne: excludeTimetableId };
  }

  const existingTimetables = await Timetable.find(query);

  // Build a map of teacher availability from existing timetables
  const teacherSchedule = new Map();

  // Populate with existing assignments
  existingTimetables.forEach(timetable => {
    timetable.slots.forEach(slot => {
      if (slot.teacherId) {
        const teacherId = String(slot.teacherId);
        const key = `${slot.day}|${slot.timeSlot}`;

        if (!teacherSchedule.has(teacherId)) {
          teacherSchedule.set(teacherId, new Set());
        }
        teacherSchedule.get(teacherId).add(key);
      }
    });
  });

  // Also build a map for the new slots to check internal conflicts
  const newSlotSchedule = new Map();

  // Check new slots for conflicts
  slots.forEach((slot, index) => {
    if (slot.teacherId) {
      const teacherId = String(slot.teacherId);
      const key = `${slot.day}|${slot.timeSlot}`;

      // Check against existing timetables
      if (teacherSchedule.has(teacherId) && teacherSchedule.get(teacherId).has(key)) {
        conflicts.push({
          slotIndex: index,
          teacherId,
          day: slot.day,
          timeSlot: slot.timeSlot,
          subject: slot.subject,
          conflictType: 'existing_timetable_conflict',
          message: 'Teacher already assigned to another class at this time'
        });
      }

      // Check for conflicts within the new slots themselves
      if (newSlotSchedule.has(teacherId) && newSlotSchedule.get(teacherId).has(key)) {
        conflicts.push({
          slotIndex: index,
          teacherId,
          day: slot.day,
          timeSlot: slot.timeSlot,
          subject: slot.subject,
          conflictType: 'internal_conflict',
          message: 'Teacher assigned multiple times at the same time slot'
        });
      }

      // Add to new slot schedule for future checks
      if (!newSlotSchedule.has(teacherId)) {
        newSlotSchedule.set(teacherId, new Set());
      }
      newSlotSchedule.get(teacherId).add(key);
    }
  });

  return conflicts;
};

const buildPrimarySlots = ({
  gradeNum,
  section,
  subjects,
  classIndex = 0,
  englishTeacherId = null,
  classTeacherId = null,
}) => {
  const timeSlots = INTELLIGENT_TIME_SLOTS.slice(0, 6);
  const slots = [];

  DAYS.forEach((day, dayIndex) => {
    const englishPeriodIndex = (classIndex + dayIndex) % timeSlots.length;
    const otherSubjects = subjects.filter((s) => s !== "English");
    let otherSubjectCounter = 0;

    timeSlots.forEach((timeSlot, slotIndex) => {
      const isEnglish = slotIndex === englishPeriodIndex;
      const subject = isEnglish
        ? "English"
        : otherSubjects[otherSubjectCounter++ % otherSubjects.length];
      const teacherId = isEnglish ? englishTeacherId : classTeacherId;

      slots.push({
        day,
        timeSlot,
        subject,
        teacherId,
        teacherStatus: teacherId ? "assigned" : "unassigned",
        room: `Room ${gradeNum}${section}`,
      });
    });
  });

  return slots;
};

const upsertTimetable = async ({ grade, section, term, year, slots, autoGenerated = true }) =>
  Timetable.findOneAndUpdate(
    { grade, section, term, year },
    { $set: { slots, autoGenerated } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );


/* -------------------- GENERATE TIMETABLE -------------------- */

const generateTimetable = async (req, res) => {
  try {

    const { grade, section } = req.body;
    const { term, year } = parseTermYear(req.body.term, req.body.year);

    const gradeNum = parseInt(grade);
    const normalizedSection = normalizeSection(section);
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 13) {
      return res.status(400).json({ message: "Invalid grade. Only grades 1-13 are supported." });
    }
    if (!normalizedSection) {
      return res.status(400).json({ message: "Section is required." });
    }

    const subjects = GRADE_SUBJECTS[gradeNum];
    const days = DAYS;
    const timeSlots = INTELLIGENT_TIME_SLOTS.slice(0,6);

    const slots = [];

    days.forEach(day=>{
      timeSlots.forEach((timeSlot,i)=>{

        const subject = subjects[i % subjects.length];

        slots.push({
          day,
          timeSlot,
          subject,
          teacherStatus:"unassigned",
          room:`Room ${gradeNum}${section}`
        });

      });
    });

    const timetable = await upsertTimetable({
      grade: gradeNum,
      section: normalizedSection,
      term,
      year,
      slots,
      autoGenerated: true,
    });

    res.json({
      success:true,
      timetable
    });

  } catch (error) {

    res.status(500).json({message:error.message});

  }
};


/* -------------------- GET TIMETABLE -------------------- */

const getTimetable = async (req,res)=>{
  try{

    const {grade, section, term = 1, year = new Date().getFullYear()} = req.query;
    const gradeNum = Number.parseInt(grade, 10);
    const normalizedSection = normalizeSection(section);
    const parsedTerm = Number.parseInt(term, 10);
    const parsedYear = Number.parseInt(year, 10);

    const timetable = await Timetable.findOne({
      grade: gradeNum,
      section: normalizedSection,
      term: parsedTerm,
      year: parsedYear,
    }).populate("slots.teacherId", "firstName lastName subjects");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json(timetable);

  }catch(err){

    res.status(500).json({message:err.message});

  }
};


/* -------------------- TEACHER TIMETABLE -------------------- */

const getTeacherTimetable = async (req,res)=>{
  try{

    const teacherId = req.user.userId;
    const { term = 1, year = new Date().getFullYear() } = req.query;
    const parsedTerm = Number.parseInt(term, 10);
    const parsedYear = Number.parseInt(year, 10);

    const timetables = await Timetable.find({
      "slots.teacherId":teacherId
    })
      .where("term").equals(parsedTerm)
      .where("year").equals(parsedYear)
      .populate("slots.teacherId", "firstName lastName");

    const slots = [];
    timetables.forEach((timetable) => {
      timetable.slots.forEach((slot) => {
        if (slot.teacherId && String(slot.teacherId._id) === String(teacherId)) {
          slots.push({
            day: slot.day,
            timeSlot: slot.timeSlot,
            subject: slot.subject,
            room: slot.room,
            grade: timetable.grade,
            section: timetable.section,
            term: timetable.term,
            year: timetable.year,
          });
        }
      });
    });

    res.json({ slots, term: parsedTerm, year: parsedYear });

  }catch(err){

    res.status(500).json({message:err.message});

  }
};


/* -------------------- STUDENT TIMETABLE -------------------- */

const getStudentTimetable = async (req,res)=>{
  try{

    const student = await Student.findById(req.user.userId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const grade = parseGradeValue(student.grade);
    const section = normalizeSection(student.section);
    const requestedTerm = Number.parseInt(req.query.term, 10);
    const requestedYear = Number.parseInt(req.query.year, 10);
    const studentTerm = Number.parseInt(student.term, 10);
    const term = requestedTerm || studentTerm || 1;
    const year = requestedYear || new Date().getFullYear();

    const timetable = await Timetable.findOne({ grade, section, term, year })
      .populate("slots.teacherId", "firstName lastName");

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json(timetable);

  }catch(err){

    res.status(500).json({message:err.message});

  }
};


/* -------------------- DELETE TIMETABLE -------------------- */

const deleteTimetable = async (req,res)=>{
  try{
    const { grade, section, term, year } = req.body;

    if (!grade || !section || !term || !year) {
      return res.status(400).json({ message: "Grade, section, term, and year are required" });
    }

    const gradeNum = parseInt(grade);
    const normalizedSection = normalizeSection(section);
    const parsedTerm = Number.parseInt(term, 10);
    const parsedYear = Number.parseInt(year, 10);

    const timetable = await Timetable.findOneAndDelete({
      grade: gradeNum,
      section: normalizedSection,
      term: parsedTerm,
      year: parsedYear,
    });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.json({
      success: true,
      message: "Timetable deleted successfully"
    });

  }catch(err){
    res.status(500).json({message: err.message});
  }
};


/* -------------------- UPDATE TIMETABLE -------------------- */

const updateTimetable = async (req,res)=>{
  try{
    const { grade, section, term, year, slots } = req.body;

    if (!grade || !section || !term || !year) {
      return res.status(400).json({ message: "Grade, section, term, and year are required" });
    }

    const gradeNum = parseInt(grade);
    const normalizedSection = normalizeSection(section);
    const parsedTerm = Number.parseInt(term, 10);
    const parsedYear = Number.parseInt(year, 10);

    // Find existing timetable
    const existingTimetable = await Timetable.findOne({
      grade: gradeNum,
      section: normalizedSection,
      term: parsedTerm,
      year: parsedYear,
    });

    if (!existingTimetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Check for conflicts if slots with teacher assignments are provided
    if (slots && Array.isArray(slots)) {
      const conflicts = await checkTeacherConflicts(slots, parsedTerm, parsedYear, existingTimetable._id);

      if (conflicts.length > 0) {
        return res.status(409).json({
          message: "Teacher conflicts detected",
          conflicts: conflicts.map(c => ({
            teacherId: c.teacherId,
            day: c.day,
            timeSlot: c.timeSlot,
            subject: c.subject,
            message: c.message
          }))
        });
      }
    }

    // Update the timetable
    const updatedTimetable = await Timetable.findByIdAndUpdate(
      existingTimetable._id,
      req.body,
      { new: true, runValidators: true }
    ).populate("slots.teacherId", "firstName lastName");

    res.json({
      success: true,
      timetable: updatedTimetable,
      message: "Timetable updated successfully"
    });

  }catch(err){
    res.status(500).json({message: err.message});
  }
};


/* -------------------- GET ALL TIMETABLES -------------------- */

const getAllTimetables = async (req,res)=>{
  try{
    const { term, year } = req.query;
    const filters = {};
    if (term) filters.term = Number.parseInt(term, 10);
    if (year) filters.year = Number.parseInt(year, 10);

    const timetables = await Timetable.find(filters)
      .populate("slots.teacherId", "firstName lastName")
      .sort({ grade: 1, section: 1 });

    res.json(timetables);

  }catch(err){

    res.status(500).json({message:err.message});

  }
};


/* -------------------- AI SUGGESTIONS -------------------- */

const generateTimetableSuggestions = async (req,res)=>{
  try{

    res.json({
      suggestions:"AI timetable suggestions feature coming soon"
    });

  }catch(err){

    res.status(500).json({message:err.message});

  }
};


/* -------------------- AUTO GENERATE GRADE 1-5 -------------------- */

const generateTimetableGrade1_5 = async (req, res) => {

  try {

    const { grade, section, englishTeacherId, classTeacherId } = req.body;
    const { term, year } = parseTermYear(req.body.term, req.body.year);

    const gradeNum = parseInt(grade);
    const normalizedSection = normalizeSection(section);

    if (Number.isNaN(gradeNum) || gradeNum < 1 || gradeNum > 5) {
      return res.status(400).json({ message: "Only grades 1-5 allowed" });
    }
    if (!normalizedSection) {
      return res.status(400).json({ message: "Section is required" });
    }

    const [englishTeacher, classTeacher] = await Promise.all([
      Teacher.findById(englishTeacherId),
      Teacher.findById(classTeacherId)
    ]);

    if (!englishTeacher || !classTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (!englishTeacher.subjects.includes("English")) {
      return res.status(400).json({ message: "English teacher required" });
    }

    const subjects = GRADE_SUBJECTS[gradeNum];
    const slots = buildPrimarySlots({
      gradeNum,
      section: normalizedSection,
      subjects,
      classIndex: 0,
      englishTeacherId: englishTeacher._id,
      classTeacherId: classTeacher._id,
    });

    // Check for teacher conflicts before creating timetable
    const conflicts = await checkTeacherConflicts(slots, term, year);

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Teacher conflicts detected",
        conflicts: conflicts.map(c => ({
          teacherId: c.teacherId,
          day: c.day,
          timeSlot: c.timeSlot,
          subject: c.subject,
          message: c.message
        }))
      });
    }

    const timetable = await upsertTimetable({
      grade: gradeNum,
      section: normalizedSection,
      term,
      year,
      slots,
      autoGenerated: true,
    });

    await ClassTeacher.findOneAndUpdate(

      {grade:gradeNum,section: normalizedSection},
      {teacherId:classTeacherId},
      {upsert:true}

    );

    res.json({
      success:true,
      timetable,
      message:`Auto timetable Grade ${gradeNum}${section} created`
    });

  } catch (err) {

    res.status(500).json({ message: err.message });

  }

};

/* -------------------- AUTO GENERATE GRADE 6-9 -------------------- */
const generateTimetableGrade6_9 = async (req, res) => {
  try {
    const { grade, section, term: termInput, year: yearInput } = req.body;
    const gradeNum = parseInt(grade, 10);
    const normalizedSection = normalizeSection(section);

    const termYear = parseTermYear(termInput, yearInput);
    const term = termYear.term;
    const year = termYear.year;

    if (Number.isNaN(gradeNum) || gradeNum < 6 || gradeNum > 9) {
      return res.status(400).json({ message: "Only grades 6-9 allowed" });
    }
    if (!normalizedSection || !["A", "B", "C", "D"].includes(normalizedSection)) {
      return res.status(400).json({ message: "Section must be one of A, B, C, D" });
    }

    const electiveSubject = getMiddleElectiveForSection(normalizedSection);
    const skeletonSlots = buildMiddleSlots({
      gradeNum,
      section: normalizedSection,
      electiveSubject,
    });

    const teacherRecords = await Teacher.find({
      $or: [{ leaveDate: { $exists: false } }, { leaveDate: null }, { leaveDate: "" }],
    });
    const middleTeachers = teacherRecords.filter((t) => isMiddleTeacher(t));
    const activeTeachers = middleTeachers.length ? middleTeachers : teacherRecords.filter(Boolean);

    const teacherBusy = new Map();
    const teacherLoad = new Map();
    const isTeacherFree = (teacherId, day, timeSlot) => {
      const busy = teacherBusy.get(String(teacherId));
      return !busy?.has(`${day}|${timeSlot}`);
    };
    const reserveTeacher = (teacherId, day, timeSlot) => {
      const key = String(teacherId);
      if (!teacherBusy.has(key)) teacherBusy.set(key, new Set());
      teacherBusy.get(key).add(`${day}|${timeSlot}`);
      teacherLoad.set(key, (teacherLoad.get(key) || 0) + 1);
    };

    let classTeacherId = null;
    const slots = skeletonSlots.map((slot) => {
      const candidates = getMiddleTeacherCandidates(slot.subject, activeTeachers);
      // Prefer the least-loaded free teacher
      const sorted = [...candidates].sort(
        (a, b) => (teacherLoad.get(String(a._id)) || 0) - (teacherLoad.get(String(b._id)) || 0)
      );
      const chosen = sorted.find((t) => isTeacherFree(t._id, slot.day, slot.timeSlot)) || null;

      if (chosen) {
        reserveTeacher(chosen._id, slot.day, slot.timeSlot);
        if (!classTeacherId && slot.subject === "English") classTeacherId = chosen._id;
        return {
          ...slot,
          teacherId: chosen._id,
          teacherStatus: "assigned",
        };
      }

      return { ...slot, teacherId: null, teacherStatus: "unassigned" };
    });

    const anyUnassigned = slots.some((s) => !s.teacherId);
    if (anyUnassigned) {
      const missingSubjects = Array.from(new Set(slots.filter((s) => !s.teacherId).map((s) => s.subject)));
      return res.status(409).json({
        message: "Cannot generate Grade 6-9 timetable: missing teacher(s) for some subjects",
        missingSubjects,
      });
    }

    const conflicts = await checkTeacherConflicts(slots, term, year);
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Teacher conflicts detected",
        conflicts: conflicts.map((c) => ({
          teacherId: c.teacherId,
          day: c.day,
          timeSlot: c.timeSlot,
          subject: c.subject,
          message: c.message,
        })),
      });
    }

    const timetable = await upsertTimetable({
      grade: gradeNum,
      section: normalizedSection,
      term,
      year,
      slots,
      autoGenerated: true,
    });

    // Attendance / student list for teachers depends on ClassTeacher
    await ClassTeacher.findOneAndUpdate(
      { grade: gradeNum, section: normalizedSection, stream: null },
      { teacherId: classTeacherId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      timetable,
      message: `Auto timetable Grade ${gradeNum}${normalizedSection} created (Grades 6-9)`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const autoGenerateAllMiddleTimetables = async (req, res) => {
  try {
    const { term: termInput, year: yearInput } = req.body;
    const termYear = parseTermYear(termInput, yearInput);
    const term = termYear.term;
    const year = termYear.year;

    const teacherRecords = await Teacher.find({
      $or: [{ leaveDate: { $exists: false } }, { leaveDate: null }, { leaveDate: "" }],
    });
    const middleTeachers = teacherRecords.filter((t) => isMiddleTeacher(t));
    const activeTeachers = middleTeachers.length ? middleTeachers : teacherRecords.filter(Boolean);

    const classes = [];
    for (const gradeNum of [6, 7, 8, 9]) {
      for (const section of MIDDLE_SECTIONS) {
        classes.push({ grade: gradeNum, section });
      }
    }

    const teacherBusy = new Map();
    const teacherLoad = new Map();
    const generated = [];
    const failed = [];

    const isTeacherFree = (teacherId, day, timeSlot) => {
      const busy = teacherBusy.get(String(teacherId));
      return !busy?.has(`${day}|${timeSlot}`);
    };
    const reserveTeacher = (teacherId, day, timeSlot) => {
      const key = String(teacherId);
      if (!teacherBusy.has(key)) teacherBusy.set(key, new Set());
      teacherBusy.get(key).add(`${day}|${timeSlot}`);
      teacherLoad.set(key, (teacherLoad.get(key) || 0) + 1);
    };

    for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
      const { grade: gradeNum, section } = classes[classIndex];
      const normalizedSection = normalizeSection(section);

      const electiveSubject = getMiddleElectiveForSection(normalizedSection);
      const skeletonSlots = buildMiddleSlots({
        gradeNum,
        section: normalizedSection,
        electiveSubject,
      });

      let classTeacherId = null;

      // Local scheduling buffer: do not reserve teachers globally until the class is accepted.
      const localBusy = new Map();
      const localLoad = new Map();
      const isTeacherFreeLocal = (teacherId, day, timeSlot) => {
        const key = String(teacherId);
        const slotKey = `${day}|${timeSlot}`;
        const globalSet = teacherBusy.get(key);
        const localSet = localBusy.get(key);
        return !(globalSet?.has(slotKey) || localSet?.has(slotKey));
      };
      const reserveTeacherLocal = (teacherId, day, timeSlot) => {
        const key = String(teacherId);
        const slotKey = `${day}|${timeSlot}`;
        if (!localBusy.has(key)) localBusy.set(key, new Set());
        localBusy.get(key).add(slotKey);
        localLoad.set(key, (localLoad.get(key) || 0) + 1);
      };

      const slots = skeletonSlots.map((slot) => {
        const candidates = getMiddleTeacherCandidates(slot.subject, activeTeachers);
        const sorted = [...candidates].sort(
          (a, b) =>
            ((teacherLoad.get(String(a._id)) || 0) + (localLoad.get(String(a._id)) || 0)) -
            ((teacherLoad.get(String(b._id)) || 0) + (localLoad.get(String(b._id)) || 0))
        );
        const chosen =
          sorted.find((t) => isTeacherFreeLocal(t._id, slot.day, slot.timeSlot)) || null;

        if (chosen) {
          reserveTeacherLocal(chosen._id, slot.day, slot.timeSlot);
          if (!classTeacherId && slot.subject === "English") classTeacherId = chosen._id;
          return { ...slot, teacherId: chosen._id, teacherStatus: "assigned" };
        }

        return { ...slot, teacherId: null, teacherStatus: "unassigned" };
      });

      const anyUnassigned = slots.some((s) => !s.teacherId);
      if (anyUnassigned) {
        const missingSubjects = Array.from(new Set(slots.filter((s) => !s.teacherId).map((s) => s.subject)));
        failed.push({ grade: gradeNum, section: normalizedSection, reason: `Missing teacher(s): ${missingSubjects.join(", ")}` });
        continue;
      }

      const conflicts = await checkTeacherConflicts(slots, term, year);
      if (conflicts.length > 0) {
        failed.push({
          grade: gradeNum,
          section: normalizedSection,
          reason: "Teacher conflicts detected for this timetable",
        });
        continue;
      }

      // Commit teacher reservations globally now that the class timetable is accepted.
      slots.forEach((slot) => {
        if (slot.teacherId) reserveTeacher(slot.teacherId, slot.day, slot.timeSlot);
      });

      const timetable = await upsertTimetable({
        grade: gradeNum,
        section: normalizedSection,
        term,
        year,
        slots,
        autoGenerated: true,
      });

      // Attendance / student list for teachers depends on ClassTeacher
      if (!classTeacherId) {
        // Fallback: first assigned teacher
        classTeacherId = slots.find((s) => s.teacherId)?.teacherId || null;
      }
      await ClassTeacher.findOneAndUpdate(
        { grade: gradeNum, section: normalizedSection, stream: null },
        { teacherId: classTeacherId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      generated.push({
        id: timetable._id,
        grade: gradeNum,
        section: normalizedSection,
        electiveSubject,
      });
    }

    return res.json({
      success: true,
      message: `Generated ${generated.length} timetable(s) for Grades 6-9`,
      term,
      year,
      generated,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* -------------------- AUTO GENERATE ALL PRIMARY -------------------- */

const autoGenerateAllPrimaryTimetables = async (req, res) => {
  try {
    const { term, year } = parseTermYear(req.body.term, req.body.year);

    const teacherRecords = await Teacher.find({
      $or: [{ leaveDate: { $exists: false } }, { leaveDate: null }, { leaveDate: "" }],
    });
    const allTeachers = teacherRecords.filter(isPrimaryTeacher);

    const englishTeachers = allTeachers.filter((teacher) => teacher.subjects?.includes("English"));
    if (!englishTeachers.length) {
      return res.status(200).json({
        success: true,
        message: "No English teachers available for grades 1-5",
        term,
        year,
        generated: [],
        failed: GRADE_RULES.primary.grades.flatMap((grade) =>
          DEFAULT_PRIMARY_SECTIONS.map((section) => ({
            grade,
            section,
            reason: "No English teacher available for primary classes",
          }))
        ),
      });
    }
    if (!allTeachers.length) {
      return res.status(200).json({
        success: true,
        message: "No primary teachers available for grades 1-5",
        term,
        year,
        generated: [],
        failed: GRADE_RULES.primary.grades.flatMap((grade) =>
          DEFAULT_PRIMARY_SECTIONS.map((section) => ({
            grade,
            section,
            reason: "No class teacher available for primary classes",
          }))
        ),
      });
    }

    const classes = GRADE_RULES.primary.grades.flatMap((grade) =>
      DEFAULT_PRIMARY_SECTIONS.map((section) => ({ grade, section }))
    );

    const teacherBusy = new Map();
    const teacherLoad = new Map();
    const generated = [];
    const failed = [];

    const isTeacherFree = (teacherId, day, timeSlot) => {
      const busy = teacherBusy.get(String(teacherId));
      return !busy?.has(`${day}|${timeSlot}`);
    };

    const reserveTeacher = (teacherId, day, timeSlot) => {
      const key = String(teacherId);
      if (!teacherBusy.has(key)) teacherBusy.set(key, new Set());
      teacherBusy.get(key).add(`${day}|${timeSlot}`);
      teacherLoad.set(key, (teacherLoad.get(key) || 0) + 1);
    };

    for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
      const classInfo = classes[classIndex];
      const gradeNum = classInfo.grade;
      const section = normalizeSection(classInfo.section);
      const subjects = GRADE_SUBJECTS[gradeNum] || GRADE_SUBJECTS[1];
      const skeletonSlots = buildPrimarySlots({
        gradeNum,
        section,
        subjects,
        classIndex,
      });

      const englishSlots = skeletonSlots.filter((slot) => slot.subject === "English");
      const nonEnglishSlots = skeletonSlots.filter((slot) => slot.subject !== "English");

      const sortedEnglishCandidates = [...englishTeachers].sort(
        (a, b) => (teacherLoad.get(String(a._id)) || 0) - (teacherLoad.get(String(b._id)) || 0)
      );
      const englishTeacher = sortedEnglishCandidates.find((teacher) =>
        englishSlots.every((slot) => isTeacherFree(teacher._id, slot.day, slot.timeSlot))
      );

      const sortedClassCandidates = [...allTeachers].sort(
        (a, b) => (teacherLoad.get(String(a._id)) || 0) - (teacherLoad.get(String(b._id)) || 0)
      );
      const classTeacher = sortedClassCandidates.find((teacher) =>
        nonEnglishSlots.every((slot) => isTeacherFree(teacher._id, slot.day, slot.timeSlot))
      );

      if (!englishTeacher || !classTeacher) {
        const reason = !englishTeacher
          ? "No available English teacher for required slots"
          : "No available class teacher for required slots";
        failed.push({
          grade: gradeNum,
          section,
          reason,
        });
        continue;
      }

      const slots = skeletonSlots.map((slot) => ({
        ...slot,
        teacherId: slot.subject === "English" ? englishTeacher._id : classTeacher._id,
        teacherStatus: "assigned",
      }));

      slots.forEach((slot) => reserveTeacher(slot.teacherId, slot.day, slot.timeSlot));

      const timetable = await upsertTimetable({
        grade: gradeNum,
        section,
        term,
        year,
        slots,
        autoGenerated: true,
      });

      await ClassTeacher.findOneAndUpdate(
        { grade: gradeNum, section },
        { teacherId: classTeacher._id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      generated.push({
        id: timetable._id,
        grade: gradeNum,
        section,
        englishTeacherId: englishTeacher._id,
        classTeacherId: classTeacher._id,
      });
    }

    return res.json({
      success: true,
      message: `Generated ${generated.length} timetable(s) with conflict checks`,
      term,
      year,
      generated,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


/* -------------------- EXPORTS -------------------- */

export {
  generateTimetable,
  getTimetable,
  getTeacherTimetable,
  getStudentTimetable,
  deleteTimetable,
  updateTimetable,
  getAllTimetables,
  generateTimetableSuggestions,
  generateTimetableGrade1_5,
  generateTimetableGrade6_9,
  autoGenerateAllPrimaryTimetables,
  autoGenerateAllMiddleTimetables,
};