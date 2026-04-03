goimport mongoose from 'mongoose';
import dotenv from 'dotenv';
import SchoolDay from './models/SchoolDay.js';

dotenv.config();

const pad = (num) => String(num).padStart(2, '0');
const toDateString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const SRI_LANKA_HOLIDAYS = {
  2024: [
    // Fixed
    '2024-01-14', '2024-01-15', // Thai Pongal
    '2024-02-04', // Independence
    '2024-04-13', '2024-04-14', // New Year
    '2024-05-01', // May Day
    '2024-05-22', // Heroes Day
    '2024-12-25', // Christmas
    // Poya
    '2024-02-24', '2024-03-25', '2024-04-23', '2024-05-23', '2024-06-22', 
    '2024-07-21', '2024-08-19', '2024-09-17', '2024-10-17', '2024-11-15', '2024-12-15'
  ],
  2025: [
    // Fixed
    '2025-01-14', '2025-01-15', // Thai Pongal
    '2025-02-04', // Independence
    '2025-04-13', '2025-04-14', // New Year
    '2025-05-01', // May Day
    '2025-05-22', // Heroes Day
    '2025-12-25', // Christmas
    // Poya (shifted 11 days)
    '2025-03-14', '2025-04-13', '2025-05-12', '2025-06-11', '2025-07-10', 
    '2025-08-09', '2025-09-06', '2025-10-06', '2025-11-04', '2025-12-04'
  ],
  2026: [
    // Fixed
    '2026-01-14', '2026-01-15', // Thai Pongal
    '2026-02-04', // Independence
    '2026-04-13', '2026-04-14', // New Year
    '2026-05-01', // May Day
    '2026-05-22', // Heroes Day
    '2026-12-25', // Christmas
    // Poya
    '2026-02-01', '2026-03-01', '2026-04-01', '2026-04-30', '2026-05-29', 
    '2026-06-28', '2026-07-27', '2026-08-26', '2026-09-24', '2026-10-24', '2026-11-22'
  ]
};

const runFix = async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🟢 Connected to MongoDB');

    const years = [2024, 2025, 2026];
    const operations = [];
    let weekdayCount = 0;
    let holidayCount = 0;

    years.forEach(year => {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      const holidays = SRI_LANKA_HOLIDAYS[year] || [];

      let current = new Date(start);
      while (current <= end) {
        const dateStr = toDateString(current);
        const dayOfWeek = current.getDay();
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.includes(dateStr);

        const isSchoolDay = !isWeekend && !isHoliday;
        const description = isHoliday ? 'Public Holiday' : (isWeekend ? 'Weekend (Non-school)' : '');
        
        operations.push({
          updateOne: {
            filter: { date: dateStr },
            update: {
              date: dateStr,
              isSchoolDay,
              description: description || ''
            },
            upsert: true
          }
        });
        
        if (!isSchoolDay) {
          if (isHoliday) holidayCount++;
          else weekdayCount++;
        }
        current.setDate(current.getDate() + 1);
      }
    });

    if (operations.length === 0) {
      console.log('ℹ️ No operations needed');
      return;
    }

    console.log(`⏳ Fixing ${operations.length} dates...`);
    await SchoolDay.bulkWrite(operations, { ordered: false });
    
    console.log('✅ SUCCESS! Fixed school days:');
    let weekdayCount = 0;
    console.log(`   📅 Weekdays: ${weekdayCount}`);
    console.log(`   🇱🇰 Public holidays: ${holidayCount}`);
    console.log(`   📅 Total: ${operations.length}`);
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runFix();

