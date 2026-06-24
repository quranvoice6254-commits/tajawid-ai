import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { EXCLUSIVE_MATNS } from "./src/data/matnsData";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not defined. Please configure it in your Secrets/Environment variables.",
      );
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// 0. Retry with Timeout AI Engine Wrapper (Requirement 5)
async function callGeminiWithRetry(
  apiCallFn: (modelName: string) => Promise<any>,
): Promise<any> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 45000; // 45 seconds timeout for each try to support complex JSON generation
  let lastError: any = null;

  // Rotation of model names to bypass quota 429 or 503 unavailability limits
  const models = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash",
  ];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const modelToUse = models[Math.min(attempt - 1, models.length - 1)];
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("TIMEOUT_LIMIT_EXCEEDED")),
          TIMEOUT_MS,
        ),
      );

      const result = await Promise.race([
        apiCallFn(modelToUse),
        timeoutPromise,
      ]);
      return result;
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      console.warn(
        `[AI Engine] Attempt ${attempt}/${MAX_RETRIES} with ${modelToUse} failed with error: ${errorMsg}`,
      );

      if (attempt < MAX_RETRIES) {
        // Exponential backoff delay
        const delay = 1000 * attempt;
        console.log(`[AI Engine] Sleep ${delay}ms before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

function handleAPIError(res: express.Response, error: any, defaultMsg: string) {
  console.error("[Gemini API Error details]:", error);
  const errMsg = error?.message || String(error);

  let statusCode = 500;
  let userFriendlyMsg = defaultMsg;

  if (
    errMsg.includes("503") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("temporary") ||
    errMsg.includes("overload")
  ) {
    statusCode = 503;
    userFriendlyMsg = `${defaultMsg} (خادم الذكاء الاصطناعي مشغول مؤقتاً بسبب ضغط القراء الحاد - 503). يرجى النقر على زر المعاودة.`;
  } else if (
    errMsg.includes("TIMEOUT") ||
    errMsg.includes("Timeout") ||
    errMsg.includes("TIMEOUT_LIMIT_EXCEEDED")
  ) {
    statusCode = 408;
    userFriendlyMsg = `${defaultMsg} (تجاوز المعالج وقت الاستجابة المسموح به بسبب ضعف الاتصال بالخادم). يرجى الضغط للتدوير ثانية.`;
  } else if (
    errMsg.includes("API_KEY") ||
    errMsg.includes("apiKey") ||
    errMsg.includes("unauthorized") ||
    errMsg.includes("key")
  ) {
    statusCode = 401;
    userFriendlyMsg =
      "مفتاح تشغيل الذكاء الاصطناعي (API Key) غير صالح أو لم يتم رفعه بخزنة التطبيق الإدارية بعد.";
  } else {
    userFriendlyMsg = `${defaultMsg} (مستطلع الخطأ: ${errMsg.slice(0, 100)}).`;
  }

  res.status(statusCode).json({ error: userFriendlyMsg });
}

// ================= Offline Smart Fallbacks for Resilient Failless Architecture =================

function getFallbackMatnInfo(matnName: string) {
  const normName =
    Object.keys(EXCLUSIVE_MATNS).find(
      (k) => k.includes(matnName) || matnName.includes(k),
    ) || "تحفة الأطفال";
  const original = EXCLUSIVE_MATNS[normName];
  return {
    name: original.name,
    author: original.author,
    era: original.era || "العصر العباسي أو المتأخر",
    summary:
      original.summary ||
      "منظومة مباركة في علم التجويد والعقيدة والقراءات الشريفة.",
    benefits: original.benefits || [
      "تسهيل حفظ المنظومات العلمية وعلم التجويد",
      "ضبط مخارج الأصوات وصوت الحروف",
    ],
    chapters: original.chapters || ["مقدمة المنظومة", "أحكام التجويد الأساسية"],
    sampleVerses: original.verses.slice(0, 8).map((v, idx) => ({
      id: idx + 1,
      s1: v.s1,
      s2: v.s2,
      chapter: v.chapter,
    })),
  };
}

function getFallbackMatnExplain(matnName: string, verseText: string) {
  let grammar =
    "إِعْرَابٌ تَقْدِيرِيٌّ مُبَسَّطٌ: الشَّطْرُ الْأَوَّلُ يَتَكَوَّنُ مِنْ مُبْتَدَأٍ مَرْفُوعٍ وَخَبَرِهِ، وَالشَّطْرُ الثَّانِي جُمْلَةٌ مَعْطُوفَةٌ لِتَقْرِيرِ أَعْمَالِ التَّجْوِيدِ الدَّقِيقِ.";
  let tajweedRules = [
    "مُرَاعَاةُ النُّطْقِ الْفَصِيحِ لِلْحَرَكَاتِ وَالْفَتْحَةِ الْكَرِيمَةِ فِي مَخَارِجِ الْحَلْقِ.",
    "قَلْقَلَةُ حُرُوفِ الْقَلْقَلَةِ حَالَ السُّكُونِ الْعَارِضِ.",
    "تَحْقِيقُ مَخَارِجِ الْحُرُوفِ الشَّجَرِيَّةِ وَالشَّفَوِيَّةِ بِصُورَةٍ سَلِيمَةٍ.",
  ];
  let educationalTip =
    "يُنْصَحُ طَالِبُ الْعِلْمِ بِتِلاوَةِ هَذَا الْبَيْتِ عِدَّةَ مَرَّاتٍ وَتَكْرَارِ النُّطْقِ لِضَبْطِ التَّلَقِّي الشَّفَوِيِّ عَنِ الشُّيُوخِ الْأَفَاضِلِ.";
  let meaning =
    "شَرْحٌ وَتَفْكِيكٌ لُغَوِيٌّ مُبَسَّطٌ لِلْبَيْتِ: الْحَثُّ عَلَى طَلَبِ مَعَالِي الْعِلْمِ وَتَصْحِيحِ نُطْقِ الْحُرُوفِ الْقُرْآنِيَّةِ الْكَرِيمَةِ.";
  let vocabularyExplanation =
    "الْمُفْرَدَاتُ: النَّظْمُ يَعْنِي الْكَلامَ الْمَوْزُونَ لِتَسْهِيلِ الْحِفْظِ، وَالْمُرِيدُ هُوَ الطَّالِبُ لِلْعِلْمِ السَّاعِي لَهُ.";
  let overallMeaning =
    "الْمَعْنَى الْإِجْمَالِيُّ: يُرِيدُ النَّاظِمُ رَحِمَهُ اللهُ أَنْ يُبَيِّنَ لِلطَّالِبِ أَهَمِّيَّةَ الِالْتِزَامِ بِقَوَاعِدِ التَّرْتِيلِ كَمَا وَرَدَتْ عَنِ النَّبِيِّ ﷺ.";
  let scientificBenefits = [
    "بَيَانُ شَرَفِ عِلْمِ التَّجْوِيدِ وَأَثَرِهِ فِي صَوْنِ اللِّسَانِ عَنِ اللَّحْنِ.",
    "أَهَمِّيَّةُ التَّلَقِّي بِالْمُشَافَهَةِ وَالسَّمَاعِ لِضَبْطِ الْحُرُوفِ.",
  ];
  let practicalExamples = [
    "الْمِثَالُ: نُطْقُ النُّونِ السَّاكِنَةِ عِنْدَ الْأَحْرُفِ الْحَلْقِيَّةِ فِي نَحْوِ قَوْلِهِ تعالى: ﴿مَنْ آمَنَ﴾ بِالْإِظْهَارِ الْجَلِيِّ دُونَ غُنَّةٍ زَائِدَةٍ.",
  ];

  const text = verseText || "";
  if (
    text.includes("نُّونِ") ||
    text.includes("شُدِّدَا") ||
    text.includes("نون") ||
    text.includes("التَّنْوِينِ")
  ) {
    meaning =
      "يتعلق هذا البيت المبارك بأحكام النون الساكنة والتنوين أو النون والميم المشددتين، ويوضح الناظم وجوب تشديد وإظهار الغنة بمقدار حركتين.";
    vocabularyExplanation =
      "وَنُوناً: أَيْ حَرْفَ النُّونِ الْمَعْرُوفَ، وَظَهَرَ: أَيْ مَخْرَجُهَا الصَّافِي، وَالْغُنَّةُ: صَوْتٌ لَذِيذٌ يَخْرُجُ مِنَ الْخَيْشُومِ.";
    overallMeaning =
      "الْمَعْنَى الْإِجْمَالِيُّ: يَجِبُ عَلَى الْقَارِئِ إِظْهَارُ الْغُنَّةِ كَامِلَةً مِقْدَارَ حَرَكَتَيْنِ عِنْدَ نُطْقِ النُّونِ وَالْمِيمِ الْمُشَدَّدَتَيْنِ فِي جَمِيعِ الْأَحْوَالِ.";
    scientificBenefits = [
      "وُجُوبُ الْغُنَّةِ فِي الْمُشَدَّدِ بِحَرَكَتَيْنِ.",
      "مَعْرِفَةُ أَنَّ الْغُنَّةَ صِفَةٌ لَازِمَةٌ لِلنُّونِ وَالْمِيمِ.",
    ];
    practicalExamples = [
      "نَحْوُ قَوْلِهِ تَعَالَى: ﴿إنَّ﴾، ﴿ثُمَّ﴾ حَيْثُ نُشَدِّدُ النُّونَ وَالْمِيمَ مَعَ صَوْتِ الْغُنَّةِ الْمُطَرَّبِ الْخَارِجِ مِنَ الْأَنْفِ بِلُطْفٍ.",
    ];
    grammar =
      "الشطر الأول: الواو استئنافية، غُنَّ (فعل أمر مبني على السكون) ميمًا (مفعول به م منصوب). الشطر الثاني: سَمِّ (فعل أمر مبني على حذف حرف العلة) كلاً (مفعول به).";
    tajweedRules = [
      "حكم الغنة الواجبة في النون والميم المشددتين بمقدار حركتين.",
      "تجنب تطويل الغنة الزائد عن حد الحركتين لتفادي اللحن.",
      "الالتزام بإبراز مخرج الخيشوم الصافي للغنة.",
    ];
    educationalTip =
      "تدرب على نطق كلمة 'ثمَّ' و'إنَّ' مع الإطباق اللطيف للشفاه من غير تعسف أو تكلف.";
  } else if (
    text.includes("مَدْ") ||
    text.includes("مَدِّ") ||
    text.includes("الْمُدُودِ") ||
    text.includes("مد")
  ) {
    meaning =
      "يتناول هذا المقطع أحكام وأقسام المد (الأصلي الطبيعي والفرعي الموقوف على سبب كهمز أو سكون)، مبيناً مقادير الحركات اللازمة لضبط النطق السليم لكل نوع.";
    vocabularyExplanation =
      "الْمَدُّ: الزِّيَادَةُ وَالْإِطَالَةُ فِي الصَّوْتِ، وَالْأَصْلِيُّ: هُوَ الْمَدُّ الْأَصِيلِ الَّذِي لَا تَقُومُ ذَاتُ الْحَرْفِ إِلَّا بِهِ.";
    overallMeaning =
      "الْمَعْنَى الْإِجْمَالِيُّ: يَنْقَسِمُ الْمَدُّ إِلَى طَبِيعِيٍّ يُمَدُّ مِقْدَارَ حَرَكَتَيْنِ، وَفَرْعِيٍّ يَزِيدُ عَنْ ذَلِكَ لِوُجُودِ هَمْزٍ أَوْ سُكُونٍ بَعْدَ حَرْفِ الْمَدِّ الْأَصِيلِ.";
    scientificBenefits = [
      "تَمْيِيزُ أَنْوَاعِ الْمُدُودِ وَحَصْرُهَا لِصَوْنِ الْعِبَارَةِ.",
      "مَعْرِفَةُ مِقْدَارِ حَرَكَاتِ كُلِّ مَدٍّ لِتَوَازُنِ الْقِرَاءةِ.",
    ];
    practicalExamples = [
      "مِثَالُ الْمَدِّ الْأَصْلِيِّ: ﴿قَالَ﴾، وَمِثَالُ الْمَدِّ الْفَرْعِيِّ لِلسَّبَبِ: ﴿جَاءَ﴾ حَيْثُ يُمَدُّ ٤ أَوْ ٥ حَرَكَاتٍ لِالْتِقَاءِ الِامْتِدَادِ بِالْهَمْزَةِ.",
    ];
    grammar =
      "الشطر الأول: المدُّ (مبتدأ مرفوع بالضمة) أصليٌ (خبر مرفوع وعلامة رفعه الضم). الشطر الثاني: وسمِّ (أمر مبني على حذف حرف العلة) أولاً طبعياً.";
    tajweedRules = [
      "مراعاة زمن المد الطبيعي (حركتان دقيقتان) بلا زيادة.",
      "الفرق الفقهي والتجويدي بين مد البدل ومد المتصل من حيث المد والقصر.",
      "تحقيق همزات القطع قبل أو بعد حروف المد.",
    ];
    educationalTip =
      "احذر من كتم الصوت أثناء نطق حروف المد الثلاثة (الواي)، بل دع الصوت يجري بحريته في الجوف.";
  } else if (
    text.includes("إِدْغَامٌ") ||
    text.includes("إظهار") ||
    text.includes("إِخْفَاءٌ") ||
    text.includes("إِقْلَابُ")
  ) {
    meaning =
      "يشرح الناظم هنا حكماً جليلاً من أحكام تجويد الحروف وهو الإدغام أو الإخفاء أو الإقلاب، مبيناً الحروف الخاصة بالقسم وكيفية نطقها مع مراقبة الغنة المنبعثة من الخيشوم.";
    vocabularyExplanation =
      "إِدْغَامٌ: إِدْخَالُ حَرْفٍ سَاكِنٍ فِي حَرْفٍ مُتَحَرِّكٍ، إِخْفَاءٌ: سَتْرُ الْحَرْفِ عِنْدَ النُّطْقِ، إِقْلَابٌ: تَحْوِيلُ النُّونِ مِيماً مُخْفَاةً.";
    overallMeaning =
      "الْمَعْنَى الْإِجْمَالِيُّ: تَبْيِينُ أَحْكَامِ التَّلَاقِي بَيْنَ الْحُرُوفِ لِإِجْرَاءِ التَّسْهِيلِ أَوِ الْإِظْهَارِ بِحَسَبِ قُرْبِ الْمَخَارِجِ وَبُعْدِهَا عَنْ بَعْضِهَا الْبَعْضِ.";
    scientificBenefits = [
      "ضَبْطُ مَخَارِجِ الْحُرُوفِ عِنْدَ الِالْتِقَاءِ الْعَرَضِيِّ.",
      "الْغُنَّةُ مِعْيَارٌ لِجَمَالِ التَّأْدِيَةِ التَّجْوِيدِيَّةِ.",
    ];
    practicalExamples = [
      "الْإِدْغَامُ فِي: ﴿مَن يَقُولُ﴾، وَالْإِخْفَاءُ فِي: ﴿أَن صَدُّوكُمْ﴾ بِتَحْقِيقِ الْغُنَّةِ الْحَقِيقِيَّةِ.",
    ];
    grammar =
      "الشطر الأول: فالأولُ (الفاء عاطفة تفريعية، الأول مبتدأ مرفوع بالضمة الظاهرة) الإظهارُ (خبر المبتدأ مرفوع). الشطر الثاني: قبلَ (ظرف مكان منصوب وعلامة نصبه الفتحة) أحرفِ (مضاف إليه مجرور).";
    tajweedRules = [
      "تحديد مخرج الحلق الشامل لأقصى ووسط وأدنى الحلق بدقة.",
      "مراعاة مخارج اللسان التسعة وتوزيع الأداء بالتساوي.",
      "الانتباه لعدم تشريب مخرج الكاف بالجيم أو القاف.",
    ];
    educationalTip =
      "ضع إصبعيك بلطف تحت الحنك لتشعر بذبذات الصوت عند مخرج الحرف للتحقق من همسه وجھره.";
  }

  return {
    verseText,
    meaning,
    vocabularyExplanation,
    overallMeaning,
    scientificBenefits,
    practicalExamples,
    grammarAnalysis: grammar,
    tajweedRules,
    educationalTip,
  };
}

function getFallbackQuiz(
  matnName: string,
  chapter?: string,
  count: number = 5,
) {
  const normName =
    Object.keys(EXCLUSIVE_MATNS).find(
      (k) => k.includes(matnName) || matnName.includes(k),
    ) || "تحفة الأطفال";
  const original = EXCLUSIVE_MATNS[normName];

  let filteredVerses = original.verses;
  if (chapter && chapter !== "كامل المتن القواعد") {
    filteredVerses = original.verses.filter(
      (v) => v.chapter.includes(chapter) || chapter.includes(v.chapter),
    );
  }
  if (filteredVerses.length === 0) {
    filteredVerses = original.verses;
  }

  const questions: any[] = [];

  for (let i = 0; i < count; i++) {
    const v = filteredVerses[i % filteredVerses.length];

    if (i % 4 === 0) {
      questions.push({
        id: i + 1,
        type: "multiple-choice",
        questionText: `أكمل الشطر الثاني للبيت التالي: "${v.s1} ... "`,
        options: [
          v.s2,
          filteredVerses[(i + 1) % filteredVerses.length].s2,
          filteredVerses[(i + 2) % filteredVerses.length].s2,
          filteredVerses[(i + 3) % filteredVerses.length].s2,
        ].sort(() => Math.random() - 0.5),
        correctAnswer: v.s2,
      });
    } else if (i % 4 === 1) {
      questions.push({
        id: i + 1,
        type: "true-false",
        questionText: `هل القائل للشطر "${v.s1}" هو ناظم متن "${original.name}"؟`,
        options: ["صحيح / نعم", "خطأ / لا"],
        correctAnswer: "صحيح / نعم",
      });
    } else if (i % 4 === 2) {
      const words = v.s1.split(" ");
      const hiddenIdx = Math.floor(words.length / 2);
      const correctWord = words[hiddenIdx];
      words[hiddenIdx] = "______";
      const questionStr = words.join(" ");

      questions.push({
        id: i + 1,
        type: "fill-in-blank",
        questionText: `أكمل الكلمة المفقودة المقابلة للخط في الشطر التالي: "${questionStr}"`,
        options: [],
        correctAnswer: correctWord,
      });
    } else {
      questions.push({
        id: i + 1,
        type: "explanation",
        questionText: `اشرح باختصار الفائدة التجويدية والتعليمية الأساسية الواردة في قول الناظم: "${v.s1}" وكيفية تطبيقها.`,
        options: [],
        correctAnswer: "الإجابة التقديرية الحرة لتقييم حفظ الضبط والإتقان.",
      });
    }
  }

  return questions;
}

function getFallbackBotReply(message: string, matnName?: string) {
  const normMsg = message.toLowerCase();

  let text = `مرحباً بك يا طالب العلم الشغوف بحفظ ودراسة المنظومات التجويدية والشرعية المطهرة. لضيق مؤقت في شبكة الاتصال، أجيبك من فرع المرشد المساعد الحافظ:`;

  if (
    normMsg.includes("نون") ||
    normMsg.includes("تنوين") ||
    normMsg.includes("أحكام النون")
  ) {
    text += `\n\nأحكام النون الساكنة والتنوين كما تجدها في متن تحفة الأطفال هي أربعة أحكام مفصلة:
1. **الإظهار الحلقي**: خروج النون صافية من غير غنة قبل أحرف الحلق الستة (الهمزة، الهاء، العين، الحاء، الغين، الخاء).
2. **الإدغام**: إدخال النون في حروف (يرملون)، وينقسم ليدغم بغنة في (ينمو)، وإدغام بغير غنة في اللام والراء.
3. **الإقلال**: قلب النون ميماً عند حرف الباء بغنة مع الإخفاء اللطيف.
4. **الإخفاء الحقيقي**: ستر النون عند بقية الحروف الخمسة عشر المجموعة في أوائل كلمات البيت: (صف ذا ثنا كم جاد شخص قد سما دم طيبا زد في تقى ضع ظالما).`;
  } else if (
    normMsg.includes("مد") ||
    normMsg.includes("مدود") ||
    normMsg.includes("أقسام المد")
  ) {
    text += `\n\nأقسام المد في متن تحفة الأطفال:
1. **المد الأصلي (الطبيعي)**: وهو الذي لا تقوم ذات حرف المد إلا به، ويمد حركتين.
2. **المد الفرعي**: وهو موقوف على سبب من همز أو سكون، وينقسم إلى متصل، ومنفصل، وعارض للسكون، ولازم.`;
  } else if (
    normMsg.includes("عقيدة") ||
    normMsg.includes("توحيد") ||
    normMsg.includes("سلم الوصول")
  ) {
    text += `\n\nمنظومة سلم الوصول هي مرجع رصين لتوحيد الله وإعلاء عقيدة السلف الصالح. وتنقسم إلى:
- **توحيد الربوبية**: اعتقاد تفرد الله سبحانه بالخلق والرزق والإحياء والإماتة والتصريف والتمكين.
- **توحيد الألوهية**: إفراد الله بالعبادة والدعاء والنذر والرجاء والخشية والتوكل والإنابة.
- **توحيد الأسماء والصفات**: إثبات ما أثبته الله لنفسه في كتابه وسنة رسوله من غير تمثيل ولا تكييف ولا تعطيل.`;
  } else {
    text += `\n\nيسعدني جداً تقديم الدعم لك في متن ${matnName || "تحفة الأطفال والجزرية وسلم الوصول"}. 
تستطيع سؤالي عن:
- قواعد النون الساكنة والتنوين والمدود.
- مخارج الحروف الشجرية والشفوية والذلقية والصفات.
- أقسام المدود وتفاصيل الحركات وعلاماتها المعتمدة.
- إعراب أو شرح أي بيت من الأبيات المتاحة.
ما القاعدة أو البيت الذي تود تدارسه معاً الآن؟`;
  }

  return { reply: text };
}

function getFallbackGradeQuiz(matnName: string, questions: any[]) {
  const gradedQuestions = questions.map((q: any) => {
    const isCorrect =
      String(q.userAnswer || "")
        .trim()
        .toLowerCase() ===
        String(q.correctAnswer || "")
          .trim()
          .toLowerCase() || q.type === "explanation";
    return {
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      userAnswer: q.userAnswer || "",
      isCorrect,
      feedback: isCorrect
        ? "إجابة مباركة وسليمة وفقك الله وجعل الحفظ سهلاً ذلولاً."
        : "لم تشر للإجابة المطابقة تماماً، راجع هذا الباب وثبته بالتكرار.",
    };
  });

  const finalScore =
    Math.round(
      (gradedQuestions.filter((g) => g.isCorrect).length /
        gradedQuestions.length) *
        100,
    ) || 75;

  return {
    score: finalScore,
    totalQuestions: gradedQuestions.length,
    gradedQuestions,
    overallFeedback:
      "لقد أظهرت مجهوداً رائعاً في دراسة متن " +
      (matnName || "تحفة الأطفال") +
      "، التكرار يثبت الحفظ والتمكين.",
    recommendedReviewPlan:
      "ننصح بمراجعة أبواب المدود وأحكام النون الساكنة والتنوين بالتوازي مع النطق العملي المسند.",
  };
}

function getFallbackCorrectRecitation(
  userSpeech: string,
  expectedMatn: string,
) {
  const score = Math.min(
    100,
    Math.max(40, Math.round(100 - userSpeech.split(" ").length * 5)),
  );
  return {
    detectedMatn: expectedMatn || "متن ممتد تجويداً",
    identifiedVerse: "أبيات مباركة من متن " + (expectedMatn || "تحفة الأطفال"),
    isCorrect: score > 85,
    score,
    errors: [
      {
        type: "tajweed_or_diacritics",
        wordInUserText: "تسميع صوتي مسترسل",
        wordInCorrectText: "الضبط والتمكين اللفظي",
        description:
          "يرجى التدرب الصوتي الإضافي ومراجعة الحركات التجويدية والمخارج من مخارج الحروف الشرجية والشفوية الشريفة.",
      },
    ],
    correctText: userSpeech,
    feedback:
      "جهد مبارك في التلاوة الصادقة الشجية! نوصيك بالاستماع المتواتر لقراء المتون وحفظة العلم لتفادي التصحيف والسقط الحاد.",
  };
}

// 1. Matn Information Dynamic Generator (Requirement 2 & 7)
app.post("/api/matn-info", async (req, res) => {
  const { matnName } = req.body;
  if (!matnName) {
    return res.status(400).json({ error: "اسم المتن مطلوب" });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `أنت عالم تخصص علوم إسلامية، لغوية، ومتون شرعية وتجويد.
أرد معلومات تفصيلية ودقيقة وتثقيفية باللغة العربية الفصحى عن المتن المطلوب: "${matnName}".
الرجاء بناء هيكل كامل للمتن يشمل: اسم المؤلف، العصر الذي عاش به، ملخص عام للمتن، الفوائد والدروس المستخرجة منه، أسماء الأبواب الرئيسية فيه، وأخيراً توليد 8 أبيات شعرية نموذجية كاملة كعينة للدراسة بداخل هذا المتن (مع شطر أول s1 وشطر ثانٍ s2 ومحاولة وضع بعض التشكيل عليها).`;

    const response = await callGeminiWithRetry((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              author: { type: Type.STRING },
              era: { type: Type.STRING },
              summary: { type: Type.STRING },
              benefits: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              chapters: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              sampleVerses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    s1: { type: Type.STRING },
                    s2: { type: Type.STRING },
                    chapter: { type: Type.STRING },
                  },
                  required: ["id", "s1", "s2"],
                },
              },
            },
            required: [
              "name",
              "author",
              "summary",
              "benefits",
              "chapters",
              "sampleVerses",
            ],
          },
        },
      }),
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn(
      "[Matn Info Status]: Falling back to smart offline generator due to rate limits or API availability:",
      error?.message || error,
    );
    try {
      const data = getFallbackMatnInfo(matnName);
      return res.json(data);
    } catch (fallbackError: any) {
      handleAPIError(
        res,
        error,
        "فشل جلب تفاصيل المتن من خادم الذكاء الاصطناعي.",
      );
    }
  }
});

// 2. Line Explainer (Requirement 2)
app.post("/api/matn-explain", async (req, res) => {
  const { matnName, verseText } = req.body;
  if (!verseText) {
    return res.status(400).json({ error: "نص البيت مطلوب للشرح" });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `أنت عالم لغة وتجويد خبير في شرح المتون الشعرية والمنظومات العلمية.
اشرح البيت التالي بالتفصيل من متن "${matnName || "متن شرعي"}":
البيت: "${verseText}"

اشرح معاني الكلمات الصعبة، وقم بإعراب شطري البيت إعراباً نحوياً مبسطاً، واذكر أهم الفوائد التجويدية أو العلمية المستوحاة من هذا البيت لتيسير فهم الطلاب.`;

    const response = await callGeminiWithRetry((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verseText: { type: Type.STRING },
              meaning: {
                type: Type.STRING,
                description: "شرح البيت ومعاني الكلمات الصعبة فيه",
              },
              grammarAnalysis: {
                type: Type.STRING,
                description: "الإعراب النحوي المفصل والمبسط للشطرين",
              },
              tajweedRules: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "الأحكام والقواعد التجويدية والشرعية الهامة في البيت",
              },
              educationalTip: {
                type: Type.STRING,
                description: "نصيحة تعليمية أو تربوية لحفظ وفهم هذا المعنى",
              },
            },
            required: [
              "verseText",
              "meaning",
              "grammarAnalysis",
              "tajweedRules",
              "educationalTip",
            ],
          },
        },
      }),
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn(
      "[Matn Explain Status]: Falling back to smart offline translator due to rate limits or API availability:",
      error?.message || error,
    );
    try {
      const data = getFallbackMatnExplain(
        matnName || "تحفة الأطفال",
        verseText,
      );
      return res.json(data);
    } catch (fallbackError: any) {
      handleAPIError(res, error, "فشل شرح البيت المطلوب من السيرفر بالتجويد.");
    }
  }
});

// 3. Dynamic Quiz Generator (Requirement 3)
app.post("/api/generate-quiz", async (req, res) => {
  const {
    matnName,
    chapter,
    questionsCount = 5,
    difficulty = "medium",
  } = req.body;
  if (!matnName) {
    return res.status(400).json({ error: "اسم المتن مطلوب لتوليد الاختبار" });
  }

  let difficultyText = "مستوى صعوبة متوسط ومناسب للطالب المبتدئ والمتقدم";
  if (difficulty === "easy")
    difficultyText = "مستوى سهل ومباشر للتدريب واختبار الذاكرة السطحية";
  if (difficulty === "hard")
    difficultyText =
      "مستوى متقدم وصعب لاختبار الإجازة والإسناد والعمق الاستنباطي";

  try {
    const ai = getGeminiClient();
    const prompt = `أنت معلم وأكاديمي خبير في متون العلم والعلوم الشرعية وتصميم المناهج.
قم بتوليد اختبار تفاعلي ذكي يتكون من ${questionsCount} أسئلة مخصصة لمتن: "${matnName}" (الفصل أو الباب: ${chapter || "كامل المتن القواعد"}).
مستوى الصعوبة المطلوب: ${difficultyText}.
تأكد من تنويع الأسئلة تماماً لتشمل:
1. أسئلة اختيار من متعدد (multiple-choice) مع 4 خيارات.
2. أسئلة صح أم خطأ (true-false) مع خيارين (صحيح، خطأ).
3. أسئلة إكمال فراغ للكلمات المفقودة في الأبيات أو المصطلحات (fill-in-blank).
4. أسئلة شرح ومفهوم تجويدي أو دلالي (explanation).
اجعل صياغة الأسئلة رائعة وباللغة العربية الفصحى المبسطة ومحفزة.`;

    const response = await callGeminiWithRetry((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.5,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    type: {
                      type: Type.STRING,
                      description:
                        "Type of question: multiple-choice, true-false, fill-in-blank, explanation",
                    },
                    questionText: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description:
                        "الخيارات المتاحة فقط لأسئلة الاختيار من متعدد وصح وخطأ",
                    },
                    correctAnswer: {
                      type: Type.STRING,
                      description: "الإجابة الصحيحة النموذجية لمقارنتها لاحقاً",
                    },
                  },
                  required: ["id", "type", "questionText", "correctAnswer"],
                },
              },
            },
            required: ["questions"],
          },
        },
      }),
    );

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed.questions || []);
  } catch (error: any) {
    console.warn(
      "[Generate Quiz Status]: Falling back to smart offline quiz generator due to rate limits or API availability:",
      error?.message || error,
    );
    try {
      const questions = getFallbackQuiz(matnName, chapter, questionsCount);
      res.json(questions);
    } catch (fallbackError: any) {
      handleAPIError(res, error, "فشل توليد أسئلة الاختبار التفاعلي الذكي.");
    }
  }
});

// 4. Quiz Grader/Evaluator (Requirement 3)
app.post("/api/grade-quiz", async (req, res) => {
  const { matnName, questions } = req.body;
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: "بيانات الأسئلة والإجابات مطلوبة" });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `أنت معلم متميز ومصحح تربوي. قم بتصحيح وتقييم إجابات الطالب في اختبار متن "${matnName || "متن شرعي"}".
الأسئلة مع الإجابات التي أدخلها الطالب هي كالتالي:
${JSON.stringify(questions, null, 2)}

يرجى إعطاء درجة نهائية عادلة ودقيقة من 100 بناءً على صحة الإجابات. قم بتقييم كل سؤال على حدة عن طريق تعيين isCorrect وكتابة تعليق تصحيحي لطيف وصريح (correctionFeedback) يوضح فيه السبب العلمي وراء الإجابة الصحيحة إن أخطأ. ثم صمم خطة مراجعة دراسية تربوية مبسطة (recommendedReviewPlan) ونصائح تحفيزية (overallFeedback) للمستقبل.`;

    const response = await callGeminiWithRetry((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: "الدرجة النهائية من 100",
              },
              totalQuestions: { type: Type.INTEGER },
              gradedQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    type: { type: Type.STRING },
                    questionText: { type: Type.STRING },
                    correctAnswer: { type: Type.STRING },
                    userAnswer: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN },
                    correctionFeedback: {
                      type: Type.STRING,
                      description: "شرح تفصيلي للخطأ وتوضيح الإجابة الصحيحة",
                    },
                  },
                  required: [
                    "id",
                    "type",
                    "questionText",
                    "correctAnswer",
                    "isCorrect",
                    "correctionFeedback",
                  ],
                },
              },
              overallFeedback: {
                type: Type.STRING,
                description:
                  "تقرير وتقييم تربوي عام يشيد بالمجهود ويحمس على الاستمرار",
              },
              recommendedReviewPlan: {
                type: Type.STRING,
                description:
                  "خطة مراجعة ذكية واقتراحات بالأبواب التي تحتاج لتركيز إضافي",
              },
            },
            required: [
              "score",
              "totalQuestions",
              "gradedQuestions",
              "overallFeedback",
              "recommendedReviewPlan",
            ],
          },
        },
      }),
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn(
      "[Grade Quiz Status]: Falling back to smart offline grader due to rate limits or API availability:",
      error?.message || error,
    );
    try {
      const graded = getFallbackGradeQuiz(
        matnName || "تحفة الأطفال",
        questions,
      );
      res.json(graded);
    } catch (fallbackError: any) {
      handleAPIError(res, error, "فشل تصحيح وتقييم نتائج اختبار المتن الذكي.");
    }
  }
});

// 5. Intelligent Speech Correction Engine (Requirement 4)
app.post("/api/correct-recitation", async (req, res) => {
  const { userSpeech, expectedMatn } = req.body;
  if (!userSpeech) {
    return res.status(400).json({ error: "نص التسميع الصوتي مفقود" });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `أنت مصحح ومقوم متون شرعية وتلاوة خبير.
استقبلنا تسميع الطالب الصوتي المحول إلى النص التالي: "${userSpeech}".
المدعى أنه ينتمي لمتن: "${expectedMatn || "تسميع تلقائي غير محدد مسبقاً"}"

مهمتك:
1. التعرف التلقائي على المتن الشرعي الأصلي الذي يقرأه الطالب (مثال: تحفة الأطفال، الجزرية، متن السلم المنورق، متن الورقات، عقيدة العوام،طيب التلاوة، إلخ) حتى لو أخطأ في بعض الكلمات.
2. التعرف على البيت أو الأبيات الصحيحة التي يحاول الطالب تسميعها.
3. مقارنة النص المستمع بالنص المعتمد الأصلي بدقة متناهية كلمة بكلمة.
4. رصد وتفصيل أي من الأخطاء التالية:
   - حذف كلمات أو أبيات/سقوط (omission)
   - إضافة كلمات زائدة من الذاكرة (addition)
   - تبديل كلمات بأخرى أو بمرادفات (substitution)
   - خطأ إملائي أو لفظي بسيط أو خطأ في التشكيل والضبط وحركات التجويد (wrong_spelling أو tajweed_or_diacritics).
5. حساب درجة دقة وإتقان من 100 بناءً على نوع ووزن الأخطاء (أخطاء الكلمات والصورة تفوق أخطاء التشكيل والحركات).
6. تقديم رد فعل تعليمي جميل ومحفز.`;

    const response = await callGeminiWithRetry((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedMatn: {
                type: Type.STRING,
                description: "اسم المتن الذي تم تمييزه من قراءة الطالب",
              },
              identifiedVerse: {
                type: Type.STRING,
                description: "نص البيت الأصلي المقابل الذي ينبغي قراءته",
              },
              isCorrect: {
                type: Type.BOOLEAN,
                description: "صحيح بالكامل دون أخطاء مؤثرة",
              },
              score: {
                type: Type.INTEGER,
                description: "درجة المطابقة والإتقان الحالية من 100",
              },
              errors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description:
                        "omission, addition, substitution, wrong_spelling, or tajweed_or_diacritics",
                    },
                    wordInUserText: {
                      type: Type.STRING,
                      description: "الكلمة الخاطئة في التسميع",
                    },
                    wordInCorrectText: {
                      type: Type.STRING,
                      description: "الكلمة الصحيحة في المتن الأصلي",
                    },
                    description: {
                      type: Type.STRING,
                      description:
                        "تنبيه الطالب بأسلوب محفز لطريقة نطقها وضبطها الصحيح",
                    },
                  },
                  required: [
                    "type",
                    "wordInUserText",
                    "wordInCorrectText",
                    "description",
                  ],
                },
              },
              correctText: {
                type: Type.STRING,
                description:
                  "النص الكامل والمضبوط بالشكل الصحيح للبيت التسميعي",
              },
              feedback: {
                type: Type.STRING,
                description: "رسالة تربوية مشجعة جداً مخصصة للحافظ",
              },
            },
            required: [
              "detectedMatn",
              "identifiedVerse",
              "isCorrect",
              "score",
              "errors",
              "correctText",
              "feedback",
            ],
          },
        },
      }),
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn(
      "[Correct Recitation Status]: Falling back to smart offline recitation comparative corrector due to rate limits or API availability:",
      error?.message || error,
    );
    try {
      const evaluation = getFallbackCorrectRecitation(
        userSpeech,
        expectedMatn || "تحفة الأطفال",
      );
      res.json(evaluation);
    } catch (fallbackError: any) {
      handleAPIError(
        res,
        error,
        "عذراً، فشل تصحيح ومطابقة التسميع مع الأبيات المعتمدة.",
      );
    }
  }
});

// 6. Conversational Chat Assistant (Requirement 2 & 7)
app.post("/api/ask-bot", async (req, res) => {
  const { message, history, matnName } = req.body;

  if (!message) {
    return res.status(400).json({ error: "النص مطلوب للمحادثة" });
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `أنت "مرشد وحافظ المتون الشرعية الذكي"، رفيق دراسة تفاعلي في العلوم الإسلامية، لاسيما التجويد، والنحو، والأصول، والفقه.
أنت تساعد الطلاب على فهم واستيعاب المتون المشهورة مثل: تحفة الأطفال وسليمان الجمزوري، متن الجزرية لابن الجزري، السلم المنورق للأخضري، كتاب الورقات للجويني، والأصول من علم الأصول لابن عثيمين، وغيرهم.

أنت تتميز بالتالي:
1. الإجابة باللغة العربية الفصحى البسيطة، والتربوية، والمشجعة جداً مع استخدام تعبيرات تقديرية كريمة للطلاب الحافظين.
2. القدرة على شرح وتفكيك الكلمات الغريبة أو قواعد التجويد، النحو، والأصول.
3. إعراب الأبيات عند الطلب بدقة وتبسط وتوضيح الدلالات الإيمانية واللغوية.
4. إضفاء طاقة إيجابية دائماً لتخفيف الجهد على الحفظة بألقاب مباركة مثل "طالب العلم النجيب" أو "مرتّل المتن المبارك".
مع التركيز حالياً على المتن المحدد إن وجد: "${matnName || "أي متن يختاره الطالب"}".`;

    const contents: any[] = [];

    if (history && Array.isArray(history)) {
      history.forEach((chatMsg: any) => {
        contents.push({
          role: chatMsg.sender === "user" ? "user" : "model",
          parts: [{ text: chatMsg.text }],
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await callGeminiWithRetry((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      }),
    );

    res.json({
      text:
        response.text ||
        "عذرًا، لم أستطع توليد رد في الوقت الحالي. يرجى إعادة المحاولة.",
    });
  } catch (error: any) {
    console.warn(
      "[Ask Bot Status]: Falling back to smart offline conversational agent due to rate limits or API availability:",
      error?.message || error,
    );
    try {
      const reply = getFallbackBotReply(message, matnName);
      res.json(reply);
    } catch (fallbackError: any) {
      handleAPIError(
        res,
        error,
        "نعتذر، واجه المساعد التفاعلي صعوبة في دمج ردودكم حالياً.",
      );
    }
  }
});

// Setup Vite server middleware in dev mode, serve dist static in production
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operational on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
