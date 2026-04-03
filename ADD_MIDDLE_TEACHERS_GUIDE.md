# Add Teachers for Grades 6-9

## Problem
Missing teachers for Grades 6-9 classes:
- Grade 6A-D, 7A-D, 8A-D, 9A-D all lack teachers for core subjects and aesthetic electives

## Solution
Run the seed script to add all missing teachers automatically.

---

## Quick Start

### Step 1: Navigate to Backend
```bash
cd backend
```

### Step 2: Run the Seed Script
```bash
node seedMiddleTeachersGrade6_9.js
```

### Expected Output
```
✅ MongoDB connected
🗑️  Deleted 0 existing teachers
✅ Created teacher: Tamil Teacher
   Subjects: Tamil
   Email: tamil.teacher@school.com

✅ Created teacher: History Teacher
   Subjects: History
   Email: history.teacher@school.com

[... and so on for all 12 teachers ...]

✅ Successfully created 12 teachers for Grades 6-9

⚠️  PASSWORD NOTICE:
   All teachers have temporary password: Temp@123
   Teachers should be asked to change their password on first login
```

---

## Teachers Added

### Core Subjects (All Sections)
| Subject | Teacher Name | Email | Subjects Handled |
|---------|--------------|-------|------------------|
| Tamil | Tamil Teacher | tamil.teacher@school.com | Tamil |
| History | History Teacher | history.teacher@school.com | History |
| Geography | Geography Teacher | geography.teacher@school.com | Geography |
| Religion | Religion Teacher | religion.teacher@school.com | Buddhism, Hinduism, Islam, Catholicism, Christianity |
| Civic Education | Civic Education | civic.teacher@school.com | Civic Education, Citizenship, Civilization, Social Science, Life Competencies |
| Health | Health Teacher | health.teacher@school.com | Health |
| ICT | ICT Teacher | ict.teacher@school.com | ICT |
| PTS | Physical Training | pts.teacher@school.com | PTS (Physical Training), Technology |

### Aesthetic Electives (Section-Specific)
| Section | Elective | Teacher Name | Email |
|---------|----------|--------------|-------|
| A (All Grades) | Art | Art Teacher | art.teacher@school.com |
| B (All Grades) | Music | Music Teacher | music.teacher@school.com |
| C (All Grades) | Dancing | Dancing Teacher | dancing.teacher@school.com |
| D (All Grades) | Drama and Theatre | Drama Teacher | drama.teacher@school.com |

---

## Login Credentials

**All teachers have the same temporary credentials:**
- Username: `[subject].teacher` (e.g., `tamil.teacher`)
- Password: `Temp@123`

### Warning ⚠️
Teachers **must change their password** on first login for security.

---

## Verification

### Check if Teachers Were Added
```bash
# In MongoDB shell
use research-db
db.teachers.find().pretty()

# Should return 12 teacher documents
db.teachers.countDocuments()  // Should return 12
```

### Check in Frontend
1. Login as Admin
2. Go to Teacher Management page
3. Search for one of the teachers: "Tamil Teacher", "History Teacher", etc.
4. Verify all 12 appear with correct subjects assigned

---

## Timetable Generation

After adding teachers, you can now generate timetables for Grades 6-9:

### Option A: Via Admin Panel
1. Login as Admin
2. Go to Timetable Management
3. Click "Generate All Grade 6-9 Timetables"
4. Select all sections (A, B, C, D) and terms
5. Click Generate

### Option B: Via API
```bash
POST /api/timetable/generate-grade6-9-all
Authorization: Bearer [admin-token]
```

This will automatically assign the newly added teachers to timetable slots based on their subjects.

---

## If You Need to Redo

### Remove All Middle Teachers
```bash
npm run seed:remove-middle
# OR manually delete them from MongoDB
```

### Reset and Re-seed
```bash
node seedMiddleTeachersGrade6_9.js
```

---

## Next Steps

1. ✅ Run the seed script
2. ✅ Verify teachers appear in database
3. ✅ Generate timetables for Grades 6-9
4. ✅ Verify timetables have all teachers assigned
5. ✅ Have admin notify teachers about login credentials
6. ✅ Teachers update their passwords

---

## Troubleshooting

### Script fails with "Cannot find module"
```bash
npm install  # Install dependencies first
```

### MongoDB connection error
```bash
# Check if MongoDB is running
# Windows: Check Services or run: mongod
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Teachers not appearing in dropdown
```bash
# Clear browser cache
# Refresh the page
# Check MongoDB: db.teachers.countDocuments()
```

### Timetable still shows "Missing teachers"
```bash
# Regenerate timetables after adding teachers:
POST /api/timetable/generate-grade6-9-all
```

---

## Script Details

**File**: `backend/seedMiddleTeachersGrade6_9.js`

**What it does**:
1. Connects to MongoDB
2. Deletes existing middle teachers (to avoid duplicates)
3. Creates 12 new teacher records
4. Creates corresponding User accounts
5. Assigns appropriate subjects to each teacher
6. Sets temporary passwords (must be changed)

**Teachers created**: 12
- 8 core subject teachers
- 4 aesthetic electives teachers

**Grades covered**: 6, 7, 8, 9
**Sections covered**: A, B, C, D
**Total possible class assignments**: 16 (4 grades × 4 sections)

---

## Subject Subject Mapping

The teachers handle these subject aliases automatically:

**Religion** handles:
- Buddhism, Hinduism, Islam, Catholicism, Christianity

**Civic Education** handles:
- Civic Education, Citizenship, Civilization, Social Science, Life Competencies

**PTS (Physical Training)** handles:
- PTS (Physical Training), Technology

This means timetables can use any of these names and the system will match the correct teacher.

---

## Support

If teachers don't get assigned to timetables:
1. Check that teacher subjects match timetable subjects
2. Re-run timetable generation
3. Check database directly: `db.teachers.findOne({email: 'tamil.teacher@school.com'})`
4. Verify `subjects` array contains expected values
