import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Printer, 
  Share2, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Palette, 
  Type, 
  Clock, 
  Plus, 
  Trash2, 
  Settings2, 
  Mail, 
  FileSpreadsheet, 
  CheckSquare, 
  X, 
  ChevronRight, 
  School, 
  UserCheck, 
  Award,
  AlertTriangle,
  Globe,
  FileCheck,
  Send,
  HelpCircle,
  Activity,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { LearningSession, QuizQuestion, QuizReport, ExplanationResult, PerformanceStats } from '../types';

interface ExportWizardProps {
  onClose: () => void;
  history?: LearningSession[];
  stats?: PerformanceStats;
  initialQuizReport?: QuizReport | null;
  initialExplanation?: ExplanationResult | null;
  initialChatText?: string | null;
  activeMatn?: string;
}

type ExportCategory = 'grades' | 'attendance' | 'performance_report' | 'lesson_summary' | 'exam' | 'homework' | 'parent_notice' | 'stats_card' | 'chat_message';
type ColorTheme = 'classical_emerald' | 'navy_royal' | 'orchid_purple' | 'luxury_burgundy' | 'dignified_charcoal';
type FontStyle = 'font-sans' | 'font-amiri';
type PageSize = 'A4' | 'A5' | 'Letter';
type PageLayout = 'portrait' | 'landscape';
type PresetStyle = 'official' | 'infographic' | 'economic';

