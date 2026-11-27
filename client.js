const root=document.querySelector("#root");
const state={user:null,organizations:[],organizationId:"",elections:[]};
const names={"/":"Overview","/dashboard":"Overview","/elections":"Elections","/voters":"Voters","/candidates":"Candidates","/audit":"Audit log","/login":"Sign in"};
const $=s=>root.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const count=v=>Number(v||0).toLocaleString();
async function api(path,opts={}){const res=await fetch(path,{credentials:"same-origin",cache:"no-store",...opts,headers:{...(opts.body?{"Content-Type":"application/json"}:{}),...(opts.headers||{})}});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data.error||"Request failed.");return data}
function go(path){history.pushState({},"",path);void render()}
function toast(msg,bad=false){let host=document.querySelector("#toast-host");if(!host)return;host.innerHTML='<div class="toast '+(bad?"toast-error":"")+'">'+esc(msg)+'</div>';setTimeout(()=>{if(host)host.innerHTML=""},4000)}
function pageHead(kicker,title,subtitle,action=""){return '<div class="heading"><div><p class="eyebrow">'+esc(kicker)+'</p><h1>'+esc(title)+'</h1><p class="sub">'+esc(subtitle)+'</p></div>'+action+'</div>'}
function empty(title,desc){return '<div class="empty"><div class="empty-icon">◫</div><b>'+esc(title)+'</b><p>'+esc(desc)+'</p></div>'}
function note(msg,bad=false){return '<div class="notice '+(bad?"notice-error":"")+'">'+esc(msg)+'</div>'}
function shell(content,active){
 const org=state.organizations.find(x=>x.id===state.organizationId);
 return `<div class="app"><aside class="sidebar">
  <a class="brand" href="/dashboard" data-link><span class="brand-mark">V</span><span>VotaChain<small>ELECTION PLATFORM</small></span></a>
  <p class="eyebrow">WORKSPACE</p><label class="workspace-label">Organization
  <select id="organization-select" class="workspace-select">${state.organizations.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===state.organizationId?'selected':'')+'>'+esc(x.name)+'</option>').join("")}</select></label>
  <p class="eyebrow nav-label">MENU</p><nav>
  <a class="${active==="Overview"?"active":""}" href="/dashboard" data-link>▦ <span>Overview</span></a>
  <a class="${active==="Elections"?"active":""}" href="/elections" data-link>▤ <span>Elections</span></a>
  <a class="${active==="Voters"?"active":""}" href="/voters" data-link>♙ <span>Voters</span></a>
  <a class="${active==="Candidates"?"active":""}" href="/candidates" data-link>♧ <span>Candidates</span></a>
  <a class="${active==="Audit log"?"active":""}" href="/audit" data-link>◷ <span>Audit log</span></a></nav>
  <div class="sidebar-bottom"><div class="help"><b>Development environment</b><p>Do not use this build for a binding election.</p></div>
  <button id="sign-out" class="sign-out">Sign out · ${esc(state.user?.email||"")}</button></div>
 </aside><main class="main"><header class="topbar"><span>Workspace / <b>${esc(active)}</b></span><span class="preview">● Development preview</span></header>
 <section class="content">${content}<footer>VotaChain · Early development · Not approved for binding elections</footer></section></main><div id="toast-host" aria-live="polite"></div></div>`;
}
function bindShell(){
 root.querySelectorAll("[data-link]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();go(a.getAttribute("href"))}));
 const org=$("#organization-select");if(org)org.addEventListener("change",async e=>{state.organizationId=e.target.value;await render()});
 const out=$("#sign-out");if(out)out.addEventListener("click",async()=>{try{await api("/api/auth/session",{method:"DELETE"})}catch{}state.user=null;go("/login")});
}
async function loadOrgs(){const d=await api("/api/organizations");state.organizations=d.organizations||[];if(!state.organizations.some(x=>x.id===state.organizationId))state.organizationId=state.organizations[0]?.id||""}
async function loadElections(){if(!state.organizationId){state.elections=[];return}const d=await api("/api/elections?organizationId="+encodeURIComponent(state.organizationId));state.elections=d.elections||[]}
function login(){
 root.innerHTML=`<main class="login-page"><section class="login-card">
 <a class="brand login-brand" href="/"><span class="brand-mark">V</span><span>VotaChain<small>ELECTION PLATFORM</small></span></a>
 <p class="eyebrow">SECURE WORKSPACE ACCESS</p><h1 id="login-title">Welcome back</h1>
 <p class="sub" id="login-copy">Enter your email address and we will send you a one-time sign-in code.</p><div id="login-message"></div>
 <form id="login-form"><label class="field-label">Email address<input class="field" id="login-email" type="email" maxlength="254" autocomplete="email" placeholder="you@organization.com" required></label>
 <button class="primary full" id="login-submit">Email me a sign-in code</button></form>
 <p class="fine-print">Codes expire after 10 minutes. Never share your sign-in code.</p><p class="fine-print">Development preview · Not for binding elections</p></section></main>`;
 let sent=false,email="";
 $("#login-form").addEventListener("submit",async e=>{
  e.preventDefault();const button=$("#login-submit"),message=$("#login-message");button.disabled=true;message.innerHTML="";
  try{
   if(!sent){email=$("#login-email").value.trim().toLowerCase();await api("/api/auth/request-otp",{method:"POST",body:JSON.stringify({email})});sent=true;
    $("#login-title").textContent="Check your email";$("#login-copy").textContent="Enter the six-digit code sent to "+email;
    $("#login-form").innerHTML=`<label class="field-label">Six-digit code<input class="field" id="login-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required></label>
    <button class="primary full" id="login-submit">Verify and continue</button><button class="secondary full" id="change-email" type="button">Use a different email</button>`;
    $("#login-code").focus();$("#change-email").addEventListener("click",login);toast("Sign-in code requested. Check your inbox.");
   }else{const code=$("#login-code").value.trim();const d=await api("/api/auth/verify-otp",{method:"POST",body:JSON.stringify({email,code})});state.user=d.user;go("/dashboard");}
  }catch(err){message.innerHTML=note(err.message,true)}
  finally{const current=$("#login-submit");if(current){current.disabled=false;current.textContent=sent?"Verify and continue":"Email me a sign-in code"}}
 });
}
function selection(elections){return '<section class="panel selection-panel"><label class="field-label">Election<select class="field" id="election-select">'+elections.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+' · '+esc(x.status)+'</option>').join("")+'</select></label></section>'}
async function dashboard(){
 await loadOrgs();await loadElections();
 const rows=state.elections.map(e=>'<tr><td><b>'+esc(e.title)+'</b><small>'+esc(e.description||"No description")+'</small></td><td><span class="status status-'+esc(e.status)+'">'+esc(e.status)+'</span></td><td>'+count(e._count?.voters)+'</td><td>'+count(e._count?.candidates)+'</td><td>'+count(e._count?.ballots)+'</td><td><select class="small-select election-status" data-id="'+esc(e.id)+'"><option value="">Change status…</option>'+["draft","scheduled","open","closed"].filter(s=>s!==e.status).map(s=>'<option value="'+s+'">'+s+'</option>').join("")+'</select></td></tr>').join("");
 let content=pageHead("ORGANIZATION WORKSPACE",state.organizations.find(x=>x.id===state.organizationId)?.name||"Your workspace","Manage elections, eligible voters and candidates.",'<button class="primary" id="new-election" '+(!state.organizationId?"disabled":"")+'>＋ New election</button>');
 if(!state.organizations.length){content+='<section class="panel"><h2>Create your organization</h2><p class="sub">An organization owns its elections, voter lists and admin activity.</p><form id="create-org-form" class="inline-form"><input class="field" name="name" minlength="2" maxlength="80" placeholder="Organization name" required><button class="primary">Create organization</button></form></section>'}
 else{
  content+='<div class="metrics"><article><span>Organizations</span><strong>'+count(state.organizations.length)+'</strong><small>Workspaces you belong to</small></article><article><span>Elections</span><strong>'+count(state.elections.length)+'</strong><small>In this organization</small></article><article><span>Eligible voters</span><strong>'+count(state.elections.reduce((a,e)=>a+Number(e._count?.voters||0),0))+'</strong><small>Across its elections</small></article><article><span>Open elections</span><strong>'+count(state.elections.filter(e=>e.status==="open").length)+'</strong><small>Marked open</small></article></div>';
  content+='<section class="panel"><div class="panel-head"><div><h2>Election register</h2><p>Election status and participation counts.</p></div><span class="tag">LIVE DATA</span></div>'+(rows?'<div class="table-wrap"><table><thead><tr><th>ELECTION</th><th>STATUS</th><th>VOTERS</th><th>CANDIDATES</th><th>BALLOTS</th><th>UPDATE</th></tr></thead><tbody>'+rows+'</tbody></table></div>':empty("No elections yet","Create your first election to configure its candidates and voters."))+'</section>';
 }
 content+='<section class="panel"><div class="panel-head"><div><h2>System status</h2><p>Administrative endpoints are served by the Cloudflare Worker.</p></div><span class="tag">CONNECTED</span></div><p class="sub">Ballot casting and cryptographic verification are not implemented.</p></section>';
 root.innerHTML=shell(content,location.pathname==="/elections"?"Elections":"Overview");bindShell();
 const orgForm=$("#create-org-form");if(orgForm)orgForm.addEventListener("submit",async e=>{e.preventDefault();try{await api("/api/organizations",{method:"POST",body:JSON.stringify({name:new FormData(orgForm).get("name")})});toast("Organization created.");await render()}catch(err){toast(err.message,true)}});
 const create=$("#new-election");if(create)create.addEventListener("click",showElectionForm);
 root.querySelectorAll(".election-status").forEach(s=>s.addEventListener("change",async()=>{if(!s.value)return;try{await api("/api/elections",{method:"PATCH",body:JSON.stringify({electionId:s.dataset.id,status:s.value})});toast("Election status updated.");await render()}catch(err){toast(err.message,true);s.value=""}}));
}
function showElectionForm(){
 const panel=document.createElement("section");panel.className="panel form-panel";
 panel.innerHTML=`<div class="panel-head"><div><h2>Create election</h2><p>New elections begin in draft status.</p></div><button id="close-election" class="icon-button" type="button">×</button></div>
 <form id="election-form" class="form-grid"><label class="field-label span-two">Election title<input class="field" name="title" minlength="3" maxlength="160" required></label>
 <label class="field-label span-two">Description<textarea class="field" name="description" maxlength="4000" rows="3"></textarea></label>
 <label class="field-label">Start date<input class="field" type="datetime-local" name="startsAt"></label><label class="field-label">End date<input class="field" type="datetime-local" name="endsAt"></label>
 <div class="form-actions span-two"><button class="primary">Save draft</button><button class="secondary" id="cancel-election" type="button">Cancel</button></div></form>`;
 document.querySelector(".content").prepend(panel);const close=()=>panel.remove();$("#close-election").addEventListener("click",close);$("#cancel-election").addEventListener("click",close);
 $("#election-form").addEventListener("submit",async e=>{e.preventDefault();const d=new FormData(e.currentTarget),date=v=>v?new Date(v).toISOString():null;try{await api("/api/elections",{method:"POST",body:JSON.stringify({organizationId:state.organizationId,title:d.get("title"),description:d.get("description")||null,startsAt:date(d.get("startsAt")),endsAt:date(d.get("endsAt"))})});toast("Election draft created.");await render()}catch(err){toast(err.message,true)}});
}
async function voters(){
 await loadOrgs();await loadElections();
 let content=pageHead("ELECTION ADMINISTRATION","Voter register","Manage eligible voter email addresses for each election.");
 content+=state.elections.length?selection(state.elections)+`<section class="panel"><div class="panel-head"><div><h2>Add a voter</h2><p>One email address per voter.</p></div></div><form id="add-voter" class="inline-form"><input class="field" type="email" name="email" maxlength="254" placeholder="voter@example.com" required><button class="primary">Add voter</button></form></section>
 <section class="panel"><div class="panel-head"><div><h2>Bulk import</h2><p>Paste emails or CSV rows. The first column is used, up to 500 rows per batch.</p></div></div><form id="bulk-voters"><textarea class="field textarea" name="emails" rows="5" placeholder="voter@example.com&#10;another@example.com" required></textarea><button class="primary">Import voter list</button></form></section>
 <section class="panel"><div class="panel-head"><div><h2>Registered voters</h2><p id="voter-count">Loading…</p></div></div><div id="voter-list"></div></section>`:empty("No elections available","Create an election before adding voters.");
 root.innerHTML=shell(content,"Voters");bindShell();if(!state.elections.length)return;
 const load=async id=>{const target=$("#voter-list");try{const d=await api("/api/voters?electionId="+encodeURIComponent(id));$("#voter-count").textContent=d.voters.length+" registered";target.innerHTML=d.voters.length?'<div class="table-wrap"><table><thead><tr><th>EMAIL ADDRESS</th><th>ACTION</th></tr></thead><tbody>'+d.voters.map(v=>'<tr><td>'+esc(v.email)+'</td><td><button class="danger remove-voter" data-id="'+esc(v.id)+'">Remove</button></td></tr>').join("")+'</tbody></table></div>':empty("No voters registered","Add one voter or paste a CSV list above.");target.querySelectorAll(".remove-voter").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Remove this voter?"))return;try{await api("/api/voters",{method:"DELETE",body:JSON.stringify({voterId:b.dataset.id})});toast("Voter removed.");await load(id)}catch(err){toast(err.message,true)}}))}catch(err){target.innerHTML=note(err.message,true)}};
 await load($("#election-select").value);$("#election-select").addEventListener("change",e=>load(e.target.value));
 $("#add-voter").addEventListener("submit",async e=>{e.preventDefault();try{await api("/api/voters",{method:"POST",body:JSON.stringify({electionId:$("#election-select").value,email:new FormData(e.currentTarget).get("email")})});e.currentTarget.reset();toast("Voter added.");await load($("#election-select").value)}catch(err){toast(err.message,true)}});
 $("#bulk-voters").addEventListener("submit",async e=>{e.preventDefault();const raw=String(new FormData(e.currentTarget).get("emails"));const emails=raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(s=>s.split(/[;,\t]/)[0].trim().replace(/^"|"$/g,""));if(!emails.length||emails.length>500){toast("Provide between 1 and 500 rows.",true);return}try{const d=await api("/api/voters/import",{method:"POST",body:JSON.stringify({electionId:$("#election-select").value,emails})});toast(d.added+" added, "+d.duplicates+" duplicates, "+d.invalid+" invalid.");e.currentTarget.reset();await load($("#election-select").value)}catch(err){toast(err.message,true)}});
}
async function candidates(){
 await loadOrgs();await loadElections();
 let content=pageHead("ELECTION ADMINISTRATION","Candidate management","Maintain the candidate list for each election.");
 content+=state.elections.length?selection(state.elections)+`<section class="panel"><div class="panel-head"><div><h2>Add candidate</h2><p>Candidate records can only be changed before an election opens.</p></div></div><form id="add-candidate" class="form-grid"><label class="field-label">Candidate name<input class="field" name="name" minlength="2" maxlength="120" required></label><label class="field-label span-two">Manifesto / details<textarea class="field" name="details" maxlength="2000" rows="3"></textarea></label><div class="span-two"><button class="primary">Add candidate</button></div></form></section><section class="panel"><div class="panel-head"><div><h2>Candidate list</h2><p id="candidate-count">Loading…</p></div></div><div id="candidate-list"></div></section>`:empty("No elections available","Create an election before adding candidates.");
 root.innerHTML=shell(content,"Candidates");bindShell();if(!state.elections.length)return;
 const load=async id=>{const target=$("#candidate-list");try{const d=await api("/api/candidates?electionId="+encodeURIComponent(id));$("#candidate-count").textContent=d.candidates.length+" candidates";const locked=["open","closed"].includes(d.election.status);target.innerHTML=(locked?note("Candidate records are locked because this election has opened or closed."):"")+(d.candidates.length?'<div class="table-wrap"><table><thead><tr><th>CANDIDATE</th><th>DETAILS</th><th>ACTION</th></tr></thead><tbody>'+d.candidates.map(c=>'<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.details||"—")+'</td><td>'+(locked?"Locked":'<button class="danger remove-candidate" data-id="'+esc(c.id)+'">Remove</button>')+'</td></tr>').join("")+'</tbody></table></div>':empty("No candidates added","Add candidates using the form above."));$("#add-candidate button").disabled=locked;target.querySelectorAll(".remove-candidate").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Remove this candidate?"))return;try{await api("/api/candidates",{method:"DELETE",body:JSON.stringify({candidateId:b.dataset.id})});toast("Candidate removed.");await load(id)}catch(err){toast(err.message,true)}}))}catch(err){target.innerHTML=note(err.message,true)}};
 await load($("#election-select").value);$("#election-select").addEventListener("change",e=>load(e.target.value));
 $("#add-candidate").addEventListener("submit",async e=>{e.preventDefault();const d=new FormData(e.currentTarget);try{await api("/api/candidates",{method:"POST",body:JSON.stringify({electionId:$("#election-select").value,name:d.get("name"),details:d.get("details")||null})});e.currentTarget.reset();toast("Candidate added.");await load($("#election-select").value)}catch(err){toast(err.message,true)}});
}
async function audit(){
 await loadOrgs();let d={events:[]};if(state.organizationId)d=await api("/api/audit?organizationId="+encodeURIComponent(state.organizationId));
 const rows=d.events.map(x=>'<tr><td><b>'+esc(x.action)+'</b></td><td>'+esc(JSON.stringify(x.details||{}))+'</td><td>'+esc(new Date(x.createdAt).toLocaleString())+'</td></tr>').join("");
 const content=pageHead("ORGANIZATION WORKSPACE","Audit log","Recent administrative actions for this organization.")+'<section class="panel">'+(rows?'<div class="table-wrap"><table><thead><tr><th>ACTION</th><th>DETAILS</th><th>DATE</th></tr></thead><tbody>'+rows+'</tbody></table></div>':empty("No audit events yet","Organization administration events will appear here."))+'</section>';
 root.innerHTML=shell(content,"Audit log");bindShell();
}
async function render(){
 const path=location.pathname.replace(/\/+$/,"")||"/";document.title=(names[path]||"Not found")+" · VotaChain";
 if(path==="/login"){login();return}
 try{
  const s=await api("/api/auth/session");if(!s.user){history.replaceState({},"","/login");login();return}state.user=s.user;
  if(["/","/dashboard","/elections"].includes(path))await dashboard();
  else if(path==="/voters")await voters();
  else if(path==="/candidates")await candidates();
  else if(path==="/audit")await audit();
  else{root.innerHTML=shell(pageHead("NOT FOUND","Page not found","The requested page does not exist.")+'<section class="panel">'+empty("Unknown route","Use the workspace menu to navigate.")+'</section>',"");bindShell()}
 }catch(err){root.innerHTML='<main class="login-page"><section class="login-card"><h1>Unable to load workspace</h1>'+note(err.message,true)+'<button class="primary full" id="retry">Try again</button><p class="fine-print">Check Worker logs and the database binding if this continues.</p></section></main>';$("#retry").addEventListener("click",render)}
}
window.addEventListener("popstate",render);void render();
