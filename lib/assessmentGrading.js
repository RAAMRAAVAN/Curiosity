export const DEFAULT_GRADE_BANDS = [
  { label: 'A', minPercentage: 80 },
  { label: 'B', minPercentage: 60 },
  { label: 'C', minPercentage: 40 },
  { label: 'D', minPercentage: 0 },
];

export function calculateMarks(questions = []) {
  return questions.reduce((total, item) => {
    const marks = Number(item?.marks ?? item?.mark ?? 0) || 0;
    const isCorrect = Boolean(item?.isCorrect);
    return total + (isCorrect ? marks : 0);
  }, 0);
}

export function resolveGradeBand(percentage, gradeBands = DEFAULT_GRADE_BANDS) {
  const numericPercentage = Number(percentage) || 0;
  const normalizedBands = [...(gradeBands || [])]
    .filter((band) => Number.isFinite(Number(band?.minPercentage)))
    .sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));

  const match = normalizedBands.find((band) => numericPercentage >= Number(band.minPercentage));
  return match?.label || 'D';
}

export function calculateGradeFromPercentage(percentage, gradeBands = DEFAULT_GRADE_BANDS) {
  const numericPercentage = Number(percentage) || 0;
  return {
    grade: resolveGradeBand(numericPercentage, gradeBands),
    percentage: numericPercentage,
  };
}
