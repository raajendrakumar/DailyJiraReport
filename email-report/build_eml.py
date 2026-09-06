import os
from email.message import EmailMessage
from email.utils import formatdate

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(SCRIPT_DIR, "mail-assets")
OUT = os.path.join(SCRIPT_DIR, "Daily Jira Report - Dashboard.eml")

TO = "Rajendra.Kumar@truevaluehub.com"
SUBJECT = "Daily Status Report - Project COS - Open Stories & Bugs (24 Aug 2026)"

plain = """TRUEVALUEHUB ENGINEERING
Daily Status Report - Project COS - Open Stories & Bugs
Snapshot date: 24 August 2026

Dear Rajendra Kumar,

Please find below the daily status report for project COS, covering all open
Stories and Bugs as of the snapshot date above. A full breakdown, team
workload distribution, and the current top risk item are summarized below.
Supporting screenshots are attached for reference.

1. EXECUTIVE SUMMARY
   Stories open ............... 47
   Bugs open ................... 10
   Total open items ............ 57
   Assignees .................... 11
   Aging 90+ days (critical) .... 16

2. DISTRIBUTION BREAKDOWN
   By Priority:  Highest 6 | High 7 | Medium 44
   By Status:    To Do 56 | Dev In Progress 1

3. TEAM WORKLOAD DISTRIBUTION
   Assignee     Stories   Bugs   Total   Aging 90+d
   Amjath          10       1     11         1
   Morgan           7       3     10         6
   Rosiya          10       0     10         0
   Akhila           6       0      6         4
   Amrut            1       4      5         2
   Kishan           4       0      4         2
   Guhan            1       2      3         0
   Sanapathi        3       0      3         0
   Arun             2       0      2         0
   Satyateja        2       0      2         1
   Naveen           1       0      1         0

4. KEY RISK - OLDEST OPEN BUG
   COS-4889 - "Core details are extracted wrongly"
   150 days open - Assigned to Amrut - Priority High - Status To Do
   https://truevaluehub.atlassian.net/browse/COS-4889

5. ATTACHMENTS (content screenshots - the charts are already shown inline above)
   1. content-kpi-overview.png  - overview snapshot KPI tiles
   2. content-top-bugs.png      - Top 20 Oldest Bugs table

Live dashboard: https://raajendrakumar.github.io/DailyJiraReport/

Please let me know if you have any questions regarding this report.

Regards,
Rajendra Kumar
TrueValueHub Engineering
"""

