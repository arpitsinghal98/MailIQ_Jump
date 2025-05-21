
import { Page, Frame } from "playwright";
import fetch from "node-fetch";
import fs from "fs";
import { solveCaptcha } from "./captchaSolver";

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

    const domSummary = await page.evaluate(() => {
      function summarize(el: Element): string {
        const tag = el.tagName.toLowerCase();
        const id = el.id || "";
        const name = el.getAttribute("name") || "";
        const type = el.getAttribute("type") || "";
        const cls = el.className || "";
        const label =
          el.getAttribute("aria-label") ||
          el.closest("label")?.innerText ||
          el.getAttribute("placeholder") ||
          el.getAttribute("value") ||
          "";
        return `${tag}[id="${id}"][name="${name}"][type="${type}"][class="${cls}"][label="${label}"]`;
      }

      const elements = Array.from(
        document.querySelectorAll("input, select, textarea, button, div[role]")
      );
      return elements.map(summarize).join("\n");
    });

    const aiActions = await sendToOpenAI(domSummary, userEmail);
    if (!aiActions || aiActions.length === 0) {
      console.error("❌ OpenAI returned no usable actions");
      return false;
    }

    let frame: Page | Frame = page;
    const iframeHandle = await page.$('iframe[src^="data:text/html;base64,"]');
    if (iframeHandle) {
      const nestedFrame = await iframeHandle.contentFrame();
      if (nestedFrame) {
        frame = nestedFrame;
        console.log("🔗 Running in nested iframe");
      }
    }

    console.log("⚙️ AI Actions:", aiActions);

    for (const action of aiActions) {
      const el = await frame.$(action.selector);
      if (!el) {
        console.warn(`⚠️ Element not found: ${action.selector}`);
        continue;
      }

      if (action.value !== undefined) {
        const tag = await el.evaluate((e) => e.tagName.toLowerCase());

        if (tag === "select") {
          // ✅ Native dropdown — safe type assertion
          const options: string[] = await el.evaluate((e) =>
            Array.from(e.querySelectorAll("option")).map(
              (o) => (o as HTMLOptionElement).value
            )
          );
          const validOption = options.find((v) => !!v && v !== "");
          if (validOption) {
            await el.selectOption(validOption).catch(() => {});
            console.log(
              `🔽 Auto-selected: "${validOption}" on ${action.selector}`
            );
          } else {
            console.warn(`⚠️ No valid options in <select>: ${action.selector}`);
          }
        } else if (tag === "textarea" || tag === "input") {
          await el.fill?.(action.value).catch(() => {});
          console.log(`✍️ Filled ${action.selector} with "${action.value}"`);
        } else {
          // ✅ Custom dropdown fallback
          await el.click({ force: true }).catch(() => {});
          const option = await frame
            .locator("div[role=option], .option, li")
            .first();
          if ((await option.count()) > 0) {
            await option.click({ force: true }).catch(() => {});
            console.log(
              `🔽 Clicked first custom option under ${action.selector}`
            );
          } else {
            console.warn(
              `⚠️ No visible dropdown options for ${action.selector}`
            );
          }
        }
      }

      if (action.action === "check") {
        await el.check?.().catch(() => {});
        console.log(`✅ Checked: ${action.selector}`);
      }

      if (action.action === "click") {
        await el.click?.().catch(() => {});
        console.log(`🖱️ Clicked: ${action.selector}`);
        await Promise.race([
          page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
          page
            .waitForLoadState("networkidle", { timeout: 5000 })
            .catch(() => {}),
        ]);
        const shot = `screenshots/openai-click-${Date.now()}.png`;
        await page.screenshot({ path: shot, fullPage: true });
        console.log(`📸 Screenshot saved: ${shot}`);
      }
    }

    console.log("✅ AI-powered unsubscribe flow completed");
    return true;
  } catch (err) {
    console.error("❌ Unsubscribe automation error:", err);
    return false;
  }
}

async function sendToOpenAI(
  domSummary: string,
  userEmail: string
): Promise<any[] | null> {
  const prompt = `
You are an AI assistant automating the process of unsubscribing from an email newsletter.

You are given a structured list of form elements from a webpage. Your job is to return a sequence of actions that:

1. Fills the user's email: ${userEmail}
2. Selects appropriate dropdowns (use any available option)
3. Fills any textareas (e.g., reason fields)
4. Checks any opt-out or unsubscribe checkboxes
5. Clicks the correct final submit or unsubscribe button

Support both native and custom dropdowns:
- If it's a native <select>, provide a "value"
- If it's a custom dropdown (like <div>), first "click" the dropdown trigger, then "click" any visible option

Only output a JSON array like:
[
  { "selector": "input#email", "value": "${userEmail}" },
  { "selector": "select#unsubscribeReason", "value": "" },
  { "selector": "textarea#feedback", "value": "No longer interested" },
  { "selector": "input.optOut", "action": "check" },
  { "selector": "button#submitUnsubscribe", "action": "click" }
]

Do not include explanations. Use only selectors found in the form.

Form Elements:
-----
${domSummary}
-----
`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY not set");
      return null;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || "";

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("❌ JSON parse error from OpenAI output");
      return null;
    }

    return JSON.parse(text.slice(jsonStart, jsonEnd + 1).trim());
  } catch (err) {
    console.error("❌ OpenAI request failed:", err);
    return null;
  }
}