export default function ExportWizard({ 
  onClose, 
  history = [], 
  stats, 
  initialQuizReport, 
  initialExplanation,
  initialChatText,
  activeMatn = "تحفة الأطفال" 
}: ExportWizardProps) {
  
  // 1. Core Export Setup States
  const [selectedCategory, setSelectedCategory] = useState<ExportCategory>(
    initialChatText ? 'chat_message' : initialExplanation ? 'lesson_summary' : initialQuizReport ? 'exam' : 'grades'
  );
  const [theme, setTheme] = useState<ColorTheme>('classical_emerald');
  const [font, setFont] = useState<FontStyle>('font-sans');
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [layout, setLayout] = useState<PageLayout>('portrait');
  const [preset, setPreset] = useState<PresetStyle>('official');
  
  // Custom metadata editable fields
  const [schoolName, setSchoolName] = useState('أكاديمية تجاويد لعلوم القرآن الكريم');
  const [schoolLogo, setSchoolLogo] = useState('https://a.top4top.io/p_3759pkxhr1.png');
  const [teacherName, setTeacherName] = useState('الشيخ المقرئ المعتمد');
  const [studentName, setStudentName] = useState('طالب العلم النجيب');
  const [subjectName, setSubjectName] = useState(`علوم التجويد - متن ${activeMatn}`);
  const [testDuration, setTestDuration] = useState('45 دقيقة');
  const [examGrade, setExamGrade] = useState('20 درجة');
  const [customTitle, setCustomTitle] = useState('');
  const [showCoverPage, setShowCoverPage] = useState(false);
  const [examType, setExamType] = useState<'student_copy' | 'answer_key'>('student_copy');
  
  // Export Loading statuses
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 2. Custom Dynamic Sheet Content States - Allows full "Canva/Notion" editing within live preview
  
  // Grades Table Data
  const [gradesData, setGradesData] = useState<Array<{ id: number; name: string; task: string; date: string; score: number; remarks: string }>>([]);
  
  // Attendance Table Data
  const [attendanceData, setAttendanceData] = useState<Array<{ id: number; name: string; s1: string; s2: string; s3: string; s4: string; rate: string }>>([
    { id: 1, name: 'سليمان الحربي', s1: 'حاضر', s2: 'حاضر', s3: 'حاضر', s4: 'حاضر', rate: '100%' },
    { id: 2, name: 'عبدالرحمن العتيبي', s1: 'حاضر', s2: 'غائب', s3: 'حاضر', s4: 'حاضر', rate: '75%' },
    { id: 3, name: 'فاطمة الشمري', s1: 'حاضر', s2: 'حاضر', s3: 'متأخر', s4: 'حاضر', rate: '90%' },
    { id: 4, name: 'عائشة الفوزان', s1: 'حاضر', s2: 'حاضر', s3: 'حاضر', s4: 'حاضر', rate: '100%' },
  ]);

  // Quiz/Exam data
  const [examData, setExamData] = useState<QuizQuestion[]>([]);

  // Lesson Summary data
  const [summaryData, setSummaryData] = useState<ExplanationResult>({
    verseText: 'للنونِ إن تسكنْ وللتنوينِ ** أربعُ أحكامٍ فخذْ تبييني',
    meaning: 'يوضح صاحب المتن أن حرف النون الساكنة أو التنوين إذا جاء بعدها أي حرف لغوي، ينشأ عنها أربعة أحكام تجويدية رئيسية سيتم شرحها وتفصيلها.',
    grammarAnalysis: 'للنون: جار ومجرور متعلقان بمحذوف خبر مقدم. إن: حرف شرط جازم يجزم فعلين. تسكن: فعل مضارع مجزوم فعل الشرط وعلامة جزمه السكون والفاعل مستتر تقديره هي.',
    tajweedRules: [
      'النون الساكنة: نون خالية من الحركة تأتي ثابتة لفظاً ورسماً وصلاً ووقفاً.',
      'التنوين: نون ساكنة زائدة تلحق آخر الأسماء لفظاً وصلاً وتفارقه خطاً ووقفاً.',
      'الإظهار الحلقي، الإدغام بغنة وبغير غنة، الإقلاب، الإخفاء الحقيقي.'
    ],
    educationalTip: 'احرص على كتم النون الساكنة والبحث عن مخرجها المقرون بالغنة الحركية وخاصة عند الإخفاء والإدغام.'
  });

  // Homework data
  const [homeworkTasks, setHomeworkTasks] = useState([
    { id: 1, text: 'حفظ وفهم أول خمسة أبيات من متن الجزرية/تحفة الأطفال بدقة بالغة وصوت مضبوط.', done: false },
    { id: 2, text: 'استخراج 3 مواضع لحكم الإدغام الناقص والكامل من سورة الملك تدوينياً.', done: false },
    { id: 3, text: 'تسجيل مقطع صوتي طوله دقيقتين عبر المقرأ الذكي ومحاولة الحصول على درجة مطابقة فوق 90%.', done: false }
  ]);

  // Parents message text
  const [parentMessage, setParentMessage] = useState(
    `السلام عليكم ورحمة الله وبركاته،\nنحيطكم علماً بأن ولدكم المبارك/طالبتنا النجيبة قد أتم بنجاح ومثابرة دراسة وحفظ باب أحكام النون الساكنة والتنوين من المتن المعتمد بتقدير متميز وإتقان عالٍ.\nنسأل الله أن يبارك في مسيرته القرآنية ونوصيكم بمتابعة التلاوة يومياً لبلوغ رتبة الإجازة.\nمع تحيات معلم ومحفّظ الأكاديمية.`
  );

  // Chat message text
  const [chatContent, setChatContent] = useState('');

  // References to print scope
  const previewRef = useRef<HTMLDivElement>(null);

  // 3. Effect hook to prefill content with live data on demand
  useEffect(() => {
    if (initialChatText) {
      setChatContent(initialChatText);
      setSelectedCategory('chat_message');
    }
    // Generate grades based on user session history or fallbacks
    if (history.length > 0) {
      const generated = history.map((h, i) => ({
        id: i + 1,
        name: studentName,
        task: `${h.type === 'recitation' ? 'تسميع' : h.type === 'quiz' ? 'اختبار' : 'شرح'} - متن ${h.matnName}`,
        date: h.date,
        score: h.score,
        remarks: h.score >= 90 ? 'ممتاز ممتاز' : h.score >= 75 ? 'جيد جداً مرتفع' : 'يحتاج لمزيد مراجعة'
      }));
      setGradesData(generated);
    } else {
      // Offline fallback lists
      setGradesData([
        { id: 1, name: 'عبدالله بن أحمد', task: 'تسميع النون الساكنة - تحفة الأطفال', date: '2026-06-05', score: 98, remarks: 'أداء صوتي مذهل في المخرج والغنة' },
        { id: 2, name: 'عبدالرحمن العتيبي', task: 'اختبار باب المدود - التحفة والجزري', date: '2026-06-06', score: 85, remarks: 'أخطأ في المد اللازم الكلمي المثقل فقط' },
        { id: 3, name: 'سليمان الحربي', task: 'شرح معاني الاستعاذة والبسملة', date: '2026-06-08', score: 92, remarks: 'إعراب صحيح وشرح دلالي مميز للبيت' },
        { id: 4, name: 'أحمد الفاروق', task: 'تسميع مخارج الحروف الشجرية والذلقية', date: '2026-06-09', score: 70, remarks: 'متعثر قليلاً في مخرج الضاد وحافتها' },
      ]);
    }

    // Prefill quizzes if available
    if (initialQuizReport && initialQuizReport.gradedQuestions) {
      setExamData(initialQuizReport.gradedQuestions);
      setSelectedCategory('exam');
    } else {
      // Fallback sample questions
      setExamData([
        {
          id: 1,
          type: 'multiple-choice',
          questionText: 'ما هو حكم للام في اسم الإشارة "ألك" أو التعريف في النون الساكنة عندما يأتي إدغام بغنة؟',
          options: ['إدغام ناقص بغنة', 'إظهار حلقي واضح', 'إخفاء حقيقي مفخم', 'إقلاب بحرف الميم'],
          correctAnswer: 'إدغام ناقص بغنة',
          userAnswer: 'إدغام ناقص بغنة',
          isCorrect: true,
          correctionFeedback: 'أحسنت! تدغم النون الساكنة والتنوين في أحرف "ينمو" بغنة كاملة، ويكون الإدغام ناقصاً لبقاء صفة الغنة.'
        },
        {
          id: 2,
          type: 'true-false',
          questionText: 'حروف الإظهار الحلقي ستة، تخرج كلها من جوف الفم والصوت المعتدل.',
          options: ['خيار صحيح', 'خيار خاطئ'],
          correctAnswer: 'خيار خاطئ',
          userAnswer: 'خيار خاطئ',
          isCorrect: true,
          correctionFeedback: 'صحيح! تخرج حروف الإظهار الستة (همز فهاء ثم عين حاء مهملتان ثم غين خاء) من الحلق وليس من الجوف.'
        },
        {
          id: 3,
          type: 'fill-in-blank',
          questionText: 'أكمل الفراغ: "وَالثَّانِ إِدْغَامٌ بِقَيْرِ غُنَّهْ *** فِي اللَّامِ وَالرَّا ثُمَّ مَكَرَّرَنَّهْ" لـ ...',
          correctAnswer: 'مكررنه',
          userAnswer: '',
          isCorrect: false,
          correctionFeedback: 'الكلمة الصحيحة لإتمام عجز البيت هي "مكررنه"، وذلك لبيان تكرار حرف الراء المنصوص عليه بالمتن.'
        },
        {
          id: 4,
          type: 'explanation',
          questionText: 'اشرح ما هو حكم الإخفاء الشفوي للميم الساكنة وبيّن حروفه.',
          correctAnswer: 'هو أن تقع الميم الساكنة في آخر الكلمة ويليها حرف الباء فتخفى مع الغنة اللطيفة دون كز للشفتين.',
          userAnswer: 'الإخفاء الشفوي حرفه الوحيد الباء مع الغنة المطورة.',
          isCorrect: true,
          correctionFeedback: 'شرح صحيح ومكتمل، حرف الإخفاء الشفوي هو الباء فقط مع مراعاة الحركتين وترك فرجة يسيرة دون كرب للشفتين.'
        }
      ]);
    }

    // Prefill Explanation if available
    if (initialExplanation) {
      setSummaryData(initialExplanation);
      setSelectedCategory('lesson_summary');
    }
  }, [initialQuizReport, initialExplanation, initialChatText, history, studentName]);

  // 4. Color Theme mapper helper
  const getThemeColors = () => {
    switch (theme) {
      case 'classical_emerald':
        return {
          primary: '#0a5f3e',
          secondary: '#c49a45',
          lightBg: '#f6faf8',
          border: '#e6f3ee',
          textDark: '#1e293b',
          pill: '#0a5f3e'
        };
      case 'navy_royal':
        return {
          primary: '#1e3a8a',
          secondary: '#f59e0b',
          lightBg: '#f8fafc',
          border: '#e2e8f0',
          textDark: '#0f172a',
          pill: '#1e3a8a'
        };
      case 'orchid_purple':
        return {
          primary: '#5b21b6',
          secondary: '#ec4899',
          lightBg: '#faf5ff',
          border: '#f3e8ff',
          textDark: '#2e1065',
          pill: '#5b21b6'
        };
      case 'luxury_burgundy':
        return {
          primary: '#7f1d1d',
          secondary: '#d97706',
          lightBg: '#fffbeb',
          border: '#fef3c7',
          textDark: '#450a0a',
          pill: '#7f1d1d'
        };
      case 'dignified_charcoal':
        return {
          primary: '#374151',
          secondary: '#14b8a6',
          lightBg: '#f9fafb',
          border: '#f3f4f6',
          textDark: '#111827',
          pill: '#374151'
        };
    }
  };

  const colors = getThemeColors();

  // 5. Native Print triggering custom styling overrides
  const triggerPrint = () => {
    const printContent = previewRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    
    if (printContent) {
      const styleElement = document.createElement("style");
      styleElement.innerHTML = `
        @media print {
          body {
            direction: rtl !important;
            font-family: 'Amiri', 'Tajawal', serif !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card-wrapper {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(styleElement);
      window.print();
      document.head.removeChild(styleElement);
    }
  };

  // 6. Double Scaled High-Quality PNG Export
  const handleExportAsImage = async () => {
    if (!previewRef.current) return;
    setIsExporting('PNG');
    try {
      // Optimize options for high precision
      const canvas = await html2canvas(previewRef.current, {
        scale: 3, // Premium triple resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: preset === 'economic' ? '#ffffff' : colors.lightBg,
        scrollX: 0,
        scrollY: 0
      });
      
      const fileData = canvas.toDataURL('image/png');
      const dlLink = document.createElement('a');
      dlLink.download = `tajweed_export_${selectedCategory}_${Date.now()}.png`;
      dlLink.href = fileData;
      dlLink.click();
      
      setSuccessMessage('🎉 تم تصدير المستند وتنزيله كصورة عالية الدقة (3x) بنجاح مذهل لسطح المكتب!');
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (e: any) {
      console.error(e);
      alert('نعتذر، واجه محرك توليد الصور المتقدم مشكلة طارئة.');
    } finally {
      setIsExporting(null);
    }
  };

  // 7. Multi-page High-Quality PDF Render (via HTML-to-Canvas approach to fix Arabic RTL ligatures)
  const handleExportAsPDF = async () => {
    if (!previewRef.current) return;
    setIsExporting('PDF');
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2.5, // Crisp printable size 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      // Determine orientation parameters
      const pdfLayout = layout === 'portrait' ? 'p' : 'l';
      const pdfUnit = 'mm';
      
      // Match PDF with chosen sizes
      let pdfSize: [number, number] = [210, 297]; // A4 default
      if (pageSize === 'A5') pdfSize = [148, 210];
      else if (pageSize === 'Letter') pdfSize = [215.9, 279.4];

      const doc = new jsPDF({
        orientation: pdfLayout,
        unit: pdfUnit,
        format: pageSize.toLowerCase()
      });

      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      // Calculate scaled heights
      const finalImageWidth = pdfWidth;
      const finalImageHeight = pdfWidth / ratio;

      // Handle pagination beautifully
      if (finalImageHeight <= pdfHeight) {
        doc.addImage(imgData, 'JPEG', 0, 0, finalImageWidth, finalImageHeight, undefined, 'FAST');
      } else {
        // Multi-page slicing code based on physical height constraints
        let heightLeft = finalImageHeight;
        let position = 0;

        doc.addImage(imgData, 'JPEG', 0, position, finalImageWidth, finalImageHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - finalImageHeight;
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, position, finalImageWidth, finalImageHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      doc.save(`tajweed_report_${selectedCategory}_${Date.now()}.pdf`);
      setSuccessMessage('💚 تم إنشاء وتنزيل ملف التقرير بتنسيق PDF احترافي يدعم التصفح والطباعة على ورق A4 بنجاح!');
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء رندرة وتوليد ملف PDF المتقدم.');
    } finally {
      setIsExporting(null);
    }
  };

  // 8. Sharing function (Simulation and fast Clipboard link/WhatsApp build)
  const handleShareWhatsApp = () => {
    const textPrefix = `*${schoolName}*\n📚 *ملخص تعليمي / تقرير أداء: ${customTitle || selectedCategory}*\nالمادة: ${subjectName}\nالمعلم: ${teacherName}\nالرجاء الاطلاع على المرفق لتحفيز الطالب!`;
    const encoded = encodeURIComponent(textPrefix);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Helper row adders for grades of custom workspace
  const addGradesRow = () => {
    const nextId = gradesData.length + 1;
    const name = prompt('أدخل اسم الطالب الإضافي للجدول:', 'طالب نجيب جديد');
    if (!name) return;
    const task = prompt('أدخل اسم المادة أو المتن:', 'حفظ متن الجزرية');
    if (!task) return;
    const scoreVal = prompt('أدخل الدرجة (من 100):', '95');
    const scoreInt = scoreVal ? parseInt(scoreVal, 10) : 95;
    const remarks = prompt('أدخل ملاحظات تربوية قصيرة:', 'مثابر ومستعد للإجازة');
    
    setGradesData([
      ...gradesData,
      {
        id: nextId,
        name,
        task,
        date: new Date().toISOString().split('T')[0],
        score: scoreInt,
        remarks: remarks || 'أداء ممتاز'
      }
    ]);
  };

  const removeGradesRow = (id: number) => {
    setGradesData(gradesData.filter(g => g.id !== id));
  };


  return (
    <div className="fixed inset-0 bg-zinc-900/65 flex flex-col items-center justify-center z-50 p-2 md:p-6 backdrop-blur-md select-none overflow-y-auto">
      
      {/* Container Frame */}
      <div className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-zinc-200">
        
        {/* Top Header Bar */}
        <div className="bg-white px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-light text-emerald-primary rounded-2xl">
              <Sparkles className="w-5 h-5 text-emerald-primary animate-pulse" />
            </span>
            <div className="text-right">
              <span className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1">
                نظام التصدير والطباعة اللحظي (Material 3 Canva System)
              </span>
              <h2 className="text-sm md:text-base font-black text-zinc-800">
                مركز مستندات وتفاصيل التصدير الاحترافي للطلاب
              </h2>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1 px-2.5 bg-zinc-150 hover:bg-zinc-200 text-zinc-650 rounded-xl font-bold cursor-pointer transition-colors text-xs flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </button>
        </div>

        {/* Outer Split Layout - Controls in Left block - Canvas Preview in Right block to facilitate RTL naturally */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* A. Dynamic Preview Canvas (Scrollable viewport) */}
          <div className="flex-1 bg-zinc-200/60 p-4 md:p-6 overflow-y-auto flex items-start justify-center custom-scrollbar order-last lg:order-first relative">
            
            {/* Page wrapper with strict physical constraints mimicking A4 */}
            <div 
              ref={previewRef}
              className={`bg-white transition-all duration-300 shadow-xl border border-zinc-300 relative print-card-wrapper text-right rtl ${font}`}
              style={{
                width: layout === 'portrait' ? '210mm' : '297mm',
                minHeight: layout === 'portrait' ? '297mm' : '210mm',
                padding: preset === 'infographic' ? '15mm' : '20mm',
                boxSizing: 'border-box',
                fontFamily: font === 'font-amiri' ? '"Amiri", serif' : '"Tajawal", sans-serif',
                background: preset === 'economic' ? '#ffffff' : '#fafcfb'
              }}
              id="printable-canvas-page"
            >
              
              {/* Cover Page Mode */}
              {showCoverPage && (
                <div className="absolute inset-0 bg-emerald-primary text-white p-20 flex flex-col justify-between items-center text-center z-10 select-all border-10 border-gold-accent">
                  <div className="space-y-4">
                    <img src={schoolLogo} className="w-24 h-24 object-contain mx-auto bg-white p-2 rounded-3xl" referrerPolicy="no-referrer" />
                    <h3 className="text-xl font-black tracking-wide text-amber-400">{schoolName}</h3>
                  </div>

                  <div className="space-y-6 max-w-md">
                    <h1 className="text-3xl font-black tracking-tight leading-relaxed">
                      {customTitle || 
                        (selectedCategory === 'grades' ? 'كشف درجات وسجل دراسي كامل' :
                         selectedCategory === 'attendance' ? 'وثيقة كشف الحضور والغياب للطلاب' :
                         selectedCategory === 'performance_report' ? 'تقرير قياس الأداء القرآني المعتمد' :
                         selectedCategory === 'exam' ? 'الاختبار التحصيلي الشامل بمتون التجويد' : 'ملف الشواهد والواجبات')}
                    </h1>
                    <div className="h-1.5 w-32 bg-amber-500 mx-auto rounded"></div>
                    <p className="text-sm opacity-80 font-medium">سجل تعليمي وإحصائي تم إنتاجه بواسطة منصة "تجاويد" الذكية لمتابعة التلاوات والألحان وصقل مهارات المرتلين.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-bold border-t border-white/20 pt-8 w-full">
                    <div>
                      <span className="opacity-60 block">المعلم المشرف:</span>
                      <span className="text-amber-300 font-extrabold">{teacherName}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block">اسم المادة والمستهدف:</span>
                      <span className="text-amber-300 font-extrabold">{subjectName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Header Panel */}
              <div className="flex items-start justify-between pb-6 border-b-2 gap-4" style={{ borderColor: colors.primary }}>
                {schoolLogo && preset !== 'economic' ? (
                  <img 
                    src={schoolLogo} 
                    alt="School Logo" 
                    className="w-16 h-16 object-contain rounded-2xl border border-zinc-100 bg-white p-1" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="p-3 bg-zinc-100 text-zinc-700 rounded-xl font-black text-xs">الشعار</div>
                )}
                
                <div className="text-right flex-1 space-y-1">
                  <h2 className="text-base font-black" style={{ color: colors.primary }}>{schoolName}</h2>
                  <p className="text-sm font-extrabold text-zinc-550">{subjectName}</p>
                  <p className="text-[10px] text-zinc-400 font-bold">تاريخ التوثيق: {new Date().toLocaleDateString('ar-SA')}</p>
                </div>

                <div className="text-left font-bold text-xs space-y-1 shrink-0">
                  <span className="px-3 py-1 bg-zinc-250/50 rounded-full text-[10px] text-zinc-500">حلقة الإتقان</span>
                  <div className="text-zinc-650 pt-1 text-[10px]">المعلم: <strong style={{ color: colors.secondary }}>{teacherName}</strong></div>
                  <div className="text-[9px] text-zinc-400">توقيع المعلم:...........</div>
                </div>
              </div>

              {/* Customizable Title Flag */}
              <div className="my-6 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded bg-zinc-100 text-zinc-400">المستند الرسمي المعتمد</span>
                <h1 className="text-lg md:text-xl font-black mt-2 leading-snug" style={{ color: colors.primary }}>
                  {customTitle || 
                    (selectedCategory === 'grades' ? 'كشف وسجل درجات الحافظين المفصل' :
                     selectedCategory === 'attendance' ? 'كشف الحضور والمواظبة - الربع الأخير للحلَق' :
                     selectedCategory === 'performance_report' ? 'تقرير قياس مستوى الإتقان وخلو اللحون' :
                     selectedCategory === 'lesson_summary' ? 'ملخص دراسي: شرح أبيات المتن وتطبيقها' :
                     selectedCategory === 'exam' ? `مسابقة تج التفاعلية (نسخة ${examType === 'student_copy' ? 'الطالب' : 'الإجابة النموذجية'})` :
                     selectedCategory === 'homework' ? 'شيت الواجبات التحفيزية المنزلية' :
                     selectedCategory === 'parent_notice' ? 'رسالة مباركة وتهنئة تربوية لأولياء الأمور' : 
                     'بطاقة قياس ومؤشرات الأداء القرآني')}
                </h1>
                <div className="w-16 h-1 mx-auto mt-2 rounded" style={{ backgroundColor: colors.secondary }}></div>
              </div>

              {/* Dynamic Categories Contents Rendering */}
              <div className="space-y-6">
                
                {/* 1. Category Grades Table */}
                {selectedCategory === 'grades' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500 leading-relaxed font-bold">
                      يدرج الجدول التالي سجل الإنجاز القرآني التراكمي وتحديثات الدرجات ونسبة التطابق الصوتي الممنوحة بواسطة نظام التقييم الذكي:
                    </p>
                    <div className="overflow-x-auto border border-zinc-150 rounded-2xl">
                      <table className="w-full text-xs font-bold">
                        <thead>
                          <tr className="text-white" style={{ backgroundColor: colors.primary }}>
                            <th className="p-3 text-right">م</th>
                            <th className="p-3 text-right">اسم الطالب مبارك</th>
                            <th className="p-3 text-right">النشاط المستهدف</th>
                            <th className="p-3 text-center">التاريخ</th>
                            <th className="p-3 text-left">معدل الإتقان</th>
                            <th className="p-3 text-right max-w-[150px]">ملاحظات ومخرجات الأداء</th>
                            <th className="p-3 text-center no-print">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradesData.map((g, idx) => (
                            <tr key={g.id} className="border-b border-zinc-100 hover:bg-zinc-50" style={{ backgroundColor: idx % 2 === 0 ? 'white' : colors.lightBg }}>
                              <td className="p-3 text-right font-black">{idx + 1}</td>
                              <td className="p-3 text-right font-black text-zinc-800 focus:outline-none" contentEditable onBlur={(e) => {
                                const val = e.currentTarget.textContent || '';
                                const updated = [...gradesData];
                                updated[idx].name = val;
                                setGradesData(updated);
                              }}>{g.name}</td>
                              <td className="p-3 text-right text-zinc-500 focus:outline-none" contentEditable onBlur={(e) => {
                                const val = e.currentTarget.textContent || '';
                                const updated = [...gradesData];
                                updated[idx].task = val;
                                setGradesData(updated);
                              }}>{g.task}</td>
                              <td className="p-3 text-center text-zinc-400 text-[10px]">{g.date}</td>
                              <td className="p-3 text-left font-black" style={{ color: colors.primary }}>{g.score}%</td>
                              <td className="p-3 text-right text-zinc-500 focus:outline-none max-w-[150px] truncate" contentEditable onBlur={(e) => {
                                const val = e.currentTarget.textContent || '';
                                const updated = [...gradesData];
                                updated[idx].remarks = val;
                                setGradesData(updated);
                              }}>{g.remarks}</td>
                              <td className="p-3 text-center no-print">
                                <button onClick={() => removeGradesRow(g.id)} className="p-1 px-2 text-red-500 hover:bg-red-50 rounded cursor-pointer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 font-extrabold no-print">
                      <span>* ملاحظة: يمكنك الضغط على خلايا الاسم والملاحظات لتعديلها فورياً كعضو أو محرر كلي.</span>
                      <button 
                        onClick={addGradesRow}
                        className="p-1.5 bg-emerald-700 text-white rounded-xl flex items-center gap-1 hover:bg-emerald-800 cursor-pointer font-black px-2.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة سطر طالب جديد</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Category Attendance */}
                {selectedCategory === 'attendance' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
                      سجل المتابعة اليومي ومواظبة الطلاب على الحلقات والدروس لعام 2026:
                    </p>
                    <div className="overflow-x-auto border border-zinc-150 rounded-2xl">
                      <table className="w-full text-xs font-bold text-zinc-700">
                        <thead>
                          <tr className="text-white text-right" style={{ backgroundColor: colors.primary }}>
                            <th className="p-3">اسم الطالب</th>
                            <th className="p-3 text-center">الأسبوع 1</th>
                            <th className="p-3 text-center">الأسبوع 2</th>
                            <th className="p-3 text-center">الأسبوع 3</th>
                            <th className="p-3 text-center">الأسبوع 4</th>
                            <th className="p-3 text-left">درجة الالتزام</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceData.map((att, idx) => (
                            <tr key={att.id} className="border-b border-zinc-100" style={{ backgroundColor: idx % 2 === 0 ? 'white' : colors.lightBg }}>
                              <td className="p-3 font-black text-zinc-800">{att.name}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                  att.s1 === 'حاضر' ? 'bg-emerald-100 text-emerald-800' :
                                  att.s1 === 'متأخر' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                }`} onClick={() => {
                                  const updated = [...attendanceData];
                                  updated[idx].s1 = att.s1 === 'حاضر' ? 'متأخر' : att.s1 === 'متأخر' ? 'غائب' : 'حاضر';
                                  setAttendanceData(updated);
                                }}>{att.s1}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                  att.s2 === 'حاضر' ? 'bg-emerald-100 text-emerald-800' :
                                  att.s2 === 'متأخر' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                }`} onClick={() => {
                                  const updated = [...attendanceData];
                                  updated[idx].s2 = att.s2 === 'حاضر' ? 'متأخر' : att.s2 === 'متأخر' ? 'غائب' : 'حاضر';
                                  setAttendanceData(updated);
                                }}>{att.s2}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                  att.s3 === 'حاضر' ? 'bg-emerald-100 text-emerald-800' :
                                  att.s3 === 'متأخر' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                }`} onClick={() => {
                                  const updated = [...attendanceData];
                                  updated[idx].s3 = att.s3 === 'حاضر' ? 'متأخر' : att.s3 === 'متأخر' ? 'غائب' : 'حاضر';
                                  setAttendanceData(updated);
                                }}>{att.s3}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                  att.s4 === 'حاضر' ? 'bg-emerald-100 text-emerald-800' :
                                  att.s4 === 'متأخر' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                }`} onClick={() => {
                                  const updated = [...attendanceData];
                                  updated[idx].s4 = att.s4 === 'حاضر' ? 'متأخر' : att.s4 === 'متأخر' ? 'غائب' : 'حاضر';
                                  setAttendanceData(updated);
                                }}>{att.s4}</span>
                              </td>
                              <td className="p-3 text-left font-black" style={{ color: colors.primary }}>{att.rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-bold block">* ملاحظة: اضغط على الكبسولة (الملونة) لتغيير حالة حضور وغياب وحضور الطالب بسرعة.</span>
                  </div>
                )}

                {/* 3. Category Performance Report */}
                {selectedCategory === 'performance_report' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Metric Box 1 */}
                      <div className="p-4 rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.lightBg }}>
                        <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">التقييم العام للمستوى</span>
                        <h4 className="text-sm font-black text-zinc-800">ماتش الحفظ ومخارج الغنة والتشكيل</h4>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-3xl font-black" style={{ color: colors.primary }}>{stats?.averageMastery || 92}%</span>
                          <span className="text-xs font-bold text-zinc-550">مستوى متقن طليق</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-bold mt-2">قياس من أصل 15 تلاوة صوتية تم فحصها من خلال معيار المحرك الذكي.</p>
                      </div>

                      {/* Metric Box 2 */}
                      <div className="p-4 rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.lightBg }}>
                        <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">معدل اجتياز الاختبارات</span>
                        <h4 className="text-sm font-black text-zinc-800">تفصيل معاني الأبيات وفك غريب الألفاظ</h4>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-3xl font-black" style={{ color: colors.secondary }}>{stats?.quizSuccessRate || 90}%</span>
                          <span className="text-xs font-bold text-amber-705">دقة إجابة ذكية</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-bold mt-2">بمعدل مشاركات إجمالي يبلغ {stats?.totalQuizzes || 4} اختبار علمي معتمد.</p>
                      </div>

                    </div>

                    <div className="p-4 rounded-2xl border border-dashed text-right space-y-2" style={{ borderColor: colors.secondary }}>
                      <h4 className="text-xs font-black flex items-center gap-1.5" style={{ color: colors.primary }}>
                        <Award className="w-4 h-4 text-amber-500" />
                        رأي وملاحظات اللجنة الأكاديمية والمحفظ القرآني:
                      </h4>
                      <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                        يُظهر الحافظ <strong className="text-zinc-800 font-black">"{studentName}"</strong> استيعاباً رائعاً وحفظاً متقناً لأصول مخارج الحروف الشجرية والشفوية، ولديه وعي ممتاز بمراتب الغنة. نوصي بالاستمرار في استماع المخارج لرفع مستوى الدقة لأكثر من 95%.
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-4 border-t border-zinc-100 font-bold">
                      <span>مع تمنياتنا بالتوفيق المستمر والهمة العالية.</span>
                      <span>ختم الأكاديمية الرسمي</span>
                    </div>
                  </div>
                )}

                {/* 4. Category Lesson Summary */}
                {selectedCategory === 'lesson_summary' && (
                  <div className="space-y-6">
                    
                    {/* Visual Infographic card when selected or standard */}
                    <div className={`p-6 rounded-3xl text-right border-2 space-y-4 ${preset === 'infographic' ? 'bg-gradient-to-tr from-emerald-100/30 to-amber-50/40 border-dashed' : 'bg-white'}`} style={{ borderColor: colors.border }}>
                      
                      {/* Verse preview block in center */}
                      <div className="bg-emerald-light/60 p-4 rounded-2xl text-center border-l-4 font-amiri text-base md:text-lg animate-pulse" style={{ borderLeftColor: colors.secondary }}>
                        <p className="font-extrabold text-[#0a5f3e] leading-relaxed">
                          {summaryData.verseText.split('**')[0]}
                          <span className="block text-xs font-black text-[#c49a45] my-1">***</span>
                          {summaryData.verseText.split('**')[1] || ''}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-amber-600">الشرح البياني والمعاني:</span>
                        <p className="text-xs text-zinc-600 leading-relaxed font-bold">{summaryData.meaning}</p>
                      </div>

                      <div className="space-y-2 border-t border-zinc-100 pt-3">
                        <span className="text-[10px] font-black uppercase text-emerald-primary" style={{ color: colors.primary }}>تفكيك الإعراب النحوي للأبيات:</span>
                        <p className="text-xs text-zinc-650 leading-relaxed font-medium font-mono bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">{summaryData.grammarAnalysis}</p>
                      </div>

                      <div className="space-y-2 border-t border-zinc-100 pt-3">
                        <span className="text-[10px] font-black uppercase text-emerald-primary" style={{ color: colors.primary }}>أهم القواعد والأحكام التجويدية المستخرجة:</span>
                        <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-600 font-semibold pr-4">
                          {summaryData.tajweedRules.map((rule, run) => (
                            <li key={run} className="marker:text-amber-550 leading-relaxed">{rule}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-500/25 text-xs font-bold text-zinc-700 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>نصيحة الحفظ والتنمية: {summaryData.educationalTip}</span>
                      </div>

                    </div>

                    {preset === 'infographic' && (
                      <div className="text-center p-3 bg-emerald-primary text-white font-black rounded-2xl text-xs space-y-1">
                        <p>📢 انشر العلم وشارك الملخص عبر السوشيال ميديا وحلقات تحفيظ الواتساب</p>
                        <p className="text-[9px] text-amber-300 font-bold">أكاديمية تجاويد لعلوم القرآن الكريم والدراسات الشرعية © 2026</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Category Quiz/Exam */}
                {selectedCategory === 'exam' && (
                  <div className="space-y-6">
                    <div className="p-3 bg-zinc-50 rounded-xl flex items-center justify-between border text-[10px] text-zinc-400 font-extrabold gap-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <span>زمن الاختبار: <strong className="text-zinc-700">{testDuration}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-zinc-400" />
                        <span>الدرجة الإجمالية لكامل الأسئلة: <strong className="text-zinc-700">{examGrade}</strong></span>
                      </div>
                      <div>
                        <span>اسم الطالب المبارك: .......................................</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {examData.map((q, qIndex) => (
                        <div key={q.id} className="p-4 rounded-xl border space-y-3 relative" style={{ borderColor: colors.border, backgroundColor: colors.lightBg }}>
                          <span className="absolute left-4 top-4 font-black text-xs text-zinc-300">س {qIndex + 1}</span>
                          
                          <h4 className="text-xs md:text-sm font-black text-zinc-800 pr-2 border-r-2" style={{ borderRightColor: colors.secondary }}>
                            {q.questionText}
                          </h4>

                          {/* Multiple Choice options layout */}
                          {q.type === 'multiple-choice' && q.options && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {q.options.map((opt, optIndex) => {
                                const isCorrect = opt === q.correctAnswer;
                                const isSelected = opt === q.userAnswer;
                                const showAsCorrect = examType === 'answer_key' && isCorrect;
                                
                                return (
                                  <div 
                                    key={optIndex} 
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                      showAsCorrect 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-500' 
                                        : 'bg-white border-zinc-200'
                                    }`}
                                  >
                                    <span className="w-4.5 h-4.5 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-400 flex items-center justify-center">
                                      {String.fromCharCode(65 + optIndex)}
                                    </span>
                                    <span>{opt}</span>
                                    {showAsCorrect && <span className="text-[9px] text-[#0a5f3e] mr-auto font-black">(الجواب المعتمد)</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* True/False layout */}
                          {q.type === 'true-false' && q.options && (
                            <div className="flex gap-4 mt-2">
                              {q.options.map((opt, optIndex) => {
                                const isCorrect = opt === q.correctAnswer;
                                const showAsCorrect = examType === 'answer_key' && isCorrect;
                                
                                return (
                                  <div 
                                    key={optIndex} 
                                    className={`p-2.5 px-6 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                                      showAsCorrect 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-500' 
                                        : 'bg-white border-zinc-200'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {showAsCorrect && <span className="text-[9px] text-[#0a5f3e] mr-auto font-black">(✓)</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Fill-in-blank textlines or writing room */}
                          {q.type === 'fill-in-blank' && (
                            <div className="pt-1">
                              {examType === 'student_copy' ? (
                                <div className="border-b border-dashed border-zinc-300 w-full h-8 flex items-end">
                                  <span className="text-[10px] text-zinc-300">اكتب الكلمة الصحيحة الناقصة هنا...</span>
                                </div>
                              ) : (
                                <p className="text-xs bg-amber-50 text-amber-800 p-2 rounded-xl border font-black">
                                  الكلمة الصحيحة النموذجية: <strong className="text-amber-900">"{q.correctAnswer}"</strong>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Essay / Explanation styling */}
                          {q.type === 'explanation' && (
                            <div className="pt-1 space-y-2">
                              {examType === 'student_copy' ? (
                                <div className="space-y-1">
                                  <div className="border-b border-zinc-200 w-full h-8"></div>
                                  <div className="border-b border-zinc-200 w-full h-8"></div>
                                  <span className="text-[9px] text-zinc-300 block">اكتب شرحك التدويني المفصل هنا...</span>
                                </div>
                              ) : (
                                <p className="text-xs bg-amber-50 text-amber-800 p-3 rounded-xl border leading-relaxed font-bold">
                                  الإجابة وشرح المتن المعتمد: {q.correctAnswer}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Extra feedback for learning */}
                          {examType === 'answer_key' && q.correctionFeedback && (
                            <p className="text-[10px] text-zinc-500 bg-zinc-100/70 p-2.5 rounded-lg font-semibold block leading-relaxed mt-2" style={{ borderRight: `3px solid ${colors.secondary}` }}>
                              💡 الإيضاح التربوي: {q.correctionFeedback}
                            </p>
                          )}

                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] text-zinc-400 font-extrabold text-center pt-4">أكاديمية تجاويد لعلوم ومسابقات التجويد - كامل الحقوق محفوظة ومعتمدة من المحفظين.</p>
                  </div>
                )}

                {/* 6. Category Homework */}
                {selectedCategory === 'homework' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500 leading-relaxed font-bold">
                      يرجى من الطالب الكريم تطبيق وحل البنود والواجبات المنزلية التالية وتقديمها للحلقة في الموعد المستهدف:
                    </p>
                    <div className="space-y-3">
                      {homeworkTasks.map((t, index) => (
                        <div key={t.id} className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between gap-4 font-bold" style={{ backgroundColor: index % 2 === 0 ? 'white' : colors.lightBg }}>
                          <span className="text-xs text-zinc-700 leading-relaxed text-right flex-1 focus:outline-none" contentEditable onBlur={(e) => {
                            const val = e.currentTarget.textContent || '';
                            const updated = [...homeworkTasks];
                            updated[index].text = val;
                            setHomeworkTasks(updated);
                          }}>{t.text}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] text-zinc-400 font-bold">تم الإنجاز</span>
                            <input 
                              type="checkbox" 
                              checked={t.done} 
                              className="accent-emerald-750 w-4 h-4 cursor-pointer"
                              onChange={(e) => {
                                const updated = [...homeworkTasks];
                                updated[index].done = e.target.checked;
                                setHomeworkTasks(updated);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end p-2 no-print">
                      <button 
                        onClick={() => {
                          const nextId = homeworkTasks.length + 1;
                          const text = prompt('أدخل تفاصيل الواجب المدرسي/المنزلي الإضافي:', 'مراجعة المذكرة التجويدية.');
                          if (text) {
                            setHomeworkTasks([...homeworkTasks, { id: nextId, text, done: false }]);
                          }
                        }}
                        className="p-1 px-3 bg-zinc-150 hover:bg-zinc-200 text-zinc-750 font-black rounded-lg text-[10px] flex items-center gap-1.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>إضافة بند واجب</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. Category Parents notice */}
                {selectedCategory === 'parent_notice' && (
                  <div className="space-y-4">
                    <div className="p-6 rounded-3xl border text-right space-y-4" style={{ borderColor: colors.secondary, backgroundColor: colors.lightBg }}>
                      <div className="flex items-center gap-1.5" style={{ color: colors.primary }}>
                        <Mail className="w-5 h-5 text-amber-500 animate-bounce" />
                        <span className="text-xs font-black">خطاب شكر وتقدير موجه لولي الأمر الكريم:</span>
                      </div>
                      
                      <textarea
                        value={parentMessage}
                        onChange={(e) => setParentMessage(e.target.value)}
                        className="w-full min-h-[140px] text-xs font-black text-zinc-700 bg-white/70 p-4 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700 leading-relaxed no-print resize-none"
                        placeholder="اكتب صيغة الخطاب الهادف لأولياء الأمور هنا..."
                      />
                      
                      {/* Read only view in standard canvas export format */}
                      <p className="hidden print:block text-xs text-zinc-650 leading-relaxed whitespace-pre-line font-medium pr-2 border-r-2 border-emerald-primary/30">
                        {parentMessage}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-150 text-[10px] text-zinc-400 font-bold">
                        <span>مع تحيات الأستاذ: {teacherName}</span>
                        <span>مقرأة أكاديمية تجاويد للقرآن</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. Performance stats card */}
                {selectedCategory === 'stats_card' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500 leading-relaxed font-bold">
                      رسم توضيحي ملخص لإحصائيات تقدم الطالب والمستوى القرآني:
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-emerald-50 text-center rounded-2xl border border-emerald-250">
                        <span className="text-xl font-black text-emerald-primary block">{stats?.totalRecitations || 12}</span>
                        <span className="text-[10px] text-zinc-400 font-extrabold block">جلسات تلاوة</span>
                      </div>
                      <div className="p-3 bg-amber-50 text-center rounded-2xl border border-amber-250">
                        <span className="text-xl font-black text-amber-600 block">{stats?.averageMastery || 92}%</span>
                        <span className="text-[10px] text-zinc-400 font-extrabold block">متوسط الإتقان</span>
                      </div>
                      <div className="p-3 bg-[#e6f3ee] text-center rounded-2xl border border-[#0a5f3e]/25">
                        <span className="text-[11px] font-black text-[#0a5f3e] block py-1.5 leading-none">{stats?.hifzLevel || 'مبتدئ'}</span>
                        <span className="text-[10px] text-zinc-400 font-extrabold block">مستوى الحفظ</span>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                      <span className="text-[10px] text-zinc-400 font-extrabold block">توزيع ونسب اللحون اللفظية:</span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-[10px]">
                          <span>أخطاء مخارج الأصوات (لحن جلي):</span>
                          <span className="font-extrabold">20%</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full rounded-full" style={{ width: '20%' }}></div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] pt-1">
                          <span>أخطاء الغدد والمد والتجويد (لحن خفي):</span>
                          <span className="font-extrabold">80%</span>
                        </div>
                        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Chat Message Document template */}
                {selectedCategory === 'chat_message' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500 leading-relaxed font-bold">
                      يرد أدناه محتوى الرسالة التوجيهية وتفاصيل المنظومة والشروح المستنبطة (يمكنك تعديل النص مباشرة أدناه قبل الطباعة أو الحفظ):
                    </p>
                    
                    <div className="bg-white p-6 rounded-2xl border text-right space-y-4" style={{ borderColor: colors.border }}>
                      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: colors.border }}>
                        <span className="p-2 rounded-xl text-white" style={{ backgroundColor: colors.primary }}>
                          <Bot className="w-5 h-5" />
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-zinc-800">إرشاد المعلم والموجه اللغوي الذكي</h4>
                          <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">محتوى الجلسة العلمية لمتن: {activeMatn}</span>
                        </div>
                      </div>

                      <div 
                        className="text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap font-medium outline-none focus:bg-amber-50/20 p-2 rounded-xl border border-transparent hover:border-zinc-200 focus:border-emerald-primary"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setChatContent(e.currentTarget.textContent || '')}
                        style={{ wordBreak: 'break-word', fontFamily: font === 'font-amiri' ? '"Amiri", serif' : '"Tajawal", sans-serif' }}
                      >
                        {chatContent}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t text-[10px] text-zinc-400 font-extrabold" style={{ borderColor: colors.border }}>
                        <span>منصة تجاويد لتعليم المتون التجويدية © 2026</span>
                        <span>مرحلة الضبط والتمكين</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* PDF Custom Footer Panel (A4 layout default signature) */}
              <div className="mt-12 pt-6 border-t border-zinc-200 flex justify-between items-center text-[9px] text-zinc-400 font-extrabold">
                <div>
                  <span>تم التوليد بنجاح عبر حزمة التصدير لمنصة تجاويد لتعليم المتون الشرعية والمققر</span>
                </div>
                <div>
                  <span className="block">معتمد من الشيخ: ✍️ {teacherName}</span>
                </div>
              </div>

            </div>
          </div>

          {/* B. Settings & Controls Panel */}
          <div className="w-full lg:w-96 bg-white border-r lg:border-r-0 lg:border-l border-zinc-100 p-6 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* 1. Category Switcher */}
            <div className="space-y-2 text-right">
              <label className="text-xs font-black text-zinc-650 block">1. حدد نوع المحتوى والمستند المراد تصديره:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'grades', label: 'كشف درجات الطلاب', icon: FileSpreadsheet },
                  { id: 'attendance', label: 'كشف الحضور والغياب', icon: CheckSquare },
                  { id: 'performance_report', label: 'تقرير قياس الأداء', icon: Activity },
                  { id: 'lesson_summary', label: 'ملخصات الأبيات والشرح', icon: FileText },
                  { id: 'exam', label: 'الأسئلة والاختبارات', icon: HelpCircle },
                  { id: 'homework', label: 'شيت الواجبات المنزلية', icon: Award },
                  { id: 'parent_notice', label: 'رسالة لأولياء الأمور', icon: Mail },
                  { id: 'stats_card', label: 'إحصائيات الإتقان', icon: Sparkles },
                  { id: 'chat_message', label: 'محتوى رسالة الحوار', icon: Bot }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id as ExportCategory);
                      setShowCoverPage(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold justify-start flex items-center gap-2 transition-all cursor-pointer ${
                      selectedCategory === cat.id 
                        ? 'bg-emerald-primary text-white border-emerald-primary' 
                        : 'bg-zinc-50 text-zinc-700 border-zinc-250 hover:bg-zinc-100'
                    }`}
                  >
                    <cat.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Extra Quiz options if Quiz selected */}
            {selectedCategory === 'exam' && (
              <div className="p-3.5 bg-slate-50 border border-zinc-200 rounded-2xl space-y-2 text-right">
                <span className="text-[10px] font-black text-amber-600 block">خيارات تصميم ملف الاختبار:</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setExamType('student_copy')} 
                    className={`flex-1 py-1.5 font-bold text-xs rounded-lg border cursor-pointer ${examType === 'student_copy' ? 'bg-[#c49a45] text-white' : 'bg-white text-zinc-700 hover:bg-zinc-100'}`}
                  >
                    نسخة الطالب (للفحص)
                  </button>
                  <button 
                    onClick={() => setExamType('answer_key')}
                    className={`flex-1 py-1.5 font-bold text-xs rounded-lg border cursor-pointer ${examType === 'answer_key' ? 'bg-[#c49a45] text-white' : 'bg-white text-zinc-700 hover:bg-zinc-100'}`}
                  >
                    نموذج الإجابات (للاستاذ)
                  </button>
                </div>
              </div>
            )}

            {/* 2. Visual Theme Colors & Fonts Panel */}
            <div className="space-y-3.5 text-right border-t border-zinc-105 pt-4">
              <span className="text-xs font-black text-zinc-650 block">2. الألوان وتنسيق الهوية البصرية:</span>
              
              {/* Color Themes */}
              <div className="flex items-center gap-2 justify-between">
                <span className="text-[10px] font-bold text-zinc-400">نمط القالب:</span>
                <div className="flex gap-2.5">
                  {[
                    { id: 'classical_emerald', class: 'bg-[#0a5f3e]', title: 'أخضر محكم' },
                    { id: 'navy_royal', class: 'bg-[#1e3a8a]', title: 'أزرق ملكي' },
                    { id: 'orchid_purple', class: 'bg-[#5b21b6]', title: 'بنفسجي زكي' },
                    { id: 'luxury_burgundy', class: 'bg-[#7f1d1d]', title: 'عنابي فاخر' },
                    { id: 'dignified_charcoal', class: 'bg-[#374151]', title: 'وقور معتم' }
                  ].map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setTheme(col.id as ColorTheme)}
                      title={col.title}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all border ${
                        theme === col.id ? 'scale-125 ring-2 ring-offset-2 ring-emerald-650' : 'ring-0 opacity-80'
                      } ${col.class}`}
                    />
                  ))}
                </div>
              </div>

              {/* Fonts Swappers */}
              <div className="flex items-center gap-2 justify-between">
                <span className="text-[10px] font-bold text-zinc-400">نوع الخط العربي:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setFont('font-sans')}
                    className={`px-3 py-1 text-[11px] font-black rounded-lg cursor-pointer ${font === 'font-sans' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-700'}`}
                  >
                    تجوال عصري
                  </button>
                  <button
                    onClick={() => setFont('font-amiri')}
                    className={`px-3 py-1 text-[11px] font-black rounded-lg cursor-pointer ${font === 'font-amiri' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-700'}`}
                  >
                    أميري كلاسيكي
                  </button>
                </div>
              </div>

              {/* Design Presets (Economic, Infographic) */}
              <div className="flex items-center gap-2 justify-between">
                <span className="text-[10px] font-bold text-zinc-400">قالب الهيكل:</span>
                <div className="flex gap-1.5">
                  {[
                    { id: 'official', label: 'رسمي هوامش' },
                    { id: 'infographic', label: 'إنفوجرافيك' },
                    { id: 'economic', label: 'اقتصادي توفير حبر' }
                  ].map((pres) => (
                    <button
                      key={pres.id}
                      onClick={() => setPreset(pres.id as PresetStyle)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${preset === pres.id ? 'bg-emerald-700 text-white' : 'bg-zinc-100 text-zinc-700'}`}
                    >
                      {pres.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Paper Sizes & Layout Orientation */}
            <div className="space-y-3 text-right border-t border-zinc-105 pt-4">
              <span className="text-xs font-black text-zinc-650 block">3. إعدادات الورقة والأحجام المخصصة:</span>
              
              {/* Size Select */}
              <div className="flex items-center gap-2 justify-between">
                <span className="text-[10px] font-bold text-zinc-400">حجم الصفحة القياسي:</span>
                <div className="flex gap-1.5">
                  {['A4', 'A5', 'Letter'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size as PageSize)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${pageSize === size ? 'bg-[#c49a45] text-white' : 'bg-zinc-100 text-zinc-700'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation Option */}
              <div className="flex items-center gap-2 justify-between">
                <span className="text-[10px] font-bold text-zinc-400">اتجاه الطباعة:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setLayout('portrait')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${layout === 'portrait' ? 'bg-[#c49a45] text-white' : 'bg-zinc-100 text-zinc-700'}`}
                  >
                    رأسي (Portrait)
                  </button>
                  <button
                    onClick={() => setLayout('landscape')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${layout === 'landscape' ? 'bg-[#c49a45] text-white' : 'bg-zinc-100 text-zinc-700'}`}
                  >
                    أفقي (Landscape)
                  </button>
                </div>
              </div>

              {/* Cover Page Checker */}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[10px] font-bold text-zinc-400">إضافة صفحة غلاف منفصلة للتقارير:</span>
                <input 
                  type="checkbox" 
                  checked={showCoverPage} 
                  className="accent-emerald-700 w-4 h-4 cursor-pointer"
                  onChange={(e) => setShowCoverPage(e.target.checked)} 
                />
              </div>
            </div>

            {/* 4. Text Customizations Form */}
            <div className="space-y-3.5 text-right border-t border-zinc-105 pt-4">
              <span className="text-xs font-black text-zinc-650 block">4. ضبط وحرير ألقاب وبيانات التوثيق:</span>
              
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block mb-1">اسم المدرسة/الأكاديمية المانحة:</span>
                  <input 
                    type="text" 
                    value={schoolName} 
                    onChange={(e) => setSchoolName(e.target.value)} 
                    className="w-full text-xs font-bold text-zinc-750 bg-zinc-50 border border-zinc-250 p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block mb-1">صورة شعار الأكاديمية (رابط URL):</span>
                  <input 
                    type="text" 
                    value={schoolLogo} 
                    onChange={(e) => setSchoolLogo(e.target.value)} 
                    className="w-full text-xs font-mono text-zinc-500 bg-zinc-50 border border-zinc-250 p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block mb-1">اسم المعلم المشرف والمصحح:</span>
                  <input 
                    type="text" 
                    value={teacherName} 
                    onChange={(e) => setTeacherName(e.target.value)} 
                    className="w-full text-xs font-bold text-zinc-755 bg-zinc-50 border border-zinc-250 p-2 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-bold block mb-1">عنوان مخصص للمستند (اختياري للاستبدال):</span>
                  <input 
                    type="text" 
                    placeholder="سيتم استخدام العنوان التلقائي إن تُرِك فارغاً"
                    value={customTitle} 
                    onChange={(e) => setCustomTitle(e.target.value)} 
                    className="w-full text-xs font-bold text-zinc-755 bg-zinc-50 border border-zinc-250 p-2 rounded-xl focus:outline-none"
                  />
                </div>

                {selectedCategory === 'exam' && (
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-400">
                    <div>
                      <span>زمن الاختبار:</span>
                      <input 
                        type="text" 
                        value={testDuration} 
                        onChange={(e) => setTestDuration(e.target.value)}
                        className="w-full text-xs font-bold text-zinc-755 bg-zinc-50 border border-zinc-200 p-2 rounded-xl focus:outline-none mt-1"
                      />
                    </div>
                    <div>
                      <span>الدرجة النهائية:</span>
                      <input 
                        type="text" 
                        value={examGrade} 
                        onChange={(e) => setExamGrade(e.target.value)}
                        className="w-full text-xs font-bold text-zinc-755 bg-zinc-50 border border-zinc-200 p-2 rounded-xl focus:outline-none mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Master Actions Bottom Panel */}
            <div className="border-t border-zinc-150 pt-5 space-y-3.5">
              
              <div className="space-y-2">
                <button
                  onClick={handleExportAsPDF}
                  disabled={isExporting !== null}
                  className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all focus:scale-101 cursor-pointer"
                >
                  {isExporting === 'PDF' ? (
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></span>
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>تصدير كملف PDF للطباعة والنشر A4</span>
                </button>

                <button
                  onClick={handleExportAsImage}
                  disabled={isExporting !== null}
                  className="w-full py-3 bg-emerald-primary hover:bg-emerald-802 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all focus:scale-101 cursor-pointer"
                >
                  {isExporting === 'PNG' ? (
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></span>
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  <span>تصدير كصورة PNG عالية النقاء (3x)</span>
                </button>

                <button
                  onClick={triggerPrint}
                  className="w-full py-3 bg-[#c49a45] hover:bg-[#b0883b] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all focus:scale-101 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>الطباعة المباشرة للمستند</span>
                </button>
              </div>

              {/* Share triggers */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex-1 py-2 text-[10px] font-black justify-center items-center flex gap-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-580 shrink-0" />
                  <span>واتساب</span>
                </button>
                <button
                  onClick={() => alert(`تم نسخ رابط التقرير الذكي للحافظ ${studentName} في الحافظة بنجاح، يمكنك مشاركته مع العائلة.`)}
                  className="flex-1 py-2 text-[10px] font-black justify-center items-center flex gap-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-505 shrink-0" />
                  <span>نسخ الرابط</span>
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Success toast banners */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-6 right-6 left-6 md:left-auto bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl md:max-w-md text-right flex items-start gap-3 border border-emerald-500 z-50 font-black text-xs"
            >
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
              <div className="space-y-1">
                <span className="text-amber-300 block">✓ تمت العملية بنجاح!</span>
                <p className="font-bold text-zinc-350 leading-relaxed">{successMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