html = """\
<html>
<body style="margin:0;padding:0;background-color:#f2f2f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f2f2;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="660" cellpadding="0" cellspacing="0" border="0" style="width:660px;max-width:660px;background-color:#ffffff;border:1px solid #d9d9d9;font-family:Calibri,Arial,sans-serif;color:#222222;">

<!-- Letterhead -->
<tr>
<td bgcolor="#1f3864" style="padding:20px 32px;">
<div style="color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;">TrueValueHub Engineering</div>
<div style="color:#ffffff;font-size:19px;font-weight:bold;padding-top:4px;">Daily Status Report &ndash; Project COS</div>
<div style="color:#c9d3e6;font-size:12px;padding-top:2px;">Open Stories &amp; Bugs &middot; Snapshot date: 24 August 2026</div>
</td>
</tr>

<!-- Salutation / intro -->
<tr>
<td style="padding:24px 32px 4px 32px;font-size:14px;line-height:1.55;">
<p style="margin:0 0 12px 0;">Dear Rajendra Kumar,</p>
<p style="margin:0 0 12px 0;">Please find below the daily status report for project <b>COS</b>, covering all open Stories and Bugs as of the snapshot date above. A breakdown by priority and status, the current team workload distribution, and the top risk item are summarized in the sections below. Supporting screenshots are attached for reference.</p>
</td>
</tr>

<!-- 1. Executive Summary -->
<tr>
<td style="padding:8px 32px 0 32px;">
<div style="font-size:14px;font-weight:bold;color:#1f3864;border-bottom:2px solid #1f3864;padding-bottom:4px;">1.&nbsp; Executive Summary</div>
</td>
</tr>
<tr>
<td style="padding:12px 32px 20px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;">
<tr style="background-color:#1f3864;">
<td style="padding:8px 12px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Metric</td>
<td align="right" style="padding:8px 12px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;width:100px;">Value</td>
</tr>
<tr>
<td style="padding:7px 12px;border:1px solid #d9d9d9;">Stories open</td>
<td align="right" style="padding:7px 12px;border:1px solid #d9d9d9;">47</td>
</tr>
<tr style="background-color:#f5f6f8;">
<td style="padding:7px 12px;border:1px solid #d9d9d9;">Bugs open</td>
<td align="right" style="padding:7px 12px;border:1px solid #d9d9d9;">10</td>
</tr>
<tr>
<td style="padding:7px 12px;border:1px solid #d9d9d9;font-weight:bold;">Total open items</td>
<td align="right" style="padding:7px 12px;border:1px solid #d9d9d9;font-weight:bold;">57</td>
</tr>
<tr style="background-color:#f5f6f8;">
<td style="padding:7px 12px;border:1px solid #d9d9d9;">Assignees</td>
<td align="right" style="padding:7px 12px;border:1px solid #d9d9d9;">11</td>
</tr>
<tr>
<td style="padding:7px 12px;border:1px solid #d9d9d9;color:#9a3412;font-weight:bold;">Aging 90+ days (critical)</td>
<td align="right" style="padding:7px 12px;border:1px solid #d9d9d9;color:#9a3412;font-weight:bold;">16</td>
</tr>
</table>
</td>
</tr>

<!-- 2. Distribution Breakdown -->
<tr>
<td style="padding:0 32px 0 32px;">
<div style="font-size:14px;font-weight:bold;color:#1f3864;border-bottom:2px solid #1f3864;padding-bottom:4px;">2.&nbsp; Distribution Breakdown</div>
</td>
</tr>
<tr>
<td style="padding:12px 32px 10px 32px;">
<img src="cid:chart_priority_status" alt="Priority / Status breakdown chart" width="596" style="width:100%;max-width:596px;display:block;">
</td>
</tr>
<tr>
<td style="padding:0 32px 20px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" valign="top" style="padding-right:8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;">
<tr style="background-color:#1f3864;"><td style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Priority</td><td align="right" style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Count</td></tr>
<tr><td style="padding:6px 10px;border:1px solid #d9d9d9;">Highest</td><td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;">6</td></tr>
<tr style="background-color:#f5f6f8;"><td style="padding:6px 10px;border:1px solid #d9d9d9;">High</td><td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;">7</td></tr>
<tr><td style="padding:6px 10px;border:1px solid #d9d9d9;">Medium</td><td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;">44</td></tr>
</table>
</td>
<td width="50%" valign="top" style="padding-left:8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;">
<tr style="background-color:#1f3864;"><td style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Status</td><td align="right" style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Count</td></tr>
<tr><td style="padding:6px 10px;border:1px solid #d9d9d9;">To Do</td><td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;">56</td></tr>
<tr style="background-color:#f5f6f8;"><td style="padding:6px 10px;border:1px solid #d9d9d9;">Dev In Progress</td><td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;">1</td></tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<!-- 3. Team Workload -->
<tr>
<td style="padding:0 32px 0 32px;">
<div style="font-size:14px;font-weight:bold;color:#1f3864;border-bottom:2px solid #1f3864;padding-bottom:4px;">3.&nbsp; Team Workload Distribution</div>
</td>
</tr>
<tr>
<td style="padding:12px 32px 10px 32px;">
<img src="cid:chart_team_workload" alt="Team workload chart" width="596" style="width:100%;max-width:596px;display:block;">
</td>
</tr>
<tr>
<td style="padding:0 32px 20px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-collapse:collapse;">
<tr style="background-color:#1f3864;">
<td style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Assignee</td>
<td align="right" style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Stories</td>
<td align="right" style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Bugs</td>
<td align="right" style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Total</td>
<td align="right" style="padding:6px 10px;color:#ffffff;font-weight:bold;border:1px solid #1f3864;">Aging 90+d</td>
</tr>
{workload_rows}
</table>
</td>
</tr>

<!-- 4. Key Risk -->
<tr>
<td style="padding:0 32px 0 32px;">
<div style="font-size:14px;font-weight:bold;color:#1f3864;border-bottom:2px solid #1f3864;padding-bottom:4px;">4.&nbsp; Key Risk &ndash; Oldest Open Bug</div>
</td>
</tr>
<tr>
<td style="padding:12px 32px 20px 32px;font-size:13px;line-height:1.6;">
<p style="margin:0;">
<a href="https://truevaluehub.atlassian.net/browse/COS-4889" style="color:#1f3864;font-weight:bold;text-decoration:none;">COS-4889</a>
&ndash; &quot;Core details are extracted wrongly&quot; has been open for <b>150 days</b>, the longest of any item in the current snapshot.
Assigned to <b>Amrut</b>, priority <b>High</b>, status <b>To Do</b>. Recommend prioritizing for review in the next sprint planning session.
</p>
</td>
</tr>

<!-- 5. Attachments -->
<tr>
<td style="padding:0 32px 0 32px;border-top:1px solid #d9d9d9;padding-top:16px;">
<div style="font-size:14px;font-weight:bold;color:#1f3864;">5.&nbsp; Attachments</div>
<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Content screenshots only &ndash; the charts are already shown inline in sections 2 and 3 above.</div>
</td>
</tr>
<tr>
<td style="padding:10px 32px 4px 32px;font-size:13px;color:#333333;line-height:1.8;">
1.&nbsp; content-kpi-overview.png &ndash; overview snapshot KPI tiles<br>
2.&nbsp; content-top-bugs.png &ndash; Top 20 Oldest Bugs table
</td>
</tr>

<!-- Closing -->
<tr>
<td style="padding:16px 32px 28px 32px;font-size:13px;line-height:1.6;">
<p style="margin:0 0 4px 0;">Live dashboard: <a href="https://raajendrakumar.github.io/DailyJiraReport/" style="color:#1f3864;">https://raajendrakumar.github.io/DailyJiraReport/</a></p>
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

WORKLOAD = [
    ("Amjath", 10, 1, 11, 1),
    ("Morgan", 7, 3, 10, 6),
    ("Rosiya", 10, 0, 10, 0),
    ("Akhila", 6, 0, 6, 4),
    ("Amrut", 1, 4, 5, 2),
    ("Kishan", 4, 0, 4, 2),
    ("Guhan", 1, 2, 3, 0),
    ("Sanapathi", 3, 0, 3, 0),
    ("Arun", 2, 0, 2, 0),
    ("Satyateja", 2, 0, 2, 1),
    ("Naveen", 1, 0, 1, 0),
]

rows = []
for i, (name, stories, bugs, total, aging) in enumerate(WORKLOAD):
    bg = ' style="background-color:#f5f6f8;"' if i % 2 == 1 else ""
    aging_style = "color:#9a3412;font-weight:bold;" if aging > 0 else ""
    rows.append(
        f'<tr{bg}>'
        f'<td style="padding:6px 10px;border:1px solid #d9d9d9;">{name}</td>'
        f'<td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;">{stories}</td>'
        f'<td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;">{bugs}</td>'
        f'<td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;font-weight:bold;">{total}</td>'
        f'<td align="right" style="padding:6px 10px;border:1px solid #d9d9d9;{aging_style}">{aging}</td>'
        f'</tr>'
    )
html = html.replace("{workload_rows}", "\n".join(rows))

msg = EmailMessage()
msg["From"] = TO
msg["To"] = TO
msg["Subject"] = SUBJECT
msg["Date"] = formatdate(localtime=True)
msg.set_content(plain)
msg.add_alternative(html, subtype="html")

html_part = msg.get_payload()[1]

def read(fname):
    with open(os.path.join(ASSETS, fname), "rb") as f:
        return f.read()

html_part.add_related(read("chart-priority-status.png"), maintype="image", subtype="png", cid="<chart_priority_status>")
html_part.add_related(read("chart-team-workload.png"), maintype="image", subtype="png", cid="<chart_team_workload>")

for fname in ["content-kpi-overview.png", "content-top-bugs.png"]:
    msg.add_attachment(read(fname), maintype="image", subtype="png", filename=fname)

with open(OUT, "wb") as f:
    f.write(msg.as_bytes())

print("Wrote:", OUT)
