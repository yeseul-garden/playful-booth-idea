import test from 'node:test';
import assert from 'node:assert/strict';
import {cardColor,QUESTION_PLACEHOLDER,RESPONSE_COLORS} from '../public/presentation.js';
test('response palette is balanced, with no same horizontal or vertical neighbors in supported grids',()=>{
 for(let start=0;start<200;start++){
  assert.equal(new Set(Array.from({length:5},(_,i)=>cardColor(start+i))).size,5);
  for(let columns=1;columns<=4;columns++)for(let i=0;i<12;i++)assert.notEqual(cardColor(start+i),cardColor(start+i+columns));
 }
 assert(!RESPONSE_COLORS.includes('#BEAF39'));
});
test('question example is available as placeholder copy',()=>{assert(QUESTION_PLACEHOLDER.includes('Self-Learning'));assert(QUESTION_PLACEHOLDER.includes('귀찮은 일'));});
