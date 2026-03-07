import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNextQuizProgress, filterDueQuizzes, isQuizDue } from './quizDue.js';

test('first correct answer schedules quiz for 1 day and is not due immediately', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const next = computeNextQuizProgress({ rep: 0, ef: 2.5, interval: 0, nextReview: 0 }, true, now);

  assert.equal(next.rep, 1);
  assert.equal(next.interval, 1);
  assert.equal(isQuizDue(next, now), false);
  assert.equal(isQuizDue(next, now + 24 * 60 * 60 * 1000), true);
});

test('second correct answer schedules quiz for 6 days', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const next = computeNextQuizProgress({ rep: 1, ef: 2.5, interval: 1, nextReview: now }, true, now);

  assert.equal(next.rep, 2);
  assert.equal(next.interval, 6);
});

test('wrong answer resets repetition and schedules quick retry (~1 minute)', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const next = computeNextQuizProgress({ rep: 3, ef: 2.5, interval: 15, nextReview: now }, false, now);

  assert.equal(next.rep, 0);
  assert.ok(next.interval > 0 && next.interval < 0.001);
  assert.equal(isQuizDue(next, now), false);
  assert.equal(isQuizDue(next, now + 61 * 1000), true);
});

test('due pool shrinks after one question is answered correctly', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const quizzes = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
  const progress = {
    q1: { rep: 0, ef: 2.5, interval: 0, nextReview: 0 },
    q2: { rep: 0, ef: 2.5, interval: 0, nextReview: 0 },
    q3: { rep: 0, ef: 2.5, interval: 0, nextReview: 0 }
  };

  const before = filterDueQuizzes(quizzes, progress, now);
  assert.equal(before.length, 3);

  progress.q1 = computeNextQuizProgress(progress.q1, true, now);
  const after = filterDueQuizzes(quizzes, progress, now);
  assert.equal(after.length, 2);
});
