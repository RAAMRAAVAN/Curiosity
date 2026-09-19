import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAssessment316StatusGroups } from '../lib/assessment316Status.js';

test('3-16 status groups split students into pending, appeared, and absent correctly', () => {
  const students = [
    { id: 'u1', name: 'A', student: { studyingClass: 'c1' } },
    { id: 'u2', name: 'B', student: { studyingClass: 'c1' } },
    { id: 'u3', name: 'C', student: { studyingClass: 'c2' } },
    { id: 'u4', name: 'D', student: { studyingClass: 'c2' } },
  ];

  const groups = buildAssessment316StatusGroups({
    students,
    attemptedUserIds: new Set(['u2']),
    absentUserIds: new Set(['u4']),
  });

  assert.deepEqual(groups.pending.map((student) => student.id).sort(), ['u1', 'u3']);
  assert.deepEqual(groups.appeared.map((student) => student.id).sort(), ['u2']);
  assert.deepEqual(groups.absent.map((student) => student.id).sort(), ['u4']);
});
