# Daily Jira Bugs & Stories Report

A responsive, high-performance daily dashboard that displays open Stories and Bugs from the `COS` Jira project grouped by assignee. Designed for the TrueValueHub engineering team's daily standup meetings.

**Live view:** https://raajendrakumar.github.io/DailyJiraReport/ (or open [`index.html`](index.html) directly in any modern browser).

## Features

- **Snapshot KPI Tiles**: Quick metrics for open stories, open bugs, total open items, assignee count, and critical aging (90+ days). Clicking tiles filters the dashboard instantly.
- **Interactive Breakdown Charts**: Visual breakdown distributions by priority and status. Clicking any bar instantly filters all ticket views.
- **Team Workload Bar Chart**: Per-assignee breakdown of stories vs. bugs with avatar initials, gradient proportional bars, and load animations.
- **Smart Universal Search**: Search across assignee names, ticket keys (e.g. `COS-7208`), and summary keywords simultaneously. Matching cards auto-expand.
- **Quick-Filter Presets**: 1-click pills for *All Items*, *Bugs Only*, *Stories Only*, *Aging 90+ Days (Critical)*, *Aging 30-89 Days (Warning)*, and *Priority Levels*.
- **Direct Jira Deep Links & Quick Copy**: Click any ticket key to open directly in Jira (`https://truevaluehub.atlassian.net/browse/COS-...`) or use the one-click copy button to copy key & summary to clipboard for standup notes.
- **Expand All / Collapse All**: Toggle all assignee ticket cards with a single button.
- **Dark / Light Theme Toggle**: Seamless switching between light and dark modes with persistent local preferences.
- **Dual Export (CSV & Excel .xlsx)**: Export currently filtered tickets directly to formatted CSV or Excel workbook using SheetJS.
- **Drag & Drop Instant Preview**: Drag and drop any `.xlsx`, `.xls`, or `.csv` export anywhere onto the page to preview without modifying the base snapshot.
- **Print & PDF Layout**: Clean print stylesheet formatted for PDF reporting and sharing.

## Project Structure

```
index.html                  Page structure, UI layout, and default JSON snapshot
css/styles.css              Modern design tokens, dark/light themes, animations, print styles
js/app.js                   Filtering, universal search, chart rendering, exports, drag & drop
js/vendor/xlsx.full.min.js   SheetJS library for parsing and exporting Excel workbooks
```

## Updating the Snapshot Data

The default daily snapshot is embedded in `index.html` inside:
```html
<script id="board-data" type="application/json">
[ ... ]
</script>
```
To update the baseline snapshot, replace the JSON array with data formatted with `name`, `stories[]`, and `bugs[]` (`key`, `summary`, `priority`, `status`, and `due` days).

## Local Development

Zero external build steps required. Simply open `index.html` in your browser or run a lightweight local static web server.
