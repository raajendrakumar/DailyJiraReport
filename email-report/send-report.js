const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { chromium } = require(
  path.resolve(__dirname, "..", "..", "node_modules", "playwright")
);

const SCRIPT_DIR = __dirname;
const OUT_DIR = path.join(SCRIPT_DIR, "mail-assets");
const DASHBOARD_FILE = path.resolve(SCRIPT_DIR, "..", "index.html");
const DASHBOARD_FILE_URL = "file:///" + DASHBOARD_FILE.replace(/\\/g, "/");
const LIVE_BASE_URL = "https://raajendrakumar.github.io/DailyJiraReport/";
const DRAFT_PATH = path.join(SCRIPT_DIR, "Daily Jira Report - Dashboard.eml");
const DATA_PATH = path.join(OUT_DIR, "report-data.json");
const EXPORT_EXTENSIONS = new Set([".csv", ".xlsx", ".xls"]);

// Usage: node send-report.js [urlOrFilters] [exportFilePath]
//   urlOrFilters:
//     (none)                -> local file, unfiltered
//     "?priority=High"      -> local file with those filters applied
//     "http://..."          -> that URL verbatim (local dev server or the live site)
//   exportFilePath (optional):
//     path to a Jira export (.xlsx/.xls/.csv) to load into the dashboard
//     before capturing - the same file you'd drag onto the page - so the
//     report reflects fresh data instead of index.html's baked-in snapshot.
//     Defaults to the most recently modified .csv/.xlsx/.xls file directly
//     in this folder, if any - just drop a fresh export here (any filename)
//     and every run picks it up automatically. Pass an explicit path to
//     override, or "-" to skip upload entirely and use index.html's
//     baked-in snapshot.
function findLatestExport(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return undefined;
  }
  const candidates = entries
    .filter((e) => e.isFile() && EXPORT_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => {
      const full = path.join(dir, e.name);
      return { path: full, mtimeMs: fs.statSync(full).mtimeMs };
    });
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0].path;
}

function resolveNavUrl(arg) {
  if (!arg) return new URL(DASHBOARD_FILE_URL);
  if (arg.indexOf("?") === 0) return new URL(DASHBOARD_FILE_URL + arg);
  return new URL(arg);
}

function describeFilters(params) {
  var labels = [];
  if (params.get("type")) labels.push("Type = " + params.get("type"));
  if (params.get("priority")) labels.push("Priority = " + params.get("priority"));
  if (params.get("status")) labels.push("Status = " + params.get("status"));
  if (params.get("aging")) labels.push("Aging " + params.get("aging") + "+ days");
  if (params.get("q")) labels.push('Search = "' + params.get("q") + '"');
  return labels;
}

