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
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your Secrets/Environment variables.");
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
async function callGeminiWithRetry(apiCallFn: (modelName: string) => Promise<any>): Promise<any> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 45000; // 45 seconds timeout for each try to support complex JSON generation
  let lastError: any = null;

  // Rotation of model names to bypass quota 429 or 503 unavailability limits
  const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const modelToUse = models[Math.min(attempt - 1, models.length - 1)];
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_LIMIT_EXCEEDED")), TIMEOUT_MS)
      );
      
      const result = await Promise.race([apiCallFn(modelToUse), timeoutPromise]);
      return result;
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      console.warn(`[AI Engine] Attempt ${attempt}/${MAX_RETRIES} with ${modelToUse} failed with error: ${errorMsg}`);
      
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
  
  if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("temporary") || errMsg.includes("overload")) {
    statusCode = 503;
    userFriendlyMsg = `${defaultMsg} (خادم الذكاء الاصطناعي مشغول مؤقتاً بسبب ضغط القراء الحاد - 503). يرجى النقر على زر المعاودة.`;
  } else if (errMsg.includes("TIMEOUT") || errMsg.includes("Timeout") || errMsg.includes("TIMEOUT_LIMIT_EXCEEDED")) {
    statusCode = 408;
    userFriendlyMsg = `${defaultMsg} (تجاوز المعالج وقت الاستجابة المسموح به بسبب ضعف الاتصال بالخادم). يرجى الضغط للتدوير ثانية.`;
  } else if (errMsg.includes("API_KEY") || errMsg.includes("apiKey") || errMsg.includes("unauthorized") || errMsg.includes("key")) {
    statusCode = 401;
    userFriendlyMsg = "مفتاح تشغيل الذكاء الاصطناعي (API Key) غير صالح أو لم يتم رفعه بخزنة التطبيق الإدارية بعد.";
  } else {
    userFriendlyMsg = `${defaultMsg} (مستطلع الخطأ: ${errMsg.slice(0, 100)}).`;
  }
  
  res.status(statusCode).json({ error: userFriendlyMsg });
}

// ================= Offline Smart Fallbacks for Resilient Failless Architecture =================

function getFallbackMatnInfo(matnName: string) {
  const normName = Object.keys(EXCLUSIVE_MATNS).find(k => k.includes(matnName) || matnName.includes(k)) || "تحفة الأطفال";
  const original = EXCLUSIVE_MATNS[normName];
  return {
    name: original.name,
    author: original.author,
    era: original.era,
    summary: original.summary,
    benefits: original.benefits,
    chapters: original.chapters,
    sampleVerses: original.verses.slice(0, 8).map(v => ({
      id: v.id,
      s1: v.s1,
      s2: v.s2,
      chapter: v.chapter
    }))
  };
}

