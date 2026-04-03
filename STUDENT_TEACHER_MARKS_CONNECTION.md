# StudentMarksPage ↔ TeacherMarksPage Connection Guide

## Overview

The **StudentMarksPage** and **TeacherMarksPage** are two sides of the same marks system:

- **TeacherMarksPage**: Teachers enter and manage marks for their assigned class
- **StudentMarksPage**: Students view their marks and see AI predictions

Both pages connect to:
1. **Marks API** (`/api/marks/*`) - For storing and retrieving marks
2. **ML Prediction API** (`/api/ml/predict-marks`) - For generating predictions
3. **Backend ML Service** (Port 8003) - For actual mark predictions using trained models

---

## Data Flow Diagram

```
TEACHER SIDE                          DATABASE                      STUDENT SIDE
│                                       │                              │
TeacherMarksPage                        │                              │
│─ Fetches students in class ──────►   │                              │
│  (ATTENDANCE.TEACHER_STUDENTS)       │                              │
│                                       │                              │
│─ Displays marks input form             │                              │
│                                       │                              │
│─ Teacher enters marks ──────────────► Marks Collection ◄────────────┤
│                                       │                              │
│─ Saves marks (bulk-upsert) ──────────►│                              │
│  (MARKS.BULK_UPSERT)                 │                              │
│                                       │                              │
│─ Marks also sync to Student model     │                              │
│  (student.terms[].marks)              │                              │
│                                       │                              │
│─ ML Controller fetches for            │                              │
│  predictions ─────────────────────────┼───────────────────────────►  StudentMarksPage
│  (Queries Marks + Attendance)         │                              │
│                                       │                              │
│  Backend ML Service (Port 8003)       │                              │
│  ├─ Receives marks (English, Maths,   │                              │
│  │  Sinhala, Tamil, Env, Religion)    │                              │
│  ├─ Receives attendance rate          │                              │
│  └─ Returns predictions ──────────────┼──────────────────────────►   Student sees
│                                       │                              predictions
```

---

## 1. TeacherMarksPage Flow

### Step 1: Fetch Students and Current Marks
```javascript
// In TeacherMarksPage.jsx - Lines 125-225
const fetchStudentsAndMarks = async () => {
  // 1. Get teacher's assigned class students
  const studentsRes = await axios.get(
    API_ENDPOINTS.ATTENDANCE.TEACHER_STUDENTS,  // GET /api/attendance/teacher-students
    { headers: getAuthHeaders() }
  );

  // 2. Get marks for the class (year/term specific)
  const marksRes = await axios.get(
    API_ENDPOINTS.MARKS.TEACHER_CLASS,  // GET /api/marks/teacher-class
    { headers: getAuthHeaders(), params: { year, term } }
  );

  // 3. Organize students by grade (1-5, 6-9, 10-11, 12)
  // Store in state: studentsByGrade
};
```

### Step 2: Teacher Enters Marks
```javascript
// In TeacherMarksPage.jsx - Lines 330-350
const handleMarkChange = (grade, studentId, subject, value) => {
  setStudentsByGrade((prev) => ({
    ...prev,
    [grade]: {
      ...prev[grade],
      students: prev[grade].students.map((s) =>
        s._id === studentId
          ? {
              ...s,
              marks: {
                ...s.marks,
                [subject]: numValue,  // Update local state
              },
            }
          : s
      ),
    },
  }));
};
```

**⚠️ Note**: Marks are stored in LOCAL state only until "Save" is clicked.

### Step 3: Save Marks to Database
```javascript
// In TeacherMarksPage.jsx - Lines 361-402
const saveMarks = async () => {
  // 1. Collect all mark updates from all grades
  const updates = [];
  Object.values(studentsByGrade).forEach((gradeData) => {
    gradeData.students.forEach((student) => {
      updates.push({
        studentId: student._id,
        year: selectedYear,
        term: selectedTerm,
        marks: student.marks,  // { english: 75, maths: 80, ... }
      });
    });
  });

  // 2. Send bulk update
  const response = await axios.post(
    `${API_ENDPOINTS.MARKS.UPSERT.replace('/upsert','')}/bulk-upsert`,
    // ✅ This resolves to: POST /api/marks/bulk-upsert
    { updates },
    { headers: getAuthHeaders() }
  );
};
```

### Step 4: Auto-Generate Predictions (Grade 1-5 only)
```javascript
// In TeacherMarksPage.jsx - Lines 241-303
const predictGradeMarks = useCallback(async (grade) => {
  // Only works for Grade 1-5
  if (grade !== "Grade 1-5") return;

  // For each student, call ML prediction endpoint
  const predictions = await Promise.allSettled(
    gradeData.students.map(async (student) => {
      const response = await axios.post(
        API_ENDPOINTS.ML.PREDICT_MARKS,  // POST /api/ml/predict-marks
        { studentId: student._id, year: selectedYear, term: selectedTerm },
        { headers: getAuthHeaders() }
      );
      // Returns: { predicted_marks: { english: {...}, maths: {...}, ... } }
    })
  );
};
```

