/**
 * quizUtils.js
 * Extracted utility functions for quiz and task processing.
 */

import wissenTesten from '../data/wissen_testen.json';
import rechenAufgaben from '../data/rechen_aufgaben.json';
import { generateId } from './constants';

export const isRechenTask = (q) => {
  if (q.forceKnowledge) return false;
  const text = ((q.question || '') + ' ' + (q.topic || '') + ' ' + (q.hint || '')).toLowerCase();
  const hasCalcKeywords = ['berechne', 'rechnen', 'wieviel', 'wie hoch', 'betrag', 'kalkuliere', 'ermittle', 'prozent', 'anteil', 'summe', 'kosten'].some(k => text.includes(k));
  const hasNumbers = /[0-9]+/.test(q.question || '');
  const hasSymbols = /[%€]/.test(q.question || '') || (q.answerOptions && q.answerOptions.some(opt => /[%€]/.test(opt.text)));
  const isCalcTopic = ['Kalkulation', 'Performance', 'Conversion', 'ROAS', 'CTR', 'CPC', 'CPA', 'Deckungsbeitrag'].some(t => (q.topic || '').includes(t));
  return (isCalcTopic || ((hasCalcKeywords || hasSymbols) && hasNumbers));
};

export const getAllQuizQuestions = (customQuizQuestions = []) => [
  ...(wissenTesten.questions || []),
  ...(customQuizQuestions || [])
];

export const getRechenTasks = (customQuizQuestions = []) => [
  ...(rechenAufgaben.questions || []),
  ...(customQuizQuestions || []).filter(isRechenTask)
];

export const categorizeRechenTask = (q) => {
  const text = (q.question + ' ' + (q.topic || '')).toLowerCase();
  if (text.includes('conversion') || text.includes('konversionsrate') || text.includes(' cr ')) return 'Conversion';
  if (text.includes('roas') || text.includes('return on advertising')) return 'ROAS';
  if (['ctr', 'cpc', 'cpa', 'kennzahl', 'performance', 'effizienz', 'click-through', 'cost per'].some(k => text.includes(k))) return 'KPI';
  if (['kalkulation', 'preis', 'rabatt', 'skonto', 'gewinn', 'handlungskost', 'einstand', 'listen'].some(k => text.includes(k))) return 'Handelskalkulation';
  return 'Allgemein';
};
