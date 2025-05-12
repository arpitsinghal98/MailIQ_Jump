import { Page } from 'playwright';
import axios from 'axios';

const API_KEY = process.env.CAPSOLVER_API_KEY!;
const CAPTCHA_TYPE = 'ReCaptchaV2TaskProxyLess'; // Change to 'hCaptchaTaskProxyLess' if needed

export async function solveCaptcha(page: Page): Promise<boolean> {
  try {
    // Step 1: Extract sitekey from reCAPTCHA iframe
    const sitekey = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      const src = iframe?.getAttribute('src');
      const match = src?.match(/k=([^&]+)/);
      return match ? match[1] : null;
    });

    if (!sitekey) {
      console.warn('❌ Could not extract sitekey');
      return false;
    }

    const websiteURL = page.url();
    console.log(`🔑 Solving CAPTCHA on ${websiteURL} with sitekey ${sitekey}`);

    // Step 2: Create CAPTCHA task via CapSolver
    const createTaskResp = await axios.post('https://api.capsolver.com/createTask', {
      clientKey: API_KEY,
      task: {
        type: CAPTCHA_TYPE,
        websiteURL,
        websiteKey: sitekey,
      },
    });

    const taskId = createTaskResp.data.taskId;
    if (!taskId) {
      console.error('❌ Failed to create CAPTCHA task:', createTaskResp.data);
      return false;
    }

    console.log(`🧠 Task created. ID: ${taskId} — polling for solution...`);

    // Step 3: Poll for solution
    const start = Date.now();
    let solution: string | null = null;

    while (Date.now() - start < 120000) {
      await new Promise((res) => setTimeout(res, 10000));

      const resultResp = await axios.post('https://api.capsolver.com/getTaskResult', {
        clientKey: API_KEY,
        taskId,
      });

      if (resultResp.data.status === 'ready') {
        solution = resultResp.data.solution.gRecaptchaResponse;
        console.log('✅ CAPTCHA solved');
        break;
      }

      console.log('⏳ Waiting for CAPTCHA solution...');
    }

    if (!solution) {
      console.error('❌ CAPTCHA solving timed out');
      return false;
    }

    // Step 4: Inject token into page and append to form
    await page.evaluate((token) => {
      const textarea = document.querySelector('textarea[g-recaptcha-response]') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.value = token;
      }

      const form = document.querySelector('form');
      if (form) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'g-recaptcha-response';
        hidden.value = token;
        form.appendChild(hidden);
      }
    }, solution);

    return true;
  } catch (error) {
    console.error('❌ Error during CAPTCHA solving:', error);
    return false;
  }
}
