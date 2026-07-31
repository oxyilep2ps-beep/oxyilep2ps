/**
 * Oxyile Enterprise Technical Whitepaper publisher.
 *
 * Source evidence:
 *   Recursive PNG and JPEG files under OXYILE PLATFORM SS
 *
 * Output:
 *   Oxyile_Enterprise_RnD_Whitepaper_2026.pdf
 *
 * The browser is used only as a paged-media renderer. This program does not
 * navigate the application or acquire new interface images.
 */
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { SEO_GUIDE_FEATURES } from '../lib/seo/advanced-tools';
import { HR_GUIDE_FEATURES } from '../lib/hr/guide';

type ChapterCategory =
  | 'architecture'
  | 'security'
  | 'openBanking'
  | 'blockchain'
  | 'lending'
  | 'editorial'
  | 'hr'
  | 'admin'
  | 'platform';

type EvidenceImage = {
  absolutePath: string;
  relativePath: string;
  filename: string;
  category: ChapterCategory;
  isHeroArchitecture: boolean;
  mime: 'image/png' | 'image/jpeg';
  dataUri: string;
};

type FeatureRecord = {
  id?: string | number;
  name: string;
  group: string;
  purpose: string;
  location: string;
  operation: string;
  benefit: string;
};

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_LIBRARY = path.join(PROJECT_ROOT, 'OXYILE PLATFORM SS');
const OUTPUT_PDF = path.join(PROJECT_ROOT, 'Oxyile_Enterprise_RnD_Whitepaper_2026.pdf');
const REPORT_ASSETS = path.join(PROJECT_ROOT, '.report-assets');
const OUTPUT_HTML = path.join(
  REPORT_ASSETS,
  'Oxyile_Enterprise_RnD_Whitepaper_2026.html'
);
const NATURAL_SORT = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });
const HERO_ARCHITECTURE_PATTERN = /^a1\.(png|jpe?g)$/i;

const CATEGORY_ORDER: ChapterCategory[] = [
  'platform',
  'architecture',
  'security',
  'openBanking',
  'blockchain',
  'lending',
  'editorial',
  'hr',
  'admin',
];

const categoryNames: Record<ChapterCategory, string> = {
  architecture: 'Full-Stack Engineering Architecture',
  security: 'Supabase Security, Authentication and RLS',
  platform: 'Platform Overview and Public Experience',
  openBanking: 'GoCardless Mandates, Guarantor and Escrow Operations',
  blockchain: 'Polygon Settlement and Immutable Audit Evidence',
  lending: 'Investor, Borrower and Handshake Workspaces',
  editorial: 'Editorial Studio and SEO Content Engine',
  hr: 'Enterprise HRMS and ATS Suite',
  admin: 'Executive Administration and Governance',
};

const universalCaptions: Record<ChapterCategory, string> = {
  architecture:
    'Next.js Full-Stack Service Architecture, PostgreSQL Data Model & Controlled Engineering Delivery Interface',
  security:
    'Supabase Multi-Tenant Row-Level Security (RLS) & Role-Based Access Control Interface',
  platform:
    'Oxyile UK FinTech Platform, Public Product Experience & Customer Access Interface',
  openBanking:
    'GoCardless Open Banking Direct Debit Mandate & Co-Applicant Liability Flow',
  blockchain:
    'Polygon On-Chain Audit Trail & Immutable Transaction Verification Schema',
  lending:
    'Oxyile Interactive Handshake Proposal & Escrow Funding Workspace (£ GBP)',
  editorial:
    'Editorial Studio CMS, Real-Time SEO Scoring Engine & Admin Feedback Loop',
  hr:
    'Enterprise ATS Hiring Kanban & £ GBP Standardised Payroll & Compliance View',
  admin:
    'Executive Admin Intelligence Dashboard & Headcount Budget Burn Rate (£ GBP)',
};

const editorialSupplement: FeatureRecord[] = [
  {
    id: 'E01',
    name: 'Notion-Style TipTap Rich-Text Editor',
    group: 'Editorial workflow',
    purpose:
      'A semantic document editor replaces unstructured textarea entry. TipTap extensions model headings, lists, emphasis, links, quotations and image nodes as an explicit ProseMirror document while persisting clean HTML for rendering and indexing.',
    location: 'Blogger Portal → Blog Editor; Admin Portal → Blog review editor',
    operation:
      'The editor initialises from the canonical post body, applies transactions locally, serialises the resulting HTML on change and submits through role-protected server actions. Administrators and authors use the same component, preventing formatting divergence between drafting and review.',
    benefit:
      'Structured markup improves accessibility, content portability and crawler interpretation while reducing editorial rework.',
  },
  {
    id: 'E02',
    name: 'Slash Command Palette',
    group: 'Editorial workflow',
    purpose:
      'A keyboard-first command surface inserts block types at the current document selection without requiring toolbar navigation.',
    location: 'Rich-text body editor',
    operation:
      'Typing “/” opens a filtered command list. Selecting a heading, list, quotation or image command removes the slash token and applies the corresponding editor transaction at the cursor.',
    benefit:
      'Authors maintain concentration, produce consistent hierarchy and require less training in the formatting interface.',
  },
  {
    id: 'E03',
    name: 'Inline Multi-Image Storage Pipeline',
    group: 'Editorial workflow',
    purpose:
      'Body media is separated from cover imagery and stored in a dedicated Supabase Storage bucket with a JSONB URL index on each post.',
    location: 'Editor inline-image action and slash-command image entry',
    operation:
      'The browser sends the selected image to a server action; file type and size are validated; the object is written to the blog-inline bucket; a public URL is returned; and an image node is inserted at the active cursor position. The post records all embedded URLs for lifecycle management.',
    benefit:
      'Long-form articles can use multiple contextual illustrations while preserving asset traceability and a stable cover-image contract.',
  },
  {
    id: 'E04',
    name: 'Admin Rejection and Changes Asked Workflow',
    group: 'Editorial governance',
    purpose:
      'Review decisions carry a structured rejection category and a detailed remediation brief rather than relying on informal messages.',
    location: 'Admin Blog Manager → Pending Approval → Reject',
    operation:
      'The reviewer selects Plagiarism, Formatting, Poor SEO, Tone, Accuracy or Other and records exact changes. The transition writes REJECTED, rejection_reason and admin_feedback atomically. The blogger receives a prominent red status banner and the full brief above the editor.',
    benefit:
      'The workflow establishes accountable editorial control, consistent decision records and a direct path to compliant resubmission.',
  },
  {
    id: 'E05',
    name: 'Admin Edit-Before-Approval',
    group: 'Editorial governance',
    purpose:
      'Authorised reviewers can correct a pending article directly within the canonical document before approving it.',
    location: 'Admin Blog Manager → review panel',
    operation:
      'The admin opens the same TipTap editor used by the author, adjusts copy or inline images, saves the canonical post and then issues the approval transition. Approval clears stale rejection metadata.',
    benefit:
      'Minor compliance or presentation corrections do not require an additional author cycle, and no parallel document copy is created.',
  },
  {
    id: 'E06',
    name: 'Rejected-Post Resubmission',
    group: 'Editorial governance',
    purpose:
      'Rejected content remains recoverable and visibly linked to the reviewer’s remediation request.',
    location: 'Blogger Portal → My Drafts / Rejected → Fix & Resubmit',
    operation:
      'Opening a rejected card restores its body, images, reason and feedback. Saving keeps the item in draft remediation; Resubmit clears rejection fields and returns the item to PENDING_APPROVAL.',
    benefit:
      'The state machine prevents rejected work from disappearing and gives directors a traceable review-to-remediation lifecycle.',
  },
  {
    id: 'E07',
    name: 'Zero-Flicker Tab Isolation',
    group: 'Experience and reliability',
    purpose:
      'Each CMS tab presents only its own state and never flashes stale records or a premature empty-state message.',
    location: 'Drafts, Pending, Published and References tabs',
    operation:
      'A tab change sets loading immediately, clears the existing rows, cancels superseded responses and renders layout-matched pulse skeletons. The empty state is eligible only after the current request completes with zero rows.',
    benefit:
      'The interface communicates trustworthy state and avoids accidental action on records from the previous tab.',
  },
  {
    id: 'E08',
    name: 'Persistent Editorial Quick Create',
    group: 'Experience and reliability',
    purpose:
      'A global navigation action opens either a standard editorial draft or an SEO-scored draft from any Blogger route.',
    location: 'Blogger bottom navigation → central orange Create action',
    operation:
      'The quick-action popover routes standard posts to the CMS editor and creates an SEO draft through a protected server action before navigating to its dedicated scoring studio.',
    benefit:
      'The design shortens the route from idea to governed content and maintains consistent mobile access.',
  },
];

