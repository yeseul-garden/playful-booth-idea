import {PALETTE,endpointURL,SnapshotStore,participantCount,remainingRewards,authorTag,stableHash} from './data.js';
import {QUESTION_PLACEHOLDER,cardColor} from './presentation.js';
import {planWallLayout,textLineBudget} from './layout.js';
import {DEFAULT_TITLE,normalizeTitle,validStoredIcon,prepareIcon} from './branding.js';
import {createConnection} from './transport.js';
import {sampleSnapshot,incomingSamples} from './demo.js';
const $=selector=>document.querySelector(selector);
const config=window.BOOTH_CONFIG||{};
const pollInterval=Math.max(5000,Math.min(10000,Number(config.pollInterval)||7000));
const pageInterval=Math.max(12000,Number(config.pageInterval)||18000);
const store=new SnapshotStore();
// Olive gold is retained in brand tokens, but not assigned to response cards: it reads as a dimmed state.
const responseColor=item=>cardColor(Math.max(0,store.items.findIndex(row=>row.id===item.id)));
// One-time migration of the previously auto-filled example; user-written questions stay.
if(readPreference('question-format')!=='2'){
  if(readPreference('question')===QUESTION_PLACEHOLDER)savePreference('question','');
  savePreference('question-format','2');
}
let boardQuestion=readPreference('question')||'';
$('#board-question').placeholder=QUESTION_PLACEHOLDER;
function renderQuestion(){const heading=$('#view-heading');heading.textContent=boardQuestion;heading.hidden=!boardQuestion;}
function renderDemoGuide(){
  $('#demo-guide').hidden=!state.demo;
  const handName={human:'사람 손',cat:'고양이 손',dog:'강아지 손'}[paperHand];
  $('#demo-guide-copy').textContent=reducedMotion.matches
    ?'새 응답이 도착하는 모습을 확인해보세요. 기기의 동작 줄이기 설정에 따라 움직임은 생략됩니다.'
    :state.view==='board'
      ?`새 응답이 도착하면 ${handName}이 카드를 붙여요. 아래 버튼으로 확인해보세요.`
      :'새 응답이 도착하면 말풍선이 나타나요. 아래 버튼으로 확인해보세요. 손은 카드형에서 볼 수 있어요.';
  $('#demo-arrival').disabled=!!state.active;
  $('#demo-arrival').textContent=state.active?'도착 효과 재생 중…':'샘플 응답 도착시키기';
}
const state={view:'space',page:0,capacity:8,columns:4,rows:2,demo:false,paused:false,connection:null,endpoint:'',busy:false,generation:0,queue:[],active:null,animationTimer:null,lastSuccess:null,failures:0};
let lastSignature='',pageChangedAt=Date.now(),pollTimer=null,resizeTimer=null,sampleCounter=0;
let paperHand=['human','cat','dog'].includes(readPreference('paper-hand'))?readPreference('paper-hand'):'cat';
let branding={title:normalizeTitle(readPreference('event-title')),icon:validStoredIcon(readPreference('event-icon'))},draftIcon='',iconBusy=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function readPreference(key){try{return localStorage.getItem('playful-booth:'+key)||'';}catch{return '';}}
function savePreference(key,value){try{value?localStorage.setItem('playful-booth:'+key,value):localStorage.removeItem('playful-booth:'+key);}catch{}}
function announce(message){$('#announcement').textContent=message;}
function status(message,kind='idle'){$('#connection-status').textContent=message;$('#connection-dot').className='status-dot '+kind;}
function updateEmpty(){
  const empty=store.items.length===0;$('#empty').hidden=!empty;$('#wall').hidden=empty;
  $('#empty-connect').hidden=!!state.endpoint;$('#demo-start').hidden=!!state.endpoint;
  if(state.endpoint){$('#empty-title').textContent=state.lastSuccess?'첫 번째 아이디어를 기다리고 있어요.':'아이디어 보드에 연결하고 있어요.';$('#empty-copy').textContent=state.lastSuccess?'Google Form에 남긴 한 줄이 이곳의 새로운 별이 됩니다.':'응답 시트에서 아이디어를 불러옵니다. 연결 상태는 화면 아래에서 확인하세요.';}
  else{$('#empty-title').textContent='첫 번째 아이디어의 주인공이 되어주세요.';$('#empty-copy').textContent='Google Form에 남긴 한 줄이 이곳의 새로운 별이 됩니다.';}
}
function dimensions(){
  const wall=$('#wall'),css=getComputedStyle(wall);
  const height=Math.max(100,(wall.clientHeight||innerHeight-300)-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom));
  const layout=planWallLayout({width:wall.clientWidth||innerWidth-48,height,count:store.items.length});
  Object.assign(state,{columns:layout.columns,rows:layout.rows,capacity:layout.capacity});
  for(const [key,value] of Object.entries({'--cols':layout.columns,'--rows':layout.rows,'--card-gap':layout.gap+'px','--idea-font':layout.preferredFont+'px','--card-max-height':layout.cardMaxHeight+'px'}))wall.style.setProperty(key,value);
  return layout;
}
function fitIdea(idea,maxHeight,preferredFont){
  const message=idea.querySelector('.message'),meta=idea.querySelector('.idea-meta')||idea.querySelector('.author');
  const style=getComputedStyle(idea),metaHeight=meta.getBoundingClientRect().height;
  const minimum=Math.max(18,Math.floor(preferredFont*.82));let font=preferredFont,lines=1,fullHeight=0;
  // Measure untruncated content at each font, with a budget independent of the current card height.
  message.style.webkitLineClamp='unset';message.style.display='block';
  for(;font>=minimum;font-=2){
    message.style.fontSize=font+'px';const text=getComputedStyle(message);
    lines=textLineBudget({cardHeight:maxHeight,paddingTop:parseFloat(style.paddingTop),paddingBottom:parseFloat(style.paddingBottom),metaHeight,gap:parseFloat(style.rowGap)||0,lineHeight:parseFloat(text.lineHeight)});
    fullHeight=message.scrollHeight;if(fullHeight<=lines*parseFloat(text.lineHeight)+1||font-2<minimum)break;
  }
  message.style.display='-webkit-box';message.style.webkitLineClamp=String(lines);
  const truncated=fullHeight>lines*parseFloat(getComputedStyle(message).lineHeight)+1;
  const more=idea.querySelector('.read-more');if(more)more.hidden=!truncated;
  idea.dataset.truncated=String(truncated);
}
function styleIdea(node,item){
  const hash=stableHash(item.id);
  node.style.setProperty('--paper',responseColor(item));
  node.style.setProperty('--tilt',((hash%61)/10-3).toFixed(1)+'deg');
  node.style.setProperty('--offset',((hash>>>6)%19-9)+'px');
  node.style.setProperty('--breeze-duration',(4.5+(hash%20)/10)+'s');
  node.style.setProperty('--duration',(7+(hash%50)/10)+'s');
  node.style.setProperty('--delay',-(hash%70)/10+'s');
}
function makeIdea(item){
  const button=document.createElement('button');button.type='button';button.className='idea';styleIdea(button,item);
  button.dataset.id=item.id;button.setAttribute('aria-label',`${authorTag(item)}님의 아이디어 자세히 보기: ${item.message}`);
  const pin=document.createElement('span');pin.className='note-pin';pin.setAttribute('aria-hidden','true');
  const message=document.createElement('p');message.className='message'+(item.message.length>90?' long':'');message.textContent=item.message;
  const author=document.createElement('span');author.className='author';author.textContent=authorTag(item);
  const meta=document.createElement('span');meta.className='idea-meta';const more=document.createElement('span');more.className='read-more';more.textContent='전체 보기';more.hidden=true;meta.append(more,author);
  button.append(pin,message,meta);button.addEventListener('click',()=>openDetail(item));return button;
}
function render({enter=true}={}){
  renderQuestion();
  renderDemoGuide();
  const n=participantCount(store.items);$('#participant-count').textContent=n;$('#reward-count').textContent=remainingRewards(n,200);
  $('#response-count').textContent=`아이디어 ${store.items.length}개`;
  $('#demo-label').hidden=!state.demo;updateEmpty();const layout=dimensions();
  const pages=Math.max(1,Math.ceil(store.items.length/state.capacity));state.page=Math.max(0,Math.min(pages-1,state.page));
  const fragment=document.createDocumentFragment();
  const ordered=[...store.items].reverse();const start=state.page*state.capacity;
  for(const [index,item] of ordered.slice(start,start+state.capacity).entries()){
    const slot=document.createElement('div');slot.className='idea-slot'+(enter?' enter':'');slot.style.setProperty('--index',index);
    slot.append(makeIdea(item));fragment.append(slot);
  }
  $('#wall').replaceChildren(fragment);
  for(const idea of document.querySelectorAll('#wall .idea'))fitIdea(idea,layout.cardMaxHeight,layout.preferredFont);
  $('#page-label').textContent=`${state.page+1} / ${pages}`;
  $('#previous').disabled=pages===1;$('#next').disabled=pages===1;
}
function changePage(delta){
  const pages=Math.max(1,Math.ceil(store.items.length/state.capacity));state.page=(state.page+delta+pages)%pages;pageChangedAt=Date.now();render();
}
function setView(view){
  state.view=view==='board'?'board':'space';document.documentElement.dataset.view=state.view;savePreference('view',state.view);
  document.querySelectorAll('.view-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
  renderQuestion();
  render();pageChangedAt=Date.now();
}
function openDetail(item){
  const dialog=$('#detail');dialog.dataset.id=item.id;dialog.style.background=responseColor(item);
  $('#detail-message').textContent=item.message;$('#detail-author').textContent=authorTag(item);dialog.showModal();
}
function comet(){if(state.view!=='space'||state.paused||reducedMotion.matches||document.hidden)return;const el=$('#comet');el.classList.remove('fly');void el.offsetWidth;el.classList.add('fly');}
function clearArrival(){clearTimeout(state.animationTimer);state.animationTimer=null;state.queue=[];state.active=null;$('#spotlight').hidden=true;}
function playArrival(){
  if(state.active||!state.queue.length||document.hidden||state.paused||document.documentElement.dataset.screen!=='board'||$('dialog[open]'))return;
  const item=state.queue.shift();if(!store.items.some(row=>row.id===item.id)){playArrival();return;}
  state.active=item;state.page=0;render();comet();$('#arrival-hand').src='./hands/'+paperHand+'.svg';
  const spotlight=$('#spotlight');const article=spotlight.querySelector('.idea');styleIdea(article,item);
  const message=article.querySelector('.message');message.textContent=item.message;message.classList.toggle('long',item.message.length>90);
  article.querySelector('.author').textContent=authorTag(item);
  $('#arrival-queue').textContent=state.queue.length?`새로운 아이디어 ${state.queue.length}개가 더 도착했어요`:'';
  const target=[...document.querySelectorAll('#wall .idea')].find(node=>node.dataset.id===item.id);
  if(target){const rect=target.getBoundingClientRect();spotlight.style.setProperty('--target-x',`${rect.x+rect.width/2-innerWidth/2}px`);spotlight.style.setProperty('--target-y',`${rect.y+rect.height/2-($('#spotlight').getBoundingClientRect().y+$('#spotlight').clientHeight/2)}px`);spotlight.style.setProperty('--target-tilt',target.style.getPropertyValue('--tilt'));}
  spotlight.hidden=false;
  const spotlightHeight=spotlight.clientHeight;fitIdea(article,Math.max(160,spotlightHeight-160),Math.min(44,Math.max(22,innerWidth*.022)));
  // Recreate the animation so every queued arrival receives its own entrance.
  const content=spotlight.querySelector('.spotlight-content');content.style.animation='none';$('#arrival-hand').style.animation='none';spotlight.style.animation='none';void spotlight.offsetWidth;content.style.animation='';$('#arrival-hand').style.animation='';spotlight.style.animation='';
  state.animationTimer=setTimeout(()=>{spotlight.hidden=true;state.active=null;state.animationTimer=null;pageChangedAt=Date.now();playArrival();renderDemoGuide();},reducedMotion.matches?3500:4500);
}
function applySnapshot(payload){
  const additions=store.apply(payload);const signature=JSON.stringify(store.items);
  if(signature!==lastSignature){lastSignature=signature;if(additions.length)state.page=0;render();}
  state.queue=state.queue.filter(item=>store.items.some(row=>row.id===item.id));
  if(additions.length){state.queue.push(...additions);announce(`새로운 아이디어 ${additions.length}개가 도착했습니다. 총 ${store.items.length}개의 아이디어입니다.`);playArrival();}
  const open=$('#detail');if(open.open){const current=store.items.find(i=>i.id===open.dataset.id);if(current){$('#detail-message').textContent=current.message;$('#detail-author').textContent=authorTag(current);}else open.close();}
}
async function poll(){
  if(!state.endpoint||state.demo||state.busy||document.hidden)return false;
  const generation=state.generation;state.busy=true;$('#refresh').disabled=true;
  if(!state.lastSuccess)status('응답 시트 연결 중…','loading');
  try{
    state.connection??=createConnection(state.endpoint);const result=await state.connection.read();
    if(generation!==state.generation)return false;
    applySnapshot(result);state.lastSuccess=Date.now();state.failures=0;
    updateEmpty();status(`실시간 연결 / ${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} 확인`,'live');
    $('#settings-status').textContent=`연결되었습니다. 응답 ${store.items.length}개를 불러왔습니다.`;return true;
  }catch(error){
    if(generation!==state.generation)return false;
    state.connection?.dispose();state.connection=null;state.failures++;
    const stale=state.lastSuccess?` · ${Math.floor((Date.now()-state.lastSuccess)/1000)}초 전 기록 유지`:'';
    status(`연결 재시도 중${stale}`,'error');
    $('#settings-status').textContent='연결을 확인하지 못했습니다. 웹 앱 주소와 배포 액세스 권한을 확인해주세요. 자동으로 다시 시도합니다.';
    if(!store.items.length){$('#empty-title').textContent='연결을 한 번 더 확인해주세요.';$('#empty-copy').textContent='설정에서 웹 앱 주소와 Google 배포 권한을 확인할 수 있어요.';}
    return false;
  }finally{if(generation===state.generation){state.busy=false;$('#refresh').disabled=false;}}
}
function schedulePoll(){clearTimeout(pollTimer);pollTimer=setTimeout(async()=>{await poll();schedulePoll();},pollInterval);}
function resetSource(){
  state.generation++;state.connection?.dispose();state.connection=null;state.busy=false;state.lastSuccess=null;state.failures=0;state.page=0;clearArrival();
  store.items=[];store.initialized=false;lastSignature='';$('#refresh').disabled=false;
  if($('#detail').open)$('#detail').close();
}
async function connect(value){
  const endpoint=endpointURL(value);if(!endpoint){$('#settings-status').textContent='올바른 Google Apps Script /exec 주소를 입력해주세요.';return false;}
  resetSource();state.demo=false;renderQuestion();state.endpoint=endpoint;savePreference('endpoint',endpoint);render();
  return await poll();
}
function startDemo(){resetSource();state.endpoint='';state.demo=true;applySnapshot(sampleSnapshot());status('샘플 미리보기 / 실제 응답 아님');renderQuestion();render();}
function simulateArrival(){if(!state.demo)startDemo();const [message,author]=incomingSamples[sampleCounter++%incomingSamples.length];applySnapshot({ok:true,items:[...store.items,{id:`demo-new-${Date.now()}-${sampleCounter}`,submittedAt:new Date().toISOString(),message,author}]});status('샘플 미리보기 / 실제 응답 아님');}
function togglePause(){state.paused=!state.paused;document.documentElement.classList.toggle('motion-paused',state.paused);$('#pause').setAttribute('aria-pressed',String(state.paused));$('#pause').setAttribute('aria-label',state.paused?'애니메이션과 페이지 순환 재개':'애니메이션과 페이지 순환 일시정지');$('#pause').textContent=state.paused?'▷':'Ⅱ';pageChangedAt=Date.now();if(!state.paused)playArrival();}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('이 브라우저에서는 전체 화면을 사용할 수 없습니다. 브라우저의 전체 화면 기능을 사용해주세요.');}}
function openSettings(){$('#endpoint').value=state.endpoint||readPreference('endpoint');$('#settings-status').textContent='';$('#settings').showModal();}
for(const button of document.querySelectorAll('.view-tabs button'))button.addEventListener('click',()=>setView(button.dataset.view));
$('#previous').addEventListener('click',()=>changePage(-1));$('#next').addEventListener('click',()=>changePage(1));
$('#pause').addEventListener('click',togglePause);$('#fullscreen').addEventListener('click',fullscreen);
$('#refresh').addEventListener('click',()=>{if(state.demo){announce('현재 샘플 미리보기입니다. 실제 응답은 연결 설정에서 연결해주세요.');}else{poll();}});
$('#settings-open').addEventListener('click',openSettings);$('#empty-connect').addEventListener('click',openSettings);
$('#demo-start').addEventListener('click',()=>{startDemo();render();});
$('#connection-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{if(await connect($('#endpoint').value.trim()))$('#settings').close();}finally{button.disabled=false;}});
$('#demo-incoming').addEventListener('click',()=>{$('#settings').close();simulateArrival();});
$('#demo-arrival').addEventListener('click',()=>{if(state.paused)togglePause();simulateArrival();});
$('#disconnect').addEventListener('click',()=>{resetSource();state.endpoint='';state.demo=false;renderQuestion();savePreference('endpoint','');render();status('응답 시트 연결 대기');$('#settings-status').textContent='이 기기의 연결을 해제했습니다.';$('#endpoint').value='';});
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$('#'+button.dataset.close).close());
for(const dialog of document.querySelectorAll('dialog')){dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{pageChangedAt=Date.now();playArrival();});}
$('#detail').addEventListener('close',()=>delete $('#detail').dataset.id);
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,button,a')||document.documentElement.dataset.screen==='setup'||e.metaKey||e.ctrlKey||e.altKey||$('dialog[open]'))return;if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();}if(e.key==='ArrowRight')changePage(1);if(e.key==='ArrowLeft')changePage(-1);if(e.code==='Space'){e.preventDefault();togglePause();}});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render({enter:false}),160);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){pageChangedAt=Date.now();poll();playArrival();}});
setInterval(()=>{if(state.paused||document.hidden||document.documentElement.dataset.screen!=='board'||state.active||state.queue.length||$('dialog[open]'))return;if(Date.now()-pageChangedAt>=pageInterval)changePage(1);},1000);
setInterval(()=>{if(!$('dialog[open]')&&document.documentElement.dataset.screen==='board')comet();},17000);
// Canvas is decorative only; redraw at 24fps, with capped DPR and a static reduced-motion view.
const canvas=$('#stars'),ctx=canvas.getContext('2d');let stars=[],cw=0,ch=0,lastFrame=0;
function resizeStars(){const dpr=Math.min(devicePixelRatio||1,2);cw=innerWidth;ch=innerHeight;canvas.width=cw*dpr;canvas.height=ch*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:Math.min(200,Math.floor(cw*ch/8500))},(_,i)=>{const hash=stableHash('star-'+i);return {x:(hash%10000)/10000*cw,y:((hash>>>12)%10000)/10000*ch,r:.4+(hash%15)/10,phase:hash%60,speed:.2+(hash%9)/20};});drawStars(0);}
function drawStars(time){if(!ctx)return;ctx.clearRect(0,0,cw,ch);for(const s of stars){ctx.beginPath();ctx.fillStyle=`rgba(225,237,244,${.25+.45*(.5+.5*Math.sin(time*.001*s.speed+s.phase))})`;ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}}
function starFrame(time){if(time-lastFrame>42&&!document.hidden&&!state.paused&&state.view==='space'&&!reducedMotion.matches){drawStars(time);lastFrame=time;}requestAnimationFrame(starFrame);}
window.addEventListener('resize',resizeStars);resizeStars();requestAnimationFrame(starFrame);
function applyBranding(){
  $('#event-heading').textContent=branding.title||DEFAULT_TITLE;document.title=(branding.title||DEFAULT_TITLE)+' | Playful Booth';
  $('#header-default-symbol').hidden=!!branding.icon;$('#header-icon').hidden=!branding.icon;
  if(branding.icon)$('#header-icon').src=branding.icon;else $('#header-icon').src='./favicon.svg';
}
function showDraftIcon(){
  $('#setup-default-symbol').hidden=!!draftIcon;$('#setup-icon-preview').hidden=!draftIcon;
  if(draftIcon)$('#setup-icon-preview').src=draftIcon;else $('#setup-icon-preview').src='./favicon.svg';
  $('#icon-reset').disabled=!draftIcon;
}
function openEventSetup(){
  if($('#detail').open)$('#detail').close();if($('#settings').open)$('#settings').close();
  clearTimeout(state.animationTimer);state.animationTimer=null;$('#spotlight').hidden=true;state.active=null;
  document.documentElement.dataset.screen='setup';$('#event-title').value=branding.title;$('#board-question').value=boardQuestion;draftIcon=branding.icon;showDraftIcon();
  $('#setup-endpoint').value=state.endpoint||readPreference('endpoint')||config.endpoint||'';
  document.querySelectorAll('[name=paperHand]').forEach(input=>input.checked=input.value===paperHand);
  document.querySelectorAll('[name=initialView]').forEach(input=>input.checked=input.value===state.view);
  $('#setup-resume').hidden=!branding.title;$('#setup-error').textContent='';$('#icon-error').textContent='';
}
function showBoard(){
  document.documentElement.dataset.screen='board';applyBranding();syncChromeSize();render();pageChangedAt=Date.now();playArrival();
}
function syncChromeSize(){
  if(document.documentElement.dataset.screen!=='board')return;
  const header=Math.ceil($('.header').getBoundingClientRect().height),footer=Math.ceil($('.footer').getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-height',header+'px');document.documentElement.style.setProperty('--footer-height',footer+'px');
}
let chromeFrame=0;
if(typeof ResizeObserver==='function')new ResizeObserver(()=>{cancelAnimationFrame(chromeFrame);chromeFrame=requestAnimationFrame(()=>{syncChromeSize();render({enter:false});});}).observe($('.header'));
$('#event-settings').addEventListener('click',openEventSetup);
for(const field of ['#event-title','#setup-endpoint'])$(field).addEventListener('input',()=>{$('#setup-error').textContent='';});
$('#setup-resume').addEventListener('click',showBoard);
$('#event-icon').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;iconBusy=true;$('#icon-error').textContent='';
  try{draftIcon=await prepareIcon(file);showDraftIcon();}catch(error){$('#icon-error').textContent=error.message;}
  finally{iconBusy=false;e.target.value='';}
});
$('#icon-reset').addEventListener('click',()=>{draftIcon='';showDraftIcon();$('#icon-error').textContent='';});
$('#event-setup-form').addEventListener('submit',async e=>{
  e.preventDefault();const title=normalizeTitle($('#event-title').value);$('#setup-error').textContent='';
  if(!title){$('#setup-error').textContent='행사명 또는 부스명을 입력해주세요.';$('#event-title').focus();return;}
  if(iconBusy){$('#setup-error').textContent='아이콘을 준비하고 있어요. 잠시 후 다시 눌러주세요.';return;}
  const mode=e.submitter?.value||'live',value=$('#setup-endpoint').value.trim();
  if(mode==='live'&&value&&!endpointURL(value)){$('#setup-error').textContent='올바른 Google Apps Script /exec 주소를 입력해주세요.';return;}
  paperHand=document.querySelector('[name=paperHand]:checked').value;savePreference('paper-hand',paperHand);
  boardQuestion=$('#board-question').value.trim();savePreference('question',boardQuestion);
  branding={title,icon:draftIcon};savePreference('event-title',title);savePreference('event-icon',draftIcon);
  try{if(localStorage.getItem('playful-booth:event-title')!==title||draftIcon&&localStorage.getItem('playful-booth:event-icon')!==draftIcon)throw Error();$('#setup-save-note').textContent='행사 설정과 아이콘은 이 브라우저에 저장됩니다.';}catch{$('#setup-save-note').textContent='브라우저 저장 공간을 사용할 수 없어 이 화면을 닫으면 설정이 사라질 수 있습니다.';}
  setView(document.querySelector('[name=initialView]:checked').value);
  if(mode==='preview'){if(!state.demo)startDemo();showBoard();return;}
  if(value){showBoard();if(state.demo||state.endpoint!==value)await connect(value);}
  else{if(state.demo||state.endpoint)resetSource();state.demo=false;state.endpoint='';savePreference('endpoint','');status('응답 시트 연결 대기');renderQuestion();showBoard();}
});
setView(readPreference('view'));
const requested=new URL(location.href).searchParams;
const savedEndpoint=endpointURL(config.endpoint)||endpointURL(readPreference('endpoint'));
function showLanding(){
  document.documentElement.dataset.screen='landing';clearArrival();$('#landing-resume').hidden=!branding.title;$('#landing').scrollTop=0;
}
for(const id of ['landing-create','hero-create','footer-create'])$('#'+id).addEventListener('click',openEventSetup);
$('#setup-home').addEventListener('click',showLanding);
$('#landing-resume').addEventListener('click',()=>{showBoard();if(savedEndpoint&&!state.endpoint)connect(savedEndpoint);});
$('#landing-demo').addEventListener('click',()=>{if(!branding.title){branding={title:'우리 부스의 아이디어',icon:''};}startDemo();showBoard();});
if(requested.get('demo')==='1'&&branding.title){showBoard();startDemo();if(requested.get('arrival')==='1')setTimeout(simulateArrival,1200);}else showLanding();
document.fonts?.ready.then(()=>{syncChromeSize();render({enter:false});});
document.fonts?.addEventListener('loadingdone',()=>{syncChromeSize();render({enter:false});});
schedulePoll();
