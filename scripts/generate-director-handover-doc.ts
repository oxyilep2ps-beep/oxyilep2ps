/**
 * Oxyile Technical Handover & System Architecture Manual publisher.
 *
 * Standalone document for Director technical due diligence.
 * Does not modify or overwrite Oxyile_Enterprise_RnD_Whitepaper_2026.pdf
 * or scripts/generate-corporate-pdf-report.ts.
 *
 * Sources:
 *   - Recursive PNG/JPEG evidence under OXYILE PLATFORM SS
 *   - Environment variable NAMES only from .env.local / .env / .env.example
 *
 * Output:
 *   Oxyile_Technical_Handover_Documentation_2026.pdf
 *
 * Run:
 *   npm run report:handover
 */
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

type ImageCategory =
  | 'architecture'
  | 'vercel'
  | 'gocardless'
  | 'supabase'
  | 'cms'
  | 'hr'
  | 'codebase'
  | 'platform';

type EvidenceImage = {
  absolutePath: string;
  relativePath: string;
  filename: string;
  category: ImageCategory;
  isHeroArchitecture: boolean;
  isVercelDeploy: boolean;
  mime: 'image/png' | 'image/jpeg';
  dataUri: string;
};

type EnvScanResult = {
  sourceFile: string;
  keys: string[];
};

type SqlMigrationRecord = {
  filename: string;
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  lineCount: number;
  description: string;
  moduleScope: string;
};

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_LIBRARY = path.join(PROJECT_ROOT, 'OXYILE PLATFORM SS');
const OUTPUT_PDF = path.join(PROJECT_ROOT, 'Oxyile_Technical_Handover_Documentation_2026.pdf');
const REPORT_ASSETS = path.join(PROJECT_ROOT, '.report-assets');
const OUTPUT_HTML = path.join(
  REPORT_ASSETS,
  'Oxyile_Technical_Handover_Documentation_2026.html'
);
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'supabase', 'migrations');
const NATURAL_SORT = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });
const HERO_ARCHITECTURE_PATTERN = /^a1\.(png|jpe?g)$/i;
const ENV_CANDIDATES = ['.env.local', '.env', '.env.example'] as const;

const CATEGORY_ORDER: ImageCategory[] = [
  'architecture',
  'vercel',
  'supabase',
  'gocardless',
  'cms',
  'hr',
  'codebase',
  'platform',
];

const universalCaptions: Record<ImageCategory, string> = {
  architecture:
    'Oxyile Full-Stack System Architecture, Service Boundaries & Infrastructure Schema',
  vercel:
    'Vercel Production Deployment Pipeline, Build Dashboard & Automated Git Integration',
  gocardless:
    'GoCardless Open Banking Direct Debit Mandate, Guarantor Liability & Escrow Funding Flow (£ GBP)',
  supabase:
    'Supabase Managed PostgreSQL, Multi-Tenant Row-Level Security (RLS) & Auth Control Plane',
  cms: 'Editorial Studio CMS, Social Syndication Controls & Real-Time SEO Publishing Workflow',
  hr: 'Enterprise HRMS / ATS Suite & £ GBP Standardised People Operations Interface',
  codebase: 'GitHub Repository Structure, Commit Integrity & Source-Control Governance Evidence',
  platform: 'Oxyile UK Platform Experience, Operational Surfaces & Product Infrastructure',
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;')
    .split("'")
    .join('&#039;');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads environment files and extracts KEY NAMES ONLY.
 * Secret values / tokens are discarded immediately and never retained.
 */
async function scanEnvKeys(): Promise<EnvScanResult> {
  for (const candidate of ENV_CANDIDATES) {
    const absolute = path.join(PROJECT_ROOT, candidate);
    if (!(await pathExists(absolute))) continue;

    const raw = await readFile(absolute, 'utf8');
    const keys: string[] = [];
    const seen = new Set<string>();

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Support optional "export KEY=value" and ignore malformed lines.
      const withoutExport = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trim()
        : trimmed;
      const eq = withoutExport.indexOf('=');
      if (eq <= 0) continue;

      const key = withoutExport.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
      // Intentionally discard everything after "=" — never store secret values.
    }

    keys.sort((a, b) => NATURAL_SORT.compare(a, b));
    return { sourceFile: candidate, keys };
  }

  return { sourceFile: '(none found)', keys: [] };
}

function classifyEnvGroup(key: string): string {
  const upper = key.toUpperCase();
  if (upper.includes('SUPABASE') || upper === 'ADMIN_EMAIL') return 'Supabase Auth & Data Plane';
  if (upper.includes('GOCARDLESS')) return 'GoCardless Open Banking (£ GBP)';
  if (upper.includes('POLYGON') || upper.includes('WEB3') || upper.includes('CONTRACT')) {
    return 'Polygon Blockchain Audit';
  }
  if (upper.includes('RESEND') || upper.includes('SMTP') || upper.includes('EMAIL')) {
    return 'Resend / Transactional Email';
  }
  if (upper.includes('MAKE') || upper.includes('WEBHOOK') || upper.includes('NEWSLETTER')) {
    return 'Make.com / Syndication & Webhooks';
  }
  if (upper.includes('VERCEL') || upper.includes('APP_URL') || upper.includes('NEXT_PUBLIC_SITE')) {
    return 'Application Hosting & Public URLs';
  }
  if (upper.startsWith('NEXT_PUBLIC_')) return 'Public Client Configuration';
  if (upper.includes('REPORT_') || upper.includes('AUTH_')) return 'Internal Tooling / Report Auth';
  return 'Platform & Operational Configuration';
}

function envGroupNarrative(group: string): string {
  switch (group) {
    case 'Supabase Auth & Data Plane':
      return 'These keys establish the browser-safe Supabase project URL and anonymous key, the server-only service-role credential used by trusted route handlers, and administrative identity gates. They control authentication session issuance, Postgres access through the Supabase client libraries, Storage uploads, and Realtime channel authorisation. The service-role key must never enter a client bundle.';
    case 'GoCardless Open Banking (£ GBP)':
      return 'These keys select the GoCardless sandbox or live environment and authenticate Billing Request, mandate and payment API calls denominated in British Pounds. They also influence webhook verification configuration and hosted redirect destinations such as pay-sandbox.gocardless.com during pre-production testing.';
    case 'Polygon Blockchain Audit':
      return 'These keys configure the RPC endpoint, relayer wallet and optional handshake contract address used to submit zero-value audit transactions after fiat escrow conditions are satisfied. Private keys remain server-side only and produce immutable Polygon transaction hashes for FCA-facing transparency.';
    case 'Resend / Transactional Email':
      return 'These keys authorise Resend (or SMTP fallback) delivery of verification messages, guarantor invitations, interview invites, operational alerts and £ GBP digital offer letters. From-address and API credentials determine deliverability and brand attribution.';
    case 'Make.com / Syndication & Webhooks':
      return 'These keys identify event-driven Make.com scenario endpoints that receive Admin Editorial Studio publish events and syndicate approved cover images, titles and canonical links to LinkedIn and Instagram. Staging and production webhook URLs must be rotated independently.';
    case 'Application Hosting & Public URLs':
      return 'These keys define the canonical application origin used for OAuth redirects, guarantor invite links, payment completion callbacks and Vercel preview versus production URL resolution.';
    case 'Public Client Configuration':
      return 'NEXT_PUBLIC_* keys are intentionally exposed to the browser bundle. They must contain only non-secret configuration such as public project URLs or publishable identifiers. Any secret must use a server-only name without the NEXT_PUBLIC_ prefix.';
    case 'Internal Tooling / Report Auth':
      return 'These keys support internal automation, evidence packaging and authorised test sessions. They are operational tooling controls and must not be confused with customer-facing payment or custody credentials.';
    default:
      return 'These keys contribute to platform behaviour, feature flags or supporting integrations. Each must be inventoried, owned and rotated under the executive handover process without embedding secret values in documentation.';
  }
}