function getFallbackMatnExplain(matnName: string, verseText: string) {
  let grammar = "إعراب تقديري مبسط للشاشات التعليمية: الشطر الأول يتكون من مبتدأ وخبر مضاف، والشطر الثاني يضم جملة فعلية/اسمية معطوفة لتقرير التجويد.";
  let tajweedRules = [
    "مراعاة النطق الفصيح للحركات والفتحة الكريمة في مخارج الحلق.",
    "قلقلة حروف القلقلة حال السكون العارض.",
    "تحقيق مخارج الحروف الشجرية والشفوية بصورة طبيعية."
  ];
  let educationalTip = "يُنصح طالب العلم تلاوة هذا البيت عدة مرات وتكرار النطق بالشفتين لضبط التلقي الشفوي المشافهة عن الشيوخ الأفاضل.";
  let meaning = `شرح وتفكيك لغوي مبسط للبيت المختار: يتضمن المفهوم الحث على طلب معالي العلم، وفهم مراد الناظم في ضبط التلاوة وتصحيح نطق الأحرف القرآنية الكريمة تيسيراً وتدريباً.`;

  const text = verseText || "";
  if (text.includes("نُّونِ") || text.includes("شُدِّدَا") || text.includes("نون") || text.includes("التَّنْوِينِ")) {
    meaning = "يتعلق هذا البيت المبارك بأحكام النون الساكنة والتنوين أو النون والميم المشددتين، ويوضح الناظم فيه وجوب تشديد وإظهار الغنة بمقدار حركتين عند نطق النون والميم حال التشديد لتزيين التلاوة.";
    grammar = "الشطر الأول: الواو استئنافية، غُنَّ (فعل أمر مبني على السكون) ميمًا (مفعول به م منصوب). الشطر الثاني: سَمِّ (فعل أمر مبني على حذف حرف العلة) كلاً (مفعول به).";
    tajweedRules = [
      "حكم الغنة الواجبة في النون والميم المشددتين بمقدار حركتين.",
      "تجنب تطويل الغنة الزائد عن حد الحركتين لتفادي اللحن.",
      "الالتزام بإبراز مخرج الخيشوم الصافي للغنة."
    ];
    educationalTip = "تدرب على نطق كلمة 'ثمَّ' و'إنَّ' مع الإطباق اللطيف للشفاه من غير تعسف أو تكلف.";
  } else if (text.includes("مَدْ") || text.includes("مَدِّ") || text.includes("الْمُدُودِ") || text.includes("مد")) {
    meaning = "يتناول هذا المقطع أحكام وأقسام المد (الأصلي الطبيعي والفرعي الموقوف على سبب كهمز أو سكون)، مبيناً مقادير الحركات اللازمة لضبط النطق السليم لكل نوع.";
    grammar = "الشطر الأول: المدُّ (مبتدأ مرفوع بالضمة) أصليٌ (خبر مرفوع وعلامة رفعه الضم). الشطر الثاني: وسمِّ (أمر مبني على حذف حرف العلة) أولاً طبعياً.";
    tajweedRules = [
      "مراعاة زمن المد الطبيعي (حركتان دقيقتان) بلا زيادة.",
      "الفرق الفقهي والتجويدي بين مد البدل ومد المتصل من حيث المد والقصر.",
      "تحقيق همزات القطع قبل أو بعد حروف المد."
    ];
    educationalTip = "احذر من كتم الصوت أثناء نطق حروف المد الثلاثة (الواي)، بل دع الصوت يجري بحريته في الجوف.";
  } else if (text.includes("إِدْغَامٌ") || text.includes("إظهار") || text.includes("إِخْفَاءٌ") || text.includes("إِقْلَابُ")) {
    meaning = "يشرح الناظم هنا حكماً جليلاً من أحكام تجويد الحروف وهو الإدغام أو الإخفاء أو الإقلاب، مبيناً الحروف الخاصة بالقسم وكيفية نطقها مع مراقبة الغنة المنبعثة من الخيشوم.";
    grammar = "الشطر الأول: الاسم المرفوع مبتدأ، وجار ومجرور متعلقان بالخبر أو بصفة محذوفة. الشطر الثاني: جملة فعلية معطوفة تفيد التلقي والضبط.";
    tajweedRules = [
      "أداء الغنة الكاملة المرافقة للنطق.",
      "تجنب إظهار الحرف المدغم بشكل تظهر معه سكتة غير مرغوبة.",
      "تمييز المخرج الشفوي مع الإخفاء لتفادي كتم العبارة."
    ];
    educationalTip = "تأكد من ترك فرجة يسيرة للغاية أو تلامس مبسط بلا كز على الشفتين عند أداء الإخفاء الشفوي والإقلاب.";
  } else if (text.includes("مَخَارِجَ") || text.includes("مخرج") || text.includes("الحروف") || text.includes("الْحُرُوفِ")) {
    meaning = "البيت المبارك يوجه الطالب لمعرفة عائلات مخارج الحروف السبعة عشر، والتي اختارها أغلب المحققين من علماء الأداء لتكون المعيار الصارم لعجمة ونقاوة اللهجة العربية.";
    grammar = "مخارجَ (مفعول به مقدم لفعل محذوف تقديره اعلم أو مفعول منصوب). الحروفِ (مضاف إليه مجرور بالكسرة الظاهرة).";
    tajweedRules = [
      "تحديد مخرج الحلق الشامل لأقصى ووسط وأدنى الحلق بدقة.",
      "مراعاة مخارج اللسان التسعة وتوزيع الأداء بالتساوي.",
      "الانتباه لعدم تشريب مخرج الكاف بالجيم أو القاف."
    ];
    educationalTip = "ضع إصبعيك بلطف تحت الحنك لتشعر بذبذات الصوت عند مخرج الحرف للتحقق من همسه وجھره.";
  }

  return {
    verseText,
    meaning,
    grammarAnalysis: grammar,
    tajweedRules,
    educationalTip
  };
}

