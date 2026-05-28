const RESOURCES = [
  'LinkedIn Learning', 'Coursera for HR', 'CIPD Knowledge', 'SHRM Learning', 'Udemy Business',
  'Google Project Management', 'HubSpot Academy', 'FutureLearn', 'edX People Management', 'OpenLearn',
  'Harvard ManageMentor', 'MIT OpenCourseWare', 'Khan Academy Finance', 'Alison HR Diploma', 'Skillshare Creative',
  'Pluralsight Tech', 'Codecademy', 'DataCamp', 'Tableau Public', 'Power BI Learn',
  'Notion Academy', 'Asana Academy', 'Monday.com Resources', 'Slack Skills', 'Zoom Learning Center',
  'Microsoft Learn', 'AWS Training', 'Google Cloud Skills', 'IBM SkillsBuild', 'Oracle University',
  'Workday Training', 'SAP Learning', 'Salesforce Trailhead', 'Zendesk Training', 'Intercom Academy',
  'Figma Learn', 'Canva Design School', 'Adobe Creative Cloud', 'Grammarly Business', 'Copy.ai Academy',
  'Gartner HR Insights', 'McKinsey Forward', 'BCG Henderson Institute', 'Deloitte Insights', 'PwC Academy',
  'EY Learning', 'KPMG Learning', 'ACCA Learning', 'CIMA Study', 'CFA Institute',
];

export function HrLearningHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Learning & Development Hub</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Curated placeholder resources for HR team upskilling ({RESOURCES.length} links).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((name, i) => (
          <a
            key={name}
            href="#"
            className="glass-card flex items-center gap-3 rounded-2xl p-4 transition hover:border-brand-300"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-lg font-black text-brand-600">
              {name.slice(0, 1)}
            </div>
            <div>
              <p className="font-semibold text-neutral-950 dark:text-white">{name}</p>
              <p className="text-xs text-neutral-500">Placeholder · L&D resource {i + 1}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
