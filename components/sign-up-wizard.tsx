'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  Upload,
  Video,
} from 'lucide-react';
import type {
  BasicDetailsStep,
  BorrowerDetailsStep,
  IdentityAmlStep,
  KycSubmissionPayload,
  LenderDetailsStep,
} from '@/lib/types/kyc';
import type { AccountRole } from '@/lib/types/user';
import {
  isAtLeast18,
  isValidUkAccountNumber,
  isValidUkPhone,
  isValidUkPostcode,
  isValidUkSortCode,
} from '@/lib/validation/kyc';
import { cn } from '@/lib/utils';
import { APPROPRIATENESS_QUESTIONS } from '@/lib/kyc/constants';

const STEPS = ['Basic Details', 'Identity & AML', 'Role-specific'] as const;

export { APPROPRIATENESS_QUESTIONS };

const SOURCE_OF_FUNDS_OPTIONS = [
  'Employment income',
  'Savings',
  'Investments / dividends',
  'Property sale',
  'Inheritance',
  'Other (declared)',
];

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
      {children}
      {required ? <span className="text-brand-500"> *</span> : null}
    </span>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-brand-400 dark:border-white/10 dark:bg-black dark:text-white',
        props.className
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-brand-400 dark:border-white/10 dark:bg-black dark:text-white',
        props.className
      )}
    />
  );
}

