# Decision approvals

In Decisions, select a decision, choose required evidence, and add workspace editors as reviewers in the order they should act. Create the draft and submit it. The assigned reviewer can approve, reject, or request changes. Rejections and change requests require a comment. The requester or workspace owner can withdraw an open request. Self-approval starts disabled and only the workspace owner can change that policy.

To check revision handling, approve the first stage of a two-stage request, edit the decision, and refresh approvals. The workflow requests changes and resets to the first stage. Resubmission binds the new decision revision. The history retains both the earlier approval and the invalidation. Previously approved workflows show whether their decision revision is still current.

Workflow and evidence snapshots, policy, and separate audit-event records currently use the existing studio-record store. The API protects audit and workflow records against generic edits and deletion. A dedicated approval-event table and database migration remain outstanding. Browser controls currently require a manual refresh to see another reviewer's actions. Unsaved draft recovery, broader keyboard and assistive-technology checks, and multi-client production acceptance remain open.
