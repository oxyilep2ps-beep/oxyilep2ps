'use client';

import { FormEvent, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { inviteGuarantor } from '@/app/actions/marketplace';
import { notifyChatMessagePush } from '@/app/actions/sendPushNotification';
import { CollateralFormSection } from '@/components/collateral-form-section';
import type { HandshakeRow } from '@/lib/chat/types';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';
import { buildHandshakeMessagePayload } from '@/lib/messages/handshake-payload';
import { createClient } from '@/lib/supabase/client';
import { useEmergencyPause } from '@/lib/hooks/use-emergency-pause';

type HandshakePanelProps = {
  open: boolean;
  onClose: () => void;
  myId: string;
  myRole: 'INVESTOR' | 'BORROWER';
  peerId: string;
  /** Kept for callers; status cards render in the chat stream via HandshakeCard. */
  handshakes: HandshakeRow[];
  onRefresh: () => void;
};

export function HandshakePanel({
  open,
  onClose,
  myId,
  myRole,
  peerId,
  onRefresh,
}: HandshakePanelProps) {
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [guarantorEmail, setGuarantorEmail] = useState('');
  const [collateralType, setCollateralType] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [collateralDescription, setCollateralDescription] = useState('');
  const [collateralProof, setCollateralProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { paused: emergencyPause } = useEmergencyPause();

  if (!open) return null;

  const lenderId = myRole === 'INVESTOR' ? myId : peerId;
  const borrowerId = myRole === 'BORROWER' ? myId : peerId;

  const propose = async (event: FormEvent) => {
    event.preventDefault();
    if (emergencyPause) {
      setMessage('Platform is paused by admin. Handshake proposals are temporarily disabled.');
      return;
    }
    const amt = Number(amount);
    const dur = Number(duration);
    const email = guarantorEmail.trim().toLowerCase();
    if (!amt || !dur) return;
    if (!email || !email.includes('@')) {
      setMessage('A valid guarantor email is required.');
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      if (myRole === 'BORROWER') {
        if (
          !collateralType.trim() ||
          !collateralValue.trim() ||
          Number(collateralValue) <= 0 ||
          !collateralDescription.trim() ||
          !collateralProof
        ) {
          setMessage('All collateral security fields are required before initiating a handshake.');
          setBusy(false);
          return;
        }

        const formData = new FormData();
        formData.append('lender_id', lenderId);
        formData.append('borrower_id', borrowerId);
        formData.append('peer_id', peerId);
        formData.append('amount', String(amt));
        formData.append('rate', String(FIXED_INTEREST_RATE));
        formData.append('duration', String(dur));
        formData.append('collateral_type', collateralType);
        formData.append('collateral_value', collateralValue);
        formData.append('collateral_description', collateralDescription);
        formData.append('collateral_proof', collateralProof);
        formData.append('guarantor_email', email);

        const res = await fetch('/api/handshakes/propose', { method: 'POST', body: formData });
        const body = (await res.json()) as { ok?: boolean; error?: string };

        if (!res.ok || !body.ok) {
          setMessage(body.error ?? 'Could not initiate handshake');
        } else {
          setAmount('');
          setDuration('');
          setGuarantorEmail('');
          setCollateralType('');
          setCollateralValue('');
          setCollateralDescription('');
          setCollateralProof(null);
          onClose();
          onRefresh();
        }
      } else {
        const supabase = createClient();
        const { data: created, error } = await supabase
          .from('handshakes')
          .insert({
            lender_id: lenderId,
            borrower_id: borrowerId,
            amount: amt,
            rate: FIXED_INTEREST_RATE,
            duration: dur,
            status: 'PENDING',
            guarantor_email: email,
            guarantor_status: 'pending',
          })
          .select('id')
          .single();

        if (error || !created) {
          setMessage(error?.message ?? 'Could not initiate handshake');
        } else {
          await inviteGuarantor(created.id as string, email);
          await supabase.from('messages').insert({
            sender_id: myId,
            receiver_id: peerId,
            content: buildHandshakeMessagePayload(created.id as string),
          });
          void notifyChatMessagePush({
            receiverId: peerId,
            preview: 'New handshake proposal',
          });
          setAmount('');
          setDuration('');
          setGuarantorEmail('');
          onClose();
          onRefresh();
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Handshake proposal failed');
    }

    setBusy(false);
  };

  return (
    <div className="glass-card mx-4 mb-2 rounded-2xl border border-brand-200/60 p-4 dark:border-brand-500/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-brand-600 dark:text-brand-300">New Handshake</p>
        <button type="button" onClick={onClose} aria-label="Close handshake panel">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={propose} className="mt-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            required
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (£)"
            className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
          />
          <input
            readOnly
            type="number"
            value={FIXED_INTEREST_RATE}
            aria-label="Interest rate percent per annum"
            className="rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm text-neutral-600 dark:border-white/10 dark:bg-black/30 dark:text-neutral-300"
            title="Platform illustrative rate (% p.a.)"
          />
          <input
            required
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Months"
            className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
          />
        </div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Rate {FIXED_INTEREST_RATE}% p.a. (illustrative modelling — not a guaranteed return).
        </p>

        <input
          required
          type="email"
          value={guarantorEmail}
          onChange={(e) => setGuarantorEmail(e.target.value)}
          placeholder="Guarantor email (required)"
          className="w-full rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
        />

        {myRole === 'BORROWER' ? (
          <CollateralFormSection
            values={{
              collateralType,
              collateralValue,
              collateralDescription,
              collateralProof,
            }}
            onChange={(patch) => {
              if (patch.collateralType !== undefined) setCollateralType(patch.collateralType);
              if (patch.collateralValue !== undefined) setCollateralValue(patch.collateralValue);
              if (patch.collateralDescription !== undefined) setCollateralDescription(patch.collateralDescription);
              if (patch.collateralProof !== undefined) setCollateralProof(patch.collateralProof);
            }}
            inputClassName="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
          />
        ) : null}

        <button
          type="submit"
          disabled={busy || emergencyPause}
          className="w-full rounded-full bg-brand-500 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {emergencyPause ? 'Platform Paused' : 'Initiate Handshake'}
        </button>
        {emergencyPause && (
          <p className="text-center text-[10px] font-semibold text-red-600">
            Emergency pause active — handshake proposals disabled
          </p>
        )}
      </form>

      {message && <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{message}</p>}
      {busy && <Loader2 size={16} className="mt-2 animate-spin text-brand-500" />}
    </div>
  );
}
