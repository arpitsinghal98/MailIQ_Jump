// app/utils/ai.ts
import { GoogleGenAI } from "@google/genai";

type Category = { name: string; description: string };

export async function analyzeEmail(
  emailHtml: string,
  categories: Category[]
): Promise<{ category: string; summary: string; unsubscribeUrl: string | null }> {

  if (!emailHtml || emailHtml.trim() === "") {
    console.error("Empty email HTML content");
    return { category: "None", summary: "Empty email content", unsubscribeUrl: null };
  }

  const apiKey = process.env.GEMINI_API_KEY || "";
  const prompt = `
You are an AI email assistant acting like a deterministic program.

You must perform **three tasks** based on the raw HTML content of an email:
1. Choose the most appropriate category from the list below.
2. Write a one-line summary describing the main purpose or topic of the email.
3. If there's an unsubscribe link in the HTML, extract and return the **exact URL**. Otherwise, return null.

---

RULES:
- You MUST return the category name exactly as it appears in the "Valid category names" list.
- DO NOT rephrase, extend, or combine category names with descriptions.
- The summary must be a short, plain-English sentence — DO NOT copy-paste email text, subject lines, or include special characters.
- The unsubscribe URL must be the exact href string of the first visible link intended for unsubscribing (if any).
- If there's no unsubscribe link, return \`null\`.
- Your response must ONLY be a valid JSON object — no extra comments, markdown, or text.

---

CATEGORIES:
${categories.map((c) => `- ${c.name}: ${c.description}`).join("\n")}

Valid category names (use exactly as-is): [${categories
    .map((c) => c.name)
    .join(", ")}]

---

EMAIL CONTENT (HTML):
${emailHtml}

---

OUTPUT FORMAT (JSON only):
{
  "category": "ExactCategoryNameOrNone",
  "summary": "Short one-line summary",
  "unsubscribeUrl": "https://example.com/unsubscribe" or null
}
`;

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = res?.candidates?.[0]?.content?.parts?.[0]?.text
      ?.replace(/```json|```/g, "")
      .trim() || "";
    
    if (!text) {
      console.error("Empty AI response");
      return { category: "None", summary: "Failed to analyze email", unsubscribeUrl: null };
    }

    try {
      const parsed = JSON.parse(text);
      return {
        category: parsed.category?.trim() || "None",
        summary: parsed.summary?.trim() || "No summary available",
        unsubscribeUrl: parsed.unsubscribeUrl?.trim?.() || null,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return { category: "None", summary: "Failed to parse AI response", unsubscribeUrl: null };
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    return { category: "None", summary: "AI analysis failed", unsubscribeUrl: null };
  }
}