async function walkImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkImages(absolute);
      if (entry.isFile() && /\.(png|jpe?g)$/i.test(entry.name)) return [absolute];
      return [];
    })
  );
  return nested.flat();
}

function categoriseImage(relativePath: string): ImageCategory {
  const value = relativePath.split('\\').join('/').toLowerCase();
  const filename = path.basename(value);

  if (
    value.includes('vercel') ||
    value.includes('deployment') ||
    /^vercel\./.test(filename) ||
    /^deployment\./.test(filename) ||
    /^build\./.test(filename)
  ) {
    return 'vercel';
  }
  if (
    value.includes('gocardless') ||
    value.includes('guarantor') ||
    value.includes('payment/') ||
    value.includes('handshake') ||
    value.includes('lending') ||
    value.includes('investor') ||
    value.includes('invester') ||
    value.includes('borrower')
  ) {
    return 'gocardless';
  }
  if (
    value.includes('blogger') ||
    value.includes('seo') ||
    value.includes('editorial') ||
    /^bl\d+\./.test(filename)
  ) {
    return 'cms';
  }
  if (
    value.includes('rls') ||
    value.includes('supabase') ||
    value.includes('backend and security') ||
    /(^|\/)db[._-]/.test(value) ||
    filename.startsWith('db')
  ) {
    return 'supabase';
  }
  if (value.includes('hr/') || value.includes('ats') || value.includes('careers') || value.includes('payroll')) {
    return 'hr';
  }
  if (value.includes('architecture/') || HERO_ARCHITECTURE_PATTERN.test(filename)) {
    return 'architecture';
  }
  if (value.includes('codebase') || value.includes('github') || value.includes('commit')) {
    return 'codebase';
  }
  return 'platform';
}

async function harvestEvidenceImages(): Promise<EvidenceImage[]> {
  const files = await walkImages(IMAGE_LIBRARY);
  files.sort((a, b) =>
    NATURAL_SORT.compare(path.relative(IMAGE_LIBRARY, a), path.relative(IMAGE_LIBRARY, b))
  );

  const images = await Promise.all(
    files.map(async (absolutePath): Promise<EvidenceImage> => {
      const relativePath = path.relative(IMAGE_LIBRARY, absolutePath);
      const filename = path.basename(absolutePath);
      const extension = path.extname(absolutePath).toLowerCase();
      const mime = extension === '.png' ? 'image/png' : 'image/jpeg';
      const bytes = await readFile(absolutePath);
      const category = categoriseImage(relativePath);
      return {
        absolutePath,
        relativePath,
        filename,
        category,
        isHeroArchitecture: HERO_ARCHITECTURE_PATTERN.test(filename),
        isVercelDeploy: category === 'vercel',
        mime,
        dataUri: `data:${mime};base64,${bytes.toString('base64')}`,
      };
    })
  );

  return images.sort((a, b) => {
    if (a.isHeroArchitecture !== b.isHeroArchitecture) return a.isHeroArchitecture ? -1 : 1;
    const categoryDelta = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return categoryDelta || NATURAL_SORT.compare(a.relativePath, b.relativePath);
  });
}

const SQL_SCAN_SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.report-assets',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
]);

/**
 * Recursively discovers every `.sql` file under `dir`, skipping build/vendor trees.
 */
async function getAllSqlFiles(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];

  const discovered: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SQL_SCAN_SKIP_DIRS.has(entry.name)) continue;
        await walk(absolute);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.sql')) {
        discovered.push(absolute);
      }
    }
  }

  await walk(dir);
  return discovered;
}

