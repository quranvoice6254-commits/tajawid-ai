import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  User, 
  Loader2, 
  Sparkles, 
  MessageSquare, 
  PlusCircle, 
  Trash2, 
  BookOpen, 
  Plus, 
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { db, auth, isFirebaseReady, mockDb } from "../lib/firebase";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  matnName: string;
  lastUpdated: string;
}

interface SmartAssistantProps {
  matnName: string;
  user: any;
  onOpenChatExport?: (text: string) => void;
}

export default function SmartAssistant({ matnName, user, onOpenChatExport }: SmartAssistantProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load previous chat sessions on mount
  useEffect(() => {
    loadSessions();
  }, [user]);

  // Scroll to bottom whenever messages are populated
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const collectionName = "chat_sessions";
      let fetched: any[] = [];
      
      if (isFirebaseReady && db && !user?.isAnonymous) {
        // Safe Firestore fetching
        const { getDocs, collection, query, where, orderBy } = await import("firebase/firestore");
        const q = query(
          collection(db, collectionName),
          where("userId", "==", user?.uid || "local-id"),
          orderBy("lastUpdated", "desc")
        );
        const snapshot = await getDocs(q);
        fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        fetched = await mockDb.getCollection(collectionName);
        // Filter by current local user status
        fetched = fetched.filter((s: any) => s.userId === (user?.uid || "local-user"));
      }

      setSessions(fetched);
      if (fetched.length > 0) {
        setCurrentSessionId(fetched[0].id);
        loadMessages(fetched[0].id);
      } else {
        // Create first session by default
        createNewSession("جلسة حوار جديدة");
      }
    } catch (e) {
      console.error("Error loading chat sessions:", e);
      // Create first empty local session as backup
      createNewSession("مستشار تجاويد الذكي");
    }
  };

  const loadMessages = async (sid: string) => {
    try {
      const collectionName = `chat_messages`;
      let msgList: any[] = [];

      if (isFirebaseReady && db && !user?.isAnonymous) {
        const { getDocs, collection, query, where, orderBy } = await import("firebase/firestore");
        const q = query(
          collection(db, collectionName),
          where("sessionId", "==", sid),
          orderBy("timestamp", "asc")
        );
        const snapshot = await getDocs(q);
        msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        msgList = await mockDb.getCollection(collectionName);
        msgList = msgList.filter((m: any) => m.sessionId === sid);
        // Sort chronologically
        msgList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }

      setMessages(msgList);
    } catch (e) {
      console.error("Error loading messages:", e);
    }
  };

  const createNewSession = async (titleText?: string) => {
    setAddingSession(true);
    const title = titleText || `حوار حول متن - ${matnName}`;
    const payload = {
      title,
      matnName,
      userId: user?.uid || "local-user",
      lastUpdated: new Date().toISOString()
    };

    try {
      let createdId = "";
      if (isFirebaseReady && db && !user?.isAnonymous) {
        const { addDoc, collection } = await import("firebase/firestore");
        const docRef = await addDoc(collection(db, "chat_sessions"), payload);
        createdId = docRef.id;
      } else {
        const doc = await mockDb.addDocument("chat_sessions", payload);
        createdId = doc.id;
      }

      // Pre-add a welcome assistant msg
      const welcomePayload = {
        sessionId: createdId,
        sender: "bot",
        text: `أهلاً بك يا ${user?.displayName || "طالب العلم الفاضل"} في هذا المجلس الرفيع لمراجعة وتدارس متن "${matnName}". معك المساعد اللغوي الذكي لمنصة تجاويد، اطرح أسئلتك حول التجويد، أو معاني الأبيات، أو اطلب خطة دراسية لحفظ النظم وسأعينك فوراً!`,
        timestamp: new Date().toISOString()
      };

      if (isFirebaseReady && db && !user?.isAnonymous) {
        const { addDoc, collection } = await import("firebase/firestore");
        await addDoc(collection(db, "chat_messages"), welcomePayload);
      } else {
        await mockDb.addDocument("chat_messages", welcomePayload);
      }

      // Prepend to UI
      const newSess: ChatSession = { id: createdId, title, matnName, lastUpdated: payload.lastUpdated };
      setSessions(prev => [newSess, ...prev]);
      setCurrentSessionId(createdId);
      setMessages([{
        id: Math.random().toString(),
        sender: "bot",
        text: welcomePayload.text,
        timestamp: welcomePayload.timestamp
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingSession(false);
    }
  };

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تود حذف هذه الجلسة الحوارية بكامل أرشيفها؟")) return;

    try {
      if (isFirebaseReady && db && !user?.isAnonymous) {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "chat_sessions", sid));
        // Note: cascading delete typically done inside cloud functions, but we clean UI
      } else {
        const remaining = sessions.filter(s => s.id !== sid);
        localStorage.setItem("tajaweed_db_chat_sessions", JSON.stringify(remaining));
      }

      setSessions(prev => prev.filter(s => s.id !== sid));
      if (currentSessionId === sid) {
        setMessages([]);
        setCurrentSessionId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawMsgText = textToSend || inputMsg;
    if (!rawMsgText.trim() || !currentSessionId) return;

    if (!textToSend) setInputMsg("");
    setLoading(true);

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: rawMsgText,
      timestamp: new Date().toISOString()
    };

    // Update UI messages state immediately
    setMessages(prev => [...prev, userMsg]);

    const userPayload = {
      sessionId: currentSessionId,
      sender: "user",
      text: rawMsgText,
      timestamp: userMsg.timestamp
    };

    try {
      // Save user message to database
      if (isFirebaseReady && db && !user?.isAnonymous) {
        const { addDoc, collection, doc, updateDoc } = await import("firebase/firestore");
        await addDoc(collection(db, "chat_messages"), userPayload);
        await updateDoc(doc(db, "chat_sessions", currentSessionId), {
          lastUpdated: new Date().toISOString()
        });
      } else {
        await mockDb.addDocument("chat_messages", userPayload);
        // Modify session updated date
        const sessList = await mockDb.getCollection("chat_sessions");
        const found = sessList.find((s: any) => s.id === currentSessionId);
        if (found) {
          found.lastUpdated = new Date().toISOString();
          localStorage.setItem("tajaweed_db_chat_sessions", JSON.stringify(sessList));
        }
      }

      // Post message conversation to Gemini backend
      const response = await fetch("/api/ask-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawMsgText,
          history: messages.slice(-8), // Send sliding window context length for memory
          matnName: matnName
        })
      });

      if (!response.ok) {
        throw new Error("فشل إرسال الاستعلام للخادم.");
      }

      const resData = await response.json();
      const botReply = resData.text || "عذرًا، لم أتمكن من الاستجابة اللحظية.";

      const botMsg: Message = {
        id: Math.random().toString(),
        sender: "bot",
        text: botReply,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMsg]);

      const botPayload = {
        sessionId: currentSessionId,
        sender: "bot",
        text: botReply,
        timestamp: botMsg.timestamp
      };

      if (isFirebaseReady && db) {
        const { addDoc, collection } = await import("firebase/firestore");
        await addDoc(collection(db, "chat_messages"), botPayload);
      } else {
        await mockDb.addDocument("chat_messages", botPayload);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "bot",
        text: "🚨 وقع عطب لغز في معالج الذكاء الاصطناعي، يرجى إعادة إرسال رسالتك أو مراجعة الاتصال بالخادم الرئيسي.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (promptAction: string) => {
    handleSendMessage(promptAction);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 bg-white rounded-3xl overflow-hidden border border-emerald-primary/15 shadow-sm min-h-[550px]" id="smart-chat-assistant-panel">
      
      {/* Session histories sidebar */}
      <div className="md:col-span-1 bg-zinc-50 p-4 border-l border-zinc-100 flex flex-col justify-between space-y-4">
        <div className="space-y-3 flex-1 flex flex-col overflow-hidden max-h-[480px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-primary px-2 py-1 bg-emerald-light rounded-lg">الأرشيف</span>
            <button
              onClick={() => createNewSession()}
              disabled={addingSession}
              className="p-1 text-emerald-primary hover:bg-emerald-light rounded-lg transition-colors"
              title="بداية جلسة حوارية جديدة"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1 pl-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => { setCurrentSessionId(s.id); loadMessages(s.id); }}
                className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between text-right group ${
                  currentSessionId === s.id 
                    ? "bg-emerald-primary text-white shadow-sm" 
                    : "bg-white hover:bg-zinc-100 text-zinc-700"
                }`}
              >
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-[11px] font-black truncate leading-tight">{s.title}</h4>
                  <span className={`text-[8px] font-medium block mt-1 ${currentSessionId === s.id ? "text-emerald-100" : "text-zinc-400"}`}>
                    📖 {s.matnName}
                  </span>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-650 transition-all ${
                    currentSessionId === s.id ? "text-white hover:bg-white/20" : "text-zinc-400"
                  }`}
                  title="حذف الأرشيف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-[10px] text-zinc-400 font-bold text-center py-6">لا توجد محادثات سابقة.</p>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
          <h5 className="text-[10px] font-black text-gold-accent flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            توجيه الحوار
          </h5>
          <p className="text-[9px] text-zinc-500 leading-relaxed font-bold mt-1">
            يمكنك نقاش المتن، طلب شرح الأبيات، تصحيح مخارج الحروف، أو طلب واجب دراسي!
          </p>
        </div>
      </div>

      {/* Primary chat workspace area */}
      <div className="md:col-span-3 flex flex-col h-[550px] justify-between">
        
        {/* Chat header banner */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-light rounded-xl text-emerald-primary">
              <Bot className="w-5 h-5 animate-pulse" />
            </span>
            <div className="text-right">
              <h3 className="font-black text-xs md:text-sm text-zinc-800 flex items-center gap-1">
                الموجه الشارح ونقاش المنظومات
                <span className="text-[9px] font-bold bg-amber-100 text-gold-accent px-1.5 py-0.5 rounded-full">الذكاء التفاعلي</span>
              </h3>
              <p className="text-[9px] text-zinc-450 font-medium">اطرح أي مسألة تجويدية أو نحوية أو فقهية ليفككها لك المرشد</p>
            </div>
          </div>
        </div>

        {/* Dynamic action hot-keys for fast user interactions */}
        <div className="px-4 py-2 bg-zinc-50/30 flex flex-wrap gap-1.5 border-b border-zinc-100">
          <button
            onClick={() => handleActionClick(`اقترح عليّ خطة لحفظ وضبط متن ${matnName} بأبوابه وقواعده`)}
            className="px-2.5 py-1.5 bg-amber-500/10 text-amber-800 text-[10px] font-black rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-all text-right cursor-pointer"
          >
            📋 جدول دراسة وحفظ
          </button>
          <button
            onClick={() => handleActionClick(`لخص لي أهم الأحكام والقواعد التجويدية في متن ${matnName}`)}
            className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-850 text-[10px] font-black rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-right cursor-pointer"
          >
            📜 ملخص القواعد التجويدية
          </button>
          <button
            onClick={() => handleActionClick(`ولد لي اختباراً سريعاً من 3 أسئلة في أحكام التجويد الأساسية لـ ${matnName}`)}
            className="px-2.5 py-1.5 bg-blue-500/10 text-blue-800 text-[10px] font-black rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all text-right cursor-pointer"
          >
            ❓ مسابقة تجويد سريعة
          </button>
        </div>

        {/* Message bubble stream scroll context */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 bg-[#fbfcfb]/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 max-w-[85%] ${
                m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div className={`p-1.5 rounded-xl ${
                m.sender === "user" ? "bg-amber-100 text-amber-900" : "bg-emerald-light text-emerald-900"
              }`}>
                {m.sender === "user" ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
              </div>
              
              <div className="flex flex-col space-y-1.5 flex-1">
                <div className={`p-3.5 rounded-2xl text-[11px] font-medium leading-relaxed text-right text-zinc-805 whitespace-pre-wrap ${
                  m.sender === "user" 
                    ? "bg-amber-50 rounded-tr-none border border-amber-200/50" 
                    : "bg-zinc-50 rounded-tl-none border border-zinc-100 shadow-sm"
                }`}>
                  {m.text}
                </div>

                {m.sender === "bot" && onOpenChatExport && (
                  <div className="flex items-center gap-2 mt-0.5 mr-1 text-[9px] justify-start no-print">
                    <button 
                      onClick={() => onOpenChatExport(m.text)}
                      className="p-1 px-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-zinc-650 rounded-lg transition-all font-bold flex items-center gap-1 cursor-pointer border border-zinc-200"
                      title="تصدير كملف PDF مخصص للتحميل والطباعة"
                    >
                      <span>تصدير PDF 📄</span>
                    </button>
                    <button 
                      onClick={() => onOpenChatExport(m.text)}
                      className="p-1 px-2.5 bg-white hover:bg-amber-50 hover:text-amber-850 text-zinc-650 rounded-lg transition-all font-bold flex items-center gap-1 cursor-pointer border border-zinc-200"
                      title="تصدير كصورة PNG عالية الجودة"
                    >
                      <span>تصدير صورة 🖼️</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2.5 max-w-[85%] mr-auto">
              <div className="p-1.5 rounded-xl bg-emerald-light text-emerald-950">
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              </div>
              <div className="p-3 bg-zinc-50 text-right rounded-2xl rounded-tl-none border border-zinc-100 text-[10px] font-bold text-zinc-400">
                ⏳ يقوم مرشد تجاويد بصياغة الجواب وإعراب الأبيات...
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Text area input control bar */}
        <div className="p-3 border-t border-zinc-100 bg-zinc-50">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="✍️ اكتب سؤالك النحوي أو التجويدي هنا..."
              className="flex-1 px-4 py-2 rounded-xl text-xs bg-white border border-zinc-200 outline-none focus:border-emerald-primary text-right font-medium"
            />
            <button
              type="submit"
              disabled={loading || !inputMsg.trim()}
              className="px-4 py-2 bg-emerald-primary text-white rounded-xl shadow-md hover:bg-emerald-900 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
