export const DEFAULT_QUIZ_PROGRESS = { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
export function isQuizDue(progress, now = Date.now()) {
  return (progress?.nextReview || 0) <= now;
}

const quizzes = [
  { id: '1', question: 'Q1' },
  { id: '2', question: 'Q2' }
];

const now = Date.now();
const prog1 = { rep: 1, ef: 2.5, interval: 1, nextReview: now + 24 * 60 * 60 * 1000 };
const prog2 = { rep: 0, ef: 2.5, interval: 0, nextReview: now - 1000 };

const progressById = { '1': prog1, '2': prog2 };

const due = quizzes.filter(q => {
  const p = progressById[q.id] || q.progress || DEFAULT_QUIZ_PROGRESS;
  return isQuizDue(p, now);
});

console.log('Due IDs:', due.map(d => d.id));
