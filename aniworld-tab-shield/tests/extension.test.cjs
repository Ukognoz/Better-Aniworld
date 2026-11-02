const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const core = require('../src/skip-core.js');
test('URL matching rejects lookalike domains and invalid episodes', () => {
 assert.equal(core.parseUrl('https://aniworld.to.evil.test/anime/stream/a/staffel-1/episode-1'), null);
 assert.equal(core.parseUrl('https://aniworld.to/anime/stream/a/staffel-0/episode-1'), null);
 assert.equal(core.parseUrl('https://aniworld.to/anime/stream/a/staffel-2/episode-6?x=1').number,6);
});
test('skip boundaries preserve plot and unbounded openings', () => {
 assert.deepEqual(core.segments({baseDuration:100,timestamps:[{at:10,type:{name:'Intro'}},{at:30,type:{name:'Canon'}},{at:80,type:{name:'Credits'}}]},100),[{kind:'opening',start:10,end:30},{kind:'ending',start:80,end:100}]);
 assert.deepEqual(core.segments({baseDuration:100,timestamps:[{at:10,type:{name:'Intro'}}]},100),[]);
 assert.deepEqual(core.segments({baseDuration:100,timestamps:[{at:10,type:{name:'Mixed Intro'}}]},100),[]);
});
test('matching prefers episode title and respects seasons', () => {
 const ranked=core.rankEpisodes([{season:2,number:31,name:'Warrior'},{season:2,number:6,name:'Other'},{season:1,number:6,name:'Warrior'}],{season:2,number:6,episodeTitles:['Warrior']},'series',100);
 assert.equal(ranked[0].number,31); assert.equal(ranked.length,2);
});
test('all JavaScript parses', () => {
 for(const f of fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js'))) execFileSync(process.execPath,['--check',path.join(root,'src',f)]);
});
test('browser manifests reference real files and correct backgrounds', () => {
 const read = name => JSON.parse(fs.readFileSync(path.join(root,'manifests',name+'.json')));
 const c=read('chromium'), f=read('firefox');
 assert.equal(c.background.service_worker,'service-worker.js'); assert.equal(c.background.scripts,undefined); assert.equal(c.browser_specific_settings,undefined);
 assert.ok(f.background.scripts.includes('skip-service.js')); assert.equal(f.background.service_worker,undefined);
 assert.equal(c.version,f.version);
 for(const m of [c,f]) for(const script of [...m.content_scripts.flatMap(s=>s.js),...(m.background.scripts||[m.background.service_worker])]) assert.ok(fs.existsSync(path.join(root,'src',script)));
});
for (const namespace of ['chrome','browser']) test(namespace+' background startup and popup protection', async () => {
 let listener; const removed=[];
 const api={tabs:{onCreated:{addListener:fn=>listener=fn},get:async id=>({url:id===1?'https://aniworld.to/anime':'https://example.org'}),remove:async id=>removed.push(id)}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/background.js'),'utf8'),{[namespace]:api,URL});
 await listener({id:10,openerTabId:1}); await listener({id:11,openerTabId:2}); await listener({id:12});
 assert.deepEqual(removed,[10]);
});
test('Chromium service worker registers listeners synchronously', () => {
 let messages=0,updates=0,created=0;
 const ctx=vm.createContext({URL,AbortSignal,chrome:{runtime:{onMessage:{addListener:()=>messages++}},tabs:{onUpdated:{addListener:()=>updates++},onCreated:{addListener:()=>created++}}}});
 ctx.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,'src',f),'utf8'),ctx));
 vm.runInContext(fs.readFileSync(path.join(root,'src/service-worker.js'),'utf8'),ctx);
 assert.equal(messages,2);assert.equal(updates,1);assert.equal(created,1);
});