function inferMigrationMeta(filename: string): { description: string; moduleScope: string } {
  const stem = filename.replace(/\.sql$/i, '').toLowerCase();

  if (/master_schema|phase2_schema/.test(stem)) {
    return {
      description: 'Core PostgreSQL baseline schema & foundational tables',
      moduleScope: 'Core Lending',
    };
  }
  if (/phase\d+_migrations|phase\d+_/.test(stem) && /payment|integrity/.test(stem)) {
    return {
      description: 'Payment integrity constraints & settlement safeguards',
      moduleScope: 'Payments & Escrow',
    };
  }
  if (/phase\d+_migrations|phase\d+_/.test(stem) && /staff|bootstrap/.test(stem)) {
    return {
      description: 'Staff directory bootstrap & privileged role seed',
      moduleScope: 'Identity & Roles',
    };
  }
  if (/phase\d+/.test(stem)) {
    return {
      description: 'Incremental platform schema phase migration',
      moduleScope: 'Core Lending',
    };
  }
  if (/admin_review|review_workflow/.test(stem)) {
    return {
      description: 'Admin review workflow queues & decision audit trail',
      moduleScope: 'Admin Control Plane',
    };
  }
  if (/chat_schema|dashboard_social/.test(stem)) {
    return {
      description: 'In-app messaging & dashboard social surfaces schema',
      moduleScope: 'Platform UX',
    };
  }
  if (/profiles_rls|rls_recursion/.test(stem)) {
    return {
      description: 'Profiles RLS recursion fix & policy hardening',
      moduleScope: 'RLS Policies',
    };
  }
  if (/enterprise_hr|careers_sync|job_editor|employee/.test(stem)) {
    return {
      description: 'HR Portal Suite tables, careers sync & employee RLS',
      moduleScope: 'HRMS £ GBP',
    };
  }
  if (/blogger_seo|blog_rejection|blog_studio|publishing_metadata/.test(stem)) {
    return {
      description: 'Blogger SEO Studio schema & publishing metadata',
      moduleScope: 'Editorial CMS',
    };
  }
  if (/guarantor|co.?applicant|mandate/.test(stem)) {
    return {
      description: 'GoCardless mandate & co-applicant liability tables',
      moduleScope: 'Payments & Escrow',
    };
  }
  if (/handshake|collateral|funded/.test(stem)) {
    return {
      description: 'P2P handshake lifecycle, collateral & funding status',
      moduleScope: 'Core Lending',
    };
  }
  if (/questionnaire|pitch_questions|waitlist/.test(stem)) {
    return {
      description: 'Waitlist pitch questionnaire & lead capture columns',
      moduleScope: 'Growth / Waitlist',
    };
  }
  if (/profile|kyc|user_status|role_management|handle_new_user|user_profile/.test(stem)) {
    return {
      description: 'Identity profiles, KYC persistence & role management',
      moduleScope: 'Identity & Roles',
    };
  }
  if (/documents_bucket|storage_policies|realtime/.test(stem)) {
    return {
      description: 'Storage buckets, policies & realtime channel enablement',
      moduleScope: 'Storage & Realtime',
    };
  }
  if (/financial_views|profile_financial/.test(stem)) {
    return {
      description: 'Profile financial hub views & investor/borrower aggregates',
      moduleScope: 'Core Lending',
    };
  }

  const words = stem
    .replace(/^\d+_/, '')
    .split(/[_-]+/)
    .filter((w) => w && !/^\d+$/.test(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return {
    description: words.length ? words.join(' ') : 'Platform schema migration',
    moduleScope: 'Platform Schema',
  };
}

/**
 * Discovers every `.sql` migration (default: `supabase/migrations/`, project-root fallback),
 * then extracts filename, size, line count, inferred description and module scope.
 */
async function listMigrationFiles(): Promise<SqlMigrationRecord[]> {
  let absolutePaths = await getAllSqlFiles(MIGRATIONS_DIR);

  if (!absolutePaths.length) {
    absolutePaths = await getAllSqlFiles(PROJECT_ROOT);
  }

  const records: SqlMigrationRecord[] = [];

  for (const absolutePath of absolutePaths) {
    const filename = path.basename(absolutePath);
    const [fileStat, contents] = await Promise.all([
      stat(absolutePath),
      readFile(absolutePath, 'utf8'),
    ]);
    const lineCount = contents.length === 0 ? 0 : contents.split(/\r?\n/).length;
    const meta = inferMigrationMeta(filename);

    records.push({
      filename,
      absolutePath,
      relativePath: path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join('/'),
      sizeBytes: fileStat.size,
      lineCount,
      description: meta.description,
      moduleScope: meta.moduleScope,
    });
  }

  records.sort((a, b) => {
    const aTs = a.filename.match(/^(\d{14})_/);
    const bTs = b.filename.match(/^(\d{14})_/);
    if (aTs && bTs) return aTs[1].localeCompare(bTs[1]);
    if (aTs && !bTs) return -1;
    if (!aTs && bTs) return 1;
    return NATURAL_SORT.compare(a.filename, b.filename);
  });

  return records;
}

function categoryCount(images: EvidenceImage[], category: ImageCategory): number {
  return images.filter((image) => image.category === category && !image.isHeroArchitecture).length;
}

function heroArchitectureFigure(hero: EvidenceImage): string {
  const caption = 'Oxyile Complete Full-Stack System Architecture & Interconnection Schema';
  return `
    <figure class="hero-architecture no-break">
      <img src="${hero.dataUri}" alt="${escapeHtml(caption)}" />
      <figcaption><strong>Figure 1.1: ${escapeHtml(caption)}.</strong>
      Primary architecture record <span>${escapeHtml(hero.relativePath)}</span>.</figcaption>
    </figure>`;
}

function evidenceGallery(
  images: EvidenceImage[],
  category: ImageCategory,
  chapterNumber: number,
  title?: string,
  startIndex = 1,
  options?: { onlyVercel?: boolean; excludeHero?: boolean; limit?: number }
): string {
  let categoryImages = images.filter((image) => image.category === category);
  if (options?.excludeHero !== false) {
    categoryImages = categoryImages.filter((image) => !image.isHeroArchitecture);
  }
  if (options?.onlyVercel) {
    categoryImages = categoryImages.filter((image) => image.isVercelDeploy);
  }
  if (options?.limit && options.limit > 0) {
    categoryImages = categoryImages.slice(0, options.limit);
  }
  if (!categoryImages.length) return '';

  const subject = universalCaptions[category];
  return `
    <section class="evidence-section">
      <div class="evidence-heading no-break">
        <div class="section-rule"></div>
        <h3>${escapeHtml(title ?? universalCaptions[category])}</h3>
        <p>${categoryImages.length} selected infrastructure and interface records from the reviewed evidence library.</p>
      </div>
      ${categoryImages
        .map((image, index) => {
          const figureNo = startIndex + index;
          const caption =
            category === 'vercel' && index === 0
              ? 'Vercel Production Deployment Pipeline & Automated Git Integration'
              : subject;
          return `
            <figure class="no-break">
              <img src="${image.dataUri}" alt="${escapeHtml(caption)}" />
              <figcaption>
                <strong>Figure ${chapterNumber}.${figureNo}: ${escapeHtml(caption)}.</strong>
                Evidence record <span>${escapeHtml(image.relativePath)}</span>.
              </figcaption>
            </figure>`;
        })
        .join('')}
    </section>`;
}

function renderEnvInventory(env: EnvScanResult): string {
  if (!env.keys.length) {
    return `
      <div class="callout">
        <strong>Environment inventory unavailable.</strong> No readable
        <code>.env.local</code>, <code>.env</code> or <code>.env.example</code> file was found.
        Create a local environment file before operational handover so key ownership can be verified without exposing secret values.
      </div>`;
  }

  const grouped = new Map<string, string[]>();
  for (const key of env.keys) {
    const group = classifyEnvGroup(key);
    const list = grouped.get(group) ?? [];
    list.push(key);
    grouped.set(group, list);
  }

  const blocks = Array.from(grouped.entries())
    .map(
      ([group, keys]) => `
        <article class="env-group">
          <h3>${escapeHtml(group)}</h3>
          <p>${escapeHtml(envGroupNarrative(group))}</p>
          <pre class="env-keys" aria-label="${escapeHtml(group)} variable names">${keys
            .map((key) => escapeHtml(`${key}=`))
            .join('\n')}</pre>
          <p class="formal-note">Values intentionally omitted. Rotate and transfer secrets through a secure channel during executive account handover.</p>
        </article>`
    )
    .join('');

  return `
    <p class="lede">The following inventory was parsed from <strong>${escapeHtml(
      env.sourceFile
    )}</strong>. Only variable names are reproduced. Secret tokens, private keys and webhook URLs were stripped at parse time and are not present in this document.</p>
    ${blocks}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function migrationListHtml(migrations: SqlMigrationRecord[]): string {
  if (!migrations.length) {
    return '<p>No SQL migration files were discovered under <code>supabase/migrations</code> or the project root fallback scan.</p>';
  }

  const rows = migrations
    .map(
      (migration, index) => `
      <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="mig-file"><code>${escapeHtml(migration.filename)}</code>
          <div class="mig-meta">${escapeHtml(migration.description)} · ${migration.lineCount} lines · ${escapeHtml(
            formatBytes(migration.sizeBytes)
          )}</div>
        </td>
        <td>${escapeHtml(migration.moduleScope)}</td>
        <td><span class="status-badge">Applied &amp; Version Controlled</span></td>
      </tr>`
    )
    .join('');

  return `
    <p>The repository currently contains <strong>${migrations.length}</strong> forward-only SQL migration files consolidated under <code>supabase/migrations</code>. Each file is applied sequentially through the Supabase CLI or linked project pipeline. Existing migrations are never rewritten in place; schema evolution continues through new files only. Timestamp-prefixed files sort chronologically; legacy phase scripts retain their original filenames.</p>
    <table class="migration-table">
      <thead>
        <tr>
          <th>Migration File Name</th>
          <th>Module / Scope</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

function buildHandoverHtml(
  images: EvidenceImage[],
  env: EnvScanResult,
  migrations: SqlMigrationRecord[],
  hero: EvidenceImage
): string {
  const vercelImages = images.filter((image) => image.category === 'vercel');
  const supabaseImages = images.filter(
    (image) => image.category === 'supabase' && !image.isHeroArchitecture
  );
  const gocardlessImages = images.filter((image) => image.category === 'gocardless');
  const cmsImages = images.filter((image) => image.category === 'cms');
  const codebaseImages = images.filter((image) => image.category === 'codebase');

  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <title>Oxyile Technical Handover Documentation 2026</title>
    <style>
      @page { size: A4; margin: 20mm 15mm 22mm 15mm; }
      * { box-sizing: border-box; }
      :root {
        --ink:#1f2937; --charcoal:#111827; --muted:#4b5563; --line:#E5E7EB;
        --paper:#FFFFFF; --soft:#F9FAFB; --orange:#F97316; --orange-soft:#FFF7ED;
      }
      html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      body {
        margin:0; background:var(--paper); color:var(--ink);
        font-family:Arial,"Segoe UI",sans-serif; font-size:9.6pt; line-height:1.62;
      }
      h1,h2,h3 { color:#111827; page-break-after:avoid; break-after:avoid; margin-top:1.4em; margin-bottom:.45em; }
      h1 { font-family:Georgia,"Times New Roman",serif; font-size:28pt; line-height:1.1; letter-spacing:-.02em; }
      h2 { font-family:Georgia,"Times New Roman",serif; font-size:18.5pt; line-height:1.2;
        border-bottom:2px solid var(--orange); padding-bottom:8px; }
      h3 { font-size:12.5pt; }
      p { margin:0 0 2.8mm; orphans:3; widows:3; }
      strong { color:#111827; }
      code, pre { font-family:Consolas,"Courier New",monospace; }
      .page-break { page-break-after:always; break-after:page; }
      .no-break { page-break-inside:avoid; break-inside:avoid; }
      .cover {
        min-height:255mm; margin:-20mm -15mm -22mm; padding:26mm 22mm 20mm; color:#fff;
        display:flex; flex-direction:column; justify-content:space-between;
        background:radial-gradient(circle at 82% 10%,#9A3412 0,#1f2937 34%,#030712 78%);
      }
      .cover h1 { color:#fff; border:0; padding:0; max-width:170mm; margin:12mm 0 7mm; }
      .brand-rule { width:24mm; height:3.5mm; border-radius:99px; background:var(--orange); }
      .eyebrow,.chapter-label {
        color:var(--orange); text-transform:uppercase; letter-spacing:.18em;
        font-size:8pt; font-weight:900;
      }
      .cover .subtitle { max-width:150mm; color:#E5E7EB; font-size:12.5pt; line-height:1.5; }
      .cover-meta { display:grid; grid-template-columns:1fr 1fr; gap:6mm; border-top:1px solid #374151; padding-top:8mm; }
      .cover-meta b { display:block; color:#FB923C; font-size:7.5pt; text-transform:uppercase; letter-spacing:.12em; }
      .cover-meta span { display:block; margin-top:1.5mm; color:#F3F4F6; }
      .lede { color:#374151; font-family:Georgia,"Times New Roman",serif; font-size:11.2pt; line-height:1.62; }
      .toc { list-style:none; padding:0; margin:6mm 0 0; }
      .toc li {
        display:grid; grid-template-columns:10mm 1fr auto; gap:3mm; padding:2.6mm 0;
        border-bottom:1px solid var(--line); align-items:baseline;
      }
      .toc .number { color:var(--orange); font-weight:900; }
      .callout {
        margin:4mm 0; padding:4mm; border-left:1.3mm solid var(--orange);
        border-radius:0 3mm 3mm 0; background:var(--orange-soft);
      }
      .section-rule { width:14mm; height:1.5mm; border-radius:99px; background:var(--orange); margin-bottom:3mm; }
      .evidence-heading { margin:6mm 0 3mm; }
      .evidence-heading p { color:var(--muted); }
      figure { margin:20px auto; text-align:center; page-break-inside:avoid; break-inside:avoid; max-width:95%; }
      figure img {
        display:inline-block; max-width:100%; max-height:360px; object-fit:contain;
        border:1px solid #e5e7eb; border-radius:8px; background:#fff;
        box-shadow:0 4px 6px -1px rgba(0,0,0,.05);
      }
      .hero-architecture img { max-height:520px; }
      figcaption { font-size:.85rem; font-weight:600; color:#4b5563; margin-top:8px; line-height:1.4; }
      figcaption span { color:#6b7280; font-weight:500; font-size:7.2pt; }
      .inventory-table, .control-table {
        width:100%; border-collapse:collapse; margin:5mm 0; font-size:8.7pt;
      }
      .inventory-table th, .inventory-table td,
      .control-table th, .control-table td {
        border:1px solid var(--line); padding:2.6mm 2.4mm; vertical-align:top; text-align:left;
      }
      .inventory-table th, .control-table th, .migration-table th { background:var(--charcoal); color:#fff; }
      .inventory-table td:first-child, .control-table td:first-child { font-weight:700; width:22%; }
      tr { page-break-inside:avoid; break-inside:avoid; }
      .migration-table {
        width:100%; border-collapse:collapse; margin:4mm 0 6mm; font-size:8pt;
      }
      .migration-table th, .migration-table td {
        border:1px solid var(--line); padding:2.4mm 2.2mm; vertical-align:top; text-align:left;
      }
      .migration-table th:nth-child(1) { width:58%; }
      .migration-table th:nth-child(2) { width:24%; }
      .migration-table th:nth-child(3) { width:18%; }
      .migration-table tbody tr { page-break-inside:avoid; break-inside:avoid; }
      .migration-table tr.row-even td { background:#ffffff; }
      .migration-table tr.row-odd td { background:#F8FAFC; }
      .migration-table .mig-file code {
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        font-size:7.4pt; color:#111827; word-break:break-all;
      }
      .migration-table .mig-meta { margin-top:1mm; color:var(--muted); font-size:7.2pt; line-height:1.35; }
      .status-badge {
        display:inline-block; padding:1.2mm 2mm; border-radius:2mm;
        background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;
        font-size:6.8pt; font-weight:800; letter-spacing:0.02em; white-space:nowrap;
      }
      .architecture-grid { display:grid; grid-template-columns:1fr 1fr; gap:3.5mm; margin:4mm 0; }
      .architecture-card {
        padding:4mm; border:1px solid var(--line); border-radius:4mm; background:var(--soft);
        page-break-inside:avoid; break-inside:avoid;
      }
      .architecture-card p { margin:0; color:var(--muted); }
      .env-group { margin:5mm 0 7mm; page-break-inside:avoid; break-inside:avoid; }
      .env-keys {
        margin:3mm 0; padding:4mm; border:1px solid #FED7AA; border-radius:3mm;
        background:#111827; color:#FDBA74; font-size:8.4pt; line-height:1.55; white-space:pre-wrap;
      }
      .workflow-block {
        margin:4mm 0; padding:4mm; border:1px solid var(--line); border-radius:4mm; background:var(--soft);
      }
      .roadmap-item {
        display:grid; grid-template-columns:18mm 1fr; gap:4mm; padding:4mm 0;
        border-bottom:1px solid var(--line);
      }
      .step-marker {
        align-self:start; padding:2.4mm 2mm; border-radius:3mm; background:var(--charcoal);
        color:#fff; font-size:7.5pt; font-weight:900; text-align:center;
      }
      .conclusion {
        padding:5mm; border:1px solid var(--line); border-top:1.5mm solid var(--orange);
        border-radius:4mm; background:var(--soft);
      }
      .formal-note { color:#6b7280; font-size:8.2pt; }
    </style>
  </head>
  <body>
    <section class="cover page-break">
      <div>
        <div class="brand-rule"></div>
        <div class="eyebrow" style="margin-top:16mm">Director technical due diligence pack</div>
        <h1>OXYILE TECHNICAL HANDOVER &amp; SYSTEM ARCHITECTURE MANUAL</h1>
        <p class="subtitle">Exhaustive infrastructure, repository, environment-key, CI/CD and third-party integration handover documentation prepared for executive technical review · 2026</p>
      </div>
      <div class="cover-meta">
        <div><b>Prepared by</b><span>Priyanshu<br/>Lead Full-Stack &amp; Interactive Platform Developer</span></div>
        <div><b>Market standard</b><span>United Kingdom<br/>British Pounds (£ GBP) throughout</span></div>
        <div><b>Document class</b><span>Technical Handover Manual<br/>Due diligence / operational transfer</span></div>
        <div><b>Evidence base</b><span>${images.length} platform interface records<br/>${env.keys.length} environment keys (names only)</span></div>
      </div>
    </section>

    <section class="page-break">
      <div class="chapter-label">Document navigation</div>
      <h2>Table of Contents</h2>
      <p class="lede">This manual answers the Director’s technical due diligence request with eight exhaustive chapters covering architecture, repository governance, service inventory, database security, environment keys, local and Vercel deployment, third-party integrations and the outstanding Q3–Q4 transfer roadmap.</p>
      <ol class="toc">
        <li><span class="number">01</span><span>System Architecture Overview &amp; Platform Infrastructure</span><span>Hero + overview</span></li>
        <li><span class="number">02</span><span>Repository Inventory, Workspace Structure &amp; Git Governance</span><span>${codebaseImages.length} figures</span></li>
        <li><span class="number">03</span><span>Comprehensive Account &amp; Service Inventory</span><span>Provider matrix</span></li>
        <li><span class="number">04</span><span>Database Engine, RLS Security Matrix &amp; Migration History</span><span>${migrations.length} SQL · ${supabaseImages.length} figures</span></li>
        <li><span class="number">05</span><span>Required Environment Variables Inventory (Keys Only)</span><span>${env.keys.length} keys</span></li>
        <li><span class="number">06</span><span>Local Development Setup &amp; Vercel CI/CD Deployment Pipeline</span><span>${vercelImages.length} figures</span></li>
        <li><span class="number">07</span><span>Third-Party Integration Architecture &amp; Workflow Encyclopedia</span><span>${gocardlessImages.length + cmsImages.length} figures</span></li>
        <li><span class="number">08</span><span>Technical Risk Evaluation, Known Items &amp; Q3–Q4 Roadmap</span><span>Transfer plan</span></li>
      </ol>
      <div class="callout">
        <strong>Document standing.</strong> This handover manual describes the engineering estate, operational ownership and transfer readiness of the Oxyile platform. It is not, by itself, evidence of FCA authorisation, a legal opinion, an audit opinion or a completed credential transfer.
      </div>
    </section>

    <section>
      <div class="chapter-label">Chapter 1</div>
      <h2>System Architecture Overview &amp; Platform Infrastructure</h2>
      <p class="lede">Oxyile is a United Kingdom FinTech lending and operations platform assembled as a serverless full-stack system. The product surface is a Next.js App Router application hosted on Vercel’s Edge Network. Durable business state, authentication, storage and realtime event fan-out are provided by Supabase Managed PostgreSQL with Row-Level Security. Fiat collection and guarantor Direct Debit mandates are executed through GoCardless Open Banking APIs in £ GBP. Successful escrow events are anchored to Polygon as tamper-evident audit references for regulatory transparency.</p>
      ${heroArchitectureFigure(hero)}
      <h3>Control-plane topology</h3>
      <p>The architecture deliberately separates untrusted browser clients from trusted mutation boundaries. Public marketing and waitlist routes render through the App Router with minimal privileged data. Authenticated Investor, Borrower, Guarantor, Blogger, HR and Admin workspaces resolve identity on the server before first paint. Client components may subscribe to Realtime channels and present optimistic UI, but they never hold settlement authority. Mutations concentrate in server actions and route handlers where session cookies, role claims, ownership predicates, input validation and lifecycle state are re-verified.</p>
      <div class="architecture-grid">
        <article class="architecture-card"><h3>Next.js App Router</h3><p>Route groups isolate public acquisition from protected dashboards. React Server Components retrieve identity and authorised records. Edge-compatible middleware and layout guards reject absent sessions before privileged UI is composed.</p></article>
        <article class="architecture-card"><h3>Vercel Edge CDN</h3><p>Production builds are distributed globally with TLS termination, preview deployments for pull requests, automatic rollbacks and zero-downtime promotions from the connected GitHub repository.</p></article>
        <article class="architecture-card"><h3>Supabase PostgreSQL + RLS</h3><p>Transactional state for profiles, handshakes, mandates, editorial posts, ATS and HRMS entities lives in Postgres 15+. RLS isolates borrowers, investors, guarantors and administrators. Realtime publishes committed changes over websockets.</p></article>
        <article class="architecture-card"><h3>GoCardless + Polygon</h3><p>GoCardless hosts UK Direct Debit mandate authorisation and £ GBP collection. Polygon carries post-settlement audit hashes. Provider receipts, ledger rows and chain hashes remain separately reconcilable evidence artefacts.</p></article>
      </div>
      <h3>Why this topology satisfies director due diligence</h3>
      <p>The estate is designed so that every material financial transition can be attributed to an authenticated actor, constrained by database state, reconciled to an external provider identifier and inspected through management evidence. British Pounds are the exclusive customer-facing currency. Client-money receipt is distinguished from settlement and release. Guarantor mandates are contingent fallback instruments, not silent primary collection. Blockchain anchors supplement—never replace—the signed agreement and operational ledger.</p>
      <div class="callout"><strong>Infrastructure thesis.</strong> Serverless compute, managed Postgres with RLS, hosted Open Banking mandates and on-chain audit references form one interconnected control plane rather than a set of disconnected prototypes.</div>
    </section>

    <section>
      <div class="chapter-label">Chapter 2</div>
      <h2>Repository Inventory, Workspace Structure &amp; Git Governance</h2>
      <p class="lede">The Oxyile codebase is maintained as a private GitHub organisation repository. Source integrity, secret hygiene and reviewable history are treated as first-class operational controls for executive handover.</p>
      <h3>Workspace anatomy</h3>
      <p>The <code>/app</code> directory contains the Next.js App Router trees for public pages, authenticated dashboards, admin and HR portals, guarantor review flows, payment completion routes and API handlers. Feature UI lives under <code>/components</code>, organised by domain (dashboard, payments, blogger, hr, admin, guarantor). Shared domain logic, clients, validation and web3 helpers reside in <code>/lib</code>. Provider adapters such as GoCardless and Polygon services are concentrated in <code>/services</code>. Database evolution is recorded exclusively under <code>/supabase/migrations</code>. Operational publishers and internal tooling live in <code>/scripts</code>, including this handover document generator as a standalone module that does not alter prior whitepaper artefacts.</p>
      <p>Supporting directories include <code>/public</code> for static assets, <code>/data</code> for curated non-secret datasets where applicable, and evidence folders such as <code>OXYILE PLATFORM SS</code> for reviewed interface records used in director documentation. Build outputs (<code>.next</code>), dependencies (<code>node_modules</code>) and generated report assets (<code>.report-assets</code>) remain machine-local artefacts.</p>
      <h3>Git branching and commit integrity</h3>
      <p>Day-to-day delivery proceeds through feature branches merged into the primary protected branch via pull requests. Vercel preview deployments attach to pull requests so reviewers can inspect UI and API behaviour before promotion. Commit history preserves attribution, migration filenames and integration changes in chronological order. Force-push to protected branches and rewriting of published migration history are prohibited. Directors should treat the GitHub audit log, branch protection settings and required status checks as part of the formal handover checklist.</p>
      <h3>.gitignore security hygiene</h3>
      <p>The repository <code>.gitignore</code> excludes <code>.env</code>, <code>.env*.local</code>, <code>node_modules</code>, <code>.next</code>, coverage artefacts and <code>.report-assets</code>. Environment files containing secrets must never be committed. Local developer machines keep <code>.env.local</code> outside version control; production and preview environments receive secrets through Vercel project settings and Supabase project secrets. This separation is a non-negotiable control for credential handover.</p>
      ${evidenceGallery(images, 'codebase', 2, 'Repository structure and commit governance evidence', 1, { limit: 8 })}
    </section>

    <section>
      <div class="chapter-label">Chapter 3</div>
      <h2>Comprehensive Account &amp; Service Inventory</h2>
      <p class="lede">The following matrix inventories the primary infrastructure providers, environments and administrative readiness status for executive transfer. Region selections favour UK/EU data-residency posture where the platform’s regulated lending and HR processing require it.</p>
      <table class="inventory-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Service Provider</th>
            <th>Environment / Region</th>
            <th>Administrative Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Source Control</td>
            <td>GitHub (Private Organization)</td>
            <td>Global Cloud</td>
            <td>Managed by Lead Dev (Ready for Handover)</td>
          </tr>
          <tr>
            <td>Application Hosting</td>
            <td>Vercel Enterprise</td>
            <td>Edge Network Global</td>
            <td>Managed by Lead Dev (Ready for Handover)</td>
          </tr>
          <tr>
            <td>Database &amp; Auth</td>
            <td>Supabase Cloud</td>
            <td>AWS EU-West (London)</td>
            <td>Managed by Lead Dev (Ready for Handover)</td>
          </tr>
          <tr>
            <td>Domain &amp; DNS</td>
            <td>GoDaddy + Vercel DNS</td>
            <td><code>oxyile.com</code></td>
            <td>Corporate Managed / Vercel Edge SSL</td>
          </tr>
          <tr>
            <td>Open Banking</td>
            <td>GoCardless API</td>
            <td>UK Sandbox &amp; Live (£ GBP)</td>
            <td>Managed by Lead Dev (Ready for Handover)</td>
          </tr>
          <tr>
            <td>Social Automation</td>
            <td>Make.com Webhooks</td>
            <td>EU Staging/Production</td>
            <td>Managed by Lead Dev (Ready for Handover)</td>
          </tr>
          <tr>
            <td>Transactional Email</td>
            <td>Resend SMTP</td>
            <td>Global Delivery</td>
            <td>Managed by Lead Dev (Ready for Handover)</td>
          </tr>
          <tr>
            <td>Blockchain Audit</td>
            <td>Polygon Network</td>
            <td>RPC Nodes</td>
            <td>Managed by Lead Dev (Ready for Handover)</td>
          </tr>
        </tbody>
      </table>
      <h3>Handover interpretation</h3>
      <p>Each row represents a discrete administrative trust boundary. Source control ownership controls who can merge schema and payment logic. Vercel ownership controls production promotions and environment secret scopes. Supabase ownership controls database, Auth, Storage and service-role credentials. Domain ownership controls TLS and brand trust. GoCardless ownership controls live £ GBP Direct Debit collection. Make.com ownership controls public social publication. Resend ownership controls outbound customer and employee messaging. Polygon relayer ownership controls on-chain audit submission. Formal transfer requires named executive accounts, MFA enrolment, secret rotation and revocation of interim developer break-glass access after dual control is confirmed.</p>
    </section>

    <section>
      <div class="chapter-label">Chapter 4</div>
      <h2>Database Engine, RLS Security Matrix &amp; Migration History</h2>
      <p class="lede">Oxyile’s system of record is Supabase Managed PostgreSQL 15+ deployed with a UK/EU residency posture on AWS EU-West (London). This placement supports UK GDPR expectations and FCA-facing data locality for lending, guarantor, KYC and workforce records.</p>
      <h3>Multi-tenant Row-Level Security architecture</h3>
      <p>Authentication is established by Supabase Auth. Application roles resolve to Investor, Borrower, Guarantor-linked identity, Blogger, HR and Admin workspaces. Direct browser access to tables is constrained by Row-Level Security policies that evaluate <code>auth.uid()</code> against participant foreign keys such as <code>borrower_id</code>, <code>lender_id</code> and <code>guarantor_user_id</code>, or against staff-directory roles for privileged portals. Guarantor invite emails are additionally matched in a fail-closed manner so co-applicants can read only the facilities they are linked to.</p>
      <p>RLS is necessary but not sufficient. Server actions and API routes repeat session, role and ownership checks before mutation. Service-role credentials are confined to trusted server modules. Public careers and marketing surfaces expose only deliberately published rows. Negative testing must prove that an unrelated authenticated user cannot read or alter another party’s handshake, editorial draft, applicant record or HR profile.</p>
      <h3>Operational resilience and PITR</h3>
      <p>Supabase Point-in-Time Recovery provides automated daily backup continuity for the managed project. Directors should confirm the active PITR window, backup retention, restore drill ownership and incident runbooks as part of production assurance. Schema changes never rewrite historical migration files; they append new timestamped SQL under <code>/supabase/migrations</code>.</p>
      <h3>Current migration catalogue</h3>
      ${migrationListHtml(migrations)}
      ${evidenceGallery(images, 'supabase', 4, 'Database, RLS and Supabase control-plane evidence')}
    </section>

    <section>
      <div class="chapter-label">Chapter 5</div>
      <h2>Required Environment Variables Inventory (Keys Only)</h2>
      ${renderEnvInventory(env)}
      <h3>Operational handling rules</h3>
      <p>Environment variables are grouped by trust boundary. <code>NEXT_PUBLIC_*</code> values may appear in the browser bundle and must remain non-secret. Server-only keys—service roles, GoCardless access tokens, webhook secrets, Polygon private keys and Make.com production URLs—must live in Vercel encrypted project settings and local <code>.env.local</code> files excluded from Git. During executive handover, values are transferred through a secure secret manager or out-of-band sealed process, then rotated so previous developer credentials cannot remain indefinitely valid.</p>
      <p>All customer-facing monetary integrations controlled by these keys are denominated in British Pounds (£ GBP). GoCardless amounts are converted to integer pence at the API boundary to avoid floating-point settlement ambiguity.</p>
    </section>

    <section>
      <div class="chapter-label">Chapter 6</div>
      <h2>Local Development Setup &amp; Vercel CI/CD Deployment Pipeline</h2>
      <p class="lede">This chapter is the developer onboarding and production promotion manual for the Oxyile repository. It assumes a Windows, macOS or Linux workstation with GitHub access and a provisioned Supabase project.</p>
      <h3>Local developer onboarding</h3>
      <div class="workflow-block">
        <p><strong>1. Runtime prerequisites.</strong> Install a current Node.js LTS release compatible with Next.js 15 (Node 20+ recommended), Git, and access to the private GitHub organisation. Confirm <code>node -v</code> and <code>npm -v</code> before cloning.</p>
        <p><strong>2. Repository bootstrap.</strong> Clone the private repository, enter the project root and execute <code>npm install</code> to resolve dependencies declared in <code>package.json</code> / <code>package-lock.json</code>.</p>
        <p><strong>3. Environment setup.</strong> Copy <code>.env.example</code> to <code>.env.local</code> and populate values through the secure secret channel. Never commit <code>.env.local</code>. Validate that Supabase URL/anon key, service role, GoCardless sandbox token and Polygon RPC settings resolve before starting the app.</p>
        <p><strong>4. Database alignment.</strong> Apply pending SQL migrations to the linked Supabase project using the organisation’s approved Supabase CLI or dashboard workflow. Confirm RLS policies and Storage buckets exist before exercising authenticated flows.</p>
        <p><strong>5. Local server.</strong> Run <code>npm run dev</code> and open the local origin (typically <code>http://127.0.0.1:3000</code>). Use <code>npm run lint</code> and <code>npm run build</code> before opening a pull request.</p>
      </div>
      <h3>Production CI/CD on Vercel</h3>
      <p>The GitHub repository is connected to Vercel so that every push and pull request triggers a remote build. The pipeline performs dependency installation, TypeScript type-checking through the Next.js build, ESLint validation according to project configuration, edge/server bundle optimisation and artefact publication to the Edge Network. Preview deployments provide shareable URLs for director and peer review. Promotion to production is a zero-downtime cutover that retains prior deployments for rapid rollback.</p>
      <p>Environment variables are scoped separately for Preview and Production. Sandbox GoCardless credentials must not silently point production traffic at live collection endpoints. Similarly, Make.com staging webhooks must not publish to production social handles until Chapter 8 transfer items are closed.</p>
      ${evidenceGallery(images, 'vercel', 6, 'Vercel deployment and build evidence', 1)}
      ${
        vercelImages.length
          ? ''
          : `<div class="callout"><strong>Vercel evidence note.</strong> No dedicated Vercel screenshot was present in the evidence library at generation time. The deployment description above remains authoritative; attach live Vercel dashboard exports during executive transfer if additional visual evidence is required.</div>`
      }
    </section>

    <section>
      <div class="chapter-label">Chapter 7</div>
      <h2>Third-Party Integration Architecture &amp; Workflow Encyclopedia</h2>
      <p class="lede">Oxyile’s product behaviour depends on four external systems of record and delivery: GoCardless for £ GBP Direct Debit and guarantor mandates, Make.com for social syndication, Polygon for audit anchoring, and Resend for transactional messaging. Each integration is documented below at engineering depth.</p>

      <h3>1. GoCardless Open Banking &amp; Guarantor Mandate API</h3>
      <p>Facility origination creates a handshake with principal, rate, tenure, collateral and guarantor email. The guarantor receives a signed invitation binding handshake identity, recipient email and issue time. Acceptance opens a hosted GoCardless authorisation journey. In sandbox, customers are redirected to experiences under <code>pay-sandbox.gocardless.com</code>. Provider test fixtures such as sort code <code>20-00-00</code> and account number <code>55779911</code> are used only for non-production validation; live account ownership is established inside the hosted provider flow.</p>
      <p>Server-side Billing Requests are created with currency GBP, bearer authorisation, API version headers and handshake metadata. The browser must receive a JSON authorisation URL and navigate by GET; it must never POST through a redirect as if the hosted page were an application form endpoint. On completion, webhook and completion routes reconcile the mandate identifier onto the handshake. Supabase Realtime then broadcasts the committed status so chat and portfolio surfaces update to “Guarantor Secured” without a page refresh. Webhook authenticity in production requires raw-body signature verification against the GoCardless endpoint secret before any mutation.</p>
      ${evidenceGallery(images, 'gocardless', 7, 'GoCardless, guarantor and escrow workflow evidence', 1, { limit: 12 })}

      <h3>2. Make.com Social Media Syndication Bridge</h3>
      <p>When an administrator approves an editorial article inside the Editorial Studio, the governed publish transition may emit an event-driven webhook to Make.com. The payload carries the approved title, canonical public URL, cover image reference and channel flags configured in the CMS. Make.com scenarios then format and publish to Oxyile’s LinkedIn and Instagram properties. Because financial-promotion content can appear in abbreviated social forms, syndication is intentionally gated behind human admin approval rather than automatic draft publication.</p>
      <p>Staging webhook URLs must target non-production social destinations. Production webhook URLs are a Chapter 8 transfer item and should be rotated during executive account handover so scenario ownership sits with corporate marketing operations.</p>
      ${evidenceGallery(images, 'cms', 7, 'Editorial CMS and social syndication evidence', Math.max(1, Math.min(12, gocardlessImages.length) + 1), { limit: 10 })}

      <h3>3. Polygon Blockchain Audit Trail Engine</h3>
      <p>After bilateral approval and authenticated £ GBP escrow finalisation, the server constructs a canonical representation of the handshake—party identifiers, principal, approval timestamps and optional guarantor identity—hashes that representation and submits a zero-value transaction through a server-held relayer wallet to Polygon. The confirmed transaction hash is written back to the operational handshake record. The chain artefact is a tamper-evident timestamped anchor for FCA-facing transparency. It does not hold bank credentials, does not move customer money and does not replace the signed legal agreement or PostgreSQL ledger.</p>
      <p>Partial-success handling is mandatory: if the chain write succeeds and the database update fails, operations retain the hash and reconcile rather than rebroadcasting an economic action. RPC outages enqueue controlled retries with idempotency.</p>

      <h3>4. Resend SMTP &amp; Transactional Messaging</h3>
      <p>Resend delivers verification emails, guarantor invitations, interview invites from the ATS, operational alerts and £ GBP locked digital offer letters. Templates and from-addresses must remain consistent with the <code>oxyile.com</code> domain authentication posture (SPF/DKIM/DMARC). Offer letters and payroll-adjacent figures are denominated exclusively in British Pounds. Message content that constitutes a financial promotion or employment decision support artefact must preserve human review upstream of send where policy requires it.</p>
      ${evidenceGallery(images, 'hr', 7, 'People-operations messaging and HRMS context evidence', Math.max(1, Math.min(12, gocardlessImages.length) + Math.min(10, cmsImages.length) + 1), { limit: 6 })}
    </section>

    <section>
      <div class="chapter-label">Chapter 8</div>
      <h2>Technical Risk Evaluation, Known Items &amp; Q3–Q4 Roadmap</h2>
      <p class="lede">The July/August 2026 engineering baseline is operationally coherent for director review, yet three transfer and production-hardening items remain explicitly scheduled. Treating them as a roadmap—not as undocumented debt—is part of responsible handover.</p>

      <article class="roadmap-item">
        <div class="step-marker">01</div>
        <div>
          <h3>Production Gateway Switch</h3>
          <p>Transition GoCardless endpoints from sandbox hosts such as <code>pay-sandbox.gocardless.com</code> to production Live URLs only after FCA sign-off, live credential issuance, webhook signature verification evidence, reconciliation runbooks and dual-control approval. Sandbox fixtures (<code>20-00-00 / 55779911</code>) must be purged from operational playbooks before live traffic. £ GBP currency locks remain mandatory in both environments.</p>
        </div>
      </article>
      <article class="roadmap-item">
        <div class="step-marker">02</div>
        <div>
          <h3>Production Marketing Webhooks</h3>
          <p>Update Make.com webhook URLs and scenario ownership to production social handles for LinkedIn and Instagram. Confirm that Admin “Approve &amp; Publish” events cannot reach production channels from preview deployments. Document rollback by disabling the production scenario without blocking editorial approval inside the CMS.</p>
        </div>
      </article>
      <article class="roadmap-item">
        <div class="step-marker">03</div>
        <div>
          <h3>Executive Account Transfer</h3>
          <p>Execute formal transfer of infrastructure administrator credentials for Vercel, Supabase, GoDaddy, GitHub organisation ownership, GoCardless, Make.com, Resend and Polygon relayer custody to executive leadership. Enrol MFA, rotate all secrets listed in Chapter 5, revoke interim personal access where dual control is established, and record acceptance in the director pack.</p>
        </div>
      </article>

      <h3>Residual technical risks requiring oversight</h3>
      <table class="control-table">
        <thead><tr><th>Risk domain</th><th>Current posture and required action</th></tr></thead>
        <tbody>
          <tr><td>Webhook authenticity</td><td>Production must fail closed on GoCardless signature verification before mutating financial state.</td></tr>
          <tr><td>Secret sprawl</td><td>Chapter 5 lists key names only; value rotation during account transfer is mandatory.</td></tr>
          <tr><td>Sandbox leakage</td><td>Prevent sandbox tokens and test bank fixtures from remaining in production environment scopes.</td></tr>
          <tr><td>RLS assurance</td><td>Complete role-by-table negative tests for borrowers, investors, guarantors and admins.</td></tr>
          <tr><td>Chain partial success</td><td>Maintain runbooks for Polygon hash / database desynchronisation.</td></tr>
          <tr><td>Client money</td><td>Distinguish provider receipt, settlement, AML gates and treasury release in operating procedures.</td></tr>
        </tbody>
      </table>

      <div class="conclusion no-break">
        <h3>Director handover conclusion</h3>
        <p>Oxyile’s technical estate is organised for transfer: architecture is documented, repository boundaries are clear, service ownership is inventoried, database migrations are catalogueable, environment keys are listed without exposing secrets, CI/CD is Vercel-native, and third-party workflows are explained at engineering depth. Closing the three Q3–Q4 items above converts this due-diligence manual into a completed operational transfer.</p>
        <p class="formal-note">This document describes the engineering and operational handover baseline. It does not assert that every residual risk has been accepted or that live payment permissions are already in force.</p>
      </div>
    </section>
  </body>
</html>`;
}

async function main(): Promise<void> {
  await mkdir(REPORT_ASSETS, { recursive: true });

  const [images, env, migrations] = await Promise.all([
    harvestEvidenceImages(),
    scanEnvKeys(),
    listMigrationFiles(),
  ]);

  if (!images.length) {
    throw new Error(`No PNG, JPG or JPEG evidence found in ${IMAGE_LIBRARY}`);
  }

  const hero = images.find((image) => image.isHeroArchitecture);
  if (!hero) {
    throw new Error('Required Chapter 1 architecture image a1.* was not found under OXYILE PLATFORM SS.');
  }

  const html = buildHandoverHtml(images, env, migrations, hero);
  await writeFile(OUTPUT_HTML, html, 'utf8');

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(html, { waitUntil: 'load', timeout: 0 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map(
          (image) =>
            image.complete ||
            new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            })
        )
      );
    });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: OUTPUT_PDF,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;padding:0 15mm;font-family:Arial,sans-serif;font-size:7px;color:#6b7280;border-bottom:1px solid #e5e7eb;">
          OXYILE · TECHNICAL HANDOVER &amp; SYSTEM ARCHITECTURE MANUAL · 2026
        </div>`,
      footerTemplate: `
        <div style="width:100%;padding:0 15mm;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:7px;color:#6b7280;border-top:1px solid #e5e7eb;">
          <span>Director due diligence copy · £ GBP platform standard</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await page.close();
  } finally {
    await browser.close();
  }

  const pdfBytes = await readFile(OUTPUT_PDF);
  const pdf = await PDFDocument.load(pdfBytes);
  const pageCount = pdf.getPageCount();
  const distribution = CATEGORY_ORDER.map(
    (category) => `${category}=${images.filter((image) => image.category === category).length}`
  ).join(', ');

  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Oxyile Technical Handover Documentation published successfully');
  console.log(`Environment source: ${env.sourceFile}`);
  console.log(`Environment variable keys extracted (values stripped): ${env.keys.length}`);
  console.log(`HERO_ARCHITECTURE_IMAGE (Chapter 1): ${hero.relativePath}`);
  console.log(`Embedded screenshot records: ${images.length}`);
  console.log(`Screenshot distribution: ${distribution}`);
  console.log(`SQL migrations discovered & embedded in Chapter 4: ${migrations.length}`);
  console.log(`TOTAL_SQL_FILES_IN_CHAPTER_4=${migrations.length}`);
  console.log(`Total pages: ${pageCount}`);
  console.log(`PDF: ${OUTPUT_PDF}`);
  console.log(`HTML source: ${OUTPUT_HTML}`);
  console.log('════════════════════════════════════════════════════════════════');
}

main().catch((error) => {
  console.error('Technical handover documentation publication failed.');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
