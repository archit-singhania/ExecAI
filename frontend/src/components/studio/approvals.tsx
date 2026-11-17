"use client";

import { useEffect, useState } from "react";
import { studioRequest, type StudioRecord } from "@/lib/studio";
import { getStoredUser } from "@/lib/auth";

type Member = { id: string; name: string; role: string };
type Workflow = { id: string; title: string; version: number; data: {
  status: string; stage: number; reviewers: string[]; requester_id: string;
  decision: { version: number }; current_revision: boolean;
  events: { workflow_version: number; actor_id: string; action: string; comment: string; at: string }[];
} };
type Listing = { allow_self_approval: boolean; workflows: Workflow[] };

export function ApprovalWorkspace({ id, records, writable }: { id: string; records: StudioRecord[]; writable: boolean }) {
  const path = `/api/studio/${id}/approvals`;
  const [listing, setListing] = useState<Listing | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [decision, setDecision] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [reviewers, setReviewers] = useState<string[]>([""]);
  const [comments, setComments] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const uid = getStoredUser()?.id;
  const owner = members.some(m => m.id === uid && m.role === "owner");
  const name = (user: string) => members.find(m => m.id === user)?.name || user;
  useEffect(() => {
    let live = true;
    Promise.all([studioRequest<Listing>(path), studioRequest<Member[]>(`/api/studio/${id}/members`)])
      .then(([data, team]) => { if (live) { setListing(data); setMembers(team); } })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [id, path]);
  async function perform(operation?: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await operation?.(); setListing(await studioRequest<Listing>(path)); }
    catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setBusy(false); }
  }
  function transition(row: Workflow, action: string) {
    return perform(() => studioRequest(`${path}/${row.id}/transitions`, "POST", { version: row.version, action, comment: comments[row.id] || "" }));
  }
  return <section className="st-card advanced-studio" aria-labelledby="approvals-heading"><h2 id="approvals-heading">Decision approvals</h2>
    <p>Choose evidence and assign reviewers in order. Each approval belongs to one decision revision.</p>
    {error && <p role="alert">{error}</p>}<p role="status">{busy ? "Saving…" : listing ? `${listing.workflows.length} workflows` : "Loading reviews…"}</p>
    <button disabled={busy} onClick={() => perform()}>Refresh approvals</button>
    {listing && owner && <label><input type="checkbox" checked={listing.allow_self_approval} disabled={busy} onChange={e => {const allowed=e.target.checked;void perform(()=>studioRequest(`${path}/policy`,"PUT",{allow_self_approval:allowed}));}}/>Allow self-approval in this workspace</label>}
    <fieldset disabled={!writable || busy || !listing}><legend>Prepare a review</legend>
      <label>Decision to review<select value={decision} onChange={e=>setDecision(e.target.value)}><option value="">Choose a decision</option>{records.filter(r=>r.kind==="decision").map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      <fieldset><legend>Required evidence</legend>{records.filter(r=>["metric","research","knowledge"].includes(r.kind)).map(r=><label key={r.id}><input type="checkbox" checked={evidence.includes(r.id)} onChange={e=>setEvidence(e.target.checked?[...evidence,r.id]:evidence.filter(v=>v!==r.id))}/>{r.title} · revision {r.version}</label>)}</fieldset>
      {reviewers.map((reviewer,i)=><label key={i}>Stage {i+1} reviewer<select value={reviewer} onChange={e=>setReviewers(reviewers.map((v,j)=>j===i?e.target.value:v))}><option value="">Select member</option>{members.filter(m=>m.role!=="viewer").map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label>)}
      <button disabled={reviewers.length>=10} onClick={()=>setReviewers([...reviewers,""])}>Add review stage</button> <button disabled={reviewers.length===1} onClick={()=>setReviewers(reviewers.slice(0,-1))}>Remove last stage</button>
      <button disabled={!decision || !evidence.length || reviewers.includes("")} onClick={()=>perform(()=>studioRequest(path,"POST",{decision_id:decision,evidence_ids:evidence,reviewers}))}>Create approval draft</button>
    </fieldset>
    {listing?.workflows.map(row=>{const d=row.data;const manager=owner||uid===d.requester_id;const assigned=uid===d.reviewers[d.stage];return <article key={row.id}><h3>{row.title}</h3><p>{d.status} · Decision revision {d.decision.version} · {d.current_revision?"Current revision":"Historical revision"}</p>
      <ol>{d.reviewers.map(r=><li key={r}>{name(r)}</li>)}</ol><fieldset disabled={!writable||busy}><legend>Review action</legend>
      <label>Reviewer comment<textarea value={comments[row.id]||""} onChange={e=>setComments({...comments,[row.id]:e.target.value})}/></label>
      {manager&&["draft","changes_requested"].includes(d.status)&&<button onClick={()=>transition(row,"submit")}>Submit revision for approval</button>}
      {assigned&&d.status==="submitted"&&["approve","request_changes","reject"].map(a=><button key={a} onClick={()=>transition(row,a)}>{a.replace("_"," ")}</button>)}
      {manager&&["draft","submitted","changes_requested"].includes(d.status)&&<button onClick={()=>transition(row,"withdraw")}>Withdraw request</button>}</fieldset>
      <details><summary>Review history</summary><ol>{d.events.map(event=><li key={event.workflow_version}>{event.at} · {name(event.actor_id)} · {event.action} {event.comment}</li>)}</ol></details></article>;})}
  </section>;
}
