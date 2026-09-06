import json
import os
from email.message import EmailMessage
from email.utils import formatdate

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(SCRIPT_DIR, "mail-assets")
DATA_PATH = os.path.join(ASSETS, "report-data.json")
OUT = os.path.join(SCRIPT_DIR, "Daily Jira Report - Dashboard.eml")

TO = "Rajendra.Kumar@truevaluehub.com"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

stats = data["stats"]
snapshot_date = data["snapshotDate"]
active_filters = data.get("activeFilters", [])
live_dashboard_url = data.get("liveDashboardUrl", "https://raajendrakumar.github.io/DailyJiraReport/")
priority_breakdown = data.get("priorityBreakdown", [])
status_breakdown = data.get("statusBreakdown", [])
workload = data.get("workload", [])
top_bugs = data.get("topBugs", [])
oldest_bug = top_bugs[0] if top_bugs else None

top_priority = max(priority_breakdown, key=lambda p: p["count"]) if priority_breakdown else None
top_status = max(status_breakdown, key=lambda s: s["count"]) if status_breakdown else None
top_workload = max(workload, key=lambda w: w["total"]) if workload else None

filtered_suffix = " (filtered)" if active_filters else ""
SUBJECT = "Daily Status Report - Project COS - Open Stories & Bugs (" + snapshot_date + ")" + filtered_suffix


def read(fname):
    with open(os.path.join(ASSETS, fname), "rb") as f:
        return f.read()


# ---------------------------------------------------------------
# Plain-text body
# ---------------------------------------------------------------
plain_lines = [
    "TRUEVALUEHUB ENGINEERING",
    "Daily Status Report - Project COS - Open Stories & Bugs",
    "Snapshot date: " + snapshot_date,
    "",
    "Dear Rajendra Kumar,",
    "",
    "Please find below today's status update for project COS, covering all open",
    "Stories and Bugs as of the snapshot date above.",
    "",
]
if active_filters:
    plain_lines.append("Filters applied: " + ", ".join(active_filters))
    plain_lines.append("")

plain_lines.append("OVERVIEW")
plain_lines.append("  Stories open ............. %d" % stats["stories"])
plain_lines.append("  Bugs open ................. %d" % stats["bugs"])
plain_lines.append("  Total open items .......... %d" % stats["total"])
plain_lines.append("  Assignees .................. %d" % stats["assignees"])
plain_lines.append("  Aging 90+ days (critical) ... %d" % stats["aging"])
plain_lines.append("")
plain_lines.append("Please view in an HTML-capable client for the dashboard screenshots below.")
plain_lines.append("")

if top_priority or top_status:
    bits = []
    if top_priority:
        bits.append("most common priority is %s (%d)" % (top_priority["label"], top_priority["count"]))
    if top_status:
        bits.append("most common status is %s (%d)" % (top_status["label"], top_status["count"]))
    plain_lines.append("Distribution Breakdown - " + "; ".join(bits) + ".")
    plain_lines.append("")

if top_workload:
    plain_lines.append(
        "Team Workload Distribution - highest current load is %s (%d total: %ds/%db)."
        % (top_workload["name"], top_workload["total"], top_workload["stories"], top_workload["bugs"])
    )
    plain_lines.append("")

if oldest_bug:
    plain_lines.append("ATTENTION REQUIRED - OLDEST OPEN BUG")
    plain_lines.append(
        '  %s - "%s"' % (oldest_bug["key"], oldest_bug["summary"])
    )
    plain_lines.append(
        "  %s open, assigned to %s, priority %s, status %s."
        % (oldest_bug["due"], oldest_bug["assignee"], oldest_bug["priority"], oldest_bug["status"])
    )
    plain_lines.append("  " + oldest_bug["url"])
    plain_lines.append("")

plain_lines.append("Screenshots attached:")
plain_lines.append("1. chart-priority-status.png  - distribution breakdown (priority / status)")
plain_lines.append("2. chart-team-workload.png    - team workload distribution")
plain_lines.append("3. content-kpi-overview.png   - overview snapshot KPI tiles")
plain_lines.append("4. content-top-bugs.png       - Top 20 Oldest Bugs table")
plain_lines.append("")
plain_lines.append("Live dashboard: " + live_dashboard_url)
plain_lines.append("")
plain_lines.append("Please let me know if you have any questions regarding this report.")
plain_lines.append("")
plain_lines.append("Regards,")
plain_lines.append("Rajendra Kumar")
plain_lines.append("TrueValueHub Engineering")
plain = "\n".join(plain_lines) + "\n"


