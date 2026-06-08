'use client';

import {
  STRATEGIC_QUESTIONS,
  type StrategicAnswer,
  type StrategicAnswersState,
} from '@/lib/questionnaire/strategic-questions';
import { cn } from '@/lib/utils';

type StrategicQuestionsFieldsProps = {
  values: StrategicAnswersState;
  onChange: (key: (typeof STRATEGIC_QUESTIONS)[number]['key'], value: StrategicAnswer) => void;
  className?: string;
};

export function StrategicQuestionsFields({ values, onChange, className }: StrategicQuestionsFieldsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500">Strategic Questions</p>
      {STRATEGIC_QUESTIONS.map((q) => (
        <fieldset key={q.key} className="text-sm">
          <legend className="mb-2 font-medium text-neutral-800 dark:text-neutral-200">
            {q.label} <span className="text-brand-500">*</span>
          </legend>
          <div className="flex gap-6">
            {(['Yes', 'No'] as const).map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name={`strategic-${q.key}`}
                  required
                  checked={values[q.key] === option}
                  onChange={() => onChange(q.key, option)}
                  className="accent-brand-500"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