async function captureAndExtract(navUrl, uploadFilePath) {
  console.log("[1/3] Capturing dashboard screenshots + data (Playwright) from:");
  console.log("      " + navUrl.href);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(navUrl.href, { waitUntil: "networkidle" });

  if (uploadFilePath) {
    const resolvedUploadPath = path.resolve(uploadFilePath);
    if (!fs.existsSync(resolvedUploadPath)) {
      throw new Error("Export file not found: " + resolvedUploadPath);
    }
    console.log("      Loading latest export: " + resolvedUploadPath);
    await page.setInputFiles("#file-input", resolvedUploadPath);
    // handleFile() parses the export asynchronously (FileReader) then re-renders;
    // the preview banner going active is the app's own signal that it's done.
    await page.waitForSelector("#preview-banner.active", { timeout: 15000 });
  }

  await page.waitForTimeout(700); // let KPI count-up animations settle before reading them

  // Charts - real screenshots of what the app renders, embedded inline in the email.
  await page.locator("#breakdown-section").screenshot({
    path: path.join(OUT_DIR, "chart-priority-status.png"),
  });
  await page.locator("#workload-section").screenshot({
    path: path.join(OUT_DIR, "chart-team-workload.png"),
  });

  // Content - attached separately for reference.
  await page.locator("#stats-section").screenshot({
    path: path.join(OUT_DIR, "content-kpi-overview.png"),
  });
  await page.locator("#top-bugs-section").screenshot({
    path: path.join(OUT_DIR, "content-top-bugs.png"),
  });

  const stats = await page.evaluate(() => ({
    stories: parseInt(document.getElementById("stat-stories").textContent, 10) || 0,
    bugs: parseInt(document.getElementById("stat-bugs").textContent, 10) || 0,
    total: parseInt(document.getElementById("stat-total").textContent, 10) || 0,
    assignees: parseInt(document.getElementById("stat-assignees").textContent, 10) || 0,
    aging: parseInt(document.getElementById("stat-aging").textContent, 10) || 0,
  }));

  const snapshotDate = (await page.locator("#snapshot-date").textContent()).trim();

  const priorityBreakdown = await page.$$eval("#priority-breakdown .workload-row", (rows) =>
    rows.map((r) => ({
      label: r.getAttribute("data-filter-value") || r.querySelector(".workload-name").textContent.trim(),
      count: parseInt(r.querySelector(".workload-total").textContent, 10) || 0,
    }))
  );

  const statusBreakdown = await page.$$eval("#status-breakdown .workload-row", (rows) =>
    rows.map((r) => ({
      label: r.getAttribute("data-filter-value") || r.querySelector(".workload-name").textContent.trim(),
      count: parseInt(r.querySelector(".workload-total").textContent, 10) || 0,
    }))
  );

  const workload = await page.$$eval("#workload-card .workload-row", (rows) =>
    rows.map((r) => {
      const total = parseInt(r.querySelector(".workload-total").textContent, 10) || 0;
      const storySeg = r.querySelector(".bar-seg.story .seg-count");
      const bugSeg = r.querySelector(".bar-seg.bug .seg-count");
      return {
        name: r.getAttribute("data-assignee") || "",
        stories: storySeg ? parseInt(storySeg.textContent, 10) || 0 : 0,
        bugs: bugSeg ? parseInt(bugSeg.textContent, 10) || 0 : 0,
        total: total,
      };
    })
  );

  const topBugs = await page.$$eval("#top-bugs-body tr", (rows) =>
    rows
      .map((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) return null;
        const keyLink = cells[0].querySelector("a.key-link");
        return {
          key: keyLink ? keyLink.textContent.replace("↗", "").trim() : "",
          url: keyLink ? keyLink.href : "",
          summary: cells[1].textContent.trim(),
          assignee: cells[2].textContent.trim(),
          priority: cells[3].textContent.trim(),
          status: cells[4].textContent.trim(),
          due: cells[5].textContent.trim(),
        };
      })
      .filter(Boolean)
  );

  await browser.close();

  return { stats, snapshotDate, priorityBreakdown, statusBreakdown, workload, topBugs };
}

function buildEmailDraft() {
  console.log("[2/3] Building email draft...");
  execFileSync("python", [path.join(SCRIPT_DIR, "build_eml.py")], { stdio: "inherit" });
}

function triggerMail() {
  console.log("[3/3] Triggering mail draft in Outlook...");
  execFileSync("powershell", ["-Command", `Start-Process '${DRAFT_PATH}'`], { stdio: "inherit" });
}

function resolveUploadFilePath(arg) {
  if (arg === "-") return undefined; // explicit opt-out
  if (arg) return arg;
  return findLatestExport(SCRIPT_DIR);
}

async function main() {
  const navUrl = resolveNavUrl(process.argv[2]);
  const uploadFilePath = resolveUploadFilePath(process.argv[3]);
  const activeFilters = describeFilters(navUrl.searchParams);
  const liveDashboardUrl = LIVE_BASE_URL + (navUrl.search || "");

  const extracted = await captureAndExtract(navUrl, uploadFilePath);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify(
      Object.assign({}, extracted, { activeFilters: activeFilters, liveDashboardUrl: liveDashboardUrl }),
      null,
      2
    )
  );

  buildEmailDraft();
  triggerMail();
  console.log("\nDraft is open in Outlook. Review it, then click Send.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
