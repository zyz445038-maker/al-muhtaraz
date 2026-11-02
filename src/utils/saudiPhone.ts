export function normalizeSaudiMobileNumber(value: string): string | null {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('00966')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('966')) {
    digits = digits.slice(3);
  }

  if (/^5\d{8}$/.test(digits)) {
    digits = `0${digits}`;
  }

  if (!/^05\d{8}$/.test(digits)) {
    return null;
  }

  return `966${digits.slice(1)}`;
}
