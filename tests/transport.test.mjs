import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnection} from '../public/transport.js';
function setup(){
 let listener;const frames=[];const events=[];
 globalThis.window={addEventListener:(type,cb)=>listener=cb,removeEventListener:()=>listener=null};
 globalThis.location={origin:'https://booth.example.com'};
 globalThis.document={createElement:()=>({hidden:false,src:'',remove(){this.removed=true;}}),body:{append:frame=>frames.push(frame)}};
 const peer={postMessage:(message,origin)=>events.push({message,origin})};
 return {frames,events,peer,send:(data,{source=peer,origin='https://script.googleusercontent.com'}={})=>listener?.({data,source,origin})};
}
const endpoint='https://script.google.com/macros/s/'+'a'.repeat(30)+'/exec';
test('bridge requires channel + allowed origin, then exact peer, origin and request id',async()=>{
 const h=setup(),connection=createConnection(endpoint,{timeout:1000});
 const url=new URL(h.frames[0].src),channel=url.searchParams.get('channel');assert.equal(url.searchParams.get('origin'),'https://booth.example.com');
 let done=false;const pending=connection.read().then(r=>{done=true;return r;});
 h.send({boothBridge:1,channel,ready:true},{origin:'https://evil.test'});await Promise.resolve();assert.equal(h.events.length,0);
 h.send({boothBridge:1,channel:'wrong',ready:true});await Promise.resolve();assert.equal(h.events.length,0);
 h.send({boothBridge:1,channel,ready:true});await Promise.resolve();assert.equal(h.events.length,1);
 const id=h.events[0].message.id;
 h.send({boothBridge:1,channel,id,result:{ok:true,items:[]}},{source:{}});
 h.send({boothBridge:1,channel,id:'wrong',result:{ok:true,items:[]}});
 await Promise.resolve();assert.equal(done,false);
 h.send({boothBridge:1,channel,id,result:{ok:true,items:[]}});
 assert.deepEqual(await pending,{ok:true,items:[]});connection.dispose();assert.equal(h.frames[0].removed,true);
});
test('request timeout rejects and disposes iframe, allowing caller to reconnect',async()=>{
 const h=setup(),connection=createConnection(endpoint,{timeout:25});
 const channel=new URL(h.frames[0].src).searchParams.get('channel');h.send({boothBridge:1,channel,ready:true});
 await assert.rejects(connection.read(),/READ_TIMEOUT/);assert.equal(h.frames[0].removed,true);
});
test('disposing during connection rejects the awaiting request',async()=>{
 setup();const connection=createConnection(endpoint,{timeout:1000});const pending=connection.read();connection.dispose();await assert.rejects(pending,/CLOSED/);
});
