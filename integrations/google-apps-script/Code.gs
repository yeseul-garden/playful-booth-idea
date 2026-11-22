/** Playful Booth Idea: read only the three configured columns. */
const BOOTH = Object.freeze({
  origins: ['http://localhost:4173', 'http://127.0.0.1:4173']
});
function doGet(e) {
  const origin=String(e.parameter.origin||'');
  const extra=PropertiesService.getScriptProperties().getProperty('ALLOWED_ORIGINS')||'';
  const allowed=BOOTH.origins.concat(extra.split(',').map(s=>s.trim()).filter(Boolean));
  if(!allowed.includes(origin))throw new Error('ORIGIN_NOT_ALLOWED');
  const channel=String(e.parameter.channel||'');
  if(!/^[a-f0-9]{32}$/.test(channel))throw new Error('INVALID_CHANNEL');
  const template=HtmlService.createTemplateFromFile('Bridge');
  template.bootstrap=JSON.stringify({origin,channel}).replace(/</g,'\\u003c');
  return template.evaluate().setTitle('Playful Booth · Sheet Reader').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function columnNumberBooth_(value) {
  const letters=String(value).trim().toUpperCase();
  if(!/^[A-Z]{1,3}$/.test(letters))throw new Error('INVALID_COLUMN');
  return letters.split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
}
function readBoothIdeas() {
  const properties=PropertiesService.getScriptProperties();
  const spreadsheetId=(properties.getProperty('SHEET_ID')||'').trim();
  const tabName=(properties.getProperty('TAB_NAME')||'').trim();
  if(!spreadsheetId||!tabName)throw new Error('SETUP_REQUIRED');
  const timeColumn=columnNumberBooth_(properties.getProperty('TIMESTAMP_COLUMN')||'A');
  const messageColumn=columnNumberBooth_(properties.getProperty('MESSAGE_COLUMN')||'B');
  const authorColumn=columnNumberBooth_(properties.getProperty('AUTHOR_COLUMN')||'C');
  if(new Set([timeColumn,messageColumn,authorColumn]).size!==3)throw new Error('DUPLICATE_COLUMN');
  const cacheKey='booth-v3-'+spreadsheetId+'-'+tabName+'-'+[timeColumn,messageColumn,authorColumn].join('-');
  const cache=CacheService.getScriptCache();
  const cached=cache.get(cacheKey);
  if(cached)return JSON.parse(cached);
  const sheet=SpreadsheetApp.openById(spreadsheetId).getSheetByName(tabName);
  if(!sheet)throw new Error('TAB_NOT_FOUND');
  const rowCount=Math.max(0,sheet.getLastRow()-1);
  if(!rowCount)return {ok:true,items:[]};
  // Request each selected column separately; no intervening columns are read.
  const timestamps=sheet.getRange(2,timeColumn,rowCount,1).getValues();
  const messages=sheet.getRange(2,messageColumn,rowCount,1).getDisplayValues();
  const authors=sheet.getRange(2,authorColumn,rowCount,1).getDisplayValues();
  const occurrences=Object.create(null);
  const items=[];
  for(let i=0;i<rowCount;i++) {
    const value=timestamps[i][0];
    const submittedAt=value instanceof Date&&!isNaN(value.getTime())?value.toISOString():String(value||'').trim();
    const stamp=submittedAt||'undated';
    occurrences[stamp]=(occurrences[stamp]||0)+1;
    const message=String(messages[i][0]||'').trim();
    if(!message)continue;
    items.push({id:stamp+'#'+occurrences[stamp],submittedAt,message,author:String(authors[i][0]||'').trim().replace(/^@+/,'')});
  }
  const result={ok:true,items};
  const encoded=JSON.stringify(result);
  // Apps Script cache has a per-key byte limit. Large boards still work uncached.
  if(Utilities.newBlob(encoded).getBytes().length<95000)cache.put(cacheKey,encoded,5);
  return result;
}
