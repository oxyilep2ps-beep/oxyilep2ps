/** Returns true if the user is at least 18 years old (UK eligibility). */
export function isAtLeast18(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

/** UK mobile/landline pattern (+44 or 07…). */
export function isValidUkPhone(phone: string): boolean {
  const normalized = phone.replace(/\s/g, '');
  return /^(\+44|0)7\d{9}$/.test(normalized) || /^\+44\d{10,11}$/.test(normalized);
}

/** UK sort code: XX-XX-XX or XXXXXX. */
export function isValidUkSortCode(sortCode: string): boolean {
  const digits = sortCode.replace(/\D/g, '');
  return digits.length === 6;
}

/** UK account number: 8 digits. */
export function isValidUkAccountNumber(accountNumber: string): boolean {
  return /^\d{8}$/.test(accountNumber.replace(/\s/g, ''));
}

/** UK postcode (outward + inward). */
export function isValidUkPostcode(postcode: string): boolean {
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, ' ');
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(normalized);
}
