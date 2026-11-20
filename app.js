(() => {
'use strict';
const $ = id => document.getElementById(id);
const storageKey = 'nodewright-v1';
const I18N = window.NW_I18N;
let lang = 'en';
try { const s = localStorage.getItem(storageKey+'-lang'); if (I18N.LANGS.includes(s)) lang = s; else if ((navigator.language||'').toLowerCase().startsWith('tr')) lang = 'tr'; } catch (_) { /* Storage is optional. */ }
const t = (key, p) => { let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key; if (p) for (const k of Object.keys(p)) s = s.split('{'+k+'}').join(p[k]); return s; };
const types = {fact:1, decision:1, task:1, risk:1};
const statuses = {todo:1, doing:1, done:1};
function applyI18n() {
 document.documentElement.lang = lang;
 document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
 document.querySelectorAll('[data-i18n-attr]').forEach(el => { for (const pair of el.dataset.i18nAttr.split(';')) { const [attr, key] = pair.split(':'); el.setAttribute(attr, t(key)); } });
 $('lang').textContent = I18N[lang === 'en' ? 'tr' : 'en'].langName;
}
let graph = {nodes:[], edges:[]}, selected = null, selectedEdge = null, connecting = false, source = null;
let pan = {x:0,y:0}, zoom = 1, drag = null, toastTimer;
const canvas = $('canvas'), svg = $('svg'), nodesLayer = $('nodes'), edgesLayer = $('edges');
function notify(text) { $('toast').textContent=text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000); }
function save() { try { localStorage.setItem(storageKey,JSON.stringify(graph)); } catch (_) { /* Storage is optional. */ } }
function validate(data) {
 const errors=[];
 if (!data || typeof data !== 'object' || Array.isArray(data)) return [t('errNotObject')];
 if (!Array.isArray(data.nodes)) errors.push(t('errNodesArray'));
 if (!Array.isArray(data.edges)) errors.push(t('errEdgesArray'));
 if (errors.length) return errors;
 const ids=new Set();
 data.nodes.forEach((n,i)=>{ const name=t('errNodeName',{i:i+1}); if (!n || typeof n !== 'object' || Array.isArray(n)) {errors.push(t('errNodeObject',{name})); return;} if(typeof n.id !== 'string' || !n.id.trim()) errors.push(t('errId',{name})); else if(ids.has(n.id)) errors.push(t('errIdDup',{name,id:n.id})); else ids.add(n.id); if(typeof n.label !== 'string') errors.push(t('errLabel',{name})); if(!Object.hasOwn(types,n.type)) errors.push(t('errType',{name,type:n.type})); if(n.status !== undefined && !Object.hasOwn(statuses,n.status)) errors.push(t('errStatus',{name})); for(const k of ['x','y']) if(n[k] !== undefined && (typeof n[k] !== 'number' || !Number.isFinite(n[k]))) errors.push(t('errXY',{name,k})); });
 data.edges.forEach((e,i)=>{if(!e || typeof e !== 'object' || Array.isArray(e)) {errors.push(t('errEdgeObject',{i:i+1})); return;} if(!ids.has(e.from)) errors.push(t('errEdgeFrom',{i:i+1,id:e.from})); if(!ids.has(e.to)) errors.push(t('errEdgeTo',{i:i+1,id:e.to}));}); return errors;
}
function extract(text) {
 const candidates=[text.trim()];
 for(const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) candidates.push(match[1].trim());
 // Scan balanced objects while respecting JSON strings and escaped quotes.
 for(let start=0;start<text.length;start++) if(text[start]==='{') { let depth=0, inString=false, escape=false; for(let i=start;i<text.length;i++){const c=text[i]; if(inString){if(escape) escape=false; else if(c==='\\') escape=true; else if(c==='"') inString=false;} else if(c==='"') inString=true; else if(c==='{') depth++; else if(c==='}' && --depth===0){candidates.push(text.slice(start,i+1)); start=i; break;}} }
 let parsed; for(const c of candidates){try {const value=JSON.parse(c); if(value && typeof value==='object' && ('nodes' in value || 'edges' in value)) return value; if(parsed===undefined) parsed=value;} catch (_) {}} if(parsed!==undefined) return parsed; throw new Error(t('errNoJson'));
}
function load(data){graph=data; graph.nodes.forEach((n,i)=>{if(n.x===undefined)n.x=80+(i%3)*280;if(n.y===undefined)n.y=70+Math.floor(i/3)*150;}); selected=null;selectedEdge=null;connecting=false;source=null;pan={x:0,y:0};zoom=1;save();render();fitView();}
function doImport(text){try {const data=extract(text), errors=validate(data); if(errors.length){$('errors').textContent=errors.map(e=>'• '+e).join('\n');return;} load(data);$('importDialog').close();$('errors').textContent='';notify(t('toastImported'));}catch(e){$('errors').textContent=e.message;}}
function chain(id, reverse){const seen=new Set([id]), queue=[id]; while(queue.length){const current=queue.shift(); for(const e of graph.edges){const from=reverse?e.to:e.from, to=reverse?e.from:e.to;if(from===current&&!seen.has(to)){seen.add(to);queue.push(to);}}}return seen;}
function render(){
 $('counts').textContent=t('nodeCount',{n:graph.nodes.length,e:graph.edges.length}); $('empty').hidden=graph.nodes.length>0; $('zoomLabel').textContent=Math.round(zoom*100)+'%'; $('connect').classList.toggle('active',connecting);
 const query=$('search').value.trim().toLocaleLowerCase(lang), filter=$('filter').value;
 const related=selected?new Set([...chain(selected,true),...chain(selected,false)]):null;
 const visible=new Set(graph.nodes.filter(n=>(!filter||n.type===filter)&&(!query||[n.id,n.label,n.notes,n.note].some(v=>String(v||'').toLocaleLowerCase(lang).includes(query)))).map(n=>n.id));
 nodesLayer.replaceChildren();
 for(const n of graph.nodes){if(!visible.has(n.id))continue; const el=document.createElement('div');el.className='node'+(selected===n.id?' selected':'')+(related&&!related.has(n.id)?' dim':'');el.style.setProperty('--node-color',`var(--${n.type})`);el.style.left=(pan.x+n.x*zoom)+'px';el.style.top=(pan.y+n.y*zoom)+'px';el.style.transform=`scale(${zoom})`;el.style.transformOrigin='top left';el.dataset.id=n.id;el.tabIndex=0;
 const top=document.createElement('div');top.className='node-top';const type=document.createElement('span');type.className='node-type';type.textContent=t('type.'+n.type);const id=document.createElement('span');id.textContent=n.id;top.append(type,id);const title=document.createElement('div');title.className='node-title';title.textContent=n.label;const meta=document.createElement('div');meta.className='node-meta';const deps=graph.edges.filter(e=>e.to===n.id);const ready=deps.length>0&&deps.every(e=>graph.nodes.find(x=>x.id===e.from)?.status==='done');meta.textContent=Object.hasOwn(statuses,n.status)?t('status.'+n.status):t('statusNone');if(ready&&n.status!=='done'){const badge=document.createElement('span');badge.className='ready';badge.textContent=t('readyBadge');meta.append(badge);}el.append(top,title,meta);nodesLayer.append(el); }
 edgesLayer.replaceChildren(); graph.edges.forEach((e,i)=>{if(!visible.has(e.from)||!visible.has(e.to))return;const a=graph.nodes.find(n=>n.id===e.from),b=graph.nodes.find(n=>n.id===e.to);if(!a||!b)return;const x1=pan.x+(a.x+220)*zoom,y1=pan.y+(a.y+52)*zoom,x2=pan.x+b.x*zoom,y2=pan.y+(b.y+52)*zoom,dx=Math.max(45*zoom,Math.abs(x2-x1)*.45);const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`);path.setAttribute('class','edge'+(selectedEdge===i?' selected':'')+(related&&related.has(e.from)&&related.has(e.to)?' related':related?' dim':''));path.addEventListener('pointerdown',ev=>{ev.stopPropagation();selected=null;selectedEdge=i;render();});edgesLayer.append(path);});
 const n=graph.nodes.find(x=>x.id===selected);$('inspector').classList.toggle('has-selection',!!n||selectedEdge!==null);$('noSelection').hidden=!!n||selectedEdge!==null;$('editor').hidden=!n;$('edgeEditor').hidden=selectedEdge===null;if(n){$('nodeId').textContent=n.id; for(const key of ['label','type','status','budget','riskLevel']) $(key).value=n[key]??''; $('notes').value=n.notes??n.note??'';}if(selectedEdge!==null){const e=graph.edges[selectedEdge];$('edgeName').textContent=e.from+' → '+e.to;}
 $('message').textContent=connecting?(source?t('msgPickTarget'):t('msgPickSource')):t('msgDefault');
}
function choose(id){if(connecting){if(!source){source=id;render();return;}if(source===id){notify(t('toastSameNode'));return;}if(graph.edges.some(e=>e.from===source&&e.to===id))notify(t('toastEdgeExists'));else{graph.edges.push({from:source,to:id});save();}connecting=false;source=null;}selected=id;selectedEdge=null;render();}
function removeNode(){if(!selected)return;graph.nodes=graph.nodes.filter(n=>n.id!==selected);graph.edges=graph.edges.filter(e=>e.from!==selected&&e.to!==selected);selected=null;save();render();}
function removeEdge(){if(selectedEdge===null)return;graph.edges.splice(selectedEdge,1);selectedEdge=null;save();render();}
function layout(){const indegree=new Map(graph.nodes.map(n=>[n.id,0])), levels=new Map(graph.nodes.map(n=>[n.id,0]));for(const e of graph.edges)indegree.set(e.to,indegree.get(e.to)+1);const queue=graph.nodes.filter(n=>indegree.get(n.id)===0).map(n=>n.id);let visited=0;while(queue.length){const id=queue.shift();visited++;for(const e of graph.edges.filter(x=>x.from===id)){levels.set(e.to,Math.max(levels.get(e.to),levels.get(id)+1));indegree.set(e.to,indegree.get(e.to)-1);if(indegree.get(e.to)===0)queue.push(e.to);}}const cyclic=visited<graph.nodes.length;const max=Math.max(0,...levels.values());if(cyclic) for(const n of graph.nodes)if(indegree.get(n.id)>0)levels.set(n.id,max+1);const rows=new Map();for(const n of graph.nodes){const level=levels.get(n.id),row=rows.get(level)||0;n.x=70+level*300;n.y=70+row*145;rows.set(level,row+1);}pan={x:0,y:0};zoom=1;save();render();fitView();notify(cyclic?t('toastCycle'):t('toastLaidOut'));}
async function copyText(text){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();if(!ok)throw Error();}notify(t('toastCopied'));}catch(_){notify(t('toastCopyFail'));}}
$('prompt').onclick=()=>copyText(t('prompt').split('{graph}').join(graph.nodes.length?t('promptGraph',{json:JSON.stringify(graph,null,2)}):t('promptEmpty')));
$('copy').onclick=()=>copyText(JSON.stringify(graph,null,2));$('download').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(graph,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='nodewright-graph.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('importOpen').onclick=$('emptyImport').onclick=()=>{$('errors').textContent='';$('importDialog').showModal();};$('closeDialog').onclick=$('cancel').onclick=()=>$('importDialog').close();$('import').onclick=()=>doImport($('importText').value);$('file').onchange=async e=>{const file=e.target.files[0];if(file){try{$('importText').value=await file.text();doImport($('importText').value);}catch(_){$('errors').textContent=t('fileReadFail');}e.target.value='';}};
$('add').onclick=()=>{let i=1;while(graph.nodes.some(n=>n.id==='N'+i))i++;const n={id:'N'+i,label:t('newNode'),type:'task',x:(80-pan.x)/zoom,y:(80-pan.y)/zoom};graph.nodes.push(n);selected=n.id;selectedEdge=null;save();render();};$('sample').onclick=()=>{if(graph.nodes.length&&!confirm(t('confirmSample')))return;load({nodes:[{id:'F1',label:t('sampleF1'),type:'fact',x:100,y:100},{id:'D1',label:t('sampleD1'),type:'decision',x:380,y:100},{id:'T1',label:t('sampleT1'),type:'task',x:660,y:100},{id:'R1',label:t('sampleR1'),type:'risk',x:660,y:260}],edges:[{from:'F1',to:'D1'},{from:'D1',to:'T1'},{from:'D1',to:'R1'}]});};$('clear').onclick=()=>{if(confirm(t('confirmClear')))load({nodes:[],edges:[]});};$('connect').onclick=()=>{connecting=!connecting;source=null;render();};$('layout').onclick=layout;$('deleteNode').onclick=removeNode;$('deleteEdge').onclick=removeEdge;$('closeInspector').onclick=()=>{selected=null;selectedEdge=null;render();};
for(const key of ['label','type','status','notes','budget','riskLevel']) $(key).addEventListener(key==='label'||key==='notes'||key==='budget'?'input':'change',()=>{const n=graph.nodes.find(x=>x.id===selected);if(!n)return;let value=$(key).value;if(key==='notes' && Object.hasOwn(n,'note')&&!Object.hasOwn(n,'notes')){n.note=value;}else if((key==='status'||key==='budget'||key==='riskLevel')&&!value)delete n[key];else n[key]=key==='budget'?Number(value):value;save();render();});
$('search').oninput=$('filter').onchange=render;
function fitView(){
 if(!graph.nodes.length)return;
 const elements=[...nodesLayer.querySelectorAll('.node')];
 // Include filtered nodes too, using their rendered dimensions when available.
 const dimensions=new Map(elements.map(el=>[el.dataset.id,{width:el.offsetWidth,height:el.offsetHeight}]));
 const bounds=graph.nodes.reduce((b,n)=>{const size=dimensions.get(n.id)||{width:220,height:105};return {left:Math.min(b.left,n.x),top:Math.min(b.top,n.y),right:Math.max(b.right,n.x+size.width),bottom:Math.max(b.bottom,n.y+size.height)};},{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
 const width=canvas.clientWidth,height=canvas.clientHeight,padding=24;
 if(!width||!height)return;
 zoom=Math.max(.1,Math.min(2,(width-padding*2)/(bounds.right-bounds.left),(height-padding*2)/(bounds.bottom-bounds.top)));
 pan={x:(width-(bounds.right-bounds.left)*zoom)/2-bounds.left*zoom,y:(height-(bounds.bottom-bounds.top)*zoom)/2-bounds.top*zoom};render();
}
$('fit').onclick=fitView;
document.querySelector('.more').addEventListener('click',e=>{if(e.target.closest('button'))e.currentTarget.open=false;});
function setZoom(value){zoom=Math.max(.1,Math.min(2,value));render();}$('zoomIn').onclick=()=>setZoom(zoom+.15);$('zoomOut').onclick=()=>setZoom(zoom-.15);$('reset').onclick=()=>{pan={x:0,y:0};zoom=1;render();};
canvas.addEventListener('wheel',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,old=zoom;zoom=Math.max(.1,Math.min(2,zoom*(e.deltaY<0?1.1:1/1.1)));pan.x=x-(x-pan.x)*zoom/old;pan.y=y-(y-pan.y)*zoom/old;render();},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const node=e.target.closest('.node');if(node){const id=node.dataset.id;choose(id);if(connecting||source)return;const n=graph.nodes.find(x=>x.id===id);drag={kind:'node',id,x:e.clientX,y:e.clientY,ox:n.x,oy:n.y};}else if(e.target===canvas||e.target===nodesLayer||e.target===svg){selected=null;selectedEdge=null;render();drag={kind:'pan',x:e.clientX,y:e.clientY,ox:pan.x,oy:pan.y};}if(drag){canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');}});
canvas.addEventListener('pointermove',e=>{if(!drag)return;if(drag.kind==='node'){const n=graph.nodes.find(x=>x.id===drag.id);if(n){n.x=drag.ox+(e.clientX-drag.x)/zoom;n.y=drag.oy+(e.clientY-drag.y)/zoom;}}else{pan.x=drag.ox+e.clientX-drag.x;pan.y=drag.oy+e.clientY-drag.y;}render();});canvas.addEventListener('pointerup',()=>{if(drag?.kind==='node')save();drag=null;canvas.classList.remove('dragging');});canvas.addEventListener('pointercancel',()=>{if(drag?.kind==='node')save();drag=null;canvas.classList.remove('dragging');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('importDialog').open)return;selected=null;selectedEdge=null;connecting=false;source=null;render();}if(e.key==='Delete'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)&&!$('importDialog').open){if(selected)removeNode();else removeEdge();}});
$('lang').onclick=()=>{lang=lang==='en'?'tr':'en';try{localStorage.setItem(storageKey+'-lang',lang);}catch(_){}applyI18n();render();};
$('theme').onclick=()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'light':'dark';try{localStorage.setItem(storageKey+'-theme',document.documentElement.dataset.theme);}catch(_){}};
try{const theme=localStorage.getItem(storageKey+'-theme');if(theme==='light'||theme==='dark')document.documentElement.dataset.theme=theme;const saved=localStorage.getItem(storageKey);if(saved){const data=JSON.parse(saved);if(!validate(data).length){graph=data;graph.nodes.forEach((n,i)=>{if(n.x===undefined)n.x=80+(i%3)*280;if(n.y===undefined)n.y=70+Math.floor(i/3)*150;});}}}catch(_){} applyI18n();render();if(graph.nodes.length)requestAnimationFrame(fitView);
})();

