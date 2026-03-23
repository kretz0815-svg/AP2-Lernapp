import { computeNextQuizProgress, isQuizDue } from './src/utils/quizDue.js';
import { generateId } from './src/utils/constants.js';

const now = Date.now();
const prev = { rep: 0, ef: 2.5, interval: 0, nextReview: 0 };
const nextProg = computeNextQuizProgress(prev, true, now);
console.log("nextProg correct:", nextProg);
console.log("isDue?", isQuizDue(nextProg, now + 100)); // Should be false
console.log("isDue after 2 days?", isQuizDue(nextProg, now + 2*24*60*60*1000)); // Should be true

const nextProgWrong = computeNextQuizProgress(prev, false, now);
console.log("nextProg wrong:", nextProgWrong);
console.log("isDue wrong?", isQuizDue(nextProgWrong, now + 100)); // Should be false (cooldown 1min)
