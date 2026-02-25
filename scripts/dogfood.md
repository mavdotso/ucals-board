# Autonomous Dogfooding — ucals-board

Run this by asking the agent: "dogfood ucals-board" or "run QA on ucals-board"

## What it does
1. Opens the app in browser
2. Navigates every page (/, /docs, /board, /calendar, /pipeline, /accounts)
3. On each page: snapshots the DOM, checks console errors, tests interactions
4. Tests edge cases: empty states, form validation, overflow text
5. Captures screenshots of issues
6. Outputs structured report with severity ratings

## Severity levels
- **Critical**: App crashes, data loss, security issues
- **High**: Features broken, console errors blocking functionality
- **Medium**: UI bugs, layout issues, accessibility problems
- **Low**: Minor visual inconsistencies, missing polish
