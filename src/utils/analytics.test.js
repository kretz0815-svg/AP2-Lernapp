import test from 'node:test';
import assert from 'node:assert/strict';
import { getLearningEventKey, getAppearanceKey, getThemeKey, getAnalyticsStorageKey, resolveStorageIdentity } from './analytics.js';

test('learning event key uses mode + questionId when available', () => {
  const key = getLearningEventKey({
    mode: 'quiz',
    questionId: 'q_123',
    questionText: 'Ignored when id exists'
  });
  assert.equal(key, 'quiz::q_123');
});

test('learning event key falls back to normalized question text', () => {
  const key = getLearningEventKey({
    mode: 'WisorEco',
    questionText: '   Die ERSTE Testfrage für Analyse   '
  });
  assert.equal(key, 'wisoreco::die erste testfrage für analyse');
});

test('same questionId in different modes creates different keys', () => {
  const quizKey = getLearningEventKey({ mode: 'quiz', questionId: 'same_id' });
  const wisorKey = getLearningEventKey({ mode: 'wisor', questionId: 'same_id' });
  assert.notEqual(quizKey, wisorKey);
});

test('storage identity prefers user.id over email', () => {
  const identity = resolveStorageIdentity({ id: 'user_abc', email: 'x@example.com' });
  assert.equal(identity, 'user_abc');
});

test('per-user keys differ for different account ids', () => {
  const userA = { id: 'user_a', email: 'same@example.com' };
  const userB = { id: 'user_b', email: 'same@example.com' };
  assert.notEqual(getAppearanceKey(userA), getAppearanceKey(userB));
  assert.notEqual(getThemeKey(userA), getThemeKey(userB));
  assert.notEqual(getAnalyticsStorageKey(userA), getAnalyticsStorageKey(userB));
});
