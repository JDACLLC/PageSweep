# Documentation Protocol

## Purpose

This protocol defines a repeatable process for creating, maintaining, testing, and publishing project documentation. Apply each rule when its referenced document or product surface exists; do not create product-specific documentation solely to satisfy this protocol.

## Documentation set

Maintain applicable files under `docs/`:

| File | Purpose |
|---|---|
| `DOC_PROTOCOL.md` | Documentation rules and maintenance workflow |
| `TRIAGE.md` | Full prioritized issue and feature backlog |
| `TODO.md` | Short working list: In Progress, Up Next, Waiting On, and Recently Done |
| `DECISION_LOG.md` | Architectural and product decisions, context, alternatives, and consequences |
| `CHANGELOG.md` | Semantic-versioned history of shipped changes |
| `ARCHITECTURE.md` | Routes, components, services, data flow, and system boundaries |
| `RUNBOOK.md` | Operational procedures and recovery steps |
| `SECURITY.md` | Authentication, authorization, secrets, data controls, and hardening history |
| `USER_GUIDE.md` | Optional comprehensive end-user instructions when the product needs them |
| `SCREEN_GUIDE.md` | Optional screen-by-screen or surface-by-surface reference |
| `E2E_SMOKE_PROTOCOL.md` | Smoke-test scope, commands, and result interpretation |
| `ADMIN_RUNBOOK.md` | Internal-only administrative procedures |
| `generated/` | Generated documentation output; do not edit by hand |

Add optional guides and specialized references only when the project needs them, such as end-user instructions, screen guides, access guides, area-specific changelogs, or plain-language summaries.

The files have distinct roles:

- `TODO.md` describes current work; `TRIAGE.md` contains the complete ranked backlog.
- `CHANGELOG.md` records what changed; `DECISION_LOG.md` explains why.
- `ARCHITECTURE.md` maps the system; `RUNBOOK.md` explains how to operate it.
- When present, `USER_GUIDE.md` teaches complete workflows and `SCREEN_GUIDE.md` explains individual interfaces.

### Optional user guide

Create `USER_GUIDE.md` when a product has end users who need installation, setup, workflow, or troubleshooting instructions. A user guide is optional for internal libraries, infrastructure-only projects, prototypes, or projects adequately covered by a concise README.

When a user guide exists:

- Treat it as the canonical source for end-user instructions.
- Organize it around user goals rather than implementation structure.
- Include installation or access, primary workflows, tips, common issues, and support or debugging guidance appropriate to the audience.
- Keep it synchronized with screenshots, in-app help, release behavior, and any screen guide.
- Do not expose internal-only operational or administrative instructions through it.

## Writing standards

- Target an eighth-grade reading level.
- Use a friendly, supportive, non-technical tone in user-facing material.
- Prefer descriptive headings, short paragraphs, actionable numbered steps, and tables for comparisons.
- Bold user-visible buttons, fields, and important terms.
- Use `[Screenshot: description]` where a planned image is not yet available.
- Give every documented feature a procedure, at least two useful tips, and at least two common issues with solutions.
- Keep technical names, paths, and implementation details out of plain-language summaries unless readers need them to complete a task.

## Internal-only material

Mark sensitive operational documentation clearly as internal. Never link internal runbooks from user guides, public help pages, or in-app help. Internal material can include account grants, administrator access, security operations, key rotation, and incident recovery.

## Documenting a feature change

For every substantive user-facing feature addition or modification, apply the relevant items below. User and screen guide updates are required only when those optional documents exist or the change establishes a clear need for them.

- [ ] Update `USER_GUIDE.md` with a description, numbered instructions, tips, common issues, and a screenshot or placeholder.
- [ ] Update `SCREEN_GUIDE.md` for each affected surface with its name, route or entry point, purpose, visible elements, actions, tips, common issues, and next steps.
- [ ] Update the table of contents in each affected guide.
- [ ] Update in-app help when the product includes it, keeping its instructions consistent with the written guides.
- [ ] Update applicable architecture, security, runbook, triage, TODO, and decision documents.
- [ ] Update version and last-updated metadata where used.
- [ ] Add a changelog entry.
- [ ] Regenerate machine-readable documentation when the project supports it.
- [ ] Run the applicable smoke tests and complete the quality checklist.

Every substantive change should update at least one maintained document. Update only documents affected by the change; do not create artificial entries.

## Templates

### User guide feature

```markdown
## [Feature Name]

[Screenshot: Description of the feature interface]

### [Task Name]

1. Select **Button or Field**.
2. Complete the next action.
3. Confirm the expected result.

> **Tip:** Helpful advice.

> **Common issue:** Problem description  
> **Solution:** How to resolve it.
```

### Screen or surface guide

```markdown
## [Screen or Surface Name]

**Route or entry point:** `/path` or navigation instructions  
**Purpose:** One-sentence description.

### What you'll see

- **Element** — description

### What to do

1. First action.
2. Second action.

### Tips

- Helpful tip.

### Common issues

- **Issue:** Problem description  
  **Solution:** Resolution.

### Next steps

- Next destination or alternative workflow.
```

