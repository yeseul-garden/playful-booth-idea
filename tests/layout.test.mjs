import test from 'node:test';
import assert from 'node:assert/strict';
import {planWallLayout,textLineBudget} from '../public/layout.js';
import {normalizeTitle,validStoredIcon,prepareIcon} from '../public/branding.js';
test('portrait and desktop layouts keep useful card width and reserve motion space',()=>{
 for(const [width,height] of [[282,360],[342,500],[540,620],[720,700],[1100,600],[1728,760],[3648,1700]]){
  const p=planWallLayout({width,height,count:200});
  const cardWidth=(width-p.gap*(p.columns-1))/p.columns;
  assert(cardWidth>=Math.min(width,260),`${width}: ${cardWidth}`);
  assert.equal(p.capacity,p.columns*p.rows);
  assert(p.cardMaxHeight+24<=p.cellHeight+1,`${width}: no room for float`);
  assert(p.rows*p.cellHeight+(p.rows-1)*p.gap<=height+1);
 }
 assert.equal(planWallLayout({width:540,height:700,count:16}).columns,2);
});
test('text budget comes from available cell and chrome, independent of previously clamped content',()=>{
 const input={cardHeight:320,paddingTop:24,paddingBottom:24,metaHeight:21,gap:20,lineHeight:32};
 assert.equal(textLineBudget(input),7);
 assert.equal(textLineBudget({...input,cardHeight:200}),3);
 assert.equal(textLineBudget({...input,cardHeight:80}),1);
});
test('event title is required after trimming and capped, only normalized PNG data is restored',()=>{
 assert.equal(normalizeTitle('  행사 이름  '),'행사 이름');assert.equal(normalizeTitle('   '),'');assert.equal(normalizeTitle('a'.repeat(100)).length,80);
 assert.equal(validStoredIcon('https://evil.test/icon.svg'),'');assert.equal(validStoredIcon('data:image/svg+xml,<svg onload="x"/>'),'');
 assert.equal(validStoredIcon('data:image/png;base64,YQ=='),'data:image/png;base64,YQ==');
});
test('icon upload rejects unsupported types and oversize inputs before decoding',async()=>{
 await assert.rejects(prepareIcon({type:'image/svg+xml',size:10}),/PNG/);
 await assert.rejects(prepareIcon({type:'image/png',size:6*1024*1024}),/5MB/);
});