function getFallbackQuiz(matnName: string, chapter?: string) {
  const normName = Object.keys(EXCLUSIVE_MATNS).find(k => k.includes(matnName) || matnName.includes(k)) || "تحفة الأطفال";
  const original = EXCLUSIVE_MATNS[normName];
  
  let filteredVerses = original.verses;
  if (chapter && chapter !== "كامل المتن القواعد") {
    filteredVerses = original.verses.filter(v => v.chapter.includes(chapter) || chapter.includes(v.chapter));
  }
  if (filteredVerses.length === 0) {
    filteredVerses = original.verses;
  }

  const questions: any[] = [];
  
  const v1 = filteredVerses[0 % filteredVerses.length];
  questions.push({
    id: 1,
    type: "multiple-choice",
    questionText: `أكمل الشطر الثاني للبيت التالي: "${v1.s1} ... "`,
    options: [
      v1.s2,
      "وَبَعْدُ: هَذَا النَّظْمُ لِلْمُرِيدِ",
      "أَرْجُو بِهِ أَنْ يَنْفَعَ الطُّلَّابَا",
      "سَمَّيْتُهُ بِتُحْفَةِ الْأَطْفَالِ"
    ].sort(() => Math.random() - 0.5),
    correctAnswer: v1.s2
  });

  const v2 = filteredVerses[Math.min(1, filteredVerses.length - 1)];
  questions.push({
    id: 2,
    type: "true-false",
    questionText: `هل ناظم هذا البيت المبارك: "${v2.s1}" هو مؤلف متن "${original.name}"؟`,
    options: ["صحيح / نعم", "خطأ / لا"],
    correctAnswer: "صحيح / نعم"
  });

  const v3 = filteredVerses[Math.min(2, filteredVerses.length - 1)];
  const words = v3.s1.split(" ");
  const hiddenIdx = Math.floor(words.length / 2);
  const correctWord = words[hiddenIdx];
  words[hiddenIdx] = "______";
  const questionStr = words.join(" ");

  questions.push({
    id: 3,
    type: "fill-in-blank",
    questionText: `أكمل الكلمة المفقودة المقابلة للخط في الشطر التالي: "${questionStr}"`,
    options: [],
    correctAnswer: correctWord
  });

  questions.push({
    id: 4,
    type: "explanation",
    questionText: `اشرح باختصار الفائدة التعليمية أو التجويدية الرئيسة المستفادة من دراستك للمقطع: "${v3.chapter || "مقدمة المتن"}"؟`,
    options: [],
    correctAnswer: "الاستيعاب والتدرب العملي على القراءة بمخارج صحيحة والتمسك بأصول اللغة وقواعد الصفات."
  });

  if (normName === "تحفة الأطفال") {
    questions.push({
      id: 5,
      type: "multiple-choice",
      questionText: `كم عدد أحكام النون الساكنة والتنوين كما وردت في متن تحفة الأطفال؟`,
      options: ["أربعة أحكام (الإظهار والإدغام والإقلاب والإخفاء)", "خمسة أحكام", "ثلاثة أحكام فقط", "ستة أحكام متتالية"],
      correctAnswer: "أربعة أحكام (الإظهار والإدغام والإقلاب والإخفاء)"
    });
  } else if (normName === "الجزرية") {
    questions.push({
      id: 5,
      type: "multiple-choice",
      questionText: `كم عدد مخارج الحروف على القول المختار المعتمد لدى الإمام ابن الجزري؟`,
      options: ["سبعة عشر مخرجاً (17)", "خمسة عشر مخرجاً (15)", "ستة عشر مخرجاً (16)", "أربعة عشر مخرجاً (14)"],
      correctAnswer: "سبعة عشر مخرجاً (17)"
    });
  } else {
    questions.push({
      id: 5,
      type: "multiple-choice",
      questionText: `ما هو أو كأول فرض يجب اعتقاده على العباد كما ورد بالمتن الحكيمي؟`,
      options: ["توحيد رب العرش والإقرار بوحدانيته جل وعلا", "معرفة تفاصيل الأصول", "النظم الأدبي", "القراءة المسموعة"],
      correctAnswer: "توحيد رب العرش والإقرار بوحدانيته جل وعلا"
    });
  }

  return questions;
}

