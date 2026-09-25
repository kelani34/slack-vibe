# Commit, push and implementation workflow

[Index](README.md) · [Delivery plan](delivery-plan.md) · [TDD](tdd.md) · [Testing](testing.md) · [QA handoff](qa-engineer.md)

## Purpose

Commits are evidence-bearing delivery units. Each pushed change must be small enough to review, complete enough to run, and explicit about the product contract it advances. A commit does not close a feature by itself; closure still requires the applicable automated, browser/device, provider and independent-QA evidence.

## Branch and slice rules

1. Work on a named branch, using `codex/<short-scope>` for agent-created branches.
2. Select one dependency-ready vertical slice from [P00–P14](delivery-plan.md). Record the relevant `F`, `R`, `W`, `MR`, repair and acceptance-case IDs before changing behavior.
3. Keep schema, migration, server policy, UI behavior and tests together when splitting them would create an unusable or unsafe intermediate state.
4. Separate unrelated refactors, generated cleanup and speculative foundations. Do not hide unrelated changes inside a feature commit.
5. Preserve user work in a dirty tree. Stage explicit paths and inspect the staged diff before committing.

## Test-first evidence

For behavior changes, record the focused command and intended pre-change failure. The failure must demonstrate the missing contract, not a broken fixture or import. Implement the smallest complete behavior, rerun the focused test, then run the affected layer and shared gates. Pure documentation changes use `npm run docs:check`; changes to the documentation contract also run its focused unit test.

Public history may be squashed, but the handoff must retain the case IDs, red/green command, candidate commit, environment and remaining limitations. Never weaken an assertion, remove a correct regression or broaden permissions to make a gate pass.

## Commit format

Use `type(scope): imperative summary`.

| Type | Use |
|---|---|
| `feat` | User-visible capability |
| `fix` | Defect correction with regression evidence |
| `test` | Test infrastructure or missing behavior coverage |
| `docs` | Specification, evidence or operational guidance only |
| `refactor` | Behavior-preserving structure change |
| `perf` | Measured work or latency improvement |
| `build` | Dependencies, compilation or packaging |
| `ci` | Hosted automation and release gates |
| `chore` | Narrow maintenance that fits none of the above |

The summary is imperative, specific and under 72 characters where practical. Use the body for `F/R/W/MR` IDs, migration or security impact, commands run and material limitations. Avoid `WIP`, “misc fixes,” percentages of completion and claims that unrun QA passed.

## Required pre-push checks

Every push:

```bash
npm run docs:check
git diff --check
```

Run focused tests for the changed behavior. For application/runtime changes, also run:

```bash
npm test -- --maxWorkers=1 --testTimeout=15000
npm run typecheck
npm run lint
```

Run `npm run build` for route, configuration, dependency, server/runtime or release-candidate changes. Run opt-in performance, provider, browser or device suites only when the slice owns those contracts, and report their environment and limits.

## Staging, commit and push

1. Review `git status --short` and `git diff --stat`.
2. Stage explicit paths. Review `git diff --cached --check`, `git diff --cached --stat` and the staged patch.
3. Commit one coherent slice with the format above.
4. Fetch the remote and check that the branch still has the intended base. Resolve divergence without destructive history rewriting.
5. Push the named branch with upstream tracking on its first push. Do not force-push a shared branch without explicit authorization.
6. Verify the remote branch and capture the hosted CI result. A workflow file that exists only locally is not hosted evidence.
7. Update the delivery, test and QA evidence only with results that actually ran against the candidate.

## Documentation contract

`npm run docs:check` blocks three forms of drift:

- a Markdown file under `/docs` omitted from [the documentation index](README.md);
- a specification that does not link back to the index;
- a local Markdown link whose target file does not exist.

The command runs in CI. When adding a document, add its ownership row to the index in the same commit and connect it to the relevant feature, design, implementation, test and operations sources rather than duplicating their requirements.

## Handoff and continuation

After a green push, record the commit, exact commands, browser/device/provider evidence and remaining limits. Then return to the persistent loop: reread the affected specs and current state, select the next dependency-ready unclosed case, create its red test and continue. Do not wait for a later documentation sweep to synchronize the evidence.