function FileDrop({
  label,
  hint,
  accept,
  file,
  onFile,
  icon,
}: {
  label: string;
  hint: string;
  accept?: string;
  file: File | null;
  onFile: (f: File | null) => void;
  icon: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-brand-200 bg-brand-500/5 p-5 text-center transition hover:border-brand-400 dark:border-brand-500/30 dark:bg-brand-500/10">
      {icon}
      <span className="text-sm font-semibold text-neutral-950 dark:text-white">{label}</span>
      <span className="text-xs text-neutral-600 dark:text-neutral-400">{hint}</span>
      {file ? <span className="text-xs text-brand-600 dark:text-brand-300">{file.name}</span> : null}
      <input
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export interface SignUpWizardFiles {
  proofOfIdentity: File | null;
  livenessVideo: File | null;
  proofOfAddress: File | null;
  incomeVerification: File | null;
}

export interface SignUpWizardProps {
  onComplete: (
    payload: KycSubmissionPayload,
    meta: { email: string; fullLegalName: string; password: string },
    files: SignUpWizardFiles
  ) => void;
}

export function SignUpWizard({ onComplete }: SignUpWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [role, setRole] = useState<AccountRole>('lender');
  const [errors, setErrors] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [basic, setBasic] = useState<BasicDetailsStep>({
    fullLegalName: '',
    email: '',
    ukPhone: '',
    postalCode: '',
    dateOfBirth: '',
    currentAddress: '',
    addressHistory3Years: '',
  });

  const [identity, setIdentity] = useState<IdentityAmlStep>({
    proofOfIdentity: null,
    proofOfIdentityType: '',
    livenessVideo: null,
    proofOfAddress: null,
  });

  const [lender, setLender] = useState<LenderDetailsStep>({
    investorCategory: '',
    appropriatenessAnswers: [null, null, null],
    sourceOfFunds: '',
    bankSortCode: '',
    bankAccountNumber: '',
  });

  const [borrower, setBorrower] = useState<BorrowerDetailsStep>({
    purposeOfLoan: '',
    employmentStatus: '',
    annualIncome: '',
    incomeVerificationFile: null,
    openBankingConsent: false,
    creditCheckConsent: false,
    monthlyRentOrEmi: '',
    otherMonthlyExpenses: '',
  });

  const progress = ((step + 1) / STEPS.length) * 100;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMinLength = password.length >= 8;
  const passwordChecks = [hasUppercase, hasNumber, hasMinLength].filter(Boolean).length;
  const strengthPercent = (passwordChecks / 3) * 100;
  const strengthColor =
    strengthPercent < 40 ? 'bg-red-500' : strengthPercent < 70 ? 'bg-amber-400' : 'bg-emerald-500';
  const strengthLabel =
    strengthPercent < 40 ? 'Weak' : strengthPercent < 70 ? 'Medium' : 'Strong';

  const validateStep = (index: number): string[] => {
    const errs: string[] = [];
    if (index === 0) {
      if (!basic.fullLegalName.trim()) errs.push('Full legal name is required (must match ID).');
      if (!basic.email.includes('@')) errs.push('Valid email is required.');
      if (!isValidUkPhone(basic.ukPhone)) errs.push('Enter a valid UK phone number (+44 or 07…).');
      if (!isValidUkPostcode(basic.postalCode)) errs.push('Enter a valid UK postal code.');
      if (!isAtLeast18(basic.dateOfBirth)) errs.push('You must be 18 or older to register.');
      if (!basic.currentAddress.trim()) errs.push('Current address is required.');
      if (!basic.addressHistory3Years.trim()) errs.push('3-year address history is required.');
      if (!hasMinLength || !hasUppercase || !hasNumber) {
        errs.push('Password must include 8+ chars, 1 uppercase letter, and 1 number.');
      }
      if (password !== confirmPassword) errs.push('Passwords do not match.');
    }
    if (index === 1) {
      if (!identity.proofOfIdentityType) errs.push('Select a proof of identity document type.');
      if (!identity.proofOfIdentity) errs.push('Upload proof of identity.');
      if (!identity.livenessVideo) errs.push('Liveness video/selfie check is required (~3 seconds).');
      if (!identity.proofOfAddress) errs.push('Upload proof of address (utility bill < 3 months).');
    }
    if (index === 2) {
      if (role === 'lender') {
        if (!lender.investorCategory) errs.push('Select investor categorisation.');
        if (lender.appropriatenessAnswers.some((a) => a === null)) errs.push('Complete all FCA appropriateness questions.');
        if (!lender.sourceOfFunds) errs.push('Declare source of funds.');
        if (!isValidUkSortCode(lender.bankSortCode)) errs.push('Enter a valid UK sort code.');
        if (!isValidUkAccountNumber(lender.bankAccountNumber)) errs.push('Enter a valid 8-digit UK account number.');
      } else {
        if (!borrower.purposeOfLoan.trim()) errs.push('Purpose of loan is required.');
        if (!borrower.employmentStatus.trim()) errs.push('Employment details are required.');
        if (!borrower.annualIncome.trim()) errs.push('Annual income is required.');
        if (!borrower.incomeVerificationFile && !borrower.openBankingConsent) {
          errs.push('Provide income verification upload or Open Banking consent.');
        }
        if (!borrower.creditCheckConsent) errs.push('Credit check consent is required (Experian/Equifax).');
        if (!borrower.monthlyRentOrEmi.trim()) errs.push('Monthly rent/EMI is required for affordability.');
      }
    }
    return errs;
  };

  const goNext = () => {
    const errs = validateStep(step);
    setErrors(errs);
    if (errs.length) return;
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      submit();
    }
  };

  const goBack = () => {
    setErrors([]);
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = () => {
    const payload: KycSubmissionPayload = {
      role,
      basic,
      identityMeta: {
        proofOfIdentityType: identity.proofOfIdentityType,
        hasProofOfIdentity: Boolean(identity.proofOfIdentity),
        hasLivenessVideo: Boolean(identity.livenessVideo),
        hasProofOfAddress: Boolean(identity.proofOfAddress),
      },
      ...(role === 'lender'
        ? { lender }
        : {
            borrower: {
              purposeOfLoan: borrower.purposeOfLoan,
              employmentStatus: borrower.employmentStatus,
              annualIncome: borrower.annualIncome,
              openBankingConsent: borrower.openBankingConsent,
              creditCheckConsent: borrower.creditCheckConsent,
              monthlyRentOrEmi: borrower.monthlyRentOrEmi,
              otherMonthlyExpenses: borrower.otherMonthlyExpenses,
              hasIncomeVerification: Boolean(borrower.incomeVerificationFile),
            },
          }),
    };
    onComplete(
      payload,
      { email: basic.email, fullLegalName: basic.fullLegalName, password },
      {
        proofOfIdentity: identity.proofOfIdentity,
        livenessVideo: identity.livenessVideo,
        proofOfAddress: identity.proofOfAddress,
        incomeVerification: borrower.incomeVerificationFile,
      }
    );
  };

  const stepContent = useMemo(() => {
    if (step === 0) {
      return (
        <motion.div key="step-0" className="space-y-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            FCA KYC: provide details exactly as they appear on your government-issued ID.
          </p>
          <label className="block">
            <FieldLabel required>Full Legal Name</FieldLabel>
            <TextInput
              value={basic.fullLegalName}
              onChange={(e) => setBasic({ ...basic, fullLegalName: e.target.value })}
              placeholder="As shown on passport or driving licence"
            />
          </label>
          <label className="block">
            <FieldLabel required>Email</FieldLabel>
            <TextInput
              type="email"
              value={basic.email}
              onChange={(e) => setBasic({ ...basic, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <FieldLabel required>Password</FieldLabel>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className="w-full bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-neutral-400 transition hover:text-brand-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <motion.div
                  className={`h-full ${strengthColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${strengthPercent}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Strength: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{password ? strengthLabel : '—'}</span>{' '}
                (8+ chars, 1 uppercase, 1 number)
              </p>
            </div>
          </label>
          <label className="block">
            <FieldLabel required>Confirm password</FieldLabel>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="w-full bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="text-neutral-400 transition hover:text-brand-500"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="block">
            <FieldLabel required>UK Phone (+44 OTP ready)</FieldLabel>
            <TextInput
              value={basic.ukPhone}
              onChange={(e) => setBasic({ ...basic, ukPhone: e.target.value })}
              placeholder="+44 7XXX XXXXXX"
            />
          </label>
          <label className="block">
            <FieldLabel required>Postal Code</FieldLabel>
            <TextInput
              value={basic.postalCode}
              onChange={(e) => setBasic({ ...basic, postalCode: e.target.value.toUpperCase() })}
              placeholder="SW1A 1AA"
              autoComplete="postal-code"
            />
          </label>
          <label className="block">
            <FieldLabel required>Date of Birth</FieldLabel>
            <TextInput
              type="date"
              value={basic.dateOfBirth}
              onChange={(e) => setBasic({ ...basic, dateOfBirth: e.target.value })}
            />
          </label>
          <label className="block">
            <FieldLabel required>Current Address</FieldLabel>
            <TextArea
              rows={2}
              value={basic.currentAddress}
              onChange={(e) => setBasic({ ...basic, currentAddress: e.target.value })}
              placeholder="112, Dogfield Street, Cardiff CF24 4QN"
            />
          </label>
          <label className="block">
            <FieldLabel required>3-Year Address History</FieldLabel>
            <TextArea
              rows={3}
              value={basic.addressHistory3Years}
              onChange={(e) => setBasic({ ...basic, addressHistory3Years: e.target.value })}
              placeholder="Previous addresses with dates if changed in last 3 years"
            />
          </label>
        </motion.div>
      );
    }

    if (step === 1) {
      return (
        <motion.div key="step-1" className="space-y-4">
          <label className="block">
            <FieldLabel required>Proof of Identity Type</FieldLabel>
            <select
              value={identity.proofOfIdentityType}
              onChange={(e) =>
                setIdentity({
                  ...identity,
                  proofOfIdentityType: e.target.value as IdentityAmlStep['proofOfIdentityType'],
                })
              }
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black dark:text-white"
            >
              <option value="">Select document</option>
              <option value="passport">Passport</option>
              <option value="driving_licence">Driving Licence</option>
              <option value="brp">Biometric Residence Permit (BRP)</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileDrop
              label="Proof of Identity"
              hint="Passport, licence, or BRP scan"
              accept="image/*,.pdf"
              file={identity.proofOfIdentity}
              onFile={(f) => setIdentity({ ...identity, proofOfIdentity: f })}
              icon={<FileText className="text-brand-500" size={24} />}
            />
            <FileDrop
              label="Proof of Address"
              hint="Utility bill dated within 3 months"
              accept="image/*,.pdf"
              file={identity.proofOfAddress}
              onFile={(f) => setIdentity({ ...identity, proofOfAddress: f })}
              icon={<Upload className="text-brand-500" size={24} />}
            />
          </div>
          <FileDrop
            label="Liveness Video / Selfie Check"
            hint="~3 second video — face clearly visible"
            accept="video/*,image/*"
            file={identity.livenessVideo}
            onFile={(f) => setIdentity({ ...identity, livenessVideo: f })}
            icon={<Video className="text-brand-500" size={24} />}
          />
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-black/40">
            <Camera size={20} className="text-brand-500" />
            <span className="text-neutral-600 dark:text-neutral-300">
              Automated liveness verification will be enabled at launch. Upload placeholder accepted for beta onboarding.
            </span>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div key="step-2" className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-100 p-1 dark:bg-black"
        >
          <button
            type="button"
            onClick={() => setRole('lender')}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-semibold transition',
              role === 'lender' ? 'bg-brand-500 text-white shadow-glow' : 'text-neutral-600 dark:text-neutral-300'
            )}
          >
            Lender / Investor
          </button>
          <button
            type="button"
            onClick={() => setRole('borrower')}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-semibold transition',
              role === 'borrower' ? 'bg-brand-500 text-white shadow-glow' : 'text-neutral-600 dark:text-neutral-300'
            )}
          >
            Borrower
          </button>
        </motion.div>

        {role === 'lender' ? (
          <>
            <label className="block">
              <FieldLabel required>Investor Categorisation</FieldLabel>
              <select
                value={lender.investorCategory}
                onChange={(e) =>
                  setLender({ ...lender, investorCategory: e.target.value as LenderDetailsStep['investorCategory'] })
                }
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
              >
                <option value="">Select category</option>
                <option value="everyday">Everyday Investor</option>
                <option value="hnw">High Net Worth (HNW)</option>
                <option value="restricted">Restricted Investor</option>
              </select>
            </label>
            <motion.div layout className="space-y-4 rounded-2xl border border-brand-200/60 p-4 dark:border-brand-500/20">
              <p className="text-sm font-semibold text-neutral-950 dark:text-white">FCA Appropriateness Test</p>
              {APPROPRIATENESS_QUESTIONS.map((q, i) => (
                <fieldset key={q} className="text-sm">
                  <legend className="mb-2 text-neutral-700 dark:text-neutral-300">{i + 1}. {q}</legend>
                  <motion.div layout className="flex gap-4">
                    {(['Yes', 'No'] as const).map((opt, idx) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`mcq-${i}`}
                          checked={lender.appropriatenessAnswers[i] === idx}
                          onChange={() => {
                            const next = [...lender.appropriatenessAnswers] as LenderDetailsStep['appropriatenessAnswers'];
                            next[i] = idx;
                            setLender({ ...lender, appropriatenessAnswers: next });
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </motion.div>
                </fieldset>
              ))}
            </motion.div>
            <label className="block">
              <FieldLabel required>Source of Funds</FieldLabel>
              <select
                value={lender.sourceOfFunds}
                onChange={(e) => setLender({ ...lender, sourceOfFunds: e.target.value })}
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
              >
                <option value="">Select source</option>
                {SOURCE_OF_FUNDS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Sort Code</FieldLabel>
                <TextInput
                  value={lender.bankSortCode}
                  onChange={(e) => setLender({ ...lender, bankSortCode: e.target.value })}
                  placeholder="00-00-00"
                />
              </label>
              <label className="block">
                <FieldLabel required>Account Number</FieldLabel>
                <TextInput
                  value={lender.bankAccountNumber}
                  onChange={(e) => setLender({ ...lender, bankAccountNumber: e.target.value })}
                  placeholder="12345678"
                />
              </label>
            </div>
            <p className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <Landmark size={14} /> Nominated UK bank account for withdrawals and repayments.
            </p>
          </>
        ) : (
          <>
            <label className="block">
              <FieldLabel required>Purpose of Loan</FieldLabel>
              <TextArea
                rows={3}
                value={borrower.purposeOfLoan}
                onChange={(e) => setBorrower({ ...borrower, purposeOfLoan: e.target.value })}
              />
            </label>
            <label className="block">
              <FieldLabel required>Employment & Income</FieldLabel>
              <TextInput
                value={borrower.employmentStatus}
                onChange={(e) => setBorrower({ ...borrower, employmentStatus: e.target.value })}
                placeholder="e.g. Full-time, £45,000 p.a."
              />
            </label>
            <label className="block">
              <FieldLabel required>Annual Income (£)</FieldLabel>
              <TextInput
                type="number"
                value={borrower.annualIncome}
                onChange={(e) => setBorrower({ ...borrower, annualIncome: e.target.value })}
              />
            </label>
            <FileDrop
              label="Income Verification"
              hint="Recent payslips (PDF/image)"
              accept="image/*,.pdf"
              file={borrower.incomeVerificationFile}
              onFile={(f) => setBorrower({ ...borrower, incomeVerificationFile: f })}
              icon={<Building2 className="text-brand-500" size={24} />}
            />
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={borrower.openBankingConsent}
                onChange={(e) => setBorrower({ ...borrower, openBankingConsent: e.target.checked })}
              />
              I consent to Open Banking income verification instead of manual upload
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-white/60 p-4 text-sm dark:border-white/10">
              <input
                type="checkbox"
                className="mt-1"
                checked={borrower.creditCheckConsent}
                onChange={(e) => setBorrower({ ...borrower, creditCheckConsent: e.target.checked })}
              />
              <span>
                I consent to a soft/hard credit check via Experian and Equifax for affordability and fraud prevention.
              </span>
            </label>
            <p className="text-sm font-semibold text-neutral-950 dark:text-white">Affordability Assessment</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Monthly Rent / EMI (£)</FieldLabel>
                <TextInput
                  value={borrower.monthlyRentOrEmi}
                  onChange={(e) => setBorrower({ ...borrower, monthlyRentOrEmi: e.target.value })}
                />
              </label>
              <label className="block">
                <FieldLabel>Other Monthly Expenses (£)</FieldLabel>
                <TextInput
                  value={borrower.otherMonthlyExpenses}
                  onChange={(e) => setBorrower({ ...borrower, otherMonthlyExpenses: e.target.value })}
                />
              </label>
            </div>
          </>
        )}
      </motion.div>
    );
  }, [
    step,
    basic,
    identity,
    lender,
    borrower,
    role,
    password,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    strengthPercent,
    strengthColor,
    strengthLabel,
  ]);

  return (
    <motion.div layout className="glass-card rounded-[2.25rem] p-7 shadow-glass">
      <motion.div layout className="mb-6">
        <p className="text-sm uppercase tracking-[0.28em] text-brand-500">UK FCA-aligned onboarding</p>
        <h2 className="mt-2 text-2xl font-bold text-neutral-950 dark:text-white">Create your Oxyile account</h2>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                i === step
                  ? 'bg-brand-500 text-white'
                  : i < step
                    ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-black dark:text-neutral-400'
              )}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35 }}
        >
          {stepContent}
        </motion.div>
      </AnimatePresence>

      {errors.length > 0 && (
        <motion.ul
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 space-y-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </motion.ul>
      )}

      <motion.div layout className="mt-8 flex flex-wrap gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold dark:border-white/10"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400"
        >
          {step === STEPS.length - 1 ? (
            <>
              <CheckCircle2 size={16} /> Submit for review
            </>
          ) : (
            <>
              Continue <ArrowRight size={16} />
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default SignUpWizard;
