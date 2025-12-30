// Utility to define subjects based on student grade

export const getSubjectsByGrade = (gradeLevel) => {
  // Handle null/undefined
  if (!gradeLevel) {
    return {
      gradeCategory: "unknown",
      subjects: [],
    };
  }

  // Extract grade number from string like "Grade 8" or just number
  let gradeNum;
  if (typeof gradeLevel === "number") {
    gradeNum = gradeLevel;
  } else {
    gradeNum = extractGradeNumber(String(gradeLevel));
  }

  // If we couldn't extract a valid number, return unknown
  if (!gradeNum || isNaN(gradeNum)) {
    return {
      gradeCategory: "unknown",
      subjects: [],
    };
  }

  if (gradeNum >= 1 && gradeNum <= 5) {
    return {
      gradeCategory: "1-5",
      subjects: [
        { key: "english", label: "English" },
        { key: "sinhala", label: "Sinhala" },
        { key: "maths", label: "Maths" },
        { key: "science", label: "Science" },
        { key: "religion", label: "Religion" },
      ],
    };
  } else if (gradeNum >= 6 && gradeNum <= 9) {
    return {
      gradeCategory: "6-9",
      subjects: [
        { key: "english", label: "English" },
        { key: "sinhala", label: "Sinhala" },
        { key: "maths", label: "Maths" },
        { key: "science", label: "Science" },
        { key: "religious", label: "Religious" },
        { key: "art", label: "Art" },
        { key: "geography", label: "Geography" },
        { key: "citizenship", label: "Citizenship" },
        { key: "tamil", label: "Tamil" },
        { key: "pts", label: "PTS (Physical Training)" },
        { key: "health", label: "Health" },
        { key: "history", label: "History" },
      ],
    };
  } else if (gradeNum >= 10 && gradeNum <= 11) {
    return {
      gradeCategory: "10-11",
      subjects: [
        { key: "english", label: "English" },
        { key: "sinhala", label: "Sinhala" },
        { key: "maths", label: "Maths" },
        { key: "science", label: "Science" },
        { key: "buddhism", label: "Buddhism" },
        { key: "history", label: "History" },
        { key: "cat1", label: "1st Catogory" },
        { key: "cat2", label: "2nd Catogory" },
        { key: "cat3", label: "3rd Catogory" },
      ],
    };
  }

  return {
    gradeCategory: "unknown",
    subjects: [],
  };
};

// Extract grade number from grade string (e.g., "Grade 8" -> 8)
export const extractGradeNumber = (gradeString) => {
  if (!gradeString) return null;
  const match = gradeString.match(/\d+/);
  return match ? parseInt(match[0]) : null;
};
