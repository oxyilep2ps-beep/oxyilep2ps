export const NEWSLETTER_FROM_ADDRESS =
  process.env.NEWSLETTER_FROM ?? process.env.EMAIL_FROM ?? 'Oxyile Updates <updates@oxyile.com>';

/** Resend batch API limit per request. */
export const RESEND_BATCH_SIZE = 100;
