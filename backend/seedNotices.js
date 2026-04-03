import Notice from "./models/Notice.js";
import User from "./models/User.js";

const sampleNotices = [
  {
    title: "� Welcome to Our Advanced School Management System 2026",
    description: "🌟 **Revolutionary Digital Education Platform**\n\nWe're thrilled to introduce our state-of-the-art School Management System designed to transform the educational experience for students, teachers, and parents!\n\n✨ **Key Features:**\n• Real-time attendance tracking\n• Interactive timetable management\n• Comprehensive marks & grading system\n• Advanced analytics & reporting\n• Parent-teacher communication portal\n• Mobile-responsive design\n• AI-powered insights\n\n🎯 **Our Mission:** To create a seamless, efficient, and engaging learning environment that empowers every student to reach their full potential.\n\n📱 **Get Started:** Log in with your credentials and explore the intuitive dashboard designed for your role.",
    category: "general",
    priority: "urgent",
    targetAudience: ["all"],
    tags: ["welcome", "system", "introduction", "technology", "innovation", "education"],
    isPinned: true,
  },
  {
    title: "� Digital Transformation Initiative - Complete System Overview",
    description: "📊 **Comprehensive School Management Suite**\n\nOur advanced platform offers:\n\n🏫 **For Administrators:**\n• Complete student & teacher management\n• Automated timetable generation with conflict prevention\n• Advanced reporting & analytics\n• Bulk operations & data management\n\n👨‍🏫 **For Teachers:**\n• Class management & attendance tracking\n• Marks entry & grade calculation\n• Student performance analytics\n• Communication tools\n\n👨‍🎓 **For Students:**\n• Personal timetable & schedule\n• Marks & progress tracking\n• Attendance records\n• Assignment submissions\n\n👨‍👩‍👧‍👦 **For Parents:**\n• Real-time student progress monitoring\n• Direct communication with teachers\n• Fee payment tracking\n• Event notifications\n\n🔒 **Security & Privacy:** Enterprise-grade security with role-based access control.\n\n💡 **Innovation:** AI-powered insights and predictive analytics for better educational outcomes.",
    category: "administrative",
    priority: "high",
    targetAudience: ["all"],
    tags: ["system", "features", "technology", "administration", "innovation", "overview"],
    isPinned: true,
  },
  {
    title: "💻 Back-to-School Technology Training - Essential Digital Skills 2026",
    description: "🚀 **Master the New Digital Learning Platform!**\n\n📚 **Mandatory Training Sessions:**\n• **Admin:** March 25, 8:00 AM - Dashboard & Reporting\n• **Teachers:** March 26, 9:00 AM - Attendance & Marks Entry\n• **Students:** March 27, 10:00 AM - Timetable & Portal Navigation\n\n💡 **Key Topics Covered:**\n• Parent portal registration & login\n• Mobile app download & setup\n• Real-time notifications setup\n• Assignment submission process\n• Technical support contacts\n\n🆘 **Helpdesk:** techsupport@school.edu | +94 112 345 678\n\n⚠️ **Important:** Attendance is mandatory. Certificates provided for completion.\n\n📅 **RSVP by March 23** through your dashboard.\n\n**Let's embrace the future of education together! 🌟**",
    category: "general",
    priority: "urgent",
    targetAudience: ["all"],
    tags: ["training", "technology", "back-to-school", "digital", "workshop", "mandatory"],
    isPinned: true,
  },
  {    title: "🤖 AI-Powered Educational Analytics & Dropout Prevention",
    description: "🎯 **Intelligent Learning Insights**\n\nOur cutting-edge AI system provides:\n\n📈 **Predictive Analytics:**\n• Early identification of at-risk students\n• Performance trend analysis\n• Personalized learning recommendations\n\n🎓 **Smart Features:**\n• Automated timetable conflict resolution\n• Intelligent marks analysis\n• Student behavior pattern recognition\n• Academic performance forecasting\n\n📊 **Data-Driven Decisions:**\n• Comprehensive dashboards\n• Real-time reporting\n• Custom analytics views\n• Export capabilities\n\n🔮 **Future-Ready Education:**\n• Machine learning algorithms\n• Predictive modeling\n• Automated alerts & notifications\n• Continuous improvement through data\n\n💪 **Impact:** Reduced dropout rates by 40% through early intervention and personalized support strategies.",
    category: "academic",
    priority: "high",
    targetAudience: ["teachers", "all"],
    tags: ["AI", "analytics", "dropout-prevention", "technology", "innovation", "data"],
    isPinned: true,
  },
  {
    title: "📱 Modern Responsive Design - Access Anywhere, Anytime",
    description: "🌟 **Seamless Multi-Device Experience**\n\nExperience education management like never before:\n\n💻 **Desktop Excellence:**\n• Full-featured administrative dashboard\n• Advanced data visualization\n• Bulk operations & management tools\n• Comprehensive reporting suite\n\n📱 **Mobile Optimization:**\n• Touch-friendly interface\n• Real-time notifications\n• Quick attendance marking\n• Emergency contact access\n\n🌐 **Cross-Platform Compatibility:**\n• Works on all modern browsers\n• Progressive Web App (PWA) support\n• Offline capability for critical features\n• Cloud synchronization\n\n🎨 **Beautiful UI/UX:**\n• Modern gradient designs\n• Smooth animations & transitions\n• Intuitive navigation\n• Accessibility compliant\n\n⚡ **Performance:**\n• Lightning-fast loading\n• Optimized for speed\n• Efficient data handling\n• Scalable architecture\n\n📊 **User Satisfaction:** 98% positive feedback from our educational community!",
    category: "general",
    priority: "medium",
    targetAudience: ["all"],
    tags: ["UI", "UX", "mobile", "responsive", "design", "performance"],
    isPinned: false,
  },
  {
    title: "📊 Advanced Analytics & Comprehensive Reporting Suite",
    description: "🔍 **Data-Driven Educational Excellence**\n\nUnlock the power of comprehensive analytics:\n\n📈 **Performance Analytics:**\n• Student progress tracking\n• Grade distribution analysis\n• Subject-wise performance insights\n• Historical trend analysis\n\n👥 **Attendance Insights:**\n• Daily attendance patterns\n• Absenteeism trends\n• Class participation metrics\n• Automated alerts for irregularities\n\n🎯 **Predictive Intelligence:**\n• Dropout risk assessment\n• Academic performance forecasting\n• Intervention recommendations\n• Early warning systems\n\n📋 **Custom Reports:**\n• Student report cards\n• Teacher performance reviews\n• Class-wise summaries\n• Administrative dashboards\n\n💾 **Export Capabilities:**\n• PDF report generation\n• Excel data exports\n• Chart and graph downloads\n• Scheduled report delivery\n\n🎨 **Visual Dashboards:**\n• Interactive charts & graphs\n• Real-time data visualization\n• Customizable widgets\n• Mobile-responsive displays\n\n📊 **Key Metrics:** Over 50 different analytics views available for data-driven decision making!",
    category: "administrative",
    priority: "medium",
    targetAudience: ["teachers", "all"],
    tags: ["analytics", "reporting", "data", "insights", "performance", "dashboard"],
    isPinned: false,
  },
  {
    title: "🔒 Enterprise-Grade Security & Privacy Protection",
    description: "🛡️ **Fortified Digital Fortress**\n\nYour data security is our top priority:\n\n🔐 **Advanced Security:**\n• End-to-end encryption\n• Multi-factor authentication\n• Role-based access control\n• Secure API endpoints\n\n📋 **Compliance Standards:**\n• GDPR compliant\n• Educational data protection\n• Privacy-by-design principles\n• Regular security audits\n\n🔑 **Access Management:**\n• Granular permissions\n• Session management\n• Audit logging\n• Automated access revocation\n\n🛡️ **Data Protection:**\n• Encrypted database storage\n• Secure file uploads\n• Data backup & recovery\n• Breach detection systems\n\n🌐 **Network Security:**\n• SSL/TLS encryption\n• Firewall protection\n• DDoS mitigation\n• Secure cloud infrastructure\n\n👁️ **Monitoring & Alerts:**\n• Real-time security monitoring\n• Suspicious activity detection\n• Automated incident response\n• Security health dashboards\n\n✨ **Trust Indicators:** 100% secure data handling with zero reported breaches in our history!",
    category: "administrative",
    priority: "high",
    targetAudience: ["all"],
    tags: ["security", "privacy", "encryption", "compliance", "protection", "GDPR"],
    isPinned: true,
  },
  {    title: "�📚 Academic Year 2026 Begins",
    description: "The new academic year starts on March 24, 2026. All students are expected to report to school by 7:30 AM. Please ensure you have all required materials and uniform.",
    category: "academic",
    priority: "urgent",
    targetAudience: ["students", "teachers"],
    tags: ["academic-year", "start", "schedule"],
    expiresAt: new Date("2026-04-01"),
  },
  {
    title: "📝 Mid-Term Examinations Schedule",
    description: "Mid-term examinations will commence from April 15, 2026. Please check the detailed schedule on the timetable section. Study hard and best of luck!",
    category: "examinations",
    priority: "high",
    targetAudience: ["students"],
    tags: ["exams", "mid-term", "schedule"],
    expiresAt: new Date("2026-04-20"),
  },
  {
    title: "🎉 Annual Sports Day - April 30, 2026",
    description: "Join us for the Annual Sports Day celebration! All students are encouraged to participate in various sporting events. Registration forms are available in the office.",
    category: "events",
    priority: "medium",
    targetAudience: ["all"],
    tags: ["sports", "event", "celebration"],
    expiresAt: new Date("2026-05-01"),
  },
  {
    title: "🏖️ School Holiday Notice",
    description: "School will remain closed for the Sinhala and Tamil New Year holidays from April 10-15, 2026. Classes will resume on April 16, 2026.",
    category: "holidays",
    priority: "high",
    targetAudience: ["all"],
    tags: ["holiday", "new-year", "closure"],
    expiresAt: new Date("2026-04-16"),
  },
  {
    title: "📊 Parent-Teacher Meeting",
    description: "Parent-Teacher meetings will be held on March 28, 2026, from 2:00 PM to 5:00 PM. Parents are requested to meet with class teachers to discuss student progress.",
    category: "academic",
    priority: "medium",
    targetAudience: ["teachers", "parents"],
    tags: ["meeting", "parents", "progress"],
    expiresAt: new Date("2026-03-29"),
  },
  {
    title: "💻 Digital Learning Resources Available",
    description: "New digital learning resources have been added to our online portal. Students can access interactive lessons, practice exercises, and educational videos.",
    category: "academic",
    priority: "low",
    targetAudience: ["students"],
    tags: ["digital", "resources", "learning"],
  },
  {
    title: "🏥 Health & Safety Guidelines",
    description: "Please follow all health and safety guidelines. Regular hand washing, wearing masks when necessary, and maintaining social distance are mandatory.",
    category: "administrative",
    priority: "high",
    targetAudience: ["all"],
    tags: ["health", "safety", "guidelines"],
    isPinned: true,
  },
  {
    title: "🎨 Art & Craft Workshop",
    description: "An exciting art and craft workshop will be conducted on March 25, 2026, for grades 1-5. Materials will be provided. Participation is voluntary.",
    category: "events",
    priority: "low",
    targetAudience: ["students"],
    tags: ["art", "workshop", "craft"],
    expiresAt: new Date("2026-03-26"),
  },
  {
    title: "📖 Library Hours Extended",
    description: "The school library will now remain open until 4:00 PM on weekdays. Students can borrow books and use study areas during extended hours.",
    category: "general",
    priority: "low",
    targetAudience: ["students"],
    tags: ["library", "hours", "resources"],
  },
];

export const seedNotices = async () => {
  try {
    console.log("🌱 Seeding sample notices...");

    // Get the first admin user to set as creator
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.log("⚠️ No admin user found. Skipping notice seeding.");
      return;
    }

    let createdCount = 0;
    for (const noticeData of sampleNotices) {
      // Check if notice already exists
      const existingNotice = await Notice.findOne({
        title: noticeData.title,
        createdBy: adminUser._id
      });

      if (!existingNotice) {
        await Notice.create({
          ...noticeData,
          createdBy: adminUser._id,
        });
        createdCount++;
      }
    }

    console.log(`✅ Created ${createdCount} sample notices`);
  } catch (error) {
    console.error("❌ Error seeding notices:", error);
  }
};

export default seedNotices;