import test from 'node:test';
import assert from 'node:assert/strict';
import {inferMetadata,mergeExtractedFields,textLines} from '../src/pdf-metadata.js';
const line=(text,size=10,y=700,x=50)=>({text,size,y,x});
const pages=[[line('Efficient Memory Systems',18,740),line('Alice Smith, Bob Jones',12,710),line('Example University',10,690),line('Proceedings of ISCA 2024',10,670),line('doi:10.1234/memory.2024',10,650),line('Abstract',12,620),line('Memory movement matters.',10,600),line('1 Introduction',12,580),line('Body text, not part of abstract.',10,560)]];
test('extracts front matter when a PDF has no embedded metadata',()=>{
 const p=inferMetadata({pages});
 assert.equal(p.title,'Efficient Memory Systems');assert.equal(p.authors,'Alice Smith, Bob Jones');assert.equal(p.year,'2024');assert.equal(p.venue,'Proceedings of ISCA 2024');assert.equal(p.url,'https://doi.org/10.1234/memory.2024');assert.equal(p.abstract,'Memory movement matters.');
});
test('prefers embedded metadata and rejects generic document titles',()=>{
 assert.equal(inferMetadata({info:{Title:'An Official Research Title',Author:'Jane Doe'},pages}).title,'An Official Research Title');
 assert.equal(inferMetadata({info:{Title:'Microsoft Word - Untitled',Author:'Notability'},pages}).title,'Efficient Memory Systems');
 assert.equal(inferMetadata({info:{Title:'paper.tex'},pages}).authors,'Alice Smith, Bob Jones');
});
test('does not invent fields for image-only PDFs or use export dates as publication years',()=>{
 assert.deepEqual(inferMetadata({info:{CreationDate:'D:20261110'}}),{});
 assert.equal(inferMetadata({info:{Title:'A Research Paper Title',CreationDate:'D:20261110'}}).year,undefined);
});
test('DOIs in references are not imported as the paper link',()=>{
 assert.equal(inferMetadata({pages:[[line('A Research Paper Title',18),line('References'),line('10.1234/someone-elses-paper')]]}).url,undefined);
});
test('user-entered values survive extraction and replacement of an uploaded file',()=>{
 const original={title:'My chosen title',authors:'',year:'2020',notes:'My thoughts'};
 const next=mergeExtractedFields(original,{title:'PDF title',authors:'Jane Doe',year:'2024'});
 assert.equal(next.title,'My chosen title');assert.equal(next.authors,'Jane Doe');assert.equal(next.year,'2020');assert.equal(next.notes,'My thoughts');
 const replaced=mergeExtractedFields(next,{authors:'Alice Smith'},{authors:'Jane Doe'},new Set(['year']));assert.equal(replaced.authors,'Alice Smith');assert.equal(replaced.year,'2020');
 assert.equal(mergeExtractedFields({authors:''},{authors:'Jane Doe'},{},new Set(['authors'])).authors,'');
});
test('combines title fragments in reading order and ignores rotated sidebars',()=>{
 const rows=textLines([{str:'Systems',transform:[18,0,0,18,140,740],width:70},{str:'Memory',transform:[18,0,0,18,50,740],width:85},{str:'Sidebar',transform:[0,10,-10,0,10,100],width:40}]);
 assert.equal(rows.length,1);assert.equal(rows[0].text,'Memory Systems');
});
