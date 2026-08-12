import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMarks, calculateGradeFromPercentage, resolveGradeBand } from '../lib/assessmentGrading.mjs';

test('calculateMarks totals marks from correct answers', () => {
  const questions = [
    { marks: 2, selectedOptionIndex: 1, correctOptionIndex: 1 },
    { marks: 5, selectedOptionIndex: 0, correctOptionIndex: 1 },
    { marks: 1, selectedOptionIndex: 2, correctOptionIndex: 2 },
  ];

  assert.equal(calculateMarks(questions), 8);
});

test('resolveGradeBand picks the highest matching band', () => {
  const gradeBands = [
    { label: 'A', minPercentage: 80 },
    { label: 'B', minPercentage: 60 },
    { label: 'C', minPercentage: 40 },
  ];

  assert.equal(resolveGradeBand(75, gradeBands), 'A');
  assert.equal(resolveGradeBand(55, gradeBands), 'B');
  assert.equal(resolveGradeBand(35, gradeBands), 'C');
});

test('calculateGradeFromPercentage returns a grade and percentage', () => {
  const result = calculateGradeFromPercentage(75, [
    { label: 'A', minPercentage: 80 },
    { label: 'B', minPercentage: 60 },
    { label: 'C', minPercentage: 40 },
  ]);

  assert.equal(result.grade, 'B');
  assert.equal(result.percentage, 75);
});
