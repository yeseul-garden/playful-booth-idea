export const PALETTE = Object.freeze(['#FFF4E0','#61C3DE','#A5C852','#BEAF39','#FFEB4B','#FF8F8F']);
export function endpointURL(value) {
  try {
    const u=new URL(value);
    return u.origin==='https://script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(u.pathname) && !u.search && !u.hash && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
}
export function normalizeSnapshot(payload) {
  if(payload?.ok!==true || !Array.isArray(payload.items)) throw new Error('INVALID_DATA');
  const ids=new Set();
  // Explicit allowlist: unknown upstream fields are never copied into app state.
  return payload.items.flatMap(row=>{
    if(typeof row?.id!=='string' || !row.id || ids.has(row.id) || typeof row.message!=='string') throw new Error('INVALID_DATA');
    ids.add(row.id);
    const message=row.message.trim();if(!message)return [];
    const author=String(row.author??'').trim().replace(/^@+/, '');
    return [{id:row.id, submittedAt:typeof row.submittedAt==='string'?row.submittedAt:'',message,author}];
  });
}
export function participantCount(items) {
  const named=new Set();let anonymous=0;
  for(const item of items){if(item.author)named.add(item.author.toLowerCase());else anonymous++;}
  return named.size+anonymous;
}
export const remainingRewards = (count,total=200) => Math.max(0,total-count);
export const authorTag = item => '@'+(item.author||'익명의 크루');
export function stableHash(value) {let h=2166136261;for(const ch of value)h=Math.imul(h^ch.codePointAt(0),16777619);return h>>>0;}
export function diffSnapshot(previous,next) {const ids=new Set(previous.map(item=>item.id));return next.filter(item=>!ids.has(item.id));}
export class SnapshotStore {
  items=[];initialized=false;
  apply(payload){const next=normalizeSnapshot(payload);const added=this.initialized?diffSnapshot(this.items,next):[];this.items=next;this.initialized=true;return added;}
}
