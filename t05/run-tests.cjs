/* Browser acceptance runner for the ten criteria fixed before A implementation.
 * Runs real HTML, fonts, IndexedDB, canvas and PNG download, without editor mocks.
 * NODE_PATH may point to an existing Playwright install; otherwise npm ci first.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const spec = require('./fixed-tests.json');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.T05_OUTPUT || path.join(__dirname, 'evidence', 'latest'));
fs.mkdirSync(out, { recursive: true });
const rows = [], startedAt = new Date().toISOString();
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.otf':'font/otf','.woff':'font/woff'};
const server = http.createServer((req,res)=>{
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if(file !== root && !file.startsWith(root + path.sep)){res.writeHead(403).end();return;}
  if(file===root)file=path.join(root,'index.html');
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
async function values(p) {
  return p.evaluate(()=>Object.fromEntries(['text','color','x','y'].map(k=>[k,['x','y'].includes(k)?Number(document.getElementById(k).value):document.getElementById(k).value])));
}
async function canvas(p) {return p.locator('#canvas').evaluate(c=>c.toDataURL('image/png'));}
async function open(p) {if(!await p.locator('#historyDialog').evaluate(d=>d.open))await p.locator('#openHistory').click();}
async function close(p) {if(await p.locator('#historyDialog').evaluate(d=>d.open))await p.getByRole('button',{name:'편집 기록 닫기',exact:true}).click();}
async function entries(p) {await open(p);return p.locator('.history-entry').evaluateAll(bs=>bs.map(b=>({id:b.dataset.historyId,text:b.textContent,current:b.getAttribute('aria-current')==='step'})));}
async function choose(p,index) {await open(p);await p.locator('.history-entry').nth(index).click();}
async function edit(p,key,value) {
  await close(p);
  if(key==='x' && !await p.locator('.position-details').evaluate(d=>d.open))await p.locator('.position-details summary').click();
  await p.locator('#'+key).fill(String(value));
  await p.locator('#propertyTitle').click();
}
async function steps(p,count) {
  if(count>=1)await edit(p,'text',spec.S1.text);
  if(count>=2)await edit(p,'color',spec.S2.color);
  if(count>=3)await edit(p,'x',spec.S3.x);
}
async function snapshot(p) {return {values:await values(p),entries:await entries(p)};}
function currentAt(e,i) {assert.equal(e.filter(x=>x.current).length,1);assert.equal(e[i]?.current,true);}
const handlers = {
  async H01(p){const e=await entries(p);assert.equal(e.length,1);assert.match(e[0].text,/초기 상태/);currentAt(e,0);},
  async H02(p){await steps(p,1);const s=await snapshot(p);assert.equal(s.entries.length,2);assert.match(s.entries[1].text,/문구 변경/);currentAt(s.entries,1);assert.equal(s.values.text,spec.S1.text);},
  async H03(p){await steps(p,2);await choose(p,1);assert.deepEqual(await values(p),spec.S1);currentAt(await entries(p),1);},
  async H04(p){await steps(p,3);await choose(p,2);assert.deepEqual(await values(p),spec.S2);currentAt(await entries(p),2);},
  async H05(p){await steps(p,3);await choose(p,0);assert.deepEqual(await values(p),spec.initial);currentAt(await entries(p),0);},
  async H06(p){await steps(p,3);const before=await entries(p);await choose(p,1);const middle=await snapshot(p);await choose(p,3);const after=await snapshot(p);assert.deepEqual(middle.values,spec.S1);currentAt(middle.entries,1);assert.deepEqual(after.values,spec.S3);currentAt(after.entries,3);assert.deepEqual(after.entries.map(x=>x.id),before.map(x=>x.id));},
  async H07(p){await steps(p,3);const before=await snapshot(p),pixels=await canvas(p);await choose(p,3);assert.deepEqual(await snapshot(p),before);assert.equal(await canvas(p),pixels);},
  async H08(p){await steps(p,3);const old=await entries(p);await choose(p,1);await edit(p,'text','새로운 시작');const after=await snapshot(p);assert.deepEqual(after.values,{...spec.S1,text:'새로운 시작'});assert.equal(after.entries.length,3);assert.equal(after.entries.some(x=>[old[2].id,old[3].id].includes(x.id)),false);currentAt(after.entries,2);assert.equal(await p.locator('#redo').isDisabled(),true);},
  async H09(p){await steps(p,3);await p.locator('#undo').click();const undone=await snapshot(p);await close(p);await p.locator('#redo').click();const redone=await snapshot(p);assert.deepEqual(undone.values,spec.S2);currentAt(undone.entries,2);assert.deepEqual(redone.values,spec.S3);currentAt(redone.entries,3);},
  async H10(p){
    await steps(p,1);const reference=await canvas(p);
    await edit(p,'color',spec.S2.color);await edit(p,'x',spec.S3.x);await choose(p,1);await close(p);
    const restored=await values(p),preview=await canvas(p);
    const wait=p.waitForEvent('download');await p.locator('#download').click();const download=await wait;
    const filename=path.join(out,'H10-download.png');await download.saveAs(filename);
    const exported='data:image/png;base64,'+fs.readFileSync(filename).toString('base64');
    const decoded=await p.evaluate(async ({reference,preview,exported})=>{
      async function pixels(src){const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return {width:im.width,height:im.height,data:c.getContext('2d').getImageData(0,0,im.width,im.height).data};}
      const [a,b,c]=await Promise.all([reference,preview,exported].map(pixels));
      const same=(a,b)=>a.width===b.width&&a.height===b.height&&a.data.every((v,i)=>v===b.data[i]);
      return {width:c.width,height:c.height,matchesReference:same(a,c),matchesPreview:same(b,c)};
    },{reference,preview,exported});
    fs.writeFileSync(path.join(out,'H10-pixels.json'),JSON.stringify(decoded,null,2));
    assert.deepEqual(restored,spec.S1);assert.equal(decoded.width,1080);assert.equal(decoded.height,1350);assert.equal(decoded.matchesReference,true);assert.equal(decoded.matchesPreview,true);
  }
};
(async()=>{
  let browser,environmentError=null;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const test of spec.tests){
      const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
      const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(8000);
      let status='PASS',error=null,observed=null;
      try {
        await p.goto(`http://127.0.0.1:${server.address().port}/`);
        await p.waitForFunction(()=>document.getElementById('status').textContent.includes('취향대로 붙여보세요'));
        await p.evaluate(()=>document.fonts.ready);
        assert.deepEqual(await values(p),spec.initial);
      }catch(e){status='BLOCKED';error='Initial environment: '+e.message;}
      if(status!=='BLOCKED')try{await handlers[test.id](p);assert.deepEqual(errors,[]);}catch(e){status='FAIL';error=e.message;}
      try {observed={values:await values(p),entries:await entries(p),pageErrors:errors};await p.screenshot({path:path.join(out,test.id+'.png')});}catch{}
      rows.push({id:test.id,status,error,observed});console.log(test.id,status,error?.split('\n')[0]||'');
      await context.close();
    }
  }catch(e){environmentError=e.message;for(const t of spec.tests)if(!rows.some(r=>r.id===t.id))rows.push({id:t.id,status:'BLOCKED',error:e.message});}
  finally{
    if(browser)await browser.close();server.close();
    let commit='unknown',dirty=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();dirty=!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();}catch{}
    const sourceHashes=Object.fromEntries(['editor.js','history.js','index.html','style.css','engine.js','core.js','t05/fixed-tests.json','t05/run-tests.cjs'].map(f=>[f,sha256(fs.readFileSync(path.join(root,f)))]));
    const report={startedAt,finishedAt:new Date().toISOString(),commit,workingTreeDirty:dirty,environment:'Real Chromium via Playwright, fresh browser context per test',browserExecutable:process.env.CHROMIUM_EXECUTABLE?'explicit executable':'Playwright default',environmentError,sourceHashes,summary:{pass:rows.filter(r=>r.status==='PASS').length,fail:rows.filter(r=>r.status==='FAIL').length,blocked:rows.filter(r=>r.status==='BLOCKED').length,errorRounds:rows.some(r=>r.status==='FAIL')?1:0},tests:rows};
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
    process.exitCode=rows.every(r=>r.status==='PASS')?0:1;
  }
})();
