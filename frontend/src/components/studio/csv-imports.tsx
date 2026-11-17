"use client";

import { useEffect, useState } from "react";
import { studioRequest } from "@/lib/studio";

const fields = { source_id: "Source identifier", metric: "Metric name", value: "Numeric value", unit: "Unit", observed_on: "Observation date" };
const defaultColumns = { source_id: "id", metric: "metric", value: "value", unit: "unit", observed_on: "date" };
type Observation = { source_id: string; metric: string; value: string; unit: string; observed_on: string };
type Batch = { id: string; title: string; version: number; data: { state: string; counts: Record<string,number>; totals: { metric:string; unit:string; sum:string }[]; rows: {line:number;status:string;observation?:Observation;error?:string}[] } };

export function CsvImports({id,writable}:{id:string;writable:boolean}) {
  const path = `/api/studio/${id}/imports/csv`;
  const [source,setSource] = useState("");
  const [csv,setCsv] = useState("");
  const [columns,setColumns] = useState(defaultColumns);
  const [batches,setBatches] = useState<Batch[]>([]);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let current = true;
    studioRequest<Batch[]>(path).then(rows=>{if(current)setBatches(rows);}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[path]);
  async function submit(url:string, payload:unknown) {
    setBusy(true);setError("");
    try {
      const saved=await studioRequest<Batch>(url,"POST",payload);
      setBatches(rows=>[saved,...rows.filter(row=>row.id!==saved.id)]);
    } catch(e) { setError(e instanceof Error?e.message:"Import request failed."); }
    finally {setBusy(false);}
  }
  return <section className="st-card advanced-studio" aria-labelledby="csv-heading"><h2 id="csv-heading">Import KPI observations</h2>
    <p>Use the same source name and observation IDs on repeat imports. Preview the reconciliation before adding KPIs to this workspace.</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={!writable||busy}><legend>CSV source and mapping</legend>
      <label>Source name<input value={source} onChange={e=>setSource(e.target.value)}/></label>
      <label>Open CSV file<input type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>500000){setError("Choose a file smaller than 500 KB.");return;}try{setCsv(await file.text());setError("");}catch{setError("Could not read the selected file.");}}}/></label>
      <label>CSV text<textarea aria-label="CSV text" value={csv} onChange={e=>setCsv(e.target.value)}/></label>
      {Object.entries(fields).map(([key,label])=><label key={key}>{label} column<input value={columns[key as keyof typeof fields]} onChange={e=>setColumns({...columns,[key]:e.target.value})}/></label>)}
      <button disabled={!source.trim()||!csv.trim()} onClick={()=>submit(path,{source,csv_text:csv,columns})}>Preview and stage CSV</button>
    </fieldset><p role="status">{loading?"Loading imports…":busy?"Processing…":`${batches.length} saved batches shown`}</p>
    {batches.map(batch=><article key={batch.id}><h3>{batch.title} · {batch.data.state}</h3><p>{Object.entries(batch.data.counts).map(([status,n])=>`${n} ${status}`).join(" · ")}</p>
      <ul>{batch.data.totals.map(total=><li key={JSON.stringify([total.metric,total.unit])}>{total.metric} · total {total.sum} {total.unit}</li>)}</ul>
      <details><summary>Inspect source rows</summary><table><thead><tr><th>Line</th><th>Observation</th><th>Result</th></tr></thead><tbody>{batch.data.rows.map(row=><tr key={row.line}><td>{row.line}</td><td>{row.observation?`${row.observation.source_id} · ${row.observation.metric} · ${row.observation.value} ${row.observation.unit} · ${row.observation.observed_on}`:row.error}</td><td>{row.status}</td></tr>)}</tbody></table></details>
      {batch.data.state==="staged"&&<button disabled={!writable||busy||!batch.data.counts.ready} onClick={()=>submit(`${path}/${batch.id}/approve`,{version:batch.version,confirmed:true})}>Approve eligible observations</button>}
    </article>)}
  </section>;
}
