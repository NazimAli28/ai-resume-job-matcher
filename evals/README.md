# evals: the AI "dry run" harness

Every prompt or model change must pass these before merging (fabrication tolerance = 0).
Golden sets and graders arrive with the phases that need them:

- Phase 3: resume extraction golden set (≥ 30 resumes, ≥ 40% Pakistani CVs), field-level F1.
- Phase 4: requirement extraction and match-class accuracy against a labeled set.
- Phase 5: fabrication guardrail suite (tailoring and cover letters).
- Phase 7: interview rubric agreement with a human-graded calibration set.

Test data is synthetic or used with consent. No real personal data is committed here.
