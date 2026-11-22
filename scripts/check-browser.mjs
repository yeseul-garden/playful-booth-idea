// Independent headless QA profile; does not attach to the user's browser session.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve(process.env.BOOTH_SHOTS||'test-results');await mkdir(output,{recursive:true});
const icon=path.join(output,'test-icon.png');await writeFile(icon,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const failures=[],logs=[];
try{
 const page=await browser.newPage();page.on('pageerror',error=>failures.push(error.message));
 await page.setViewport({width:1440,height:1000});await page.goto(process.env.BOOTH_URL||'http://localhost:4173',{waitUntil:'networkidle2'});
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.$eval('html',el=>el.dataset.screen),'landing');
 await page.screenshot({path:path.join(output,'landing-desktop.png'),fullPage:true});
 await page.setViewport({width:390,height:844});await page.screenshot({path:path.join(output,'landing-mobile.png'),fullPage:true});
 assert(await page.evaluate(()=>document.querySelector('#landing').scrollWidth<=innerWidth));
 await page.setViewport({width:1440,height:1000});await page.click('#hero-create');
 assert.equal(await page.$eval('html',el=>el.dataset.screen),'setup');
 assert.equal(await page.$eval('#event-title',el=>el.value),'');
 await page.type('#event-title','   ');await page.click('#setup-preview');
 assert.match(await page.$eval('#setup-error',el=>el.textContent),/행사명/);
 await page.$eval('#event-title',el=>el.value='');await page.type('#event-title','AI Self-Learning 아이디어 부스');
 // Check image preparation with a real upload; invalid files keep the previous icon.
 await (await page.$('#event-icon')).uploadFile(icon);await page.waitForFunction(()=>!document.querySelector('#setup-icon-preview').hidden);
 await page.screenshot({path:path.join(output,'setup.png'),fullPage:true});
 await page.click('#setup-preview');await page.waitForFunction(()=>document.documentElement.dataset.screen==='board');
 assert.equal(await page.$eval('#event-heading',el=>el.textContent),'AI Self-Learning 아이디어 부스');
 assert.equal(await page.$eval('#header-icon',el=>el.hidden),false);
 assert.equal(await page.$eval('#participant-count',el=>el.textContent),'16');
 await page.click('#event-settings');await page.waitForFunction(()=>document.documentElement.dataset.screen==='setup');
 assert.equal(await page.$eval('#event-title',el=>el.value),'AI Self-Learning 아이디어 부스');
 await page.click('#icon-reset');await page.screenshot({path:path.join(output,'setup-default.png'),fullPage:true});await page.click('#setup-preview');await page.waitForFunction(()=>document.documentElement.dataset.screen==='board');
 assert.equal(await page.$eval('#header-default-symbol',el=>el.hidden),false);
 assert.equal(await page.$eval('#header-icon',el=>el.hidden),true);
 const sizes=[[1920,1080,'desktop'],[768,1024,'portrait'],[627,865,'narrow'],[390,844,'phone'],[3840,2160,'4k']];
 for(const [width,height,name] of sizes){
  await page.setViewport({width,height});
  for(const view of ['space','board']){
   await page.click(`.view-tabs [data-view=${view}]`);await new Promise(r=>setTimeout(r,500));
   const result=await page.evaluate(()=>{
    const wall=document.querySelector('#wall'),header=document.querySelector('.header').getBoundingClientRect(),footer=document.querySelector('.footer').getBoundingClientRect();
    const cards=[...wall.querySelectorAll('.idea')].map(el=>{const r=el.getBoundingClientRect(),m=el.querySelector('.message'),meta=el.querySelector('.idea-meta');return {length:m.textContent.length,truncated:el.dataset.truncated,font:parseFloat(getComputedStyle(m).fontSize),textBottom:m.offsetTop+m.offsetHeight,metaTop:meta.offsetTop,x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};});
    return {view:document.documentElement.dataset.view,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headerBottom:header.bottom,footerTop:footer.top,cards};
   });
   assert.equal(result.view,view);assert(result.scrollWidth<=width+1,`${name}: horizontal overflow`);
   for(const c of result.cards){assert(c.font>=18,`${name}: tiny text`);assert(c.x>=-1&&c.right<=width+1,`${name}: card out of viewport`);assert(c.y>=result.headerBottom&&c.bottom<=result.footerTop,`${name}/${view}: card collides with chrome`);assert(c.textBottom<=c.metaTop+1,`${name}: text overlaps author`);if(c.length<90)assert.equal(c.truncated,'false',`${name}/${view}: unnecessarily truncated short answer`);}
   logs.push({size:name,view,cards:result.cards.length,fonts:result.cards.map(c=>c.font),truncated:result.cards.filter(c=>c.truncated==='true').length});
   await page.screenshot({path:path.join(output,`${name}-${view}.png`),fullPage:true});
  }
 }
 await page.setViewport({width:1440,height:1000});await page.click('#event-settings');await page.waitForFunction(()=>document.documentElement.dataset.screen==='setup');
 await page.$eval('#event-title',el=>el.value='');await page.type('#event-title','긴 행사 제목도 헤더 높이에 맞게 자연스럽게 표시되는지 확인하기 위한 테스트 행사 이름');await page.click('#setup-preview');
 await new Promise(r=>setTimeout(r,350));assert(await page.evaluate(()=>document.querySelector('#main').getBoundingClientRect().top>=document.querySelector('.header').getBoundingClientRect().bottom));
 await page.click('#wall .idea');await page.waitForSelector('#detail[open]');assert((await page.$eval('#detail-message',el=>el.textContent)).length>0);await page.click('[data-close=detail]');
 await page.click('#settings-open');await page.click('#demo-incoming');await page.waitForFunction(()=>!document.querySelector('#spotlight').hidden);
 assert.equal(await page.$eval('#participant-count',el=>el.textContent),'16');
 assert.equal(await page.$eval('#response-count',el=>el.textContent),'아이디어 17개');
 await page.screenshot({path:path.join(output,'new-idea.png'),fullPage:true});
 await page.reload({waitUntil:'networkidle2'});assert.equal(await page.$eval('html',el=>el.dataset.screen),'landing');await page.click('#landing-resume');assert.equal(await page.$eval('html',el=>el.dataset.screen),'board');
 assert.match(await page.$eval('#event-heading',el=>el.textContent),/긴 행사 제목/);
 const longMessage='긴 답변도 원문을 잃지 않고 자세히 볼 수 있어야 합니다. '.repeat(80)+'<img src=x onerror="window.unexpected=true">';
 await page.setCacheEnabled(false);await page.setRequestInterception(true);
 page.on('request',request=>{if(new URL(request.url()).pathname==='/demo.js')request.respond({status:200,contentType:'text/javascript',body:`export const sampleSnapshot=()=>(${JSON.stringify({ok:true,items:[{id:'long-answer',message:longMessage,author:'very.long.author.name',submittedAt:''}]})});export const incomingSamples=[];`});else request.continue();});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.goto((process.env.BOOTH_URL||'http://localhost:4173')+'/?demo=1',{waitUntil:'networkidle2'});
 await page.waitForSelector('#wall .idea');
 assert.equal(await page.$eval('#wall .idea',el=>el.dataset.truncated),'true');
 assert.equal(await page.$eval('#wall .read-more',el=>el.hidden),false);
 assert.equal(await page.$eval('#wall .idea',el=>getComputedStyle(el).animationName),'none');
 assert.equal(await page.$eval('#wall',el=>el.querySelectorAll('img').length),0);
 await page.click('#wall .idea');assert.equal(await page.$eval('#detail-message',el=>el.textContent),longMessage);
 assert.deepEqual(failures,[]);await writeFile(path.join(output,'browser-results.json'),JSON.stringify({passed:true,checks:logs},null,2));
 console.log(JSON.stringify({passed:true,screens:logs.length,flows:['first-run validation','icon upload','star reset','preview return','header resize','full response','new arrival','saved branding','long response safe rendering','reduced motion'],checks:logs},null,2));
}finally{await browser.close();}
