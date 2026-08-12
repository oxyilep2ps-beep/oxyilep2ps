'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getEmployeeAnalytics } from '@/app/actions/employee-portal';
import { AuthToast } from '@/components/auth-toast';
import type { EmployeeAnalyticsBundle } from '@/lib/employee/types';
import { Download, Loader2 } from 'lucide-react';

export function AdminEmployeeAnalytics({ employeeId }: { employeeId: string }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<EmployeeAnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    startTransition(async () => {
      try {
        setData(await getEmployeeAnalytics(employeeId));
      } catch (e) {
        setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Failed to load analytics' });
      } finally {
        setLoading(false);
      }
    });
  }, [employeeId]);

  const downloadPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0A0A0A',
        scale: 2,
        useCORS: true,
      });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;

      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(249, 115, 22);
      pdf.setFontSize(14);
      pdf.text('Oxyile · Employee Performance Report', 14, 14);
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(10);
      pdf.text(data?.profile?.full_legal_name ?? 'Employee', 14, 22);
      pdf.addImage(img, 'PNG', (pageWidth - w) / 2, 28, w, Math.min(h, pageHeight - 36));
      pdf.save(`oxyile-employee-${employeeId.slice(0, 8)}.pdf`);
      setToast({ tone: 'success', message: 'PDF downloaded.' });
    } catch (e) {
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'PDF export failed' });
    } finally {
      setExporting(false);
    }
  };

  if (loading || pending) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={28} />
      </div>
    );
  }

  if (!data) {
    return <p className="text-neutral-400">No analytics available.</p>;
  }

  return (
    <div className="space-y-4">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">
            Performance Analytics
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">
            {data.profile?.full_legal_name ?? 'Employee'}
          </h1>
          <p className="text-sm text-neutral-400">{data.profile?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void downloadPdf()}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Download Full Report
        </button>
      </div>

      <div ref={reportRef} className="space-y-4 rounded-2xl bg-[#0A0A0A] p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Completed', value: data.totals.completed },
            { label: 'In progress', value: data.totals.inProgress },
            { label: 'Pending', value: data.totals.pending },
            { label: 'Hours (30d)', value: data.totals.hoursLogged },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{kpi.label}</p>
              <p className="mt-1 text-2xl font-black text-orange-400">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-orange-500">
              Tasks completed · 30 days
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tasksCompletedSeries}>
                  <defs>
                    <linearGradient id="oxyOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="#737373" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#0A0A0A', border: '1px solid #262626', color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#F97316"
                    strokeWidth={2}
                    fill="url(#oxyOrange)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-orange-500">
              Task status distribution
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.statusDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {data.statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0A0A0A', border: '1px solid #262626', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-orange-500">
            Hours logged per day
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hoursLoggedSeries}>
                <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#737373" tick={{ fontSize: 10 }} />
                <YAxis stroke="#737373" />
                <Tooltip
                  contentStyle={{ background: '#0A0A0A', border: '1px solid #262626', color: '#fff' }}
                />
                <Bar dataKey="hours" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
