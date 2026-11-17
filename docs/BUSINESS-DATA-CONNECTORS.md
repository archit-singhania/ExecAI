# Importing KPI observations

Open Goals and find **Import KPI observations**. Choose a source name such as `Sales ledger`. Keep it consistent across imports so the workspace can recognize observations it already imported. Choose a CSV file or paste text, then enter the column names from its header. The defaults accept this example.

```csv
id,metric,value,unit,date
sale-001,Revenue,0,USD,2026-11-01
sale-002,Revenue,125.50,USD,2026-11-02
```

Choose **Preview and stage CSV**. Expect two eligible observations totaling 125.5 USD. Inspect the rows, then choose **Approve eligible observations**. The batch records the approval time, user and created KPI identifiers. Repeating the import with the same source and IDs produces duplicates. Changing the amount for an existing ID produces a conflict for manual investigation. Totals are calculated separately for each metric and unit.

The parser accepts quoted fields and bounds imports to 500 rows per batch. Dates must be ISO dates. Numeric values must be finite and have at most eight decimal places. Bad rows carry individual errors. Malformed CSV structure and unusable headers reject the batch. Only mapped fields are retained. Each approved source observation currently creates its own metric record.

CSV staging and approval use the existing workspace-owned studio records. The read-only HubSpot adapter, encrypted OAuth credentials, incremental sync checkpoints and disconnect/recovery tests remain outstanding for the connector feature.