### Decision log entry

```markdown
## [Decision] — YYYY-MM-DD

### Context
[Why a decision was needed]

### Decision
[What was chosen]

### Alternatives
[What else was considered]

### Consequences
[Benefits, costs, and follow-up work]
```

### Changelog entry

```markdown
## [Version] — YYYY-MM-DD

### Added
- New capability.

### Changed
- Updated behavior.

### Fixed
- Corrected issue.

### Removed
- Removed deprecated behavior.
```

## Versioning

Use semantic versioning: **Major.Minor.Patch**.

- **Major:** Breaking change to a public route, contract, workflow, or brand direction.
- **Minor:** New feature, page, integration, backend function, or notable content section.
- **Patch:** Fix, copy change, visual polish, documentation correction, or dependency update.

Keep work in `[Unreleased]` until a coherent release is cut. Update `CHANGELOG.md` for every code change without waiting to be asked.

Documentation versions should match application versions:

- A major release requires a complete documentation review.
- A minor release requires review of affected sections.
- A patch requires documentation updates when user-visible behavior changes.

When the project has a code-level version constant, treat it as the source of truth and bump it with release documentation. Where document headers use metadata, format it as:

```markdown
**App Version:** X.Y.Z  
**Last Updated:** YYYY-MM-DD
```

## Triage and work tracking

- Use stable numbered items in `TRIAGE.md`; never renumber closed items.
- Rank work from P0 through P3.
- Record meaningful context in notes, including why, when, and who decided.
- Move deferred or speculative work to a Parking Lot section.
- Keep `TODO.md` short and synchronized with active work.

## Plain-language summaries and mirrors

When a project publishes simplified changelog or decision-log summaries:

- Preserve decision structure: Context, Decision, Alternatives, and Consequences.
- Describe changelog entries as what the experience was and what it is now.
- Remove file paths, function names, component names, and unnecessary technical detail.
- Use `## Latest Changes` for the open working batch.
- When a new batch begins, rename the previous heading to its spelled-out date, such as `July 26, 2026`, then add a new `Latest Changes` section above it.
- Group older content newest-first with one date heading and individual `###` entries.
- Create both technical and plain-language entries for substantive changes to a summarized surface.

If summaries are mirrored into code or a backend function, update and redeploy the mirror whenever the source changes. Document the exact procedure in `RUNBOOK.md`; a source-only edit must not be considered published.

## Generated and in-app documentation

When a project generates documentation from source metadata:

1. Keep the generator under `scripts/`.
2. Extract structured metadata from documented components and in-app help definitions.
3. Write generated output under `docs/generated/`.
4. Provide a dedicated generation command and run it as part of the build when appropriate.
5. Never edit generated output manually.

In-app help must match the written documentation and ship with the next application deployment.

## Smoke-test protocol

Every project must define a proportionate smoke-test process before a feature or release is declared complete. The process may be a short manual checklist for a small project or an automated suite for a larger one.

- Document the critical happy path, expected result, failure signal, and testing environment.
- Include at least one previously working path when verifying a bug fix, to catch regressions.
- Record manual results when automation is not yet practical.
- Create an area-specific script when an area first needs automated coverage, using a consistent name such as `scripts/e2e-smoke-<area>.mjs`.
- Maintain an aggregate smoke script when multiple area scripts exist.
- Document when to run each check and how to interpret its output in `E2E_SMOKE_PROTOCOL.md`, when that separate file is warranted.
- Run relevant area checks before declaring a feature complete.
- Run the aggregate suite before a release when practical.
- Do not mark a smoke test as passed when a required check was skipped; record the skip and reason.

## Quality checklist

Before publishing documentation:

- [ ] Instructions are numbered and actionable.
- [ ] User-visible controls and fields are bold.
- [ ] User-facing text avoids unnecessary jargon and targets an eighth-grade reading level.
- [ ] Each feature includes tips and common issues.
- [ ] Key screens include screenshots or placeholders.
- [ ] Tables of contents and navigation links are current.
- [ ] Written, generated, and in-app help agree.
- [ ] Version and last-updated information is current.
- [ ] Changelog, decision, and operational records are updated where applicable.
- [ ] Internal-only content is not exposed through public documentation.
- [ ] Applicable smoke tests pass.

## Publishing workflow

1. Write or update the affected documentation.
2. Regenerate derived documentation, if supported.
3. Run relevant smoke tests.
4. Review the quality checklist.
5. Verify any summary mirrors and redeploy their serving surface.
6. Commit with a focused message, such as `docs: update [feature] documentation v[X.Y]`.
7. Publish or deploy through the project's normal release process.

## Stakeholder status decks

When the project maintains a stakeholder presentation:

- Regenerate it at the end of each sprint, at pre-launch freeze, and monthly after launch.
- Never overwrite an earlier deck; increment its version suffix.
- Label non-sprint editions, for example `_v4_prelaunch` or `_v6_postlaunch_monthly`.
- Keep the approved visual template fixed and update only its data unless a redesign is explicitly authorized.
