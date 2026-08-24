// ─── Unified Clean Date & Time Formatter for Al-Muhtaraz ERP ─────────────────
// Eliminates garbled characters, Unicode BiDi reversals, and enforces clean dates

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Formats a date string or Date object into clean, crisp Arabic date:
 * Example: "24/08/2026 م" (or with month name "24 أغسطس 2026 م")
 */
export function formatCleanArabicDate(dateInput?: string | Date | null, withMonthName: boolean = false): string {
  if (!dateInput) return '-';
  try {
    let year: number, month: number, day: number;

    if (typeof dateInput === 'string') {
      // Direct YYYY-MM-DD parsing (No timezone shift)
      const cleanStr = dateInput.split('T')[0].trim();
      const match = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return dateInput;
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      }
    } else {
      if (isNaN(dateInput.getTime())) return '-';
      year = dateInput.getFullYear();
      month = dateInput.getMonth() + 1;
      day = dateInput.getDate();
    }

    const dayStr = day.toString().padStart(2, '0');
    const monthStr = month.toString().padStart(2, '0');

    if (withMonthName) {
      const monthName = ARABIC_MONTHS[month - 1] || monthStr;
      return `${day} ${monthName} ${year} م`;
    }

    return `${dayStr}/${monthStr}/${year} م`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : '-';
  }
}

/**
 * Formats time cleanly into 12-hour Arabic format:
 * Example: "04:30 مساءً" or "09:15 صباحاً"
 */
export function formatCleanArabicTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    hours = hours % 12 || 12;
    const hoursStr = hours.toString().padStart(2, '0');

    return `${hoursStr}:${minutes} ${period}`;
  } catch {
    return '-';
  }
}

/**
 * Formats full Date and Time:
 * Example: "24/08/2026 م — 04:30 مساءً"
 */
export function formatCleanArabicDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const dateStr = formatCleanArabicDate(dateInput);
  const timeStr = formatCleanArabicTime(dateInput);
  if (timeStr === '-') return dateStr;
  return `${dateStr} — ${timeStr}`;
}

/**
 * Formats Contract Date Range cleanly:
 * Example: "من 24/08/2026 م إلى 31/08/2026 م (7 أيام)"
 */
export function formatContractPeriod(startDate?: string | null, endDate?: string | null, durationDays?: number): string {
  const start = formatCleanArabicDate(startDate);
  const end = formatCleanArabicDate(endDate);
  const daysText = durationDays ? ` (${durationDays} يوم)` : '';
  return `من ${start} إلى ${end}${daysText}`;
}
