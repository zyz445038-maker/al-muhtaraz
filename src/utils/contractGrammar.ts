/**
 * تحويل الأرقام إلى صياغة سنوات باللغة العربية الفصحى (مفرد / مثنى / جمع)
 */
export function formatYearsToArabic(years: number): string {
  const num = Math.floor(years);
  switch (num) {
    case 0:
      return 'صفر سنة';
    case 1:
      return 'سنة';
    case 2:
      return 'سنتان';
    case 3:
      return 'ثلاث سنوات';
    case 4:
      return 'أربع سنوات';
    case 5:
      return 'خمس سنوات';
    case 6:
      return 'ست سنوات';
    case 7:
      return 'سبع سنوات';
    case 8:
      return 'ثماني سنوات';
    case 9:
      return 'تسع سنوات';
    case 10:
      return 'عشر سنوات';
    default:
      if (num > 10) {
        return `${num} سنة`;
      }
      return `${years} سنة`;
  }
}

/**
 * توليد البند الأول ديناميكياً بناءً على سنوات رخصة الترميم ورخصة البناء
 */
export function generateContractClause1(renovationYears: number, buildingYears: number): string {
  const renoText = formatYearsToArabic(renovationYears || 1);
  const buildText = formatYearsToArabic(buildingYears || 1);

  if (renovationYears > 0 && buildingYears > 0) {
    return `1/ مدة العقد ${renoText} لرخصة الترميم و${buildText} لرخصة البناء من تاريخ العقد.`;
  } else if (renovationYears > 0) {
    return `1/ مدة العقد ${renoText} لرخصة الترميم من تاريخ العقد.`;
  } else if (buildingYears > 0) {
    return `1/ مدة العقد ${buildText} لرخصة البناء من تاريخ العقد.`;
  } else {
    return `1/ مدة العقد سنة لرخصة الترميم وسنتان لرخصة البناء من تاريخ العقد.`;
  }
}
