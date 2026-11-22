import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSnapshot,participantCount,remainingRewards,authorTag,endpointURL,SnapshotStore,PALETTE} from '../public/data.js';
const row=(id,message='아이디어',author='eden.choi')=>({id,message,author,submittedAt:'2026-11-22T12:00:00.000Z'});
test('empty ideas excluded, authors defaulted, unknown columns never enter state',()=>{
 const items=normalizeSnapshot({ok:true,items:[{...row('1','  좋은 생각  ',' @ashley.jeon '),B:'private',C:'private',D:'private'},row('2',' \n '),row('3','의견','')]});
 assert.equal(items.length,2);assert.equal(items[0].message,'좋은 생각');assert.equal(items[0].author,'ashley.jeon');assert.equal(authorTag(items[1]),'@익명의 크루');
 assert.deepEqual(Object.keys(items[0]),['id','submittedAt','message','author']);assert(!JSON.stringify(items).includes('private'));
});
test('participants are unique LDAPs ignoring case, anonymous submissions each count once',()=>{
 assert.equal(participantCount([row('1','a','Eden.Choi'),row('2','b','eden.choi'),row('3','c',''),row('4','d','')]),3);
 assert.equal(remainingRewards(0),200);assert.equal(remainingRewards(199),1);assert.equal(remainingRewards(201),0);
});
test('initial snapshot silent; new rows only once; edits/deletions reflected; invalid snapshot preserves last good state',()=>{
 const s=new SnapshotStore();assert.deepEqual(s.apply({ok:true,items:[row('1')]}),[]);
 assert.deepEqual(s.apply({ok:true,items:[row('1'),row('2')]}).map(r=>r.id),['2']);
 assert.deepEqual(s.apply({ok:true,items:[row('1'),row('2')]}),[]);
 s.apply({ok:true,items:[row('2','수정됨')]});assert.equal(s.items.length,1);assert.equal(s.items[0].message,'수정됨');
 assert.throws(()=>s.apply({ok:false,items:[]}),/INVALID_DATA/);assert.equal(s.items.length,1);
 assert.throws(()=>s.apply({ok:true,items:[row('2'),row('2')]}),/INVALID_DATA/);assert.equal(s.items.length,1);
});
test('endpoint accepts deployed Apps Script URL only',()=>{
 const url='https://script.google.com/macros/s/'+'a'.repeat(30)+'/exec';assert.equal(endpointURL(url),url);
 for(const u of ['javascript:alert(1)',url+'?x=1',url+'#x',url.replace('/exec','/dev'),url.replace('script.google.com','script.google.com.evil.test'),url.replace('https://','https://user:pass@')])assert.equal(endpointURL(u),'');
});
test('all six card colors have >= 7:1 contrast against charcoal',()=>{
 const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
 assert.deepEqual(PALETTE,['#FFF4E0','#61C3DE','#A5C852','#BEAF39','#FFEB4B','#FF8F8F']);
 for(const color of PALETTE)assert((luminance(color)+.05)/(luminance('#17252b')+.05)>=7,color);
});
