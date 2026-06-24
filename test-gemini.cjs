const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: "AQ.Ab8RN6J2kwpReGH4b041vlPFD54It6C94FdhvPx1Xukei7fQIg" });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "Hello",
    });
    console.log("SUCCESS:", response.text);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
run();
