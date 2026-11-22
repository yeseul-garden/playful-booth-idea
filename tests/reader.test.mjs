import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../integrations/google-apps-script/Code.gs',import.meta.url),'utf8');
function harness({timestamps=[],messages=[],authors=[],cacheValue=null}={}){
 const reads=[];let cached='';
 const columns={1:timestamps,5:messages,6:authors};
 const sheet={getLastRow:()=>messages.length+1,getRange:(row,col,n,width)=>{assert.equal(row,2);assert.equal(width,1);assert([1,5,6].includes(col),'Forbidden column access!');reads.push([row,col,n,width]);return {getValues:()=>columns[col].map(v=>[v]),getDisplayValues:()=>columns[col].map(v=>[v])};}};
 const context={Date,CacheService:{getScriptCache:()=>({get:()=>cacheValue,put:(key,value)=>cached=value})},SpreadsheetApp:{openById:id=>{assert.equal(id,'YOUR_SHEET_ID');return {getSheetByName:name=>{assert.equal(name,'YOUR_TAB_NAME');return sheet;}};}},Utilities:{newBlob:value=>({getBytes:()=>Buffer.from(value)})},PropertiesService:{getScriptProperties:()=>({getProperty:key=>({SHEET_ID:'YOUR_SHEET_ID',TAB_NAME:'YOUR_TAB_NAME',TIMESTAMP_COLUMN:'A',MESSAGE_COLUMN:'E',AUTHOR_COLUMN:'F'}[key]||'')})},HtmlService:{createTemplateFromFile:()=>({evaluate(){return {setTitle(){return {setXFrameOptionsMode(){return this;}}}}}}),XFrameOptionsMode:{ALLOWALL:'all'}}};
 vm.createContext(context);vm.runInContext(source,context);
 return {context,reads,read:()=>JSON.parse(JSON.stringify(context.readBoothIdeas())),getCached:()=>cached};
}
test('server reads only A/E/F; blank E skipped, missing F preserved as anonymous, same timestamp distinct IDs',()=>{
 const time=new Date('2026-11-22T12:00:00Z');const h=harness({timestamps:[time,time,time,time],messages:['  첫 의견  ',' \n ','두 번째','<script>alert(1)</script>'],authors:['@eden.choi','private?','','ashley.jeon']});
 const r=h.read();assert.equal(r.items.length,3);assert.equal(r.items[0].message,'첫 의견');assert.equal(r.items[0].author,'eden.choi');assert.equal(r.items[1].author,'');assert.equal(new Set(r.items.map(i=>i.id)).size,3);
 assert.deepEqual(h.reads.map(read=>read[1]),[1,5,6]);assert.equal(r.items[0].submittedAt,'2026-11-22T12:00:00.000Z');assert.equal(r.items[2].message,'<script>alert(1)</script>');
 assert.deepEqual(Object.keys(r.items[0]),['id','submittedAt','message','author']);assert(h.getCached());
});
test('empty sheet returns an empty successful snapshot without reading cells',()=>{const h=harness();assert.deepEqual(h.read(),{ok:true,items:[]});assert.equal(h.reads.length,0);});
test('cache hits avoid extra Sheets reads',()=>{const h=harness({cacheValue:JSON.stringify({ok:true,items:[]})});assert.deepEqual(h.read(),{ok:true,items:[]});assert.equal(h.reads.length,0);});
test('untrusted origin and invalid nonce rejected before rendering bridge',()=>{const h=harness();assert.throws(()=>h.context.doGet({parameter:{origin:'https://evil.test',channel:'a'.repeat(32)}}),/ORIGIN_NOT_ALLOWED/);assert.throws(()=>h.context.doGet({parameter:{origin:'http://localhost:4173',channel:'bad'}}),/INVALID_CHANNEL/);});

test('missing private settings fail before cached data or sheet access',()=>{const h=harness({cacheValue:JSON.stringify({ok:true,items:[]})});h.context.PropertiesService.getScriptProperties=()=>({getProperty:()=>''});assert.throws(()=>h.read(),/SETUP_REQUIRED/);assert.equal(h.reads.length,0);});

test('column letters support alternate layouts and invalid values fail',()=>{const h=harness();assert.equal(h.context.columnNumberBooth_('b'),2);assert.equal(h.context.columnNumberBooth_('AA'),27);assert.throws(()=>h.context.columnNumberBooth_('A:F'),/INVALID_COLUMN/);assert.throws(()=>h.context.columnNumberBooth_('2'),/INVALID_COLUMN/);});
test('configured columns cannot overlap',()=>{const h=harness();h.context.PropertiesService.getScriptProperties=()=>({getProperty:key=>({SHEET_ID:'test',TAB_NAME:'test',MESSAGE_COLUMN:'A'}[key]||'')});assert.throws(()=>h.read(),/DUPLICATE_COLUMN/);assert.equal(h.reads.length,0);});
test('generic template defaults to A/B/C and reads only these columns',()=>{
 const h=harness();const selected=[];
 h.context.PropertiesService.getScriptProperties=()=>({getProperty:key=>({SHEET_ID:'test',TAB_NAME:'test'}[key]||'')});
 h.context.SpreadsheetApp.openById=()=>({getSheetByName:()=>({getLastRow:()=>2,getRange:(row,col,n,width)=>{selected.push(col);assert.equal(width,1);const value={1:'2026-01-01',2:'sample idea',3:'example.crew'}[col];return {getValues:()=>[[value]],getDisplayValues:()=>[[value]]};}})});
 const result=h.read();assert.deepEqual(selected,[1,2,3]);assert.equal(result.items[0].message,'sample idea');assert.equal(result.items[0].author,'example.crew');
});
