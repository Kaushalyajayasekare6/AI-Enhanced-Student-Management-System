import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/studentModel.js";

dotenv.config();

const firstNames = [
  "Kasun", "Nimal", "Sahan", "Ravindu", "Kavindu", "Dilshan", "Tharushi", "Nethmi",
  "Sewwandi", "Piumi", "Hashini", "Sanduni", "Kanishka", "Yasiru", "Ayesh", "Sachini",
  "Lahiru", "Amaya", "Ishara", "Dinesh", "Kalani", "Navoda", "Vihanga", "Chamodi",
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randomInt(0, arr.length - 1)];

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all students without parent contact info
    const studentsWithoutParentContact = await Student.find({
      $or: [
        { fatherName: { $exists: false } },
        { fatherName: null },
        { fatherName: "" },
        { fatherContact: { $exists: false } },
        { fatherContact: null },
        { fatherContact: "" },
        { motherName: { $exists: false } },
        { motherName: null },
        { motherName: "" },
        { motherContact: { $exists: false } },
        { motherContact: null },
        { motherContact: "" },
      ],
    });

    console.log(`📊 Found ${studentsWithoutParentContact.length} students without parent contact info`);

    if (studentsWithoutParentContact.length === 0) {
      console.log("✅ All students have parent contact information!");
      await mongoose.disconnect();
      return;
    }

    // Update each student with missing parent info
    const updateOps = studentsWithoutParentContact.map((student) => {
      const fatherFirst = pick(firstNames);
      const motherFirst = pick(firstNames);

      return {
        updateOne: {
          filter: { _id: student._id },
          update: {
            $set: {
              fatherName: student.fatherName || `${fatherFirst} ${student.lastName || "Parent"}`,
              fatherContact: student.fatherContact || `0718${randomInt(1000000, 9999999)}`,
              motherName: student.motherName || `${motherFirst} ${student.lastName || "Parent"}`,
              motherContact: student.motherContact || `0717${randomInt(1000000, 9999999)}`,
            },
          },
        },
      };
    });

    const result = await Student.bulkWrite(updateOps);
    console.log(`✅ Updated ${result.modifiedCount} students with parent contact information`);
    console.log(`📋 Details: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

    await mongoose.disconnect();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

run();
