import {endpointURL} from './data.js';
export function createConnection(value,{timeout=20000}={}) {
  const endpoint=endpointURL(value);if(!endpoint)throw new Error('INVALID_ENDPOINT');
  const channel=crypto.randomUUID().replaceAll('-','');
  const frame=document.createElement('iframe');frame.hidden=true;frame.title='Google Sheet 읽기 연결';frame.referrerPolicy='no-referrer';
  let peer=null,origin='',request=null,closed=false,readyResolve,readyReject;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const deadline=setTimeout(()=>{readyReject(new Error('CONNECTION_TIMEOUT'));dispose();},timeout);
  const allowed=/^https:\/\/(?:script\.google\.com|script\.googleusercontent\.com|[a-z0-9-]+-script\.googleusercontent\.com)$/;
  function receive(e){
    const m=e.data;if(closed||!allowed.test(e.origin)||!m||m.boothBridge!==1||m.channel!==channel)return;
    if(m.ready&&!peer&&e.source){peer=e.source;origin=e.origin;clearTimeout(deadline);readyResolve();return;}
    if(e.source!==peer||e.origin!==origin||!request||m.id!==request.id)return;
    const current=request;request=null;clearTimeout(current.timer);
    m.error?current.reject(new Error(m.error)):current.resolve(m.result);
  }
  function dispose(){if(closed)return;closed=true;clearTimeout(deadline);window.removeEventListener('message',receive);frame.remove();readyReject(new Error('CLOSED'));if(request){clearTimeout(request.timer);request.reject(new Error('CLOSED'));request=null;}}
  window.addEventListener('message',receive);frame.src=endpoint+'?channel='+channel+'&origin='+encodeURIComponent(location.origin);document.body.append(frame);
  return {dispose,async read(){await ready;if(closed)throw new Error('CLOSED');if(request)throw new Error('BUSY');return new Promise((resolve,reject)=>{const id=crypto.randomUUID();request={id,resolve,reject,timer:setTimeout(()=>{request=null;reject(new Error('READ_TIMEOUT'));dispose();},timeout)};peer.postMessage({boothBridge:1,channel,id,action:'read'},origin);});}};
}