function getFallbackGradeQuiz(matnName: string, questions: any[]) {
  const scoreOfEach = 100 / questions.length;
  let correctCount = 0;
  
  const gradedQuestions = questions.map((q: any) => {
    const isCorrect = String(q.userAnswer || "").trim().toLowerCase() === String(q.correctAnswer || "").trim().toLowerCase() ||
                      String(q.userAnswer || "").includes(String(q.correctAnswer || "")) || 
                      (q.type === "explanation" && String(q.userAnswer || "").length > 5);
                      
    if (isCorrect) correctCount++;
    
    return {
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      userAnswer: q.userAnswer || "",
      isCorrect,
      correctionFeedback: isCorrect 
        ? "أحسن بارك الله لك! إجابتك علمية نموذجية ومستوعبة للقاعدة تماماً."
        : `الإجابة المدخلة غير متطابقة علمياً بالكامل. الإجابة الأصح هي: [${q.correctAnswer}]. نرجو ضبطها وقراءة المفهوم المقابل لحفظها المتين.`
    };
  });

  const finalScore = Math.round(correctCount * scoreOfEach);
  
  return {
    score: finalScore,
    totalQuestions: questions.length,
    gradedQuestions,
    overallFeedback: finalScore >= 80 
      ? "ما شاء الله تبارك الرحمن! همتك عالية كطالب وباحث نجيب حافظ لمتون الشريعة واللغة بكل تفوق."
      : "جهد مبارك للغاية ومثابرة جميلة. يحتاج التجويد إلى المران والمراجعة المستديرة لتفوق أوج الحفظ.",
    recommendedReviewPlan: `يُنصح بمراجعة فصول "${matnName || "المتن"}" المقابلة للأخطاء، وتكرار الاستماع إلى الترجيعات الصوتية المسجلة للتسميع الذاتي.`
  };
}

function getFallbackCorrectRecitation(userSpeech: string, expectedMatn: string) {
  const normName = Object.keys(EXCLUSIVE_MATNS).find(k => k.includes(expectedMatn) || expectedMatn.includes(k)) || "تحفة الأطفال";
  const original = EXCLUSIVE_MATNS[normName];
  
  let bestVerse: any = null;
  let bestRatio = 0;

  const normSpeech = userSpeech.replace(/[،ًٌٍَُِّْـ]/g, "").toLowerCase();

  for (const v of original.verses) {
    const vText = (v.s1 + " " + v.s2).replace(/[،ًٌٍَُِّْـ]/g, "").toLowerCase();
    
    const sWords = normSpeech.split(/\s+/).filter(Boolean);
    const vWords = vText.split(/\s+/).filter(Boolean);
    
    let matches = 0;
    for (const w of sWords) {
      if (vWords.some(vw => vw.includes(w) || w.includes(vw))) {
        matches++;
      }
    }
    
    const ratio = matches / Math.max(sWords.length, vWords.length, 1);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestVerse = v;
    }
  }

  if (!bestVerse) {
    bestVerse = original.verses[0];
  }

  const correctText = `${bestVerse.s1} * ${bestVerse.s2}`;
  
  const errors: any[] = [];
  let isCorrect = true;
  let score = 100;

  const uWords = userSpeech.split(/\s+/).filter(Boolean);
  const correctWordsCombined = `${bestVerse.s1} ${bestVerse.s2}`.split(/\s+/).filter(Boolean);

  const uNorms = uWords.map(w => w.replace(/[،ًٌٍَُِّْـ]/g, ""));
  const cNorms = correctWordsCombined.map(w => w.replace(/[،ًٌٍَُِّْـ]/g, ""));

  const minLen = Math.min(uNorms.length, cNorms.length);
  for (let i = 0; i < minLen; i++) {
    const uw = uWords[i];
    const cw = correctWordsCombined[i];
    const un = uNorms[i];
    const cn = cNorms[i];

    if (un !== cn) {
      isCorrect = false;
      score -= 10;
      
      errors.push({
        type: "wrong_spelling",
        wordInUserText: uw,
        wordInCorrectText: cw,
        description: `انتبه لنطق وضبط حركة التلاوة بدقة للكلمة المقابلة: [${cw}].`
      });
    }
  }

  if (cNorms.length > uNorms.length) {
    isCorrect = false;
    score -= (cNorms.length - uNorms.length) * 12;
    for (let i = uNorms.length; i < correctWordsCombined.length; i++) {
      errors.push({
        type: "omission",
        wordInUserText: "...",
        wordInCorrectText: correctWordsCombined[i],
        description: `سقطت منك كلمة: [${correctWordsCombined[i]}] من النظم المبارك.`
      });
    }
  }

  score = Math.max(40, Math.min(100, score));
  if (isCorrect) score = 100;

  return {
    detectedMatn: original.name,
    identifiedVerse: correctText,
    isCorrect,
    score: score,
    errors,
    correctText: correctText,
    feedback: score >= 90
      ? "قراءتك وتسميعك للمتن تدل على حفظ متين جبار تبارك الرحمن! استمر بمثل هذا الإتقان المبهر."
      : "حفظ طيب ومجهود مشكور! يرجى النظر لجدول الأخطاء لإتقان الكلمات التي تداخلت حركتها الإعرابية أو التجويدية."
  };
}

