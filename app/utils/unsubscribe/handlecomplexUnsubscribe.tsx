import { Page, Frame } from "playwright";
import { solveCaptcha } from "./captchaSolver";
import fetch from "node-fetch";
import fs from "fs";

export async function handleComplexUnsubscribeForm(
  page: Page,
  userEmail: string
): Promise<boolean> {
  try {
    const captchaFrame = await page.$(
      'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="captcha"]'
    );
    if (captchaFrame) {
      console.log("🔍 CAPTCHA detected");
      const solved = await solveCaptcha(page);
      if (!solved) {
        console.warn("🧩 CAPTCHA solving failed");
        return false;
      }
    }

    let html = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src^="data:text/html;base64,"]');
      if (iframe) {
        const src = iframe.getAttribute("src");
        if (src?.startsWith("data:text/html;base64,")) {
          const base64 = src.split(",")[1];
          return base64 ? atob(base64) : document.documentElement.outerHTML;
        }
      }
      return document.documentElement.outerHTML;
    });

    fs.writeFileSync(`screenshots/html-${Date.now()}.html`, html);
    html = html.slice(0, 16000);

    const geminiResponse = await sendToGemini(html, userEmail);
    let clicked = false;

    let frame: Page | Frame = page;
    const dataIframe = await page.$('iframe[src^="data:text/html;base64,"]');
    if (dataIframe) {
      const frameHandle = await dataIframe.contentFrame();
      if (frameHandle) {
        frame = frameHandle;
        console.log("🔗 Gemini actions will run inside iframe.");
      }
    }

    if (geminiResponse && geminiResponse.length > 0) {
      console.log("⚙️ Gemini AI returned actions:", geminiResponse);

      const hasClickAction = geminiResponse.some(a => a.action === "click");
      if (!hasClickAction) {
        console.warn("⚠️ Gemini response contained no 'click' action — fallback will be triggered.");
      }

      for (const action of geminiResponse) {
        const el = await frame.$(action.selector);
        if (!el) {
          console.warn(`⚠️ Gemini suggested selector not found: "${action.selector}"`);
          continue;
        }

        if (action.value) await el.fill?.(action.value).catch(() => {});
        if (action.action === "check") await el.check?.().catch(() => {});
        if (action.action === "click") {
          await el.click?.().catch(() => {});
          await Promise.race([
            page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
            page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
            page.waitForSelector("text=/unsubscribe|success|thank/i", { timeout: 5000 }).catch(() => {}),
          ]);
          const screenshotPath = `screenshots/gemini-click-after-${Date.now()}.png`;
          fs.mkdirSync("screenshots", { recursive: true });
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`📸 Screenshot taken after Gemini click: ${screenshotPath}`);
          clicked = true;
        }
      }

      // Ensure required fields are filled even if Gemini missed them
      const requiredFields = await frame.$$('[required]');
      for (const field of requiredFields) {
        const tag = await field.evaluate(el => el.tagName.toLowerCase());
        if (tag === 'input') {
          const type = await field.getAttribute("type");
          if (type === 'email') await field.fill(userEmail).catch(() => {});
          else await field.fill('N/A').catch(() => {});
        } else if (tag === 'select') {
          await field.selectOption({ index: 1 }).catch(() => {});
        } else if (tag === 'textarea') {
          await field.fill('No reason').catch(() => {});
        }
      }

      // Click likely final submit
      const finalButtons = await frame.$$('button, input[type="submit"]');
      for (const btn of finalButtons) {
        const label = (await btn.innerText().catch(() => ""))?.toLowerCase();
        if (/submit|save|unsubscribe|update|confirm|continue|done|apply|yes/.test(label)) {
          console.log(`🟩 Final submit click on: "${label}"`);
          await btn.click().catch(() => {});
          await Promise.race([
            page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
            page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {}),
            page.waitForSelector("text=/unsubscribe|success|thank|confirmed/i", { timeout: 5000 }).catch(() => {}),
          ]);
          const shot = `screenshots/final-submit-click-${Date.now()}.png`;
          fs.mkdirSync("screenshots", { recursive: true });
          await page.screenshot({ path: shot, fullPage: true });
          console.log(`📸 Final submit screenshot saved: ${shot}`);
          break;
        }
      }

      const bodyText = await page.textContent("body");
      const successMatch = bodyText?.match(/(unsubscribe(d)?|opt(ed)? out|removed|success|no longer)/i);
      if (successMatch) {
        console.log(`🔔 Confirmation message detected: "${successMatch[0]}"`);
        return true;
      }
    }

    console.warn("⚠️ Gemini failed or did nothing — using fallback logic...");
    return false;
  } catch (err) {
    console.error("❌ Error in handleComplexUnsubscribeForm:", err);
    return false;
  }
}

async function sendToGemini(
  html: string,
  userEmail: string
): Promise<any[] | null> {
  const prompt = `
You are an expert AI assistant automating the process of unsubscribing from email newsletters and promotional messages.

You are given a block of HTML containing a form or web page that enables users to update email preferences or unsubscribe. Your task is to analyze the structure, extract intent from labels and field types, and output a list of form interaction actions needed to complete the unsubscribe process without human input.

Instructions:
- Assume the user's email address is: ${userEmail}
- Fill any input field where the type is "email" or label mentions "email"
- For checkboxes and radios, prioritize those whose label or associated text includes words like "unsubscribe", "opt-out", "stop", "none", "remove"
- Click the first button (input[type=submit] or <button>) with text like "Submit", "Save", "Unsubscribe", "Update", "Confirm", "Apply", "Done", "Yes", "Continue", or "Proceed"
- Prefer generic and resilient CSS selectors that are more likely to work across webpages
- Do NOT include any commentary outside the output JSON

Output ONLY a JSON array like:
[
  { "selector": "input[type='email']", "value": "${userEmail}" },
  { "selector": "input[type='checkbox']", "action": "check" },
  { "selector": "button", "action": "click" }
]

HTML:
-----
${html}
-----
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Gemini API key missing");
      return null;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const result = await response.json();
    console.log("🔍 Gemini API Full JSON Response:", JSON.stringify(result, null, 2));

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("🧠 Gemini raw text output:", JSON.stringify(text, null, 2));

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("❌ Could not find JSON boundaries in Gemini output");
      return null;
    }

    const json = text.slice(jsonStart, jsonEnd + 1).trim();
    return JSON.parse(json);
  } catch (error) {
    console.error("❌ Gemini request failed:", error);
    return null;
  }
}
