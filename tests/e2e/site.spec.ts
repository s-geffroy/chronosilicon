import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const corpus = JSON.parse(readFileSync('data/validated/corpus.json', 'utf8')) as {
  measurements: Array<{ id: string; quantityKind: string; valueSI: number; sourceIds: string[] }>;
};
const firstDuration = corpus.measurements.find((m) => m.quantityKind === 'duration');

async function noConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('loads under the Pages base path with all assets, no server dependency', async ({ page }) => {
  const failed: string[] = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  const errors = await noConsoleErrors(page);
  await page.goto('./');
  await expect(page.getByTestId('timeline')).toBeVisible();
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
  const v = await page.request.get('version.json');
  expect(v.ok()).toBe(true);
  expect(await v.json()).toHaveProperty('commit');
});

test('direct access to a deep link and reload keep the state', async ({ page }) => {
  await page.goto('./#/converter?lang=en&f=2000000000');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Physical ↔ subjective time converter');
  await expect(page.getByTestId('frequency')).toHaveValue('2');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Physical ↔ subjective time converter');
  await expect(page.getByTestId('frequency')).toHaveValue('2');
});

test('converter: 1 km of light in vacuum ≈ 3 h 42 min at 4 GHz (CS-03 oracle through the UI)', async ({ page }) => {
  await page.goto('./#/converter?lang=en');
  await page.getByTestId('conv-unit').selectOption('µs');
  await page.getByTestId('conv-value').fill('3.33564095');
  await expect(page.getByTestId('conv-subjective')).toHaveText('3 hours 42 minutes');
  await page.getByTestId('conv-unit').selectOption('s');
  await page.getByTestId('conv-value').fill('1');
  await expect(page.getByTestId('conv-subjective')).toHaveText('126 years 274 days');
  await page.getByTestId('conv-value').fill('-1');
  await expect(page.getByText('Enter a positive, finite duration.')).toBeVisible();
});

test('converter reverse direction and frequency change', async ({ page }) => {
  await page.goto('./#/converter?lang=en');
  await page.getByTestId('dir-physical').check();
  await page.getByTestId('conv-unit').selectOption('s');
  await page.getByTestId('conv-value').fill('4');
  await expect(page.getByTestId('conv-result')).toContainText('1 ns');
  await page.getByTestId('frequency').fill('1');
  await expect(page.getByTestId('conv-result')).toContainText('4 ns');
  await page.getByTestId('frequency').fill('-3');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('FR/EN switch changes texts, not values', async ({ page }) => {
  await page.goto('./#/timeline?lang=fr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chronologie logarithmique des durées');
  const countFr = await page.getByTestId('count').textContent();
  await page.getByTestId('lang-switch').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Logarithmic timeline of durations');
  const countEn = await page.getByTestId('count').textContent();
  expect(countFr?.match(/\d+/g)).toEqual(countEn?.match(/\d+/g));
});

test('unbuilt spaces are explicitly marked unavailable', async ({ page }) => {
  for (const r of ['architecture', 'observers', 'simulation', 'immersion', 'comparison', 'laboratory']) {
    await page.goto(`./#/${r}?lang=en`);
    await expect(page.getByTestId('unavailable')).toContainText('not built yet');
  }
});

test('timeline: sheet with source opens, keyboard operable, closes with Escape', async ({ page }) => {
  test.skip(!firstDuration, 'corpus has no duration');
  await page.goto('./#/timeline?lang=en&level=scientific');
  const row = page.locator(`button[data-id="${firstDuration!.id}"]`);
  await row.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByTestId('sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('sheet-source').first()).toContainText('Accessed on');
  await expect(sheet.getByRole('link', { name: 'Open source' }).first()).toHaveAttribute('href', /^https?:\/\//);
  await expect(page).toHaveURL(new RegExp(`sel=${firstDuration!.id}`));
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(page).not.toHaveURL(/sel=/);
});

test('domain filter and table alternative', async ({ page }) => {
  await page.goto('./#/timeline?lang=en');
  const total = corpus.measurements.length;
  await expect(page.getByTestId('count')).toContainText(`${total} values shown out of ${total}`);
  await page.getByRole('button', { name: 'None' }).click();
  await expect(page.getByTestId('count')).toContainText(`0 values shown out of ${total}`);
  await page.getByRole('button', { name: 'All' }).click();
  await page.getByTestId('view-table').check();
  await expect(page.getByTestId('duration-table')).toBeVisible();
});

test('exports JSON and CSV with versions, units and sources', async ({ page }) => {
  await page.goto('./#/timeline?lang=en');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()]);
  const json = JSON.parse(readFileSync((await dl.path())!, 'utf8'));
  expect(json.corpusVersion).toBeTruthy();
  expect(json.appVersion).toBeTruthy();
  expect(json.units.duration).toBe('s');
  expect(json.measurements.length).toBe(corpus.measurements.length);
  if (json.measurements.length) expect(json.sources.length).toBeGreaterThan(0);
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
  const csv = readFileSync((await dl2.path())!, 'utf8');
  expect(csv.split('\r\n')[0]).toContain('valueSI,siUnit');
  expect(csv.trim().split('\r\n').length).toBe(corpus.measurements.length + 1);
});

test('share link reproduces the state', async ({ page, context }) => {
  await page.goto('./#/timeline?lang=en&f=3000000000&axis=physical');
  const url = await page.getByTestId('share-url').inputValue();
  expect(url).toContain('f=3000000000');
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.getByTestId('frequency')).toHaveValue('3');
});

test('accessibility: no axe violations (WCAG 2.1 AA) on main views', async ({ page }) => {
  for (const r of ['timeline', 'converter', 'about', 'simulation']) {
    await page.goto(`./#/${r}?lang=fr`);
    await page.waitForLoadState('networkidle');
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(res.violations.map((v) => `${r}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});

test('internal navigation links all resolve', async ({ page }) => {
  await page.goto('./#/timeline?lang=fr');
  const hrefs = await page.locator('nav a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
  expect(hrefs.length).toBe(9);
  for (const h of hrefs) {
    await page.goto(`./${h}`);
    await expect(page.locator('main h1')).toBeVisible();
  }
});
