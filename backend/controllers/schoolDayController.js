import SchoolDay from "../models/SchoolDay.js";

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
      // If not found, default to school day (Monday-Friday)
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

    const schoolDay = await SchoolDay.findOneAndUpdate(
      { date },
      {
        date,
        isSchoolDay: isSchoolDay !== undefined ? isSchoolDay : true,
        description: description || "",
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

    const operations = updates.map(({ date, isSchoolDay, description }) => ({
      updateOne: {
        filter: { date },
        update: {
          date,
          isSchoolDay: isSchoolDay !== undefined ? isSchoolDay : true,
          description: description || "",
        },
        upsert: true,
      },
    }));

    await SchoolDay.bulkWrite(operations);

    res.json({ message: "School days updated successfully", count: updates.length });
  } catch (error) {
    console.error("❌ Error bulk updating school days:", error.message);
    res.status(400).json({ message: error.message });
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













