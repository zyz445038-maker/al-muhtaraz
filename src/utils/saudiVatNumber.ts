const arabicIndicDigits = '٠١٢٣٤٥٦٧٨٩';
const easternArabicDigits = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeSaudiVatNumber(value: string): string {
  return value
    .trim()
    .replace(/[٠-٩]/g, digit => String(arabicIndicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(easternArabicDigits.indexOf(digit)));
}

export function isValidSaudiVatNumber(value: string): boolean {
  return /^3\d{13}3$/.test(normalizeSaudiVatNumber(value));
}

export function getSaudiVatNumberError(value: string): string | null {
  const normalized = normalizeSaudiVatNumber(value);
  if (!normalized) return null;
  return /^3\d{13}3$/.test(normalized)
    ? null
    : 'الرقم الضريبي السعودي يجب أن يتكون من 15 رقمًا ويبدأ وينتهي بالرقم 3.';
}
