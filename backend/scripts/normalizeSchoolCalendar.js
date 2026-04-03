import mongoose from "mongoose";
import dotenv from "dotenv";
import SchoolDay from "../models/SchoolDay.js";

dotenv.config();

const pad = (num) => String(num).padStart(2, "0");
const toDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isHolidayLikeDescription = (description = "") => {
  const normalized = String(description).trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("weekend")) return false;
  return (
    normalized.includes("holiday") ||
    normalized.includes("poya") ||
    normalized.includes("closed") ||
    normalized.includes("vacation")
  );
};

const normalizeYear = async (year) => {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const existing = await SchoolDay.find({ date: { $gte: from, $lte: to } }).lean();
  const existingByDate = new Map(existing.map((d) => [d.date, d]));

  const bulkOps = [];
  let schoolDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;

  const cursor = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  while (cursor <= end) {
    const date = toDateString(cursor);
    const day = cursor.getDay();
    const weekend = day === 0 || day === 6;
    const existingRecord = existingByDate.get(date);

    let isSchoolDay = !weekend;
    let description = existingRecord?.description || "";

    if (weekend) {
      isSchoolDay = false;
      description = description || "Weekend (Non-school)";
      weekendDays += 1;
    } else if (
      existingRecord &&
      existingRecord.isSchoolDay === false &&
      isHolidayLikeDescription(existingRecord.description)
    ) {
      // Preserve explicit holiday-like entries created by admin.
      isSchoolDay = false;
      holidayDays += 1;
    } else {
      isSchoolDay = true;
      schoolDays += 1;
      if (String(description).toLowerCase().includes("weekend")) {
        description = "";
      }
    }

    bulkOps.push({
      updateOne: {
        filter: { date },
        update: {
          $set: {
            date,
            isSchoolDay,
            description,
          },
        },
        upsert: true,
      },
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  await SchoolDay.bulkWrite(bulkOps, { ordered: false });
  return { year, total: bulkOps.length, schoolDays, weekendDays, holidayDays };
};

const run = async () => {
  try {
    const yearArg = Number.parseInt(process.argv[2], 10);
    const year = Number.isNaN(yearArg) ? new Date().getFullYear() : yearArg;

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const result = await normalizeYear(year);

    console.log("Calendar normalized successfully:");
    console.log(`Year: ${result.year}`);
    console.log(`Total dates: ${result.total}`);
    console.log(`School days (Mon-Fri): ${result.schoolDays}`);
    console.log(`Weekend non-school days (Sat/Sun): ${result.weekendDays}`);
    console.log(`Holiday non-school days: ${result.holidayDays}`);
  } catch (error) {
    console.error("Failed to normalize school calendar:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