const lendingWorkspaceFeatures: FeatureRecord[] = [
  {
    id: 'L01',
    name: 'Role-Aware Lending Dashboard',
    group: 'Investor and borrower experience',
    purpose:
      'Authenticated users receive a workspace aligned to their verified INVESTOR or BORROWER role while shared navigation preserves consistent access to chat, profile, settings and transaction history.',
    location: 'Dashboard root and role-specific dashboard routes',
    operation:
      'Server-side session retrieval resolves the profile role before rendering protected content. Middleware blocks unauthenticated access; page-level logic verifies status; and data queries restrict results to the current user’s participation.',
    benefit:
      'Role separation reduces accidental disclosure and presents task-specific controls without duplicating the entire application shell.',
  },
  {
    id: 'L02',
    name: 'Collateral-Backed Marketplace',
    group: 'Origination and discovery',
    purpose:
      'Eligible borrower requests are presented to investors with principal, fixed rate, duration, collateral information and suitability context.',
    location: 'Dashboard → Marketplace',
    operation:
      'Only approved marketplace applications are retrieved. Investor actions open the counterparty conversation and preserve application identifiers so the resulting handshake references the evaluated request.',
    benefit:
      'Investors compare opportunities on a consistent GBP basis and retain a clear evidence trail from discovery to proposal.',
  },
  {
    id: 'L03',
    name: 'Interactive Handshake Proposal',
    group: 'Origination and negotiation',
    purpose:
      'The handshake formalises principal, rate, term, parties, collateral and guarantor details as a bilateral state machine.',
    location: 'Counterparty chat → Handshake panel',
    operation:
      'The borrower or investor enters the GBP amount and duration. Borrower-led proposals require collateral type, valuation, description and proof. The server binds lender_id and borrower_id, calculates EMI figures and creates a PENDING record.',
    benefit:
      'Negotiation data is structured, reproducible and capable of downstream payment and agreement enforcement.',
  },
  {
    id: 'L04',
    name: 'Bilateral Approval Control',
    group: 'Origination and negotiation',
    purpose:
      'Neither party can unilaterally activate a handshake; lender and borrower approvals are recorded separately.',
    location: 'Handshake card within chat',
    operation:
      'Each party can set only its own approval timestamp. The execute endpoint checks both timestamps again before initiating active-state or on-chain work.',
    benefit:
      'The control provides positive evidence of mutual intent and prevents premature settlement.',
  },
  {
    id: 'L05',
    name: 'Guarantor Attachment and Liability Review',
    group: 'Credit-risk mitigation',
    purpose:
      'A nominated co-applicant or guarantor reviews the exact facility terms and establishes a backup Direct Debit mandate.',
    location: 'Signed guarantor review URL',
    operation:
      'A signed token binds handshake ID, email and issue time. The page retrieves the canonical terms, explains contingent liability and records explicit acceptance or rejection. Mandate references are written only after provider authorisation.',
    benefit:
      'The workflow reduces default exposure while retaining evidence of the information shown at consent.',
  },
  {
    id: 'L06',
    name: 'Portfolio and Repayment Monitoring',
    group: 'Servicing',
    purpose:
      'Investors and borrowers can review active principal, EMI status, total return, transaction references and portfolio-level performance.',
    location: 'Dashboard → Portfolio and Borrower loan history',
    operation:
      'Queries join only the handshakes associated with the signed-in user. GBP values use en-GB formatting; provider payment IDs and Polygon hashes remain available as reconciliation references.',
    benefit:
      'The workspace supports transparent servicing, exception investigation and customer communication.',
  },
  {
    id: 'L07',
    name: 'Realtime Status Propagation',
    group: 'Servicing',
    purpose:
      'Mandate, approval and payment state changes become visible without requiring users to reload the conversation.',
    location: 'Chat room and handshake cards',
    operation:
      'Supabase Realtime listens for committed changes on the relevant handshake. A bounded polling fallback retrieves authoritative state when websocket delivery is unavailable.',
    benefit:
      'Low-latency feedback reduces duplicate submissions while the database remains the authoritative ledger.',
  },
  {
    id: 'L08',
    name: 'Transaction Recovery and 401 Resilience',
    group: 'Reliability',
    purpose:
      'Session expiry and provider interruptions produce structured recovery paths rather than ambiguous payment failures.',
    location: 'Funding gateway, completion routes and handshake success page',
    operation:
      'Mutating endpoints return HTTP 401 for missing sessions. The UI preserves the handshake reference, offers a sign-in redirect and resumes confirmation only after identity is re-established.',
    benefit:
      'The system avoids unauthorised settlement and prevents a transient session failure from losing transaction context.',
  },
];

const adminFeatures: FeatureRecord[] = [
  {
    id: 'A01',
    name: 'Executive Command Centre',
    group: 'Operating intelligence',
    purpose:
      'A consolidated administration surface presents live application, user, handshake, collateral, fraud, support and platform-status indicators.',
    location: 'Admin Dashboard → Command',
    operation:
      'Protected server queries aggregate authorised operational tables. Visual summaries link directly to the underlying review queues rather than maintaining a separate reporting database.',
    benefit:
      'Directors obtain current operating context while retaining drill-down to individual evidence records.',
  },
  {
    id: 'A02',
    name: 'Monthly Headcount Budget Burn',
    group: 'Financial governance',
    purpose:
      'The HR executive view calculates monthly workforce cost in British Pounds from annual basic salary, allowances and pension commitments.',
    location: 'Admin Dashboard → HR Overview',
    operation:
      'Active employee profiles are aggregated server-side, annual committed compensation is divided into a monthly run rate and results are grouped by department for cost-centre comparison.',
    benefit:
      'Management can identify cost concentration, compare approved headcount with actual burn and maintain GBP-consistent planning.',
  },
  {
    id: 'A03',
    name: 'Headcount Budget Approval',
    group: 'Financial governance',
    purpose:
      'A new vacancy cannot become an approved public commitment without executive review of its GBP budget.',
    location: 'Admin Dashboard → HR Overview → Headcount requests',
    operation:
      'HR creates a draft requisition and linked headcount request. Approval records reviewer and timestamp, changes the requisition to open and enables public careers synchronisation.',
    benefit:
      'The workflow separates recruiting demand from financial authority and prevents unbudgeted hiring.',
  },
  {
    id: 'A04',
    name: 'Critical Financial Action Queue',
    group: 'Financial governance',
    purpose:
      'Expenses above £500 and other high-value people decisions receive prominent executive attention.',
    location: 'Admin Dashboard → HR Overview',
    operation:
      'Pending expense and headcount records are filtered by threshold and sign-off flags, then rendered with amount, category and decision context.',
    benefit:
      'Material exceptions cannot remain hidden inside routine HR queues.',
  },
  {
    id: 'A05',
    name: 'Attrition and Retention Risk',
    group: 'People intelligence',
    purpose:
      'A management indicator combines leave usage, workforce composition and performance context to identify departments requiring review.',
    location: 'Admin Dashboard → HR Overview',
    operation:
      'The calculation is performed over authorised HR data and presented as a decision-support signal, not a deterministic employment decision.',
    benefit:
      'Leadership can intervene early while preserving human judgement and avoiding automated adverse action.',
  },
  {
    id: 'A06',
    name: 'High-Performer and Milestone Intelligence',
    group: 'People intelligence',
    purpose:
      'KPI leaders, birthdays and work anniversaries are visible to executive management.',
    location: 'Admin Dashboard → HR Overview',
    operation:
      'Active employee KPI scores are ordered for the leaderboard; date calculations identify milestones within the configured forward window.',
    benefit:
      'The view supports recognition, retention and workforce culture without exposing payroll detail unnecessarily.',
  },
  {
    id: 'A07',
    name: 'Role and Platform Access Governance',
    group: 'Security administration',
    purpose:
      'Administrative, HR and Blogger privileges are granted and revoked through controlled directory records.',
    location: 'Admin Dashboard → Access',
    operation:
      'Authorised administrators update platform access records; application routing and server assertions resolve those records before privileged workspaces are made available.',
    benefit:
      'A central least-privilege process reduces informal role assignment and supports leaver revocation.',
  },
  {
    id: 'A08',
    name: 'Audit Trail Export',
    group: 'Regulatory evidence',
    purpose:
      'HR and administrative actions can be exported with actor, action type, structured details and timestamp.',
    location: 'HR Payroll and Admin Logs',
    operation:
      'Server-side export retrieves authorised audit rows in reverse chronological order and serialises escaped CSV suitable for controlled review.',
    benefit:
      'The organisation can provide a reproducible chronology for internal audit, incident investigation and regulatory enquiry.',
  },
];

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

