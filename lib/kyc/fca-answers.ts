import { APPROPRIATENESS_QUESTIONS } from '@/lib/kyc/constants';

/** Map wizard choice index (0 = Yes, 1 = No) to display label. */
export function choiceToYesNo(value: number | null | undefined): string {
  if (value === 0) return 'Yes';
  if (value === 1) return 'No';
  return 'Not answered';
}

/** Build FCA Q&A JSON keyed by exact question strings for admin/PDF display. */
export function buildFcaTestAnswers(
  appropriatenessAnswers: (number | null)[]
): Record<string, string> {
  const result: Record<string, string> = {};
  APPROPRIATENESS_QUESTIONS.forEach((question, index) => {
    result[question] = choiceToYesNo(appropriatenessAnswers[index]);
  });
  return result;
}

export function fcaAnswersToRows(
  fca: Record<string, string> | null | undefined
): { question: string; answer: string }[] {
  if (!fca || typeof fca !== 'object') return [];
  return Object.entries(fca).map(([question, answer]) => ({
    question,
    answer: String(answer),
  }));
}
