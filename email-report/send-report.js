const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require(
  path.resolve(__dirname, "..", "..", "node_modules", "playwright")
);

const SCRIPT_DIR = __dirname;
const OUT_DIR = path.join(SCRIPT_DIR, "mail-assets");
const DASHBOARD_FILE = path.resolve(SCRIPT_DIR, "..", "index.html");
const DASHBOARD_URL = "file:///" + DASHBOARD_FILE.replace(/\\/g, "/");
const DRAFT_PATH = path.join(SCRIPT_DIR, "Daily Jira Report - Dashboard.eml");

async function captureContentScreenshots() {
  console.log("[1/4] Capturing dashboard content screenshots (Playwright)...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(DASHBOARD_URL, { waitUntil: "networkidle" });

  await page.locator("#stats-section").screenshot({
    path: path.join(OUT_DIR, "content-kpi-overview.png"),
  });
  await page.locator("#top-bugs-section").screenshot({
    path: path.join(OUT_DIR, "content-top-bugs.png"),
  });

  await browser.close();
}

function generateCharts() {
  console.log("[2/4] Generating charts (matplotlib)...");
  execFileSync("python", [path.join(SCRIPT_DIR, "generate_charts.py")], { stdio: "inherit" });
}

function buildEmailDraft() {
  console.log("[3/4] Building email draft...");
  execFileSync("python", [path.join(SCRIPT_DIR, "build_eml.py")], { stdio: "inherit" });
}

function triggerMail() {
  console.log("[4/4] Triggering mail draft in Outlook...");
  execFileSync("powershell", ["-Command", `Start-Process '${DRAFT_PATH}'`], { stdio: "inherit" });
}

async function main() {
  await captureContentScreenshots();
  generateCharts();
  buildEmailDraft();
  triggerMail();
  console.log("\nDraft is open in Outlook. Review it, then click Send.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
