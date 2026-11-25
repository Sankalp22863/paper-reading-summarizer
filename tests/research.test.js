import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestGroups,relatedPapers,goalProgress,goalTarget,safeUrl,draftTakeaway} from '../src/research.js';
const library=[{id:'a',title:'Memory bandwidth and data movement',takeaway:'Memory hierarchy and accelerator data reuse',status:'Read',groups:['Memory systems'],completedAt:'2026-11-02'}, {id:'b',title:'Compiler scheduling and loop tiling',status:'To read',groups:['Compilers']}];
test('groups come from read-paper evidence, not unread groups',()=>{const result=suggestGroups({title:'Accelerator memory bandwidth and compiler scheduling'},library);assert.deepEqual(result.map(g=>g.name),['Memory systems']);assert.ok(result[0].evidence.includes(library[0].title));});
test('no grouping fabricated for cold start or unrelated text',()=>{assert.deepEqual(suggestGroups({title:'Memory hierarchy'},[]),[]);assert.deepEqual(suggestGroups({title:'Biology of ocean fish'},library),[]);});
test('editing does not use the same paper as evidence',()=>assert.deepEqual(suggestGroups(library[0],library),[]));
test('related papers exclude the current one and rank shared groups',()=>{const results=relatedPapers({...library[0],id:'new'},library);assert.equal(results[0].id,'a');assert.equal(relatedPapers(library[0],library).some(p=>p.id==='a'),false);});
test('monthly progress respects completion date, status, and focus',()=>{const goal={month:'2026-11',group:'Memory systems'};assert.equal(goalProgress(goal,library),1);assert.equal(goalProgress({...goal,month:'2026-10'},library),0);assert.equal(goalProgress({...goal,group:'Compilers'},library),0);assert.equal(goalProgress(goal,[{...library[0],status:'Reading'}]),0);});
test('links exclude executable and invalid protocols',()=>{assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('data:text/html,hello'),'');assert.equal(safeUrl('not a url'),'');assert.equal(safeUrl('https://doi.org/10.1/example'),'https://doi.org/10.1/example');});
test('takeaway helper only excerpts user notes',()=>{assert.equal(draftTakeaway('First finding. Second finding. Third finding.'),'First finding. Second finding.');assert.equal(draftTakeaway(''),'');});

test('paper-based goals count only their chosen papers, ignoring deleted ones',()=>{const papers=[{id:'a',status:'Read',groups:[]},{id:'b',status:'Reading',groups:[]},{id:'c',status:'Read',groups:[]}];const goal={month:'2026-11',target:9,paperIds:['a','b','gone']};assert.equal(goalTarget(goal,papers),2);assert.equal(goalProgress(goal,papers),1);assert.equal(goalTarget({month:'2026-11',target:9},papers),9);});
import {paperStack,formatPercent} from '../src/stack.js';
test('paper stack uses real page counts, estimates the rest, and finds landmarks',()=>{
 const s=paperStack([{status:'Read',pages:60},{status:'Read'},{status:'To read',pages:10}]);
 assert.equal(s.pages,72);assert.equal(s.estimated,true);assert.equal(s.height,'7.2 mm');
 assert.equal(s.passed,'a pancake');assert.equal(s.next,'a stack of Pringles');assert.ok(s.papersToNext>0);
 assert.equal(s.queuedPages,10);assert.match(s.moon,/^0\.0+\d+%$/);
 const empty=paperStack([]);assert.equal(empty.pages,0);assert.equal(empty.passed,null);assert.equal(empty.next,'a credit card');
 assert.equal(formatPercent(0),'0%');assert.equal(formatPercent(12.345),'12.3%');
});
