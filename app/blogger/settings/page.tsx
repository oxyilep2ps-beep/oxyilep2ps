export default function BloggerSettingsPage() {
  return (
    <section className="glass-card rounded-[1.75rem] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Settings</p>
      <h2 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">Editorial preferences</h2>
      <p className="mt-3 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
        Blogger account settings stay synced with your Oxyile staff profile. Use the SEO Studio for draft scoring
        and the SEO Guide playbook for ranking workflows. Contact an admin if your directory role needs updating.
      </p>
      <ul className="mt-6 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        <li>• Publish flow: Draft → Pending Approval → Published (or Rejected with feedback)</li>
        <li>• Inline images upload to the `blog-inline` storage bucket</li>
        <li>• Rejected posts appear under Drafts / Rejected with a red banner</li>
      </ul>
    </section>
  );
}