function categoriseImage(relativePath: string): ChapterCategory {
  const value = relativePath.split('\\').join('/').toLowerCase();
  const filename = path.basename(value);

  if (
    value.includes('polygon') ||
    value.includes('blockchain') ||
    value.includes('on-chain') ||
    value.includes('onchain')
  ) {
    return 'blockchain';
  }
  if (
    value.includes('blogger/') ||
    value.includes('seo/') ||
    value.includes('editorial/') ||
    /^bl\d+\./.test(filename)
  ) {
    return 'editorial';
  }
  if (
    value.includes('hr/') ||
    value.includes('ats/') ||
    value.includes('careers/') ||
    value.includes('payroll/')
  ) {
    return 'hr';
  }
  if (value.includes('admin/') || filename.startsWith('admin')) return 'admin';
  if (
    value.includes('payment/') ||
    value.includes('gocardless') ||
    value.includes('open banking') ||
    value.includes('guarantor') ||
    value.includes('co-applicant') ||
    value.includes('mandate') ||
    value.includes('escrow')
  ) {
    return 'openBanking';
  }
  if (
    value.includes('investor/') ||
    value.includes('invester/') ||
    value.includes('borrower/') ||
    value.includes('p2p handshake/') ||
    value.includes('handshake/')
  ) {
    return 'lending';
  }
  if (
    value.includes('backend and security/') ||
    value.includes('supabase/') ||
    value.includes('rls') ||
    value.includes('auth') ||
    value.includes('security')
  ) {
    return 'security';
  }
  if (
    value.includes('architecture/') ||
    value.includes('codebase/')
  ) {
    return 'architecture';
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
      return {
        absolutePath,
        relativePath,
        filename,
        category: categoriseImage(relativePath),
        isHeroArchitecture: HERO_ARCHITECTURE_PATTERN.test(filename),
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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#039;');
}

function editorialImplementationContext(group: string): string {
  const normalised = group.toLowerCase();
  if (normalised.includes('research')) {
    return 'Research operations are isolated from post mutation: the tool returns decision-support data first, and the author explicitly chooses whether to create or alter a draft. Query inputs and resulting records remain associated with the authenticated author.';
  }
  if (normalised.includes('on-page')) {
    return 'The calculation runs against the current title, metadata, focus keyword and semantic HTML. Results are recomputed as content changes, but the scoring layer cannot publish or approve content; it only exposes remediable checks.';
  }
  if (normalised.includes('ai')) {
    return 'Assistance is presented as editable output rather than an autonomous publishing decision. The human author remains responsible for accuracy, financial-promotion context, sourcing and final wording.';
  }
  if (normalised.includes('distribution')) {
    return 'Repurposed material is derived from the canonical approved article and remains a draft for channel-specific review. This avoids unsupervised release of abbreviated financial claims.';
  }
  if (normalised.includes('advanced') || normalised.includes('2026')) {
    return 'The feature is implemented as deterministic analysis or clearly labelled decision support within the editor. Inputs stay within the authenticated content workspace, and the operator must apply any suggested change.';
  }
  return 'The control operates within the authenticated editorial state machine and writes only through role-checked server actions. Drafting, review and publication authority remain separate.';
}

function hrImplementationContext(group: string): string {
  const normalised = group.toLowerCase();
  if (normalised.includes('ats')) {
    return 'Applicant records are linked to a requisition and progress through an enumerated stage constraint. Candidate ranking, background status and interview evidence are decision-support fields; a responsible HR reviewer makes each employment decision.';
  }
  if (normalised.includes('onboarding')) {
    return 'The employee profile is the parent record for attendance, leave, assets and policy status. Foreign keys preserve referential integrity, and authorised HR actions create dated evidence rather than relying on local browser state.';
  }
  if (normalised.includes('payroll')) {
    return 'All monetary columns are explicitly denominated in GBP. PAYE and National Insurance values are explanatory estimates until reconciled through an approved payroll provider; material expenses retain reviewer and executive sign-off states.';
  }
  if (normalised.includes('executive')) {
    return 'Executive metrics are computed from current authorised source records. Aggregation does not alter employee or candidate data, and drill-down remains restricted to users holding the corresponding administrative role.';
  }
  return 'The feature uses constrained status values, authenticated server actions and an HR audit event to preserve a reviewable sequence of actions.';
}

function featureArticles(features: FeatureRecord[], context: 'editorial' | 'hr' | 'admin' | 'lending'): string {
  return features
    .map((feature, index) => {
      const implementation =
        context === 'editorial'
          ? editorialImplementationContext(feature.group)
          : context === 'hr'
            ? hrImplementationContext(feature.group)
            : context === 'admin'
              ? 'The operation is available only through the administrative role boundary. Source records remain authoritative, and material decisions retain actor and timestamp evidence.'
              : 'The operation repeats session, role and participation checks at the server boundary. Client state is informative only and cannot authorise a financial transition.';
      return `
        <article class="feature">
          <div class="feature-index">${escapeHtml(feature.id ?? index + 1)}</div>
          <div>
            <div class="feature-group">${escapeHtml(feature.group)}</div>
            <h4>${escapeHtml(feature.name)}</h4>
            <p><strong>Purpose and scope.</strong> ${escapeHtml(feature.purpose)}</p>
            <p><strong>Operational sequence.</strong> ${escapeHtml(feature.operation)}</p>
            <p><strong>Engineering control.</strong> ${escapeHtml(implementation)}</p>
            <p><strong>Control location.</strong> ${escapeHtml(feature.location)}</p>
            <p><strong>Business and regulatory value.</strong> ${escapeHtml(feature.benefit)}</p>
          </div>
        </article>`;
    })
    .join('');
}

function convertEditorialFeatures(): FeatureRecord[] {
  return [
    ...editorialSupplement,
    ...SEO_GUIDE_FEATURES.map((feature, index) => ({
      id: `S${String(index + 1).padStart(2, '0')}`,
      name: feature.name,
      group: feature.group,
      purpose: feature.what,
      location: feature.where,
      operation: feature.how,
      benefit: feature.benefit,
    })),
  ];
}

function convertHrFeatures(): FeatureRecord[] {
  return HR_GUIDE_FEATURES.map((feature) => ({
    id: feature.id,
    name: feature.name,
    group: feature.group,
    purpose: feature.purpose,
    location: feature.where,
    operation: feature.steps,
    benefit: feature.benefit,
  }));
}

function evidenceGallery(
  images: EvidenceImage[],
  category: ChapterCategory,
  chapterNumber: number,
  title?: string
): string {
  const categoryImages = images.filter(
    (image) => image.category === category && !image.isHeroArchitecture
  );
  if (!categoryImages.length) return '';
  const subject = universalCaptions[category];

  return `
    <section class="evidence-section">
      <div class="evidence-heading no-break">
        <div class="section-rule"></div>
        <h3>${escapeHtml(title ?? categoryNames[category])}</h3>
        <p>${categoryImages.length} selected interface and engineering records from the reviewed platform evidence library.</p>
      </div>
      <div class="evidence-gallery">
        ${categoryImages
          .map(
            (image, index) => `
              <figure class="no-break">
                <div class="figure-frame">
                  <img src="${image.dataUri}" alt="${escapeHtml(subject)}" />
                </div>
                <figcaption>
                  <strong>Figure ${chapterNumber}.${index + 1}: ${escapeHtml(subject)}.</strong>
                  Interface record <span>${escapeHtml(image.relativePath)}</span>.
                </figcaption>
              </figure>`
          )
          .join('')}
      </div>
    </section>`;
}

function heroArchitectureFigure(hero: EvidenceImage): string {
  const caption =
    'Oxyile Enterprise FinTech Platform Architecture & Multi-Tenant Infrastructure Diagram';
  return `
    <figure class="hero-architecture no-break">
      <div class="figure-frame">
        <img src="${hero.dataUri}" alt="${escapeHtml(caption)}" />
      </div>
      <figcaption>
        <strong>Figure 1.1: ${escapeHtml(caption)}.</strong>
        Primary architecture record <span>${escapeHtml(hero.relativePath)}</span>.
      </figcaption>
    </figure>`;
}

function buildPaymentLifecycle(stepNumbers: number[]): string {
  const steps = [
    {
      number: 1,
      title: 'Interactive Proposal and Origination',
      body: [
        'The transaction begins only after the borrower and investor have completed the relevant identity, status and suitability gates. Within the counterparty workspace, a borrower can propose a facility from the supported ticket threshold of £120 upward, subject to product limits, affordability evidence and the value of the pledged collateral. The proposal carries lender_id, borrower_id, principal, annual rate, duration, collateral type, collateral value, collateral description, evidence-object reference and guarantor email.',
        'Financial values are normalised as numbers at the server boundary and presented with the en-GB locale. For an amortising repayment model, the monthly rate r is the annual percentage rate divided by 12 and 100, the number of periods n is the agreed month count, and the scheduled payment is P × r × (1 + r)^n / ((1 + r)^n − 1). A zero-rate branch uses P / n. Rounding occurs at the currency boundary; payment-provider requests convert pounds into integer pence to avoid floating-point settlement ambiguity. The calculated EMI and total return are persisted with the handshake so every participant sees the same economic terms.',
        'The browser may send collateral evidence as multipart FormData because the proposal contains a binary file. The API does not trust those fields: it re-identifies the session, checks role and participant IDs, validates required collateral attributes, uploads the evidence under a controlled storage path and creates the PENDING handshake. PostgreSQL foreign keys preserve party references, enumerated states constrain lifecycle values and RLS prevents an unrelated authenticated user from selecting or mutating the row.',
      ],
      controls: [
        'Minimum ticket and duration validation is performed before persistence.',
        'GBP display and integer-pence provider conversion are separate concerns.',
        'Collateral evidence is validated by MIME type, size and controlled storage destination.',
        'RLS participant predicates and server-side ownership checks operate together.',
      ],
    },
    {
      number: 2,
      title: 'Co-Applicant / Guarantor Liability Engine',
      body: [
        'A guarantor is attached by email at origination and represented by guarantor_status, mandate reference and related event fields on the handshake. The invitation URL is not a bare record identifier: a signed token binds the handshake ID, normalised recipient email and issue timestamp. The review route verifies that token and compares the recipient with the database value before disclosing principal, rate, tenure or EMI.',
        'The review screen explains the contingent nature of the mandate and requires an explicit accept or decline action. Acceptance is recorded in PostgreSQL and is later linked to the provider mandate identifier; rejection becomes a distinct status. These records provide evidence of the terms displayed and the action taken. They support a contractual process but do not, by themselves, determine whether a co-applicant is legally bound; enforceability depends on the executed agreement, adequate disclosure, capacity, applicable consumer-credit requirements and legal review.',
        'When a borrower payment later fails or is returned, the webhook process identifies the associated handshake, verifies that the guarantor was accepted and that an active mandate exists, records a guarantor_payment_event and submits the fallback EMI amount in pence. The original payment ID, reason, amount and provider result remain linked for investigation.',
      ],
      controls: [
        'HMAC-style signed invitation context prevents identifier-only access.',
        'Email equality is checked against the canonical handshake record.',
        'Consent status and mandate ID are distinct fields and must not be conflated.',
        'Fallback collection is conditional on a failed borrower payment and an accepted active mandate.',
      ],
    },
    {
      number: 3,
      title: 'GoCardless Sandbox Direct Debit Mandate Integration',
      body: [
        'The server uses the official GoCardless Node client and selects Sandbox unless the deployment explicitly declares the live environment. API traffic is directed to the sandbox API host; the customer is then sent by GET navigation to the hosted authorisation experience, commonly served through the GoCardless sandbox payment domain. The application creates a Billing Request with currency GBP, attaches a reduced metadata set containing the handshake reference and role, creates a Billing Request Flow and returns the authorisation URL to the browser as structured JSON.',
        'The current browser integration submits JSON. A compatibility parser accepts legacy multipart/form-data fields—loanId, email, token, issuedAt and action—because earlier forms posted a payload field. Binary multipart encoding is therefore relevant to collateral and compatibility flows, but it is not the preferred provider API payload. Direct provider requests use application/json, Authorization: Bearer, GoCardless-Version and Accept headers. The browser must never POST through a redirect to the hosted authorisation URL; it receives JSON and performs a new GET navigation.',
        'Sandbox bank details such as sort code 20-00-00 and account number 55779911 are provider test fixtures. They must be confined to non-production training and evidence. Live UK account validation is performed within the hosted provider flow and provider API response; the application must not claim that string-format checks alone establish account ownership.',
        'Webhook authenticity is a mandatory production control. The raw request body must be verified against the GoCardless-Webhook-Signature using the endpoint secret and constant-time comparison before JSON parsing or mutation. The reviewed webhook route processes event semantics but does not presently expose signature-verification code; this is recorded as a pre-production control gap requiring remediation and test evidence before live operation.',
      ],
      controls: [
        'Access tokens and endpoint secrets remain server-only.',
        'Billing Requests and mandates are hard-locked to GBP.',
        'Signed application invitations and provider authorisation are separate trust boundaries.',
        'Webhook signature verification must fail closed before any event handling.',
      ],
    },
    {
      number: 4,
      title: 'Realtime Websocket Mandate Status Synchronisation',
      body: [
        'After hosted authorisation, the completion route reconciles the Billing Request, resolves the mandate and updates the handshake’s guarantor status and mandate reference. That committed PostgreSQL change is the source event for the UI. Supabase Realtime publishes database changes over a websocket channel to subscribed handshake and chat components; the rendered card changes to “Guarantor Secured” without a page refresh.',
        'Realtime delivery is observational rather than authoritative. A websocket message cannot create acceptance or activate a mandate. The client responds by refreshing the authorised row. A four-second bounded polling fallback covers transient socket loss, browser sleep and channel-reconnection delay. Components unsubscribe on unmount to avoid duplicate handlers and stale state.',
        'The state machine is designed for idempotency because provider callbacks can be delivered more than once. Repeating an accepted update preserves the same terminal meaning, and provider IDs supply stable reconciliation keys. Error responses remain structured JSON so the UI can distinguish invalid invitation, missing loan, provider failure and callback mismatch.',
      ],
      controls: [
        'Database commit precedes UI status presentation.',
        'Channel filters restrict observation to the relevant handshake.',
        'Polling retrieves canonical state and stops after the terminal transition.',
        'Duplicate callbacks do not create duplicate economic obligations.',
      ],
    },
    {
      number: 5,
      title: 'Investor Escrow Funding Gateway and Reconciliation',
      body: [
        'Funding starts from an authorised handshake preview rather than accepting amount or party data from query parameters. The endpoint retrieves the current session cookie, returns HTTP 401 when the session is absent and confirms that the user is a legitimate participant. The UI preserves the handshake reference through a sign-in redirect so a session timeout does not sever transaction context.',
        'The gateway displays principal, rate and EMI in GBP and initiates the applicable GoCardless collection or sandbox funding path. Provider amounts are integer pence and metadata includes the internal handshake reference. Incoming funds are treated as client money and remain locked: a payment notification records the provider ID but does not itself authorise borrower disbursement. Reconciliation requires settled provider status, matching internal ledger entry, AML and sanctions controls, and treasury confirmation of available balance.',
        'The webhook locates the handshake through the payment or subscription reference, records the provider event and invokes the relevant ledger update. Failure events can initiate a guarantor fallback only where the mandate and consent conditions are satisfied. Every exception retains the original provider reference and reason to support operations and complaints investigation.',
      ],
      controls: [
        'HTTP 401 is a security response with a recoverable UX path, not a reason to bypass authentication.',
        'Client-supplied principal is never trusted during final funding.',
        'Payment notification, settlement, client-money release and on-chain anchoring are distinct states.',
        'Provider and internal identifiers are retained for one-to-one reconciliation.',
      ],
    },
    {
      number: 6,
      title: 'Polygon Blockchain Audit Trail',
      body: [
        'Following bilateral approval and authenticated escrow finalisation, the server builds a canonical representation containing handshake ID, borrower ID, lender ID, GBP principal, approval timestamp and optional guarantor identity. It hashes the agreement and encodes audit data for a zero-value transaction submitted by a server-held relayer wallet to Polygon Amoy.',
        'The action waits for the transaction receipt and validates that the returned hash is a 32-byte hexadecimal transaction identifier. Only after confirmation does it update the handshake with tx_hash, polygon_tx_hash, activation time, calculated EMI, total return and payment-subscription reference. If the chain transaction succeeds but database synchronisation fails, the error returns the chain hash so operations can reconcile the partial success rather than repeating the economic action blindly.',
        'Payment webhooks can also request an on-chain EMI-paid update through the transaction execution layer. Where Polygon is unavailable, the event can be queued for controlled retry. The chain record is a tamper-evident timestamped anchor; it is not the customer-money ledger, does not contain bank-account credentials and does not replace the signed legal agreement or PostgreSQL operational record.',
      ],
      controls: [
        'Relayer private keys are environment secrets and never enter a client bundle.',
        'Both party approval timestamps are prerequisites.',
        'Canonical hashing prevents presentation-layer variation from changing the evidence model.',
        'Partial success, retry and reconciliation procedures avoid duplicate execution.',
      ],
    },
  ];

  return steps
    .filter((step) => stepNumbers.includes(step.number))
    .map(
      (step, index) => `
        <article class="workflow-step">
          <div class="step-marker">STEP ${index + 1}</div>
          <div>
            <h3>${escapeHtml(step.title)}</h3>
            ${step.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
            <div class="control-box">
              <strong>Principal engineering controls</strong>
              <ul>${step.controls.map((control) => `<li>${escapeHtml(control)}</li>`).join('')}</ul>
            </div>
          </div>
        </article>`
    )
    .join('');
}

function categoryCount(images: EvidenceImage[], category: ChapterCategory): number {
  return images.filter((image) => image.category === category).length;
}

function buildWhitepaper(images: EvidenceImage[]): string {
  const editorialFeatures = convertEditorialFeatures();
  const hrFeatures = convertHrFeatures();
  const count = (category: ChapterCategory) => categoryCount(images, category);
  const heroArchitectureImage = images.find((image) => image.isHeroArchitecture);
  if (!heroArchitectureImage) {
    throw new Error('Required Chapter 1 architecture image a1.* was not found.');
  }

  return `<!doctype html>
  <html lang="en-GB">
    <head>
      <meta charset="utf-8" />
      <title>Oxyile Enterprise R&amp;D Whitepaper 2026</title>
      <style>
        @page { size: A4; margin: 18mm 15mm 20mm 15mm; }
        * { box-sizing: border-box; }
        :root {
          --ink:#1f2937; --charcoal:#111827; --muted:#4b5563; --line:#E5E7EB;
          --paper:#FFFFFF; --soft:#FAFAFA; --orange:#F97316; --orange-soft:#FFF7ED;
        }
        html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        body { margin:0; background:var(--paper); color:var(--ink);
          font-family:Arial,"Segoe UI",sans-serif; font-size:9.45pt; line-height:1.6; }
        h1,h2,h3 { color:#111827; page-break-after:avoid; break-after:avoid;
          margin-top:1.5em; margin-bottom:.5em; }
        h1 { font-family:Georgia,"Times New Roman",serif; font-size:31pt; line-height:1.08;
          letter-spacing:-.025em; }
        h2 { font-family:Georgia,"Times New Roman",serif; font-size:20pt; line-height:1.18;
          letter-spacing:-.02em; }
        h3 { font-size:13.2pt; line-height:1.28; }
        h4 { color:#111827; font-size:11.2pt; line-height:1.3; margin:1mm 0 2mm;
          page-break-after:avoid; break-after:avoid; }
        p { margin:0 0 2.6mm; orphans:3; widows:3; }
        strong { color:#111; }
        .page-break { page-break-after:always; break-after:page; }
        .no-break { page-break-inside:avoid; break-inside:avoid; }
        .cover { min-height:259mm; margin:-18mm -15mm -20mm; padding:25mm 21mm 19mm;
          color:#fff; display:flex; flex-direction:column; justify-content:space-between;
          background:radial-gradient(circle at 84% 12%,#9A3412 0,#292524 32%,#090909 76%); }
        .cover h1 { color:#fff; }
        .brand-rule { width:24mm; height:3.5mm; border-radius:99px; background:var(--orange); }
        .eyebrow,.chapter-label { color:var(--orange); text-transform:uppercase; letter-spacing:.18em;
          font-size:8pt; font-weight:900; }
        .cover h1 { max-width:165mm; margin:12mm 0 7mm; }
        .cover .subtitle { max-width:148mm; color:#E5E5E5; font-size:13pt; line-height:1.5; }
        .cover-meta { display:grid; grid-template-columns:1fr 1fr; gap:6mm; border-top:1px solid #404040;
          padding-top:8mm; }
        .cover-meta b { display:block; color:#FB923C; font-size:7.5pt; text-transform:uppercase;
          letter-spacing:.13em; }
        .cover-meta span { display:block; margin-top:1.5mm; color:#F5F5F5; }
        .lede { color:#404040; font-family:Georgia,"Times New Roman",serif; font-size:11.6pt; line-height:1.62; }
        .chapter-title { border-bottom:2px solid var(--orange); padding-bottom:8px; margin-top:2em; }
        .toc { list-style:none; padding:0; margin:5mm 0 0; }
        .toc li { display:grid; grid-template-columns:10mm 1fr auto; gap:3mm; padding:2.5mm 0;
          border-bottom:1px solid var(--line); align-items:baseline; }
        .toc .number { color:var(--orange); font-weight:900; }
        .callout { margin:4mm 0; padding:4mm; border-left:1.3mm solid var(--orange);
          border-radius:0 3mm 3mm 0; background:var(--orange-soft); }
        .architecture-grid { display:grid; grid-template-columns:1fr 1fr; gap:3mm; margin:4mm 0; }
        .architecture-card { padding:4mm; border:1px solid var(--line); border-radius:4mm; background:var(--soft); }
        .architecture-card p { margin:0; color:var(--muted); }
        .workflow-step { display:grid; grid-template-columns:21mm 1fr; gap:4mm; padding:4mm 0;
          border-bottom:1px solid var(--line); }
        .step-marker { align-self:start; padding:2.5mm 2mm; border-radius:3mm; background:var(--charcoal);
          color:#fff; font-size:8pt; font-weight:900; text-align:center; letter-spacing:.05em; }
        .control-box { margin-top:3mm; padding:3.5mm; border:1px solid #FED7AA; border-radius:3mm;
          background:var(--orange-soft); page-break-inside:avoid; break-inside:avoid; }
        .control-box ul { margin:2mm 0 0; padding-left:5mm; }
        .control-box li { margin-bottom:1mm; }
        .feature { display:grid; grid-template-columns:10mm 1fr; gap:3mm; padding:3.2mm 0;
          border-bottom:1px solid var(--line); }
        .feature-index { width:9mm; min-height:9mm; display:grid; place-items:center; border-radius:99px;
          background:var(--orange); color:#fff; font-size:6.8pt; font-weight:900; overflow:hidden; }
        .feature-group { color:var(--orange); font-size:7pt; font-weight:900; text-transform:uppercase;
          letter-spacing:.1em; }
        .feature p { margin:0 0 1mm; color:#404040; font-size:8.45pt; }
        .section-rule { width:14mm; height:1.5mm; border-radius:99px; background:var(--orange);
          margin-bottom:3mm; }
        .evidence-heading { margin:6mm 0 3mm; }
        .evidence-heading p { color:var(--muted); }
        .evidence-gallery { display:block; }
        figure { margin:16px auto; text-align:center; page-break-inside:avoid; break-inside:avoid;
          max-width:95%; }
        .figure-frame { overflow:hidden; line-height:0; }
        figure img { display:inline-block; max-width:100%; max-height:380px; object-fit:contain;
          object-position:top; border:1px solid #e5e7eb; border-radius:8px;
          box-shadow:0 4px 6px -1px rgba(0,0,0,.05); background:#fff; }
        .hero-architecture { max-width:100%; margin:14px auto 20px; }
        .hero-architecture img { max-height:540px; }
        figcaption { color:#4b5563; font-size:.85rem; font-weight:600; margin-top:8px; line-height:1.4; }
        figcaption span { color:#737373; font-family:"Segoe UI",Arial,sans-serif; font-size:7.2pt; }
        .control-table { width:100%; border-collapse:collapse; margin:4mm 0; }
        .control-table th,.control-table td { border:1px solid var(--line); padding:2.4mm; vertical-align:top;
          text-align:left; }
        .control-table th { background:var(--charcoal); color:#fff; }
        .control-table td:first-child { width:29%; font-weight:700; }
        tr { page-break-inside:avoid; break-inside:avoid; }
        .roadmap-month { color:var(--orange); font-weight:900; white-space:nowrap; }
        .conclusion { padding:5mm; border:1px solid var(--line); border-top:1.5mm solid var(--orange);
          border-radius:4mm; background:var(--soft); }
        .formal-note { color:#525252; font-size:8.4pt; }
      </style>
    </head>
    <body>
      <section class="cover page-break">
        <div>
          <div class="brand-rule"></div>
          <div class="eyebrow" style="margin-top:16mm">Enterprise engineering whitepaper</div>
          <h1>OXYILE FINTECH PLATFORM:<br/>TECHNICAL R&amp;D, ARCHITECTURE &amp; EVIDENCE REPORT</h1>
          <p class="subtitle">Enterprise Technical Whitepaper &amp; Architecture Manual prepared for Director Review and the FCA Regulatory Endorsement Pack · July 2026</p>
        </div>
        <div class="cover-meta">
          <div><b>Author</b><span>Priyanshu<br/>Lead Full-Stack &amp; Interactive Platform Developer</span></div>
          <div><b>Market and currency</b><span>United Kingdom<br/>British Pounds (£ GBP) throughout</span></div>
          <div><b>Engineering scope</b><span>Lending · Payments · Blockchain<br/>Editorial · HRMS · Administration</span></div>
          <div><b>Reviewed evidence</b><span>${images.length} platform interface and engineering records<br/>Next.js · Supabase · GoCardless · Polygon</span></div>
        </div>
      </section>

      <section class="page-break">
        <div class="chapter-label">Document navigation</div>
        <h2>Table of Contents</h2>
        <p class="lede">This ten-chapter manual records the architecture, transaction lifecycles, data controls, operating workspaces, quality practices and scheduled R&amp;D outcomes of the Oxyile UK FinTech platform.</p>
        <ol class="toc">
          <li><span class="number">01</span><span>Executive Summary, FCA Endorsement Scope &amp; Platform Vision</span><span>${count('platform') + 1} figures</span></li>
          <li><span class="number">02</span><span>Full-Stack Architecture &amp; Supabase RLS Security Framework</span><span>${count('architecture') - 1 + count('security')} figures</span></li>
          <li><span class="number">03</span><span>Open Banking, GoCardless Mandates &amp; Co-Applicant Liability</span><span>${count('openBanking')} figures</span></li>
          <li><span class="number">04</span><span>Polygon Audit Trails &amp; Escrow Settlement</span><span>${count('blockchain')} figures</span></li>
          <li><span class="number">05</span><span>Investor, Borrower &amp; Handshake Mechanics</span><span>${count('lending')} figures</span></li>
          <li><span class="number">06</span><span>Editorial Studio &amp; SEO Content Engine</span><span>${editorialFeatures.length} controls · ${count('editorial')} figures</span></li>
          <li><span class="number">07</span><span>Enterprise HRMS, ATS &amp; Regulatory Compliance</span><span>${hrFeatures.length} controls · ${count('hr')} figures</span></li>
          <li><span class="number">08</span><span>Executive Admin Intelligence &amp; Headcount Governance</span><span>${count('admin')} figures</span></li>
          <li><span class="number">09</span><span>Quality Assurance, Loading Integrity &amp; Edge-Case Resilience</span><span>QA register</span></li>
          <li><span class="number">10</span><span>Outstanding R&amp;D Workstreams &amp; Q3–Q4 Delivery Roadmap</span><span>Aug–Oct 2026</span></li>
        </ol>
        <div class="callout">
          <strong>Document standing.</strong> This is a technical R&amp;D and delivery record. It is intended to support director review and regulatory engagement; it is not, by itself, evidence of FCA authorisation or endorsement, a legal opinion, an audit opinion or a production security certification.
        </div>
      </section>

      <section>
        <div class="chapter-label">Chapter 1</div>
        <h2 class="chapter-title">Executive Summary, FCA Endorsement Scope &amp; Platform Vision</h2>
        <p class="lede">Oxyile is a role-governed UK lending technology platform that connects verified borrowers and investors through structured collateral-backed handshakes, guarantor-supported Direct Debit controls, client-money reconciliation and tamper-evident Polygon references. Its innovation rationale is to replace fragmented marketplace, consent, payment and evidence journeys with one traceable transaction lifecycle denominated consistently in British Pounds.</p>
        ${heroArchitectureFigure(heroArchitectureImage)}
        <h3>Innovation rationale and UK market position</h3>
        <p>Smaller UK credit transactions often experience disproportionate operational friction: manual counterparty discovery, inconsistent affordability evidence, disconnected guarantor communication and payment records that cannot be reconciled readily to the agreed facility. Oxyile addresses that problem through a bilateral handshake object that carries party identity, principal, rate, duration, collateral, approval, mandate, settlement and audit references through the whole lifecycle.</p>
        <p>The platform’s £120 minimum supported ticket demonstrates technical capability for accessible lending values; it does not replace product governance. Launch parameters require credit-risk appetite, affordability methodology, vulnerability controls, fee and APR disclosure, complaints handling, arrears treatment and Consumer Duty outcome monitoring. Investor presentation must explain capital-at-risk, liquidity limitations, default assumptions and the status of any security or guarantee.</p>
        <h3>FCA endorsement scope and evidential boundaries</h3>
        <p>This manual supports director review and regulatory engagement by describing engineering controls and the evidence supplied with the July 2026 build. It does not represent FCA authorisation, approval or endorsement. Regulatory perimeter analysis must determine the permissions and financial-promotion approvals required for the exact operating model, including credit broking, lending, debt administration, payment services, client money and any P2P platform activity.</p>
        <div class="callout"><strong>Platform vision.</strong> Oxyile’s target operating model is a transparent UK marketplace in which every material transition can be attributed to an authenticated actor, validated against constrained database state, reconciled to an external provider reference and inspected through a management evidence trail.</div>
        ${evidenceGallery(images, 'platform', 1, 'UK platform vision and public experience records')}
      </section>

      <section>
        <div class="chapter-label">Chapter 2</div>
        <h2 class="chapter-title">Full-Stack Engineering Architecture &amp; Supabase RLS Security Framework</h2>
        <p class="lede">Next.js App Router, Supabase Auth, PostgreSQL, Storage and Realtime form a layered service architecture. The design does not treat a client-side route guard as security: identity, role, row participation and lifecycle state are verified at each trusted boundary.</p>
        <h3>Application and service architecture</h3>
        <p>Next.js route groups separate public acquisition routes from authenticated Investor, Borrower, Blogger, HR and Admin workspaces. Server components retrieve identity and protected data before initial render. Client components manage interaction, optimistic display and subscriptions but do not possess settlement authority. Route handlers and server actions repeat session, role, ownership, input-shape and state-transition checks before mutation.</p>
        <div class="architecture-grid">
          <article class="architecture-card no-break"><h3>Next.js application layer</h3><p>Route layouts apply authentication and workspace-level role checks. React Server Components reduce exposure of privileged data, while narrowly scoped client components provide realtime interaction, forms and resilient status transitions.</p></article>
          <article class="architecture-card no-break"><h3>Supabase PostgreSQL</h3><p>Profiles, handshakes, applications, editorial records, ATS entities and HRMS ledgers use foreign keys, check constraints, indexes and timestamped state. Service-role access remains confined to trusted server modules.</p></article>
          <article class="architecture-card no-break"><h3>Identity, RBAC and RLS</h3><p>Supabase Auth establishes the session. Profile and controlled staff-directory roles resolve workspace rights. Row-Level Security limits direct queries by participant or role, and server assertions repeat the decision before privileged mutation.</p></article>
          <article class="architecture-card no-break"><h3>Payments and audit anchors</h3><p>GoCardless manages hosted GBP mandate authorisation. Provider webhooks reconcile payment state. Canonical handshake hashes are relayed to Polygon Amoy and their transaction hashes return to the operational record.</p></article>
        </div>
        <h3>Multi-tenant isolation and data constraints</h3>
        <p>Isolation is implemented through layered controls rather than a single middleware decision. Protected pages reject absent sessions; role-specific layouts reject mismatched profiles; server actions verify the caller and row ownership; and RLS constrains browser-originated table access. Handshake policies use borrower_id and lender_id participation. Blogger records use author and reviewer roles. HR and ATS records are available only to authorised people-operations or administrative actors. Public tables expose deliberately limited read predicates, such as open careers postings marked for publication.</p>
        <p>Database check constraints bound status values such as PENDING, ACTIVE, REJECTED, applicant stages, background-check states, leave decisions and expense decisions. Foreign keys prevent orphaned relationships, while indexes support stage, author, participant and status retrieval. JSONB is reserved for structured variable content such as scorecards, policy acknowledgements and inline-image indexes rather than replacing relational fields that require constraints.</p>
        <h3>UK hosting and privacy position</h3>
        <p>UK data residency is a deployment property, not a consequence of using Supabase or Next.js. A production endorsement pack must identify the selected Supabase project region, hosting region, sub-processors, backup location and cross-border transfer mechanism. The architecture supports UK GDPR principles through purpose-specific tables, least privilege, access logs and controlled storage, but Oxyile must additionally maintain a Record of Processing Activities, retention schedule, lawful-basis analysis, DPIAs for higher-risk processing, subject-right procedures and processor agreements.</p>
        <table class="control-table">
          <thead><tr><th>Security boundary</th><th>Engineering position and required assurance</th></tr></thead>
          <tbody>
            <tr><td>Authentication</td><td>Supabase Auth issues the application session. Protected layouts retrieve the user server-side; mutating endpoints return 401 for an absent or expired session. Staff accounts require MFA and controlled recovery.</td></tr>
            <tr><td>Role-based access</td><td>ADMIN, HR, BLOGGER, INVESTOR and BORROWER responsibilities are separated. Authorised server modules resolve staff access before privileged operations.</td></tr>
            <tr><td>Row-Level Security</td><td>Participant, author and role predicates constrain direct table access. Policy assurance must include positive and negative tests for SELECT, INSERT, UPDATE and DELETE.</td></tr>
            <tr><td>Service credentials</td><td>Service-role keys, provider tokens and relayer keys remain server-only. Rotation, named ownership, monitoring and break-glass procedures are required.</td></tr>
            <tr><td>Storage</td><td>Collateral, resumes and editorial media use purpose-specific paths and MIME/size validation. Public access is restricted to deliberately public assets.</td></tr>
          </tbody>
        </table>
        ${evidenceGallery(images, 'architecture', 2, 'Full-stack architecture and controlled delivery records')}
        ${evidenceGallery(images, 'security', 2)}
      </section>

      <section>
        <div class="chapter-label">Chapter 3</div>
        <h2 class="chapter-title">Open Banking Infrastructure, GoCardless Mandates &amp; Co-Applicant Liability Model</h2>
        <p class="lede">The payment programme combines GoCardless Direct Debit mandate authorisation, signed guarantor review, realtime status propagation and controlled escrow reconciliation. Direct Debit is distinguished technically from payment-initiation Open Banking even where the wider product language groups both under connected banking.</p>
        ${buildPaymentLifecycle([2, 3, 4, 5])}
        <h3>Provider endpoint, payload and UK account controls</h3>
        <p>The sandbox API and hosted payment experience have different responsibilities. The server creates billing resources against the provider sandbox API; the browser navigates by GET to the returned hosted authorisation URL, commonly under pay-sandbox.gocardless.com. Application collateral forms may use multipart/form-data, while the current provider API boundary uses JSON with bearer authorisation, API version and content negotiation headers. The system must never infer successful authorisation from browser navigation alone.</p>
        <p>Sandbox sort code 20-00-00 and account number 55779911 are test fixtures and must never appear as production customer data. Live sort-code and account-number formatting checks are preliminary only; ownership and mandate authorisation depend on the hosted provider result. The raw webhook body must be verified against GoCardless-Webhook-Signature with the endpoint secret and a constant-time comparison before event parsing or database mutation.</p>
        ${evidenceGallery(images, 'openBanking', 3)}
      </section>

      <section>
        <div class="chapter-label">Chapter 4</div>
        <h2 class="chapter-title">On-Chain Audit Trails, Polygon Blockchain Triggers &amp; Escrow Settlement</h2>
        <p class="lede">Polygon is used as a tamper-evident audit anchor after authorised fiat settlement conditions are satisfied. It is not the client-money ledger, does not hold bank credentials and does not replace the signed agreement or operational PostgreSQL record.</p>
        ${buildPaymentLifecycle([6])}
        <h3>Escrow-to-chain trigger discipline</h3>
        <p>A provider event first enters the internal reconciliation lifecycle. The transaction is eligible for anchoring only after session and participant controls, bilateral approval, GBP amount and currency reconciliation, provider settlement state, AML and sanctions gates and treasury release authority are satisfied. The server then hashes a canonical facility representation and relays a zero-value transaction through a protected Polygon wallet.</p>
        <p>The receipt hash, block reference and activation timestamp return to the handshake. A successful chain transaction followed by a failed database write is treated as a partial success: operations retain the transaction hash and reconcile the database rather than submitting a second economic instruction. Chain unavailability produces a controlled retry queue with idempotency and monitoring.</p>
        ${evidenceGallery(images, 'blockchain', 4)}
      </section>

      <section>
        <div class="chapter-label">Chapter 5</div>
        <h2 class="chapter-title">FinTech Core Lending Workspace: Investor, Borrower &amp; Handshake Mechanics</h2>
        <p class="lede">The lending workspaces transform a marketplace interaction into a controlled facility lifecycle. Every stage retains the same party identifiers and GBP terms so discovery, negotiation, consent, funding and servicing can be reconciled without re-keying economic data.</p>
        ${buildPaymentLifecycle([1])}
        ${featureArticles(lendingWorkspaceFeatures, 'lending')}
        <h3>Proposal negotiation and portfolio monitoring</h3>
        <p>The chat room acts as the negotiation context, while the handshake record is the structured transaction context. Messages cannot amend principal or approval state; those changes use dedicated actions. This separation prevents conversational text from becoming an uncontrolled financial instruction. Portfolio views then aggregate only facilities in which the current user participates and present principal, expected return, EMI, status and provider references using British currency formatting.</p>
        <p>Collateral information remains linked to the proposal and administrative review. A valuation field is evidence supplied for assessment, not an independent professional valuation. Any enforcement process must follow the signed agreement, consumer-credit obligations, fair-treatment policy, vulnerability considerations and applicable insolvency or security law. Technical state alone must not trigger physical enforcement.</p>
        ${evidenceGallery(images, 'lending', 5)}
      </section>

      <section>
        <div class="chapter-label">Chapter 6</div>
        <h2 class="chapter-title">Oxyile Editorial Studio &amp; Proprietary SEO Content Engine</h2>
        <p class="lede">The Editorial Studio combines semantic authoring, Supabase media storage, role-separated review, realtime search analysis and controlled multi-channel reuse. SEO tools provide decision support; they do not independently publish financial promotions or replace factual and compliance review.</p>
        <div class="callout"><strong>Governed lifecycle.</strong> Research → draft → semantic authoring → inline media → live checks → admin review/edit → approve or structured reject → author remediation → resubmit → publish → controlled repurposing.</div>
        ${featureArticles(editorialFeatures, 'editorial')}
        ${evidenceGallery(images, 'editorial', 6)}
      </section>

      <section>
        <div class="chapter-label">Chapter 7</div>
        <h2 class="chapter-title">Enterprise HRMS, ATS Suite &amp; Regulatory Compliance Module</h2>
        <p class="lede">The HR Studio covers requisition governance, public careers, applicant review, onboarding, attendance, leave, assets, payroll visibility, performance and offboarding. Monetary fields are denominated explicitly in British Pounds. Recruitment scores and retention indicators remain human-reviewed decision support.</p>
        <h3>Relational architecture and workforce safeguards</h3>
        <p>job_postings is the requisition parent for job_applicants. Employment type, posting status, applicant stage and background-check status are constrained values. employee_hr_profiles is the parent for leave_requests, expense_claims, attendance, overtime, assets, KPIs, feedback and offboarding. Foreign keys define deletion behaviour; indexes support stage and employee retrieval; and HR audit logs retain actor, action, JSON details and timestamp.</p>
        <p>The careers integration exposes only open postings marked for public synchronisation. A candidate application uploads a validated PDF resume, detects a duplicate email, calculates a requirements-based match score and inserts the record into Applied. The score must not be treated as a legally determinative hiring decision. DBS status records process progress; it does not assert that a check is appropriate for every role. HR must establish lawful basis, role eligibility, candidate notice, retention and human review.</p>
        <p>PAYE and National Insurance viewers are explanatory calculations based on configured bands. They are not a substitute for HMRC-recognised payroll processing. Payslip values, pensions, statutory leave and contractor classification require reconciliation with current tax rules and approved payroll advice. The platform’s GBP lock prevents accidental USD presentation but does not itself validate payroll law.</p>
        ${featureArticles(hrFeatures, 'hr')}
        ${evidenceGallery(images, 'hr', 7)}
      </section>

      <section>
        <div class="chapter-label">Chapter 8</div>
        <h2 class="chapter-title">Executive Admin Intelligence, Headcount Governance &amp; Budget Burn Rate (£)</h2>
        <p class="lede">The administrative estate provides operating oversight without collapsing separation of duties. Executive views aggregate current source records, while approval pages retain the individual decision, actor and timestamp.</p>
        ${featureArticles(adminFeatures, 'admin')}
        <h3>Management information and decision boundaries</h3>
        <p>The HR Overview computes monthly payroll burn from active annual compensation components and presents department cost centres in GBP. Employee, contractor and vacancy counts derive from constrained source status. Attrition and burnout indicators are review prompts, not employee decisions. Expenses over £500 and pending headcount budgets enter the critical-action queue so material commitments receive senior review.</p>
        <p>Administrative access does not remove the need for minimisation. Directors should receive aggregate workforce intelligence by default and open identifiable employee or candidate records only for a defined purpose. High-risk actions—role grant, headcount approval, expense sign-off, fraud decision and offboarding—should use named accounts, MFA, short session lifetimes and periodic access recertification.</p>
        ${evidenceGallery(images, 'admin', 8)}
      </section>

      <section>
        <div class="chapter-label">Chapter 9</div>
        <h2 class="chapter-title">Comprehensive Quality Assurance, Skeleton Loading &amp; Edge-Case Resilience Logs</h2>
        <p class="lede">Quality assurance is organised around observable state integrity: the interface must not present stale data, empty results before a request completes, successful financial state before server confirmation or protected content after session expiry.</p>
        <table class="control-table">
          <thead><tr><th>QA domain</th><th>Implemented behaviour, edge case and acceptance evidence</th></tr></thead>
          <tbody>
            <tr><td>Zero-flicker tab loading</td><td>Tab selection sets loading immediately, clears the previous collection and renders Tailwind animate-pulse skeleton cards matching the final geometry. Empty state is permitted only after the active request returns zero rows.</td></tr>
            <tr><td>Superseded response control</td><td>Rapid tab switching must not allow an older response to overwrite the latest tab. Request identity or cancellation is tested under throttled network conditions.</td></tr>
            <tr><td>Case-insensitive lookup</td><td>Email and user-entered identity lookup uses normalisation and appropriate ilike matching where exact case is not semantically meaningful. Tests cover mixed-case applicant and guarantor addresses without widening access predicates.</td></tr>
            <tr><td>HTTP 401 session resilience</td><td>Missing or expired session cookies produce HTTP 401 from protected mutations. The client retains the safe transaction reference, routes to sign-in and resumes only after server-side identity is restored.</td></tr>
            <tr><td>RLS negative tests</td><td>An unrelated authenticated user cannot read or change another handshake, editorial draft, applicant or HR record. Each role is tested against every CRUD operation and service-role use is separately reviewed.</td></tr>
            <tr><td>Realtime degradation</td><td>Websocket loss does not create a false status. Bounded polling retrieves canonical database state, unsubscribes on unmount and stops at a terminal transition.</td></tr>
            <tr><td>Webhook replay</td><td>Duplicate provider event IDs produce idempotent state and do not create duplicate payments, fallback collections or chain submissions.</td></tr>
            <tr><td>GBP boundary testing</td><td>UI values use en-GB formatting; provider requests use integer pence. Zero-rate EMI, rounding boundaries, minimum £120 tickets and reconciliation mismatches are covered.</td></tr>
            <tr><td>Upload failure</td><td>Unsupported MIME type, oversize object, interrupted upload and storage denial produce an actionable error without leaving a canonical row that references a missing asset.</td></tr>
            <tr><td>Accessibility and responsive QA</td><td>Keyboard navigation, focus order, labels, modal escape, contrast, reduced motion and mobile breakpoints are reviewed for public and authenticated workspaces.</td></tr>
          </tbody>
        </table>
        <h3>Solo QA execution discipline</h3>
        <p>Each material change is evaluated through a compact regression path: type validation; production build; unauthenticated route test; positive role test; negative cross-role test; loading and empty-state observation under network throttling; mutation success and failure; refresh persistence; and GBP rendering. Financial transitions add duplicate-submit, stale-session, provider-timeout and reconciliation checks. Evidence records should identify environment, commit, tester, date, expected result, actual result and defect disposition.</p>
        <p>Skeletons are not cosmetic decoration. They distinguish an unresolved request from a confirmed absence of data and prevent users from acting on stale records. Similarly, HTTP 401 is not “prevented” by weakening authentication; it is handled deliberately through session restoration and replay-safe user experience.</p>
      </section>

      <section>
        <div class="chapter-label">Chapter 10</div>
        <h2 class="chapter-title">Outstanding R&amp;D Workstreams &amp; Endorsement Delivery Roadmap (Q3–Q4 2026)</h2>
        <p class="lede">The August–October programme converts the July engineering baseline into a reviewable pre-production assurance pack. Dates below are delivery targets subject to director decisions, provider availability and legal or compliance review.</p>
        <table class="control-table">
          <thead><tr><th>Delivery window</th><th>Engineering workstream</th><th>Exit evidence</th></tr></thead>
          <tbody>
            <tr><td class="roadmap-month">August 2026<br/>Weeks 1–2</td><td><strong>Underwriting schema synchronisation.</strong> Reconcile application, marketplace and handshake fields; establish canonical affordability, collateral valuation, risk-band, guarantor and decision-reason definitions; add forward-only migrations and backfill validation.</td><td>Approved data dictionary, migration review, row-count reconciliation, null and constraint report, rollback rehearsal and signed product-risk acceptance.</td></tr>
            <tr><td class="roadmap-month">August 2026<br/>Weeks 3–4</td><td><strong>Payment and webhook hardening.</strong> Enforce raw-body GoCardless signature verification, event-id idempotency, dead-letter handling, replay tests and provider-to-ledger reconciliation. Separate payment receipt, settlement and release states.</td><td>Signature test vectors, replay results, exception runbook, sandbox certification record and daily reconciliation evidence.</td></tr>
            <tr><td class="roadmap-month">September 2026<br/>Weeks 1–2</td><td><strong>RLS and authentication assurance.</strong> Complete role-by-table CRUD matrix, cross-tenant negative tests, service-role inventory, MFA policy and session-expiry exercises.</td><td>RLS test pack, least-privilege review, access recertification, secrets register and remediation log.</td></tr>
            <tr><td class="roadmap-month">September 2026<br/>Weeks 3–4</td><td><strong>Security audit pack.</strong> Commission independent penetration testing, dependency and configuration review, storage-policy inspection, key-rotation exercise and incident tabletop.</td><td>Independent report, prioritised remediation plan, retest closure, incident minutes and director risk acceptance for residual findings.</td></tr>
            <tr><td class="roadmap-month">October 2026<br/>Weeks 1–2</td><td><strong>Consumer Duty and data-protection evidence.</strong> Finalise customer journeys, vulnerability treatment, outcome metrics, complaints mapping, DPIAs, retention schedule, privacy notices and processor register.</td><td>Approved Consumer Duty assessment, DPIAs, Record of Processing Activities, transfer assessment and retention-control evidence.</td></tr>
            <tr><td class="roadmap-month">October 2026<br/>Weeks 3–4</td><td><strong>Operational readiness and endorsement delivery.</strong> Rehearse payment exceptions, chain partial success, arrears, guarantor fallback, data-subject requests and high-severity incidents; freeze the reviewed release candidate.</td><td>Release manifest, architecture decision register, business-continuity exercise, operational sign-offs, known-risk schedule and final director pack.</td></tr>
          </tbody>
        </table>
        <h3>Outstanding control priorities</h3>
        <p>Priority zero is webhook authenticity: no provider event may mutate financial state until raw-body signature verification is demonstrably fail-closed. Priority one is underwriting data consistency, because affordability and risk decisions cannot be defended if application, marketplace and handshake representations diverge. Priority two is independently evidenced tenant isolation and privileged-access control. Priority three is operational reconciliation across GoCardless, PostgreSQL and Polygon partial-success states.</p>
        <h3>Principal R&amp;D conclusion</h3>
        <p>The platform demonstrates a coherent control architecture across lending, payments, blockchain evidence, content governance and people operations. Its central engineering contribution is the consistent treatment of identity, role, state transition and evidence: interfaces request actions, trusted server boundaries authorise them, constrained database rows record them, provider references reconcile them and management workspaces expose their status.</p>
        <div class="conclusion no-break">
          <h3>Director conclusion</h3>
          <p>Oxyile has progressed beyond isolated prototypes into an integrated technical estate capable of supporting structured UK-market operations. The next assurance phase concentrates on underwriting synchronisation, webhook signature enforcement, independent penetration testing, complete RLS policy tests, payment-provider certification, client-money legal review, DPIA and retention approval, key rotation, incident exercises and external review of customer and guarantor agreements.</p>
          <p class="formal-note">This report describes the July 2026 engineering build and the evidence supplied with it. It does not represent that every control has operated effectively over a defined assurance period.</p>
        </div>
      </section>
    </body>
  </html>`;
}

async function main(): Promise<void> {
  await mkdir(REPORT_ASSETS, { recursive: true });
  const images = await harvestEvidenceImages();
  if (!images.length) {
    throw new Error(`No PNG, JPG or JPEG evidence found in ${IMAGE_LIBRARY}`);
  }

  const html = buildWhitepaper(images);
  const embeddedImageCount = html.split('<img src=').length - 1;
  if (embeddedImageCount !== images.length) {
    throw new Error(
      `Evidence completeness check failed: ${embeddedImageCount} embedded of ${images.length} harvested images.`
    );
  }
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
        <div style="width:100%;padding:0 15mm;font-family:Arial,sans-serif;font-size:7px;color:#737373;border-bottom:1px solid #e5e5e5;">
          OXYILE · ENTERPRISE TECHNICAL R&amp;D WHITEPAPER · JULY 2026
        </div>`,
      footerTemplate: `
        <div style="width:100%;padding:0 15mm;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:7px;color:#737373;border-top:1px solid #e5e5e5;">
          <span>Prepared by Priyanshu · Director and regulatory review copy</span>
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
  const heroArchitectureImage = images.find((image) => image.isHeroArchitecture);
  const categorySummary = CATEGORY_ORDER.map(
    (category) => `${category}=${categoryCount(images, category)}`
  ).join(', ');

  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Oxyile Enterprise R&D Whitepaper published successfully');
  console.log(
    `HERO_ARCHITECTURE_IMAGE embedded in Chapter 1: ${heroArchitectureImage?.relativePath ?? 'NOT FOUND'}`
  );
  console.log(`Embedded image records: ${embeddedImageCount} of ${images.length} harvested`);
  console.log(`Image distribution: ${categorySummary}`);
  console.log(`Total pages: ${pageCount}`);
  console.log(`PDF: ${OUTPUT_PDF}`);
  console.log(`HTML source: ${OUTPUT_HTML}`);
  console.log('════════════════════════════════════════════════════════════════');
}

main().catch((error) => {
  console.error('Whitepaper publication failed.');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
