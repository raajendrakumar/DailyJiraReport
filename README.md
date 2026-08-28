# Daily Jira Bugs & Stories Report

A static, single-page dashboard that shows open Stories and Bugs from the
`COS` Jira project, grouped by assignee. Built for the TrueValueHub
engineering team's daily standup snapshot.

**Live view:** open [`index.html`](index.html) in a browser, or serve the
folder as a static site (e.g. GitHub Pages).

## Features

- Snapshot stats: open stories, open bugs, total open items, assignee count
- Per-assignee workload bar chart (stories vs. bugs)
- Expandable per-assignee ticket tables with key, summary, priority, status,
  and days-to-due
- Search/filter by assignee name
- "Upload a newer file" — drop in a fresh Jira export (`.xlsx`, `.xls`, or
  `.csv`) to preview it instantly in the browser, without publishing or
  touching the committed snapshot

## Project structure

```
index.html          Page markup + the published data snapshot
css/styles.css       Design tokens and layout (light/dark theme via prefers-color-scheme)
js/app.js            Rendering, search, and file-upload/parsing logic
js/vendor/xlsx.full.min.js   SheetJS, used to parse uploaded .xlsx/.xls files
```

## Updating the published snapshot

The snapshot data lives inline in `index.html` inside
`<script id="board-data" type="application/json">`. To publish a new day's
export, replace that JSON array with data grouped the same way: one object
per assignee with `name`, `stories[]`, and `bugs[]`, where each ticket has
`key`, `summary`, `priority`, `status`, and `due` (days until/since due).

The expected Jira export columns (used by the in-browser upload/preview
feature) are: `Issue Type`, `Issue key`, `Summary`, `Assignee`, `Priority`,
`Status`, `Due Days`.

## Local development

No build step — it's plain HTML/CSS/JS. Open `index.html` directly in a
browser, or run any static file server from this directory.
