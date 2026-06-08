export const STRATEGIC_QUESTIONS = [
  { key: 'uk_resident', label: 'Are you a UK resident?' },
  { key: 'understands_risk', label: 'Do you understand P2P lending carries risk?' },
  { key: 'marketing_consent', label: 'May we email you about launch updates?' },
] as const;

export type StrategicAnswer = 'Yes' | 'No';

export type StrategicAnswersState = Record<(typeof STRATEGIC_QUESTIONS)[number]['key'], StrategicAnswer | ''>;

export function createEmptyStrategicAnswers(): StrategicAnswersState {
  return {
    uk_resident: '',
    understands_risk: '',
    marketing_consent: '',
  };
}

export function strategicAnswersComplete(answers: StrategicAnswersState): boolean {
  return STRATEGIC_QUESTIONS.every((q) => answers[q.key] === 'Yes' || answers[q.key] === 'No');
}

export function strategicAnswersToPayload(answers: StrategicAnswersState): Record<string, StrategicAnswer> {
  return Object.fromEntries(
    STRATEGIC_QUESTIONS.map((q) => [q.label, answers[q.key] as StrategicAnswer])
  );
}

/** Normalize questionnaire values for admin UI and PDF export. */
export function formatQuestionnaireAnswer(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === 'Yes' || value === 'No') return value;
  const text = String(value ?? '').trim();
  if (!text) return 'Not provided';
  if (text.toLowerCase() === 'true') return 'Yes';
  if (text.toLowerCase() === 'false') return 'No';
  return text;
}
