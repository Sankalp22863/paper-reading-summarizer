import test from 'node:test';
import assert from 'node:assert/strict';
import {paperKeys,cleanRatings,ratingRows,summaryFor} from '../src/ratings-core.js';
test('paper keys: DOI, then arXiv, then normalized title',()=>{
 assert.deepEqual(paperKeys({url:'https://doi.org/10.1145/3297858.3304028',title:'TVM: An Automated Compiler!'}),['doi:10.1145/3297858.3304028','title:tvm an automated compiler']);
 assert.deepEqual(paperKeys({url:'https://arxiv.org/abs/1804.11040',title:'A Memory Controller'}),['arxiv:1804.11040','title:a memory controller']);
 assert.deepEqual(paperKeys({title:'short'}),[]);
});
test('ratings are kept only for the paper\'s topics and only 1–5 stars',()=>{
 assert.deepEqual(cleanRatings({'memory systems':4,'Compilers':0,'Gone':5,'ML':9},['Memory systems','Compilers','ML']),{'Memory systems':4});
});
test('rating rows cover every key and the best key wins for summaries',()=>{
 const rows=ratingRows([{url:'https://doi.org/10.1234/x',title:'Some Long Paper Title',groups:['Memory'],ratings:{Memory:5}},{title:'Unrated paper here',groups:['A'],ratings:{}}]);
 assert.deepEqual(rows.map(r=>r.paper_key),['doi:10.1234/x','title:some long paper title']);
 const summaries={'title:some long paper title':[{category:'Memory',avg:3,ratings:1}],'doi:10.1234/x':[{category:'Memory',avg:4.5,ratings:2}]};
 assert.equal(summaryFor({url:'https://doi.org/10.1234/x',title:'Some Long Paper Title'},summaries)[0].avg,4.5);
 assert.deepEqual(summaryFor({title:'Nothing rated yet ok'},summaries),[]);
});
