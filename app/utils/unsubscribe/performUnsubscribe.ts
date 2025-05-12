import { chromium, Page, Locator } from 'playwright';
import { solveCaptcha } from './captchaSolver';
import { handleComplexUnsubscribeForm } from './handlecomplexUnsubscribe';
import fs from 'fs';

export async function performUnsubscribe(url: string, userEmail: string): Promise<{ success: boolean; reason?: string }> {
  console.log('🚀 Unsubscribe started for:', url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let strategy = 'none';
  let confirmationText = '';

  try {
    await blockUnnecessaryResources(page);

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!response) {
      console.error('❌ Failed to navigate to the initial URL');
      return { success: false, reason: 'Navigation failed' };
    }

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
    console.log('📍 Final page URL:', page.url());

    const captchaFrame = await page.$('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="captcha"]');
    if (captchaFrame) {
      console.log('🔍 CAPTCHA iframe detected');
      const solved = await solveCaptcha(page);
      if (!solved) {
        console.warn('🧩 CAPTCHA solving failed');
        return { success: false, reason: 'CAPTCHA solving failed' };
      }
    } else {
      console.log('✅ No CAPTCHA detected, continuing...');
    }

    const complexHandled = await handleComplexUnsubscribeForm(page, userEmail);
    if (complexHandled) {
      strategy = 'AI-assisted complex form';
    }

    if (strategy === 'none') {
      const unsubscribeRadio = await page.$("input[type='radio'][value*='unsubscribe'], input[type='radio'][value*='all']");
      if (unsubscribeRadio) {
        await unsubscribeRadio.check().catch(() => {});
      }

      const checkboxes = await page.$$('input[type="checkbox"]');
      for (const checkbox of checkboxes) {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) await checkbox.check().catch(() => {});
      }

      const submitButton = await findSubmitButton(page);
      if (submitButton) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => null),
          submitButton.click(),
        ]);
        strategy = 'checkbox + radio + submit';
      }
    }

    if (strategy === 'none' && await tryUnsubscribeElements(page)) strategy = 'button/link';
    else if (strategy === 'none' && await handleConfirmationDialog(page)) strategy = 'confirmation';
    else if (strategy === 'none' && await tryDelayedAction(page)) strategy = 'delayed';

    const success = strategy !== 'none';

    if (success) {
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent('body');
      const match = bodyText?.match(/(unsubscribe(d)?|opt(ed)? out|removed|success|)/i);
      if (match) {
        confirmationText = match[0];
        console.log(`🔔 Confirmation message detected: "${confirmationText}"`);
      }

      const screenshotPath = `screenshots/unsub-confirm-${Date.now()}.png`;
      fs.mkdirSync('screenshots', { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);
    } else {
      const dataIframe = await page.$('iframe[src^="data:text/html;base64,"]');
      if (dataIframe) {
        const src = await dataIframe.getAttribute('src');
        const base64 = src?.split(',')[1];
        if (base64) {
          const html = Buffer.from(base64, 'base64').toString('utf-8');
          const successMatch = html.match(/(unsubscribed|opted out|successfully removed|)/i);
          if (successMatch) {
            console.log('✅ Unsubscribed via data iframe — matched:', successMatch[0]);
            const screenshotPath = `screenshots/unsub-confirm-${Date.now()}-iframe.png`;
            fs.mkdirSync('screenshots', { recursive: true });
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot (outer shell) saved to: ${screenshotPath}`);
            return { success: true, reason: 'Unsubscribed via embedded iframe success message' };
          }
        }
      }

      console.warn('⚠️ No unsubscribe method succeeded.');
      console.log('📄 Final HTML snippet (for debug):', (await page.content()).slice(0, 2000));
    }

    return {
      success,
      reason: success ? `Unsubscribed via ${strategy}${confirmationText ? ` — "${confirmationText}"` : ''}` : 'Unsubscribe failed (form/captcha/manual fill issue)',
    };
  } catch (error) {
    console.error('❌ Unsubscribe failed with error:', error);
    return { success: false, reason: 'Unhandled exception during unsubscribe' };
  } finally {
    await browser.close();
  }
}

async function tryUnsubscribeElements(page: Page): Promise<boolean> {
  const keywords = ['unsubscribe', 'opt out', 'cancel', 'stop emails'];
  for (const word of keywords) {
    const button = await page.$(`button:has-text("${word}")`);
    if (button) {
      await button.click();
      return true;
    }
    const link = await page.$(`a:has-text("${word}")`);
    if (link) {
      await link.click();
      return true;
    }
  }
  return false;
}

async function handleConfirmationDialog(page: Page): Promise<boolean> {
  const confirmButton = await page.$('button:has-text("yes"), button:has-text("confirm"), button:has-text("ok")');
  if (confirmButton) {
    await confirmButton.click();
    return true;
  }
  return false;
}

async function tryDelayedAction(page: Page): Promise<boolean> {
  await page.waitForTimeout(2000);
  const delayed = await page.$('button:not([disabled]), a:not([disabled])');
  if (delayed) {
    await delayed.click();
    return true;
  }
  return false;
}

async function blockUnnecessaryResources(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });
}

async function findSubmitButton(page: Page): Promise<Locator | null> {
  const submit = page.locator("input[type='submit'], button[type='submit']");
  return (await submit.count()) ? submit : null;
}
 