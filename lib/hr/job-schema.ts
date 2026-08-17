import { z } from 'zod';
import { WORKING_MODELS, normalizeWorkingModel, type WorkingModel } from '@/lib/hr/working-model';

export const workingModelSchema = z.enum(WORKING_MODELS);

export const jobPostingPayloadSchema = z.object({
  title: z.string().trim().min(1, 'Job title is required.'),
  department: z.string().trim().min(1, 'Department is required.'),
  employment_type: z.string().trim().min(1),
  working_model: workingModelSchema,
  location: z.string().optional(),
  salary_min: z.number().nonnegative().optional(),
  salary_max: z.number().nonnegative().optional(),
  salary_min_gbp: z.number().nonnegative().optional(),
  salary_max_gbp: z.number().nonnegative().optional(),
  description: z.string().optional(),
  responsibilities: z.string().optional(),
  compliance_responsibilities: z.string().optional(),
  requirements: z.string().trim().min(1, 'Requirements / AI keywords context is required.'),
  ai_match_keywords: z.string().optional(),
  ai_keywords: z.string().optional(),
  source_budget_gbp: z.number().nonnegative().optional(),
  publish_to_careers: z.boolean().optional(),
  is_published: z.boolean().optional(),
  is_intern_to_fulltime: z.boolean().optional(),
  duration_months: z.number().int().positive().optional(),
  unpaid_months: z.number().int().positive().optional(),
  what_you_will_gain: z.string().nullable().optional(),
  status: z.enum(['draft', 'open']).optional(),
});

export type JobPostingPayload = z.infer<typeof jobPostingPayloadSchema>;

export function workingModelFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export function parseJobPostingPayload(input: unknown): {
  success: true;
  data: JobPostingPayload & { working_model: WorkingModel; location: WorkingModel };
} | {
  success: false;
  fieldErrors: Record<string, string>;
} {
  const result = jobPostingPayloadSchema.safeParse(input);
  if (!result.success) {
    return { success: false, fieldErrors: workingModelFieldErrors(result.error) };
  }
  const working_model = normalizeWorkingModel(result.data.working_model);
  return {
    success: true,
    data: {
      ...result.data,
      working_model,
      location: working_model,
    },
  };
}