# ---------------------------------------------------------------
# HTML body
# ---------------------------------------------------------------
filters_html = ""
if active_filters:
    filters_html = (
        '<p style="margin:0 0 12px 0;font-size:12px;">'
        '<span style="display:inline-block;background-color:#fff7ed;color:#9a3412;'
        'font-weight:bold;padding:3px 10px;border-radius:3px;">'
        "Filtered view: " + ", ".join(active_filters) + "</span></p>"
    )

breakdown_caption = ""
if top_priority or top_status:
    bits = []
    if top_priority:
        bits.append("Most common priority: <b>%s</b> (%d)" % (top_priority["label"], top_priority["count"]))
    if top_status:
        bits.append("Most common status: <b>%s</b> (%d)" % (top_status["label"], top_status["count"]))
    breakdown_caption = (
        '<tr><td style="padding:6px 32px 0 32px;font-size:12px;color:#555555;">'
        + " &middot; ".join(bits) + "</td></tr>"
    )

workload_caption = ""
if top_workload:
    workload_caption = (
        '<tr><td style="padding:6px 32px 0 32px;font-size:12px;color:#555555;">'
        "Highest current load: <b>%s</b> (%d total &ndash; %ds / %db)</td></tr>"
        % (top_workload["name"], top_workload["total"], top_workload["stories"], top_workload["bugs"])
    )

oldest_bug_html = ""
if oldest_bug:
    oldest_bug_html = """\
<tr>
<td style="padding:20px 32px 4px 32px;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fef2f2;border-left:4px solid #b91c1c;">
<tr><td style="padding:12px 16px;font-size:12px;line-height:1.6;">
<div style="font-weight:bold;color:#b91c1c;text-transform:uppercase;letter-spacing:.4px;font-size:11px;margin-bottom:4px;">Attention Required &ndash; Oldest Open Bug</div>
<a href="%s" style="color:#1f3864;font-weight:bold;text-decoration:none;">%s</a> &ndash; &quot;%s&quot;<br>
<span style="color:#333333;">%s open &middot; assigned to <b>%s</b> &middot; %s &middot; %s</span>
</td></tr>
</table>
</td>
</tr>""" % (
        oldest_bug["url"],
        oldest_bug["key"],
        oldest_bug["summary"],
        oldest_bug["due"],
        oldest_bug["assignee"],
        oldest_bug["priority"],
        oldest_bug["status"],
    )

