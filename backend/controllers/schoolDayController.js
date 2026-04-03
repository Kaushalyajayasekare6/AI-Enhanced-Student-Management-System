import SchoolDay from "../models/SchoolDay.js";

const pad = (value) => String(value).padStart(2, "0");
const toDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const isHolidayDescription = (description = "") => {
  const normalized = String(description).trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("holiday") ||
    normalized.includes("poya") ||
    normalized.includes("closed") ||
    normalized.includes("vacation")
  );
};

/**
 * Get all school days in a date range
 */
export const getSchoolDays = async (req, res) => {
  try {
    const { from, to } = req.query;

    const query = {};
    if (from && to) {
      query.date = { $gte: from, $lte: to };
    }

    const schoolDays = await SchoolDay.find(query).sort({ date: 1 });
    res.json(schoolDays);
  } catch (error) {
    console.error("❌ Error fetching school days:", error.message);
    res.status(500).json({ message: "Failed to fetch school days" });
  }
};

/**
 * Get a single school day by date
 */
export const getSchoolDayByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const schoolDay = await SchoolDay.findOne({ date });

    if (!schoolDay) {
      // If not found, default to Sat/Sun as non-school days and Mon-Fri as school days.
      const dayOfWeek = new Date(date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      return res.json({
        date,
        isSchoolDay: !isWeekend,
        description: "",
      });

    }

    res.json(schoolDay);
  } catch (error) {
    console.error("❌ Error fetching school day:", error.message);
    res.status(500).json({ message: "Failed to fetch school day" });
  }
};

/**
 * Create or update a school day
 */
export const upsertSchoolDay = async (req, res) => {
  try {
    const { date, isSchoolDay, description } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const descriptionText = description || "";
    const holidayFromDescription = isHolidayDescription(descriptionText);
    const computedIsSchoolDay =
      isSchoolDay !== undefined ? isSchoolDay : true;

    const schoolDay = await SchoolDay.findOneAndUpdate(
      { date },
      {
        date,
        isSchoolDay: holidayFromDescription ? false : computedIsSchoolDay,
        description: descriptionText,
      },
      { upsert: true, new: true }
    );

    res.json(schoolDay);
  } catch (error) {
    console.error("❌ Error upserting school day:", error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Bulk update school days
 */
export const bulkUpdateSchoolDays = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { date, isSchoolDay, description }

    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: "Updates must be an array" });
    }

    const operations = updates.map(({ date, isSchoolDay, description }) => {
      const descriptionText = description || "";
      const holidayFromDescription = isHolidayDescription(descriptionText);
      const computedIsSchoolDay =
        isSchoolDay !== undefined ? isSchoolDay : true;

      return {
        updateOne: {
          filter: { date },
          update: {
            date,
            isSchoolDay: holidayFromDescription ? false : computedIsSchoolDay,
            description: descriptionText,
          },
          upsert: true,
        },
      };
    });

    await SchoolDay.bulkWrite(operations);

    res.json({ message: "School days updated successfully", count: updates.length });
  } catch (error) {
    console.error("❌ Error bulk updating school days:", error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * Auto-generate school calendar for a full year:
 * - Mark weekends (Sat/Sun) as holidays/non-school
 * - Mark weekdays (Mon-Fri) as school days
 * - Keep any existing manually saved "real calendar" holidays unchanged
 */
export const autoGenerateSchoolCalendar = async (req, res) => {
  try {
    const year = Number(req.body?.year) || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const operations = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const date = toDateString(cursor);
      const day = cursor.getDay();
      const isWeekend = day === 0 || day === 6;

      operations.push({
        updateOne: {
          filter: { date },
          update: {
            $setOnInsert: {
              date,
              isSchoolDay: !isWeekend,
              description: isWeekend ? "Weekend (Non-school)" : "",
            },
          },
          upsert: true,
        },
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    if (operations.length > 0) {
      await SchoolDay.bulkWrite(operations);
    }

    const holidaysCount = await SchoolDay.countDocuments({
      date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
      isSchoolDay: false,
    });

    res.json({
      message: "School calendar auto-generated successfully",
      year,
      totalDays: operations.length,
      holidaysCount,
    });
  } catch (error) {
    console.error("❌ Error auto-generating school calendar:", error.message);
    res.status(500).json({ message: "Failed to auto-generate school calendar" });
  }
};

/**
 * Delete a school day (revert to default)
 */
export const deleteSchoolDay = async (req, res) => {
  try {
    const { date } = req.params;
    await SchoolDay.findOneAndDelete({ date });
    res.json({ message: "School day deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting school day:", error.message);
    res.status(500).json({ message: "Failed to delete school day" });
  }
};













