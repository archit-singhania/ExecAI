"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { getStoredUser } from "@/lib/auth";
import { studioRequest } from "@/lib/studio";

type Plan = { baseline_id: string; hypothesis: string; criteria: string[]; starts_on: string; ends_on: string; stop_conditions: string };
type Experiment = { id: string; title: string; version: number; data: { status: string; owner_id: string; decision: {id:string}; plan: Plan; plan_revision: number; history: { revision: number; plan: Plan; at: string }[]; checkpoints: { criterion: number; plan_revision: number; observation: string; source: string; assessment: string; measured_on: string }[]; review_id: string | null } };
type Baseline = { id: string; data: { decision_id: string; decision_title: string; evidence: {id:string;kind?:string;title:string;version:number;data:unknown}[] } };
const empty: Plan = { baseline_id: "", hypothesis: "", criteria: [""], starts_on: "", ends_on: "", stop_conditions: "" };

export function StrategyExperiments({ id, writable }: { id: string; writable: boolean }) {
  const path = `/api/studio/${id}/experiments`;
  const [rows, setRows] = useState<Experiment[]>([]), [baselines, setBaselines] = useState<Baseline[]>([]);
  const [plan, setPlan] = useState<Plan>(empty), [active, setActive] = useState<Experiment | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [observation, setObservation] = useState(""), [source, setSource] = useState(""), [measured, setMeasured] = useState(""), [criterion, setCriterion] = useState(0), [assessment, setAssessment] = useState("unknown"), [actions, setActions] = useState("");
  const [members,setMembers]=useState<{id:string;name:string;role:string}[]>([]);
  const [assignee,setAssignee]=useState("");
  useEffect(()=>{studioRequest<{id:string;name:string;role:string}[]>(`/api/studio/${id}/members`).then(setMembers).catch(()=>setMembers([]));},[id]);
  const [kpi, setKpi] = useState("");
  const [ready, setReady] = useState(false);
  const draftKey = `ceoai-experiment:${getStoredUser()?.id ?? "anonymous"}:${id}`;
  useEffect(() => { let live = true; Promise.all([studioRequest<Experiment[]>(path), studioRequest<{baselines:Baseline[]}>(`/api/studio/${id}/freshness`)]).then(([r,b]) => { if(live){setRows(r);setBaselines(b.baselines);
    try { const raw=sessionStorage.getItem(draftKey); if(raw){const d=JSON.parse(raw); if(d.plan && Array.isArray(d.plan.criteria)){setPlan(d.plan);setActive(d.active);setObservation(d.observation||"");setSource(d.source||"");setMeasured(d.measured||"");setCriterion(d.criterion||0);setAssessment(d.assessment||"unknown");setActions(d.actions||"");setKpi(d.kpi||"");}} } catch {setError("Draft recovery unavailable.");} setReady(true);} }).catch(e=>{if(live)setError(e.message);}); return ()=>{live=false;}; }, [path,id,draftKey]);
  useLayoutEffect(()=>{if(!ready)return;try{sessionStorage.setItem(draftKey,JSON.stringify({plan,active,observation,source,measured,criterion,assessment,actions,kpi}));}catch{ /* Storage may be disabled; saved server records remain available. */ }},[ready,draftKey,plan,active,observation,source,measured,criterion,assessment,actions,kpi]);
  async function run(work: () => Promise<void>) { setBusy(true);setError("");try{await work();}catch(e){setError(e instanceof Error?e.message:"Request failed.");}finally{setBusy(false);} }
  async function accept(row: Experiment) { setActive(row);setPlan(row.data.plan);setRows(await studioRequest<Experiment[]>(path)); }
  async function event(action: string) { if(!active)return;await run(async()=>accept(await studioRequest<Experiment>(`${path}/${active.id}/events`,"POST",{version:active.version,action,criterion,observation,source,kpi_baseline_id:kpi.split("|")[0]||null,kpi_id:kpi.split("|")[1]||null,measured_on:measured||null,assessment,actions:actions.split("\n").filter(Boolean)}))); }
  const closed = active && ["completed","stopped"].includes(active.data.status);
  return <section className="st-card advanced-studio" aria-labelledby="experiment-heading">
    <h2 id="experiment-heading">Strategy experiments</h2><p>Record hypotheses and evidence. Checkpoint assessments are human judgments; before/after changes do not establish causation.</p>
    {error && <p role="alert">{error}</p>}<p role="status">{busy?"Saving…":`${rows.length} saved experiments`}</p>
    <label>Saved experiment<select disabled={busy} value={active?.id||""} onChange={e=>{const row=rows.find(r=>r.id===e.target.value)||null;setActive(row);setPlan(row?.data.plan||empty);setCriterion(0);setObservation("");setSource("");setMeasured("");setActions("");setKpi("");}}><option value="">New experiment</option>{rows.map(r=><option key={r.id} value={r.id}>{r.title} · {r.data.status}</option>)}</select></label>
    <fieldset disabled={!ready||!writable||busy||!!closed}><legend>Expectation revision {active?.data.plan_revision||1}</legend>
      <label>Approved evidence baseline<select value={plan.baseline_id} disabled={!!active} onChange={e=>setPlan({...plan,baseline_id:e.target.value})}><option value="">Choose a current baseline</option>{baselines.map(b=><option key={b.id} value={b.id}>{b.data.decision_title}</option>)}</select></label>
      <label>Hypothesis<textarea aria-label="Hypothesis" value={plan.hypothesis} onChange={e=>setPlan({...plan,hypothesis:e.target.value})}/></label>
      <label>Success criteria · one per line<textarea value={plan.criteria.join("\n")} onChange={e=>setPlan({...plan,criteria:e.target.value.split("\n")})}/></label>
      <label>Observation start<input type="date" value={plan.starts_on} onChange={e=>setPlan({...plan,starts_on:e.target.value})}/></label>
      <label>Observation end<input type="date" value={plan.ends_on} onChange={e=>setPlan({...plan,ends_on:e.target.value})}/></label>
      <label>Stop conditions<textarea value={plan.stop_conditions} onChange={e=>setPlan({...plan,stop_conditions:e.target.value})}/></label>
      <button onClick={()=>run(async()=>accept(await studioRequest<Experiment>(active?`${path}/${active.id}`:path,active?"PUT":"POST",{...plan,...(active?{version:active.version}:{})}))) }>{active?"Save new expectation revision":"Plan experiment"}</button>
    </fieldset>
    {active && <><p>Responsible owner: {members.find(m=>m.id===active.data.owner_id)?.name||active.data.owner_id}</p>{members.some(m=>m.id===getStoredUser()?.id && m.role==="owner") && !closed && <fieldset disabled={busy}><legend>Reassign responsibility</legend><label>New experiment owner<select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Choose an owner or editor</option>{members.filter(m=>m.role==="owner"||m.role==="editor").map(m=><option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}</select></label><button disabled={!assignee} onClick={()=>run(async()=>accept(await studioRequest<Experiment>(`${path}/${active.id}/owner`,"POST",{version:active.version,owner_id:assignee})))}>Reassign experiment owner</button></fieldset>}<p>Status: {active.data.status}. Saved revision: {active.version}.</p><fieldset disabled={!ready||!writable||busy||!!closed}><legend>Lifecycle and evidence</legend>
      {active.data.status==="planned" && <button onClick={()=>event("activate")}>Activate saved experiment</button>}
      {active.data.status==="active" && <><label>Criterion<select value={criterion} onChange={e=>setCriterion(Number(e.target.value))}>{active.data.plan.criteria.map((c,i)=><option value={i} key={i}>{c}</option>)}</select></label>
      <label>Observation or closure summary<textarea aria-label="Observation or closure summary" value={observation} onChange={e=>setObservation(e.target.value)}/></label><label>Approved KPI snapshot<select value={kpi} onChange={e=>setKpi(e.target.value)}><option value="">Manual source</option>{baselines.filter(b=>b.data.decision_id===active.data.decision.id).flatMap(b=>b.data.evidence.filter(e=>e.kind==="metric").map(e=><option key={b.id+e.id} value={b.id+"|"+e.id}>{e.title} · revision {e.version}</option>))}</select></label>{kpi && <pre>{JSON.stringify(baselines.find(b=>b.id===kpi.split("|")[0])?.data.evidence.find(e=>e.id===kpi.split("|")[1])?.data,null,2)}</pre>}<label>Evidence source<input value={source} onChange={e=>setSource(e.target.value)}/></label><label>Measurement date<input type="date" value={measured} onChange={e=>setMeasured(e.target.value)}/></label>
      <label>Human checkpoint assessment<select value={assessment} onChange={e=>setAssessment(e.target.value)}><option value="unknown">Unknown</option><option value="met">Met</option><option value="not_met">Not met</option></select></label><button onClick={()=>event("checkpoint")}>Record checkpoint</button>
      <label>Proposed follow-up actions · one per line<textarea value={actions} onChange={e=>setActions(e.target.value)}/></label><button onClick={()=>event("completed")}>Complete and create review draft</button><button onClick={()=>event("stopped")}>Stop and create review draft</button></>}
    </fieldset><details><summary>Expectation history and evidence</summary>{active.data.history.map(h=><article key={h.revision}><h3>Revision {h.revision} · {h.at}</h3><p>{h.plan.hypothesis}</p><ul>{h.plan.criteria.map((c,i)=><li key={i}>{c}</li>)}</ul><p>{h.plan.starts_on} – {h.plan.ends_on} · Stop: {h.plan.stop_conditions}</p></article>)}{active.data.checkpoints.map((c,i)=><article key={i}><p>Revision {c.plan_revision}, criterion {c.criterion+1}: {c.assessment}</p><p>{c.observation}</p><p>{c.source} · {c.measured_on}</p></article>)}</details>{active.data.review_id && <p role="status">Outcome review draft created: {active.data.review_id}. Reopen Decisions to edit its observations and review proposed actions; no tasks were created automatically.</p>}</>}
  </section>;
}