html = """\
<html>
<body style="margin:0;padding:0;background-color:#f2f2f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f2f2;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px;background-color:#ffffff;border:1px solid #d9d9d9;font-family:Calibri,Arial,sans-serif;color:#222222;">

<!-- Letterhead -->
<tr>
<td bgcolor="#1f3864" style="padding:20px 32px;">
<div style="color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;">TrueValueHub Engineering</div>
<div style="color:#ffffff;font-size:19px;font-weight:bold;padding-top:4px;">Daily Status Report &ndash; Project COS</div>
<div style="color:#c9d3e6;font-size:12px;padding-top:2px;">Open Stories &amp; Bugs &middot; Snapshot date: __SNAPSHOT_DATE__</div>
</td>
</tr>

<!-- Salutation / intro -->
<tr>
<td style="padding:24px 32px 4px 32px;font-size:14px;line-height:1.55;">
<p style="margin:0 0 12px 0;">Dear Rajendra Kumar,</p>
<p style="margin:0 0 12px 0;">Please find below today&rsquo;s status update for project <b>COS</b>, covering all open Stories and Bugs as of the snapshot date above.</p>
__FILTERS_HTML__
</td>
</tr>

<!-- KPI tiles -->
<tr>
<td style="padding:0 32px 20px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="20%" align="center" style="padding:3px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-top:3px solid #2e5395;">
<tr><td align="center" style="padding:10px 4px 2px 4px;font-size:20px;font-weight:bold;color:#1f3864;">__STORIES__</td></tr>
<tr><td align="center" style="padding:0 4px 10px 4px;font-size:10px;color:#64748b;">STORIES</td></tr>
</table>
</td>
<td width="20%" align="center" style="padding:3px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-top:3px solid #b1544a;">
<tr><td align="center" style="padding:10px 4px 2px 4px;font-size:20px;font-weight:bold;color:#1f3864;">__BUGS__</td></tr>
<tr><td align="center" style="padding:0 4px 10px 4px;font-size:10px;color:#64748b;">BUGS</td></tr>
</table>
</td>
<td width="20%" align="center" style="padding:3px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-top:3px solid #1f3864;">
<tr><td align="center" style="padding:10px 4px 2px 4px;font-size:20px;font-weight:bold;color:#1f3864;">__TOTAL__</td></tr>
<tr><td align="center" style="padding:0 4px 10px 4px;font-size:10px;color:#64748b;">TOTAL OPEN</td></tr>
</table>
</td>
<td width="20%" align="center" style="padding:3px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-top:3px solid #2f6f62;">
<tr><td align="center" style="padding:10px 4px 2px 4px;font-size:20px;font-weight:bold;color:#1f3864;">__ASSIGNEES__</td></tr>
<tr><td align="center" style="padding:0 4px 10px 4px;font-size:10px;color:#64748b;">ASSIGNEES</td></tr>
</table>
</td>
<td width="20%" align="center" style="padding:3px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff7ed;border-top:3px solid #c1791a;">
<tr><td align="center" style="padding:10px 4px 2px 4px;font-size:20px;font-weight:bold;color:#9a3412;">__AGING__</td></tr>
<tr><td align="center" style="padding:0 4px 10px 4px;font-size:10px;color:#9a3412;">AGING 90+D</td></tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<!-- Screenshot: Distribution Breakdown -->
<tr>
<td style="padding:4px 32px 4px 32px;">
<div style="font-size:13px;font-weight:bold;color:#1f3864;border-bottom:2px solid #1f3864;padding-bottom:4px;">Distribution Breakdown</div>
</td>
</tr>
<tr>
<td style="padding:10px 32px 0 32px;">
<img src="cid:chart_priority_status" alt="Priority / Status breakdown" width="576" style="width:100%;max-width:576px;display:block;border:1px solid #d9d9d9;">
</td>
</tr>
__BREAKDOWN_CAPTION__

<!-- Screenshot: Team Workload -->
<tr>
<td style="padding:24px 32px 4px 32px;">
<div style="font-size:13px;font-weight:bold;color:#1f3864;border-bottom:2px solid #1f3864;padding-bottom:4px;">Team Workload Distribution</div>
</td>
</tr>
<tr>
<td style="padding:10px 32px 0 32px;">
<img src="cid:chart_team_workload" alt="Team workload distribution" width="576" style="width:100%;max-width:576px;display:block;border:1px solid #d9d9d9;">
</td>
</tr>
__WORKLOAD_CAPTION__

__OLDEST_BUG_HTML__

<!-- Attachments (brief) -->
<tr>
<td style="padding:20px 32px 4px 32px;font-size:11px;color:#94a3b8;border-top:1px solid #d9d9d9;padding-top:12px;">
Also attached for reference: content-kpi-overview.png, content-top-bugs.png (Top 20 Oldest Bugs).
</td>
</tr>

<!-- Closing -->
<tr>
<td style="padding:16px 32px 28px 32px;font-size:13px;line-height:1.6;">
<p style="margin:0 0 4px 0;">Live dashboard: <a href="__LIVE_URL__" style="color:#1f3864;">__LIVE_URL__</a></p>
<p style="margin:16px 0 0 0;">Please let me know if you have any questions regarding this report.</p>
<p style="margin:16px 0 0 0;">
Regards,<br>
<b>Rajendra Kumar</b><br>
TrueValueHub Engineering
</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
"""

html = (
    html.replace("__SNAPSHOT_DATE__", snapshot_date)
    .replace("__FILTERS_HTML__", filters_html)
    .replace("__STORIES__", str(stats["stories"]))
    .replace("__BUGS__", str(stats["bugs"]))
    .replace("__TOTAL__", str(stats["total"]))
    .replace("__ASSIGNEES__", str(stats["assignees"]))
    .replace("__AGING__", str(stats["aging"]))
    .replace("__BREAKDOWN_CAPTION__", breakdown_caption)
    .replace("__WORKLOAD_CAPTION__", workload_caption)
    .replace("__OLDEST_BUG_HTML__", oldest_bug_html)
    .replace("__LIVE_URL__", live_dashboard_url)
)

msg = EmailMessage()
msg["From"] = TO
msg["To"] = TO
msg["Subject"] = SUBJECT
msg["Date"] = formatdate(localtime=True)
msg.set_content(plain)
msg.add_alternative(html, subtype="html")

html_part = msg.get_payload()[1]
html_part.add_related(read("chart-priority-status.png"), maintype="image", subtype="png", cid="<chart_priority_status>")
html_part.add_related(read("chart-team-workload.png"), maintype="image", subtype="png", cid="<chart_team_workload>")

for fname in ["content-kpi-overview.png", "content-top-bugs.png"]:
    msg.add_attachment(read(fname), maintype="image", subtype="png", filename=fname)

with open(OUT, "wb") as f:
    f.write(msg.as_bytes())

print("Wrote:", OUT)