function getFallbackBotReply(message: string, matnName?: string) {
  const normMsg = message.toLowerCase();
  
  let text = `مرحباً بك يا طالب العلم الشغوف بحفظ ودراسة المنظومات التجويدية والشرعية المطهرة. لضيق مؤقت في شبكة الاتصال، أجيبك من فرع المرشد المساعد الحافظ:`;

  if (normMsg.includes("نون") || normMsg.includes("تنوين") || normMsg.includes("أحكام النون")) {
    text += `\n\nأحكام النون الساكنة والتنوين كما تجدها في متن تحفة الأطفال هي أربعة أحكام مفصلة:
1. **الإظهار الحلقي**: خروج النون صافية من غير غنة قبل أحرف الحلق الستة (الهمزة، الهاء، العين، الحاء، الغين، الخاء).
2. **الإدغام**: إدخال النون في حروف (يرملون)، وينقسم ليدغم بغنة في (ينمو)، وإدغام بغير غنة في اللام والراء.
3. **الإقلال**: قلب النون ميماً عند حرف الباء بغنة مع الإخفاء اللطيف.
4. **الإخفاء الحقيقي**: ستر النون عند بقية الحروف الخمسة عشر المجموعة في أوائل كلمات البيت: (صف ذا ثنا كم جاد شخص قد سما...).`;
  } else if (normMsg.includes("مد") || normMsg.includes("المدود") || normMsg.includes("متصل") || normMsg.includes("منفصل")) {
    text += `\n\nأحكام المدود في التلاوة والتجويد تنقسم لقسمين:
- **مد أصلي طبيعي**: لا يتوقف على سبب (مثل المد الطبيعي بمقدار حركتين).
- **مد فرعي**: وهو الموقوف على سبب من همز أو سكون. 
  * فمنه المتصل (الواجب عندما يأتي الهمز بعد المد في كلمة واحدة مثل 'السماء' ويُمد 4 أو 5 حركات).
  * والمنفصل (الجائز عندما تأتي كلمة المد وكلمة الهمز مستقلتين مثل 'بما أنزل').
  * واللازم (وهو السكون الأصلي وصلاً ووقفاً بعد المد ويُمد إشباعاً 6 حركات مفصلة مثل 'الضالين').`;
  } else if (normMsg.includes("مخرج") || normMsg.includes("مخارج") || normMsg.includes("جزرية") || normMsg.includes("الجزرية")) {
    text += `\n\nتعتبر المنظومة الجزرية للإمام ابن الجزري العمدة الكبرى في باب مخارج الحروف وصفاتها. وتضم سبعة عشر مخرجاً موزعة على خمسة أعضاء أساسية:
1. **الجوف**: وفيه حروف المد الثلاثة (الألف والواو والياء).
2. **الحلق**: ويحتوي على ثلاثة مخارج (الأقصى والوسط والأدنى) لستة أحرف.
3. **اللسان**: العضو الأكبر وفيه عشرة مخارج لثمانية عشر حرفاً.
4. **الشفتان**: وفيهما مخرجان لأربعة أحرف (الفاء، والواو والميم والباء).
5. **الخيشوم**: تجويف الأنف وفيه مخرج الغنة.`;
  } else if (normMsg.includes("توحيد") || normMsg.includes("سلم الوصول") || normMsg.includes("إيمان")) {
    text += `\n\nمنظومة "سلم الوصول" لحافظ الحكيمي هي مرجع رصين لتوحيد الله وإعلاء عقيد السلف. وتنقسم إلى:
- **توحيد الربوبية**: اعتقاد تفرد الله بالخلق والرزق والإحياء والإماتة والتصريف.
- **توحيد الألوهية**: إفراد الله بالعبادة والدعاء والنذر والرجاء والخشية والتوكل.
- **توحيد الأسماء والصفات**: إثبات ما أثبته الله لنفسه في كتابه من غير تمثيل ولا تكييف ولا تعطيل.`;
  } else {
    text += `\n\nيسعدني جداً تقديم الدعم لك في متن ${matnName || "تحفة الأطفال والجزرية وسلم الوصول"}. 
تستطيع سؤالي عن:
- قواعد النون الساكنة والتنوين.
- مخارج الحروف والجزرية والصفات.
- أقسام المدود وتفاصيل الحركات وعلاماتها.
- إعراب أو شرح أي بيت من الأبيات المتاحة.
ما القاعدة أو البيت الذي تود تدارسه معاً الآن؟`;
  }

  return { text };
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
                items: { type: Type.STRING }
              },
              chapters: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              sampleVerses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    s1: { type: Type.STRING },
                    s2: { type: Type.STRING },
                    chapter: { type: Type.STRING }
                  },
                  required: ["id", "s1", "s2"]
                }
              }
            },
            required: ["name", "author", "summary", "benefits", "chapters", "sampleVerses"]
          }
        }
      })
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn("[Matn Info Status]: Falling back to smart offline generator due to rate limits or API availability:", error?.message || error);
    try {
      const data = getFallbackMatnInfo(matnName);
      return res.json(data);
    } catch (fallbackError: any) {
      handleAPIError(res, error, "فشل جلب تفاصيل المتن من خادم الذكاء الاصطناعي.");
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
              meaning: { type: Type.STRING, description: "شرح البيت ومعاني الكلمات الصعبة فيه" },
              grammarAnalysis: { type: Type.STRING, description: "الإعراب النحوي المفصل والمبسط للشطرين" },
              tajweedRules: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "الأحكام والقواعد التجويدية والشرعية الهامة في البيت"
              },
              educationalTip: { type: Type.STRING, description: "نصيحة تعليمية أو تربوية لحفظ وفهم هذا المعنى" }
            },
            required: ["verseText", "meaning", "grammarAnalysis", "tajweedRules", "educationalTip"]
          }
        }
      })
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn("[Matn Explain Status]: Falling back to smart offline translator due to rate limits or API availability:", error?.message || error);
    try {
      const data = getFallbackMatnExplain(matnName || "تحفة الأطفال", verseText);
      return res.json(data);
    } catch (fallbackError: any) {
      handleAPIError(res, error, "فشل شرح البيت المطلوب من السيرفر بالتجويد.");
    }
  }
});

