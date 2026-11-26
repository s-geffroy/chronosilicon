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
  const foreign: string[] = [];
  const origin = new URL(test.info().project.use.baseURL!).origin;
  page.on('request', (r) => { if (!r.url().startsWith('data:') && new URL(r.url()).origin !== origin) foreign.push(r.url()); });
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  const errors = await noConsoleErrors(page);
  await page.goto('./');
  await expect(page.getByTestId('timeline')).toBeVisible();
  expect(failed).toEqual([]);
  expect(foreign).toEqual([]); // no third-party or server dependency at runtime
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
  await expect(page.getByTestId('conv-subjective')).toHaveText('126 years 275 days');
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

test('frequency field keeps what the user types (no silent overwrite)', async ({ page }) => {
  await page.goto('./#/converter?lang=en');
  const f = page.getByTestId('frequency');
  await f.fill('');
  await f.pressSequentially('0.5');
  await expect(f).toHaveValue('0.5');
  await expect(page).toHaveURL(/f=500000000/);
  await f.fill('0');
  await expect(f).toHaveValue('0');
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

test('every navigation space is built (no placeholder left)', async ({ page }) => {
  await page.goto('./#/timeline?lang=en');
  await expect(page.locator('nav .badge')).toHaveCount(0);
  for (const r of ['architecture', 'observers', 'simulation', 'immersion', 'comparison', 'laboratory']) {
    await page.goto(`./#/${r}?lang=en`);
    await expect(page.getByTestId('unavailable')).toHaveCount(0);
    await expect(page.getByTestId(r)).toBeVisible();
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
  await page.locator('details.filters > summary').click();
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
  for (const r of ['timeline', 'converter', 'about', 'simulation', 'architecture', 'comparison', 'observers', 'immersion', 'laboratory']) {
    await page.goto(`./#/${r}?lang=fr`);
    await page.waitForLoadState('networkidle');
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(res.violations.map((v) => `${r}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
  if (firstDuration) {
    await page.goto(`./#/timeline?lang=en&level=scientific&sel=${firstDuration.id}`);
    await expect(page.getByTestId('sheet')).toBeVisible();
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(res.violations.map((v) => `sheet: ${v.id} (${v.nodes.length})`)).toEqual([]);
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

test('V2 architecture: cycle latencies read in the core own frame (no frequency assumed)', async ({ page }) => {
  await page.goto('./#/architecture?lang=en');
  const zen4 = page.getByTestId('hier-hier-zen4');
  await expect(zen4).toContainText('50 cycles');
  await expect(zen4).toContainText('50 seconds');
  await expect(zen4).toContainText('three different statistics');
});

test('V2 comparison: ordered by year, comparability and frequency warning shown', async ({ page }) => {
  await page.goto('./#/comparison?lang=en&g=cmp-cpu-clock');
  await expect(page.getByTestId('cmp-note')).toContainText('A frequency is not a performance');
  await expect(page.getByTestId('cmp-note')).toContainText('different definitions or protocols');
  const years = await page.getByTestId('cmp-table').locator('tbody tr td:first-child').allTextContents();
  expect(years).toEqual([...years].sort());
  expect(years[0]).toBe('1978');
  await page.getByTestId('cmp-select').selectOption('cmp-azure-rtt');
  await expect(page).toHaveURL(/g=cmp-azure-rtt/);
  await expect(page.getByTestId('cmp-note')).toContainText('same source and same method');
});

test('V2 observers: same physical duration, several frames (CS-07)', async ({ page }) => {
  await page.goto('./#/observers?lang=en&m=earth-moon-light-time-one-way-m1');
  await expect(page.getByTestId('obs-obs-pedagogical-4ghz')).toHaveText('162 years 192 days');
  // 1.28222 s / 0.213 s = 6.02 reaction times
  await expect(page.getByTestId('obs-obs-human-reaction')).toHaveText('≈ 6 subjective seconds');
  await page.getByTestId('obs-select').selectOption('tcp-min-rto-m1');
  await expect(page).toHaveURL(/m=tcp-min-rto-m1/);
  await expect(page.getByTestId('obs-obs-pedagogical-4ghz')).toHaveText('126 years 275 days');
  // A frequency id in the URL must never be observed as a duration (review M7).
  await page.goto('./#/observers?lang=en&m=intel-8086-initial-clock-m1');
  await expect(page.getByTestId('obs-select')).toHaveValue('earth-moon-light-time-one-way-m1');
});

test('V2 comparison: cycle groups are not converted; common observer is named for durations', async ({ page }) => {
  await page.goto('./#/comparison?lang=en&g=cmp-l1d-cycles');
  await expect(page.getByTestId('cmp-table')).not.toContainText('Subjective time');
  await page.getByTestId('cmp-select').selectOption('cmp-dram-latency');
  await expect(page.getByTestId('cmp-table')).toContainText('Subjective time, common observer at 4 GHz');
  await expect(page.getByTestId('cmp-note')).toContainText('These values are not a series');
});

test('V3 simulation: dependent vs independent reads, capacity, critical path, export', async ({ page }) => {
  await page.goto('./#/simulation?lang=en&sc=sc-dram-dependent-reads');
  await expect(page.getByTestId('sim-excluded')).toContainText('Not modelled');
  await expect(page.getByTestId('sim-makespan')).toHaveText('640 ns');
  await expect(page.getByTestId('sim-critical')).toHaveText('r1 → r2 → r3 → r4 → r5 → r6 → r7 → r8');
  await page.getByTestId('sim-select').selectOption('sc-dram-independent-reads');
  await expect(page.getByTestId('sim-makespan')).toHaveText('160 ns');
  await page.getByTestId('sim-capacity').fill('100');
  await page.getByTestId('sim-capacity').press('Enter');
  await expect(page.getByTestId('sim-capacity')).toHaveValue('4'); // rejected value is not displayed
  await page.getByTestId('sim-capacity').fill('1');
  await page.getByTestId('sim-capacity').press('Enter');
  await expect(page.getByTestId('sim-makespan')).toHaveText('640 ns');
  await expect(page).toHaveURL(/cap=1/);
  await expect(page.getByTestId('sim-overlap')).toHaveText('0 %');
  await page.reload();
  await expect(page.getByTestId('sim-makespan')).toHaveText('640 ns');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('sim-export').click()]);
  const json = JSON.parse(readFileSync((await dl.path())!, 'utf8'));
  expect(json.result.scenarioId).toBe('sc-dram-independent-reads');
  expect(json.result.makespan).toBe('640000000'); // femtoseconds, decimal string
  expect(json.corpusVersion).toMatch(/^0\.3\.0\+/);
  expect(json.capacity).toBe(1);
});

test('V4 immersion: journal derived from the simulated events, labelled as a metaphor', async ({ page }) => {
  await page.goto('./#/immersion?lang=en&sc=sc-mars-command');
  await expect(page.getByTestId('immersion')).toContainText('Metaphor');
  const items = page.getByTestId('journal').locator('li');
  await expect(items).toHaveCount(8); // 6 events + 2 elapsed-time lines
  await expect(items.nth(2)).toContainText('The model does not say what I do meanwhile');
  await page.getByTestId('imm-select').selectOption('sc-tcp-first-response');
  await expect(page).toHaveURL(/sc=sc-tcp-first-response/);
  await expect(items.first()).toContainText('handshake');
});

test('V5 laboratory: browser measurement labelled as such, raw samples exported; withheld data listed', async ({ page }) => {
  await page.goto('./#/laboratory?lang=en');
  await expect(page.getByTestId('laboratory')).toContainText('not native processor latency');
  await expect(page.getByTestId('lab-withheld').locator('tbody tr')).toHaveCount(4);
  await page.getByTestId('lab-run-timer').click();
  await expect(page.getByTestId('lab-n')).toHaveText(/^\d+$/);
  await expect(page.getByTestId('lab-result')).toContainText('Hyndman-Fan type 7');
  await expect(page.getByTestId('lab-result')).toContainText('of clock steps');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('lab-export').click()]);
  const json = JSON.parse(readFileSync((await dl.path())!, 'utf8'));
  expect(json.samples.length).toBe(json.summary.n);
  expect(json.samples.every((x: number) => Number.isFinite(x) && x > 0)).toBe(true);
  expect(json.summary.quantiles[0].value).toBeLessThanOrEqual(json.summary.quantiles[2].value);
  // call cost: only a median with its resolution, or "not resolved" — never quantiles of batch means
  await page.getByTestId('lab-run-now').click();
  await expect(page.getByTestId('lab-percall')).toHaveText(/±|Not resolved/, { timeout: 20_000 });
  await expect(page.getByTestId('lab-result')).not.toContainText('P99');
});

test('no horizontal page overflow on any view (responsive)', async ({ page }) => {
  for (const r of ['timeline', 'converter', 'architecture', 'observers', 'simulation', 'immersion', 'comparison', 'laboratory', 'about']) {
    await page.goto(`./#/${r}?lang=fr`);
    await expect(page.locator('main h1')).toBeVisible();
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, r).toBeLessThanOrEqual(cw);
  }
});
