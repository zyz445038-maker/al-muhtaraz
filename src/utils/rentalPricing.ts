export function getWeeklyRate(dailyRate: number | null | undefined): number {
  return Math.round(Number(dailyRate || 0) * 7);
}

export function getDebrisContractTypeLabel(periodType: string, durationDays: number): string {
  if (periodType === 'monthly') return 'حاوية أنقاض (عقد شهري)';
  if (durationDays === 15) return 'حاوية أنقاض (عقد نصف شهري)';
  if (durationDays === 7) return 'حاوية أنقاض (عقد 7 أيام)';
  return `حاوية أنقاض (عقد ${durationDays} يوم)`;
}
