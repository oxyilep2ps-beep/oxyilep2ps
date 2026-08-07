export function SocialGuideClient() {
  const sections = [
    {
      title: 'Canva template ratios',
      body: 'Use 1:1 square creatives for Instagram feed posts and 1.91:1 landscape frames for LinkedIn Official Feed link/image cards. Export from Canva Brand Studio, then upload here or paste the public CDN URL.',
    },
    {
      title: 'Character limits',
      body: 'LinkedIn Official Feed: up to 3,000 characters. Instagram Business Feed: up to 2,200 characters. The Studio counter uses the stricter limit of your selected channels.',
    },
    {
      title: 'Hashtag strategy',
      body: 'Lead with the story, then append 3–5 focused tags such as #FinTech #UKLending #P2P #Oxyile. Avoid stuffing — clarity beats volume for regulated FinTech messaging.',
    },
    {
      title: 'Admin approval & Make.com',
      body: 'Social Managers save drafts or submit for Admin Approval. Only Admins can Approve & Publish, which fires the Make.com webhook bridge for LinkedIn and/or Instagram. Rejected campaigns return with feedback so you can revise and re-submit.',
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <article
          key={s.title}
          className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">Guide</p>
          <h2 className="mt-1 text-lg font-black text-white">{s.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">{s.body}</p>
        </article>
      ))}
    </div>
  );
}
