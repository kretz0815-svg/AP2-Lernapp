import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextQuizProgress,
  filterDueQuizzes,
  isQuizDue,
  MULTI_CHOICE_REPEAT_MODES,
  getRequiredCorrectAnswers
} from './quizDue.js';

test('once mode learns after first correct answer', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const next = computeNextQuizProgress({ rep: 0, ef: 2.5, interval: 0, nextReview: 0 }, true, now, MULTI_CHOICE_REPEAT_MODES.ONCE);

  assert.equal(next.rep, 1);
  assert.equal(next.isLearned, true);
  assert.equal(isQuizDue(next, now, MULTI_CHOICE_REPEAT_MODES.ONCE), false);
});

test('twice mode needs two correct answers', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const first = computeNextQuizProgress({ rep: 0, ef: 2.5, interval: 0, nextReview: 0 }, true, now, MULTI_CHOICE_REPEAT_MODES.TWICE);
  assert.equal(first.rep, 1);
  assert.equal(first.isLearned, false);
  assert.equal(isQuizDue(first, now, MULTI_CHOICE_REPEAT_MODES.TWICE), true);

  const second = computeNextQuizProgress(first, true, now, MULTI_CHOICE_REPEAT_MODES.TWICE);
  assert.equal(second.rep, 2);
  assert.equal(second.isLearned, true);
  assert.equal(isQuizDue(second, now, MULTI_CHOICE_REPEAT_MODES.TWICE), false);
});

test('spaced mode defers next repetition after first correct answer', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const next = computeNextQuizProgress({ rep: 0, ef: 2.5, interval: 0, nextReview: 0 }, true, now, MULTI_CHOICE_REPEAT_MODES.SPACED);

  assert.equal(next.rep, 1);
  assert.equal(next.isLearned, false);
  assert.equal(next.interval, 1);
  assert.equal(isQuizDue(next, now, MULTI_CHOICE_REPEAT_MODES.SPACED), false);
  assert.equal(isQuizDue(next, now + 24 * 60 * 60 * 1000 + 1000, MULTI_CHOICE_REPEAT_MODES.SPACED), true);
});

test('due pool uses active repeat mode', () => {
  const now = Date.UTC(2026, 2, 7, 12, 0, 0);
  const quizzes = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
  const progress = {
    q1: { rep: 0, ef: 2.5, interval: 0, nextReview: 0 },
    q2: { rep: 0, ef: 2.5, interval: 0, nextReview: 0 },
    q3: { rep: 0, ef: 2.5, interval: 0, nextReview: 0 }
  };

  const before = filterDueQuizzes(quizzes, progress, now, MULTI_CHOICE_REPEAT_MODES.ONCE);
  assert.equal(before.length, 3);

  progress.q1 = computeNextQuizProgress(progress.q1, true, now, MULTI_CHOICE_REPEAT_MODES.ONCE);
  const after = filterDueQuizzes(quizzes, progress, now, MULTI_CHOICE_REPEAT_MODES.ONCE);
  assert.equal(after.length, 2);
});

test('required correct answers helper maps modes correctly', () => {
  assert.equal(getRequiredCorrectAnswers(MULTI_CHOICE_REPEAT_MODES.ONCE), 1);
  assert.equal(getRequiredCorrectAnswers(MULTI_CHOICE_REPEAT_MODES.TWICE), 2);
  assert.equal(getRequiredCorrectAnswers(MULTI_CHOICE_REPEAT_MODES.SPACED), 2);
});