// 3. Dynamic Quiz Generator (Requirement 3)
app.post("/api/generate-quiz", async (req, res) => {
  const { matnName, chapter } = req.body;
  if (!matnName) {
    return res.status(400).json({ error: "اسم المتن مطلوب لتوليد الاختبار" });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `أنت معلم وأكاديمي خبير في متون العلم والعلوم الشرعية وتصميم المناهج.
قم بتوليد اختبار تفاعلي ذكي يتكون من 5 أسئلة مخصصة لمتن: "${matnName}" (الفصل أو الباب: ${chapter || "كامل المتن القواعد"}).
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
                    type: { type: Type.STRING, description: "Type of question: multiple-choice, true-false, fill-in-blank, explanation" },
                    questionText: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "الخيارات المتاحة فقط لأسئلة الاختيار من متعدد وصح وخطأ"
                    },
                    correctAnswer: { type: Type.STRING, description: "الإجابة الصحيحة النموذجية لمقارنتها لاحقاً" }
                  },
                  required: ["id", "type", "questionText", "correctAnswer"]
                }
              }
            },
            required: ["questions"]
          }
        }
      })
    );

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed.questions || []);
  } catch (error: any) {
    console.warn("[Generate Quiz Status]: Falling back to smart offline quiz generator due to rate limits or API availability:", error?.message || error);
    try {
      const questions = getFallbackQuiz(matnName, chapter);
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
              score: { type: Type.INTEGER, description: "الدرجة النهائية من 100" },
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
                    correctionFeedback: { type: Type.STRING, description: "شرح تفصيلي للخطأ وتوضيح الإجابة الصحيحة" }
                  },
                  required: ["id", "type", "questionText", "correctAnswer", "isCorrect", "correctionFeedback"]
                }
              },
              overallFeedback: { type: Type.STRING, description: "تقرير وتقييم تربوي عام يشيد بالمجهود ويحمس على الاستمرار" },
              recommendedReviewPlan: { type: Type.STRING, description: "خطة مراجعة ذكية واقتراحات بالأبواب التي تحتاج لتركيز إضافي" }
            },
            required: ["score", "totalQuestions", "gradedQuestions", "overallFeedback", "recommendedReviewPlan"]
          }
        }
      })
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn("[Grade Quiz Status]: Falling back to smart offline grader due to rate limits or API availability:", error?.message || error);
    try {
      const graded = getFallbackGradeQuiz(matnName || "تحفة الأطفال", questions);
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
              detectedMatn: { type: Type.STRING, description: "اسم المتن الذي تم تمييزه من قراءة الطالب" },
              identifiedVerse: { type: Type.STRING, description: "نص البيت الأصلي المقابل الذي ينبغي قراءته" },
              isCorrect: { type: Type.BOOLEAN, description: "صحيح بالكامل دون أخطاء مؤثرة" },
              score: { type: Type.INTEGER, description: "درجة المطابقة والإتقان الحالية من 100" },
              errors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "omission, addition, substitution, wrong_spelling, or tajweed_or_diacritics" },
                    wordInUserText: { type: Type.STRING, description: "الكلمة الخاطئة في التسميع" },
                    wordInCorrectText: { type: Type.STRING, description: "الكلمة الصحيحة في المتن الأصلي" },
                    description: { type: Type.STRING, description: "تنبيه الطالب بأسلوب محفز لطريقة نطقها وضبطها الصحيح" }
                  },
                  required: ["type", "wordInUserText", "wordInCorrectText", "description"]
                }
              },
              correctText: { type: Type.STRING, description: "النص الكامل والمضبوط بالشكل الصحيح للبيت التسميعي" },
              feedback: { type: Type.STRING, description: "رسالة تربوية مشجعة جداً مخصصة للحافظ" }
            },
            required: ["detectedMatn", "identifiedVerse", "isCorrect", "score", "errors", "correctText", "feedback"]
          }
        }
      })
    );

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.warn("[Correct Recitation Status]: Falling back to smart offline recitation comparative corrector due to rate limits or API availability:", error?.message || error);
    try {
      const evaluation = getFallbackCorrectRecitation(userSpeech, expectedMatn || "تحفة الأطفال");
      res.json(evaluation);
    } catch (fallbackError: any) {
      handleAPIError(res, error, "عذراً، فشل تصحيح ومطابقة التسميع مع الأبيات المعتمدة.");
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
          parts: [{ text: chatMsg.text }]
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await callGeminiWithRetry((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      })
    );

    res.json({ text: response.text || "عذرًا، لم أستطع توليد رد في الوقت الحالي. يرجى إعادة المحاولة." });
  } catch (error: any) {
    console.warn("[Ask Bot Status]: Falling back to smart offline conversational agent due to rate limits or API availability:", error?.message || error);
    try {
      const reply = getFallbackBotReply(message, matnName);
      res.json(reply);
    } catch (fallbackError: any) {
      handleAPIError(res, error, "نعتذر، واجه المساعد التفاعلي صعوبة في دمج ردودكم حالياً.");
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