---

## 2. StudentMarksPage Flow

### Step 1: Fetch Student's Marks
```javascript
// In StudentMarks.jsx - Lines 94-150
useEffect(() => {
  const fetchMarksData = async () => {
    // Get marks for logged-in student
    const marksRes = await axios.get(
      API_ENDPOINTS.MARKS.MY_MARKS,  // GET /api/marks/my-marks
      { headers: getAuthHeaders() }
    );
    
    // Returns: { student, marks: [ { year, term, marks: {...} } ], subjects }
    const { student, marks } = marksRes.data;
    
    // Transform and display marks
    setMarksData(formattedMarks);
  };
  
  fetchMarksData();
}, [year, term]);
```

### Step 2: Get AI Predictions (Grade 1-5 only)
```javascript
// In StudentMarks.jsx - Lines 159-210
useEffect(() => {
  const fetchPredictions = async () => {
    // Check if student is Grade 1-5
    if (gradeValue < 1 || gradeValue > 5) {
      setPredictionError("Marks prediction is supported only for grades 1 to 5.");
      return;
    }

    // Call ML prediction endpoint
    const predictionRes = await axios.post(
      API_ENDPOINTS.ML.PREDICT_MARKS,  // POST /api/ml/predict-marks
      { studentId, year: Number(year), term: Number(term) },
      { headers: getAuthHeaders() }
    );
    
    // Returns: { 
    //   success: true, 
    //   predicted_marks: { 
    //     english: { predicted: 78, min: 72, max: 84 },
    //     math: { predicted: 82, min: 76, max: 88 },
    //     ... 
    //   } 
    // }
    
    setPredictions(predictionRes.data);
  };
  
  fetchPredictions();
}, [studentData, year, term]);
```

---

## 3. Backend Connection: Marks Model → ML Predictions

### Backend Marks Routes
```javascript
// backend/routes/marksRoutes.js

POST   /marks/upsert          → Single mark entry
POST   /marks/bulk-upsert     → Bulk mark entry (TeacherMarksPage uses this)
GET    /marks/teacher-class   → Teacher's class marks
GET    /marks/student         → Specific student's marks
GET    /marks/my-marks        → Logged-in student's marks
GET    /marks/all             → All marks (admin)
```

### Backend Marks Controller: upsertMarksBulk
```javascript
// backend/controllers/marksController.js - Lines 100-130

export const upsertMarksBulk = async (req, res) => {
  const { updates } = req.body;  // Array of { studentId, year, term, marks }
  
  const results = [];
  for (const update of updates) {
    // For each student:
    let marksRecord = await Marks.findOne({ 
      studentId: update.studentId, 
      year: update.year, 
      term: update.term 
    });
    
    // Create or update Marks document
    if (marksRecord) {
      marksRecord.marks = cleanedMarks;  // { english: 75, maths: 80, ... }
      await marksRecord.save();
    } else {
      marksRecord = new Marks({ ...update, marks: cleanedMarks });
      await marksRecord.save();
    }
    
    // ✅ IMPORTANT: Also sync to Student model for quick access
    const student = await Student.findById(update.studentId);
    const existingTerm = student.terms.find(t => t.year === year && t.term === term);
    if (existingTerm) {
      existingTerm.marks = cleanedMarks;
    } else {
      student.terms.push({ year, term, marks: cleanedMarks });
    }
    await student.save();
    
    results.push({ success: true, marks: marksRecord });
  }
  
  res.status(200).json({ results });
};
```

### ML Controller: Fetch Marks for Predictions
```javascript
// backend/controllers/mlMarksController.js - Lines 37-50

export const predictMarksML = async (req, res) => {
  const { studentId, year, term } = req.body;
  
  // Get student
  const student = await Student.findById(studentId);
  
  // Fetch latest marks for the student
  const marksQuery = { studentId };
  if (year) marksQuery.year = Number(year);
  if (term) marksQuery.term = Number(term);
  
  const marksRecords = await Marks.find(marksQuery)
    .sort({ year: -1, term: -1 })
    .limit(1);  // Get latest
  
  const latestMarks = marksRecords.length > 0 ? marksRecords[0] : null;
  const marks = latestMarks?.marks || {};  // { english: 75, maths: 80, ... }
  
  // Extract marks with fallback handling
  const english = marks.english ?? 50;
  const math = marks.maths ?? marks.math ?? 50;
  const sinhala = marks.sinhala ?? 50;
  const tamil = marks.tamil ?? 50;
  const env = marks.science ?? marks.env ?? 50;
  const religion = marks.religion ?? 50;
  
  // Calculate attendance for the year
  const attendance = await calculateAttendance(studentId, year);
  
  // Send to FastAPI model (Port 8003)
  const mlResponse = await axios.post(
    'http://localhost:8003/predict',
    {
      attendance,
      english,
      math,
      sinhala,
      tamil,
      env,
      religion
    }
  );
  
  // mlResponse = { 
  //   english: { predicted: 78, min: 72, max: 84 },
  //   math: { predicted: 82, min: 76, max: 88 },
  //   ...
  // }
  
  res.json({
    success: true,
    predicted_marks: mlResponse.data,  // Rename 'env' to 'science' if needed
    student,
    marks
  });
};
```

