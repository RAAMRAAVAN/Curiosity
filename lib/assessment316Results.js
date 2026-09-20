export const buildAssessment316ResultSummary = (items = [], checklistMap = new Map(), optionMap = new Map()) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No data';
  }

  const selectedValues = items
    .map((item) => {
      const checklistId = String(item?.checklistId || '');
      const optionId = String(item?.optionId || '');
      const checklistLabel = item?.checklist?.itemText || checklistMap.get(checklistId) || 'Field';
      const optionLabel = item?.option?.optionText || optionMap.get(optionId) || item?.optionId || 'No value';
      return `${checklistLabel}: ${optionLabel}`;
    })
    .filter((value) => typeof value === 'string' && value.trim());

  if (!selectedValues.length) {
    return 'No data';
  }

  return selectedValues.length === 1
    ? selectedValues[0].replace(/^[^:]+:\s*/, '')
    : selectedValues.join(' | ');
};
