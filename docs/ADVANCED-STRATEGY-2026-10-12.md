# Evidence and strategy workflows

These extend the existing local CEO.ai studio. Start the backend and frontend using the repository setup guide; sign in with an owned workspace. Browser acceptance uses isolated fixture accounts and port 8012, not a production account or database. Export retains the existing Pro-or-above entitlement.

## Evidence freshness

1. Save a decision in Decisions and a KPI in Goals & metrics, or a document/research record in Knowledge.
2. In Decisions → Evidence freshness, select the decision and evidence. Optionally enter a research review date, review the snapshot and explicitly approve it.
3. Edit the linked KPI or document. Return to freshness and check for changes. Expect a saved alert containing the previous and current versions and values.
4. Acknowledge or mark reviewed. Repeat the check: the same change should not create duplicate alerts. Reload: states and approval baselines remain saved.

An external source's review date produces a due-review reminder. It does not prove that the external page changed. Date checks currently run on explicit refresh; periodic background scheduling remains unfinished. Approval records preserve historical evidence rather than silently changing the decision.

## Negotiation studio

1. Open Strategy lab and create a comparison. Enter objectives, alternatives and counterpart assumptions.
2. Add a numeric reservation variable such as Price with maximum 100. Compare packages with Price 90 and Price 110.
3. Save. Expect side-by-side package cards: 90 is within the entered limit; 110 displays a visible violation.
4. Reopen, change the package, save and reload. Values persist; conflicting edits reject with a reload instruction.

This evaluates entered constraints. It cannot approve or send agreements. Optional model-driven practice conversations remain unfinished.

## Board presentations

1. In Strategy lab, select a saved decision and optional scenarios. Generate a board presentation.
2. Open it, edit slide text and private speaker notes, then save. Expect readable slide navigation, keyboard arrows and a fullscreen control where supported by the browser.
3. Download PDF and PPTX. Open both in a compatible reader. Expect actual decision text, approved source revision footnotes, actions and a scenario revenue chart when the selected scenarios contain numeric monthly revenue.
4. As the workspace owner, review the public contents and publish a link. Open it in a signed-out browser. Private speaker notes and raw source metadata must be absent.
5. Revoke the link and reload the public page. Expect an unavailable-link message. Editing the private deck does not modify an already published snapshot; publish the new saved version explicitly.

Exports omit notes by default. The API permits authenticated note-inclusive exports when explicitly requested. Current slide text is bounded; comprehensive long-text, multilingual and office-reader visual profiling remains pending. This is an implementation slice, not certification of all 30 planned additions.

## Visual expectations

The new screens retain the pearl/navy Liquid Glass navigation, restrained cobalt accents and readable solid content cards. Negotiation packages appear side by side on wide screens. Form controls have keyboard focus and touch targets; reduced-motion styles come from the existing studio foundation. See the actual strategy-lab screenshot under `screenshots/advanced-features-2026-10-12/`.