---

## 4. Issues and Fixes

### ❌ Issue 1: Hardcoded API Endpoint in TeacherMarksPage

**Location**: `frontend/src/Pages/TeacherMarksPage/TeacherMarksPage.jsx`, line ~375

**Current Code**:
```javascript
const response = await axios.post(
  `${API_ENDPOINTS.MARKS.UPSERT.replace('/upsert','')}/bulk-upsert`,
  { updates },
  { headers: getAuthHeaders() }
);
```

**Problem**: 
- Manipulates the API endpoint string by removing `/upsert`
- Creates double slashes: `/api/marks//bulk-upsert`
- Not DRY (Don't Repeat Yourself)

**✅ Fix**: Add constant to `api.js`
```javascript
// frontend/src/config/api.js
export const API_ENDPOINTS = {
  // ...
  MARKS: {
    BASE: `${API_BASE_URL}/marks`,
    UPSERT: `${API_BASE_URL}/marks/upsert`,
    BULK_UPSERT: `${API_BASE_URL}/marks/bulk-upsert`,  // ← ADD THIS
    STUDENT: `${API_BASE_URL}/marks/student`,
    TEACHER_CLASS: `${API_BASE_URL}/marks/teacher-class`,
    ALL: `${API_BASE_URL}/marks/all`,
    MY_MARKS: `${API_BASE_URL}/marks/my-marks`,
  },
};
```

Then update TeacherMarksPage:
```javascript
const response = await axios.post(
  API_ENDPOINTS.MARKS.BULK_UPSERT,  // Use constant directly
  { updates },
  { headers: getAuthHeaders() }
);
```

---

### ❌ Issue 2: Subject Name Mismatch (science vs env)

**Locations**: 
- `frontend`: TeacherMarksPage stores as `science`
- `backend`: Marks model stores as `science`
- `ML`: Expects `env` in requested format

**Current Code** (TeacherMarksPage, line ~27):
```javascript
const SUBJECTS_BY_GRADE = {
  "1-5": [
    // ...
    { key: "science", label: "Science" },  // ← Stored as 'science'
  ],
};

const ML_SUBJECT_MAP = {
  english: 'english',
  maths: 'math', 
  sinhala: 'sinhala',
  science: 'env',  // ← Maps to 'env' for ML model
};
```

**Problem**: The mapping exists in TeacherMarksPage but might not be consistent everywhere.

**✅ Fix**: Ensure consistent mapping in `mlMarksController`:
```javascript
// backend/controllers/mlMarksController.js - Line ~65
const env = (marks.env !== undefined && marks.env !== null) ? marks.env :
            (marks.science !== undefined && marks.science !== null) ? marks.science :
            (marks.Science !== undefined && marks.Science !== null) ? marks.Science :
            (marks.environment !== undefined && marks.environment !== null) ? marks.environment :
            50;
```

This already handles both `science` and `env` keys, so it's fine!

---

### ❌ Issue 3: Missing Attendance Data for Predictions

**Location**: `mlMarksController.predictMarksML`

**Problem**: If student has no attendance records, predictions might fail.

**✅ Fix** (Already implemented in mlMarksController):
```javascript
// backend/controllers/mlMarksController.js - Lines 95-120
// Calculate attendance percentage for current year
const yearStart = new Date(`${currentYear}-01-01`);
const yearEnd = new Date(`${currentYear}-12-31`);

const attendanceRecords = await Attendance.find({
  studentId: targetStudentId,
  date: { $gte: yearStart, $lte: yearEnd },
  status: "present"
});

// Count school days in the year
const schoolDays = await SchoolDay.countDocuments({
  date: { $gte: yearStart, $lte: yearEnd },
  isSchoolDay: true
});

const attendance = schoolDays > 0 
  ? Math.round((attendanceRecords.length / schoolDays) * 100) 
  : 50;  // Default to 50 if no school days found
```

---

### ❌ Issue 4: Prediction Response Format Inconsistency

**Location**: Both `StudentMarks.jsx` and `TeacherMarksPage.jsx` handle predictions

**Problem**: Response from `/api/ml/predict-marks` might have different structures

**StudentMarks.jsx expects**:
```javascript
{
  success: true,
  predicted_marks: {
    english: { predicted: 78, min: 72, max: 84 },
    math: { predicted: 82, min: 76, max: 88 },
    ...
  }
}
```

**TeacherMarksPage.jsx expects**:
```javascript
{
  studentId,
  name,
  predicted_marks: {
    english: { predicted, min, max },
    math: { predicted, min, max },
    ...
  }
}
```

**✅ Fix**: Standardize the response in mlMarksController
```javascript
// backend/controllers/mlMarksController.js - at the end
res.json({
  success: true,
  student: {
    id: student._id,
    name: `${student.firstName} ${student.lastName}`,
    grade: student.grade
  },
  marks,
  predicted_marks: mlResponse.data,
  timestamp: new Date().toLocaleString()
});
```

---

## 5. Implementation Checklist

### Frontend Fixes
- [ ] **Add `MARKS.BULK_UPSERT` to `api.js`**
  ```javascript
  BULK_UPSERT: `${API_BASE_URL}/marks/bulk-upsert`,
  ```

- [ ] **Update TeacherMarksPage to use constant**
  ```javascript
  const response = await axios.post(
    API_ENDPOINTS.MARKS.BULK_UPSERT,
    { updates },
    { headers: getAuthHeaders() }
  );
  ```

- [ ] **Verify StudentMarks** handles both response formats gracefully
  ```javascript
  const predictedMarks = predictionRes.data.predicted_marks || predictionRes.data;
  setPredictions(predictedMarks);
  ```

### Backend Fixes
- [ ] **Verify mlMarksController** properly formats response
- [ ] **Check Marks model** includes all necessary fields
- [ ] **Ensure Attendance tracking** is working for all students
- [ ] **Test bulk-upsert endpoint** with sample data

### Database Checks
- [ ] **Verify Marks collection** has all student records with year/term
- [ ] **Check Student model** terms array is synced with Marks collection
- [ ] **Ensure Attendance records** exist for students

---

## 6. Testing the Connection

### Manual Test 1: Teacher Saves Marks
```bash
# 1. Login as teacher
# 2. Go to TeacherMarksPage
# 3. Enter marks for a Grade 1-5 student
# 4. Click "Save All Marks to Database"
# Expected: Background shows "✅ All marks saved!"
```

### Manual Test 2: Student Views Marks & Predictions
```bash
# 1. Login as the same student
# 2. Go to StudentMarksPage
# 3. Expected: Student sees their marks
# 4. Expected: AI predictions load automatically (Grade 1-5 only)
# 5. Expected: Predictions show predicted mark + min/max range
```

### API Test 1: Bulk Save Marks
```bash
curl -X POST http://localhost:5000/api/marks/bulk-upsert \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [{
      "studentId": "123",
      "year": 2024,
      "term": 1,
      "marks": {
        "english": 75,
        "maths": 80,
        "sinhala": 72,
        "science": 78,
        "religion": 85
      }
    }]
  }'
```

### API Test 2: Get Predictions
```bash
curl -X POST http://localhost:5000/api/ml/predict-marks \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "123",
    "year": 2024,
    "term": 1
  }'

# Expected response:
# {
#   "success": true,
#   "predicted_marks": {
#     "english": { "predicted": 78, "min": 72, "max": 84 },
#     "math": { "predicted": 82, "min": 76, "max": 88 },
#     ...
#   }
# }
```

---

## 7. Summary

| Component | Role | API Endpoint | Data Flow |
|-----------|------|--------------|-----------|
| **TeacherMarksPage** | Entry | `POST /marks/bulk-upsert` | Teacher → Marks DB → Sync Student model |
| **StudentMarksPage** | Display | `GET /marks/my-marks` | Marks DB → Student view |
| **StudentMarks Component** | Display | `POST /ml/predict-marks` | Marks DB + Attendance → ML model → Predictions |
| **mlMarksController** | Prediction | Calls `/predict` on FastAPI (8003) | DB marks + attendance → ML predictions |
| **FastAPI ML Service** | ML Model | Port 8003 `/predict` | Marks + attendance → ML model → Predictions |

**Key Integration Points**:
1. ✅ Marks saved by teacher → Queried by ML controller
2. ✅ ML controller sends marks to FastAPI service
3. ✅ FastAPI returns predictions
4. ✅ Student sees predictions in StudentMarksPage
5. ✅ Both pages use same Marks collection source of truth

