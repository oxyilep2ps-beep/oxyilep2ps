'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  deleteBotKnowledge,
  listBotKnowledge,
  upsertBotKnowledge,
  type BotKnowledgeRow,
} from '@/app/actions/admin-bot-knowledge';

export function AdminOliverTrainingTab() {
  const [rows, setRows] = useState<BotKnowledgeRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [answer, setAnswer] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listBotKnowledge());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await upsertBotKnowledge({ id: editId ?? undefined, keyword_string: keyword, answer_text: answer });
    setKeyword('');
    setAnswer('');
    setEditId(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Oliver AI Training</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Manage dynamic Q&A pairs. Keywords are matched when users chat with Oliver.
        </p>
      </div>

      <form onSubmit={onSubmit} className="glass-card space-y-3 rounded-2xl p-5">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Keywords (comma-separated)"
          className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
          required
        />
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer text"
          rows={4}
          className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
          required
        />
        <button type="submit" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white">
          {editId ? 'Update Q&A' : 'Add Q&A'}
        </button>
      </form>

      {loading ? (
        <Loader2 className="mx-auto animate-spin text-brand-500" size={24} />
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="glass-card flex items-start justify-between gap-3 rounded-xl p-4">
              <div>
                <p className="text-xs font-bold uppercase text-brand-500">{row.keyword_string}</p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{row.answer_text}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(row.id);
                    setKeyword(row.keyword_string);
                    setAnswer(row.answer_text);
                  }}
                  className="text-xs font-semibold text-brand-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteBotKnowledge(row.id).then(load)}
                  className="text-red-500"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
