import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import os

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mail-assets")

NAVY = "#1f3864"
STORIES_COLOR = "#2e5395"
BUGS_COLOR = "#b1544a"
PRIORITY_COLORS = {"Highest": "#9e2a2b", "High": "#c1791a", "Medium": "#2e5395"}
STATUS_COLORS = {"To Do": "#6b7280", "Dev In Progress": "#2f6f62"}
GRID = "#e2e5ea"
TEXT = "#333333"

plt.rcParams.update({
    "font.family": "Calibri" if "Calibri" in {f.name for f in fm.fontManager.ttflist} else "DejaVu Sans",
    "text.color": TEXT,
    "axes.edgecolor": GRID,
})


def style_axes(ax):
    for spine in ("top", "right", "left"):
        ax.spines[spine].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(axis="both", length=0)
    ax.set_axisbelow(True)


# ---------------------------------------------------------------
# Chart 1: Distribution Breakdown (Priority + Status), side by side
# ---------------------------------------------------------------
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9.4, 3.1), dpi=160)
fig.patch.set_facecolor("white")

priority = [("Medium", 44), ("High", 7), ("Highest", 6)]
labels = [p[0] for p in priority]
values = [p[1] for p in priority]
colors = [PRIORITY_COLORS[p[0]] for p in priority]
y = range(len(priority))
bars = ax1.barh(y, values, color=colors, height=0.55, zorder=3)
ax1.set_yticks(y)
ax1.set_yticklabels(labels, fontsize=11)
ax1.invert_yaxis()
ax1.set_xlim(0, max(values) * 1.22)
ax1.set_title("By Priority", fontsize=12, fontweight="bold", color=NAVY, loc="left", pad=10)
ax1.xaxis.set_visible(False)
style_axes(ax1)
for rect, v in zip(bars, values):
    ax1.text(rect.get_width() + max(values) * 0.02, rect.get_y() + rect.get_height() / 2,
              str(v), va="center", ha="left", fontsize=11, fontweight="bold", color=TEXT)

status = [("To Do", 56), ("Dev In Progress", 1)]
labels2 = [s[0] for s in status]
values2 = [s[1] for s in status]
colors2 = [STATUS_COLORS[s[0]] for s in status]
y2 = range(len(status))
bars2 = ax2.barh(y2, values2, color=colors2, height=0.55, zorder=3)
ax2.set_yticks(y2)
ax2.set_yticklabels(labels2, fontsize=11)
ax2.invert_yaxis()
ax2.set_xlim(0, max(values2) * 1.35)
ax2.set_title("By Status", fontsize=12, fontweight="bold", color=NAVY, loc="left", pad=10)
ax2.xaxis.set_visible(False)
style_axes(ax2)
for rect, v in zip(bars2, values2):
    ax2.text(rect.get_width() + max(values2) * 0.03, rect.get_y() + rect.get_height() / 2,
              str(v), va="center", ha="left", fontsize=11, fontweight="bold", color=TEXT)

fig.suptitle("Distribution Breakdown — Project COS", fontsize=13, fontweight="bold", color=NAVY, x=0.02, ha="left", y=1.03)
fig.tight_layout(rect=[0, 0, 1, 0.92])
fig.savefig(os.path.join(ASSETS, "chart-priority-status.png"), facecolor="white", bbox_inches="tight")
plt.close(fig)

# ---------------------------------------------------------------
# Chart 2: Team Workload Distribution (stacked horizontal bars)
# ---------------------------------------------------------------
WORKLOAD = [
    ("Amjath", 10, 1),
    ("Morgan", 7, 3),
    ("Rosiya", 10, 0),
    ("Akhila", 6, 0),
    ("Amrut", 1, 4),
    ("Kishan", 4, 0),
    ("Guhan", 1, 2),
    ("Sanapathi", 3, 0),
    ("Arun", 2, 0),
    ("Satyateja", 2, 0),
    ("Naveen", 1, 0),
]
names = [w[0] for w in WORKLOAD]
stories = [w[1] for w in WORKLOAD]
bugs = [w[2] for w in WORKLOAD]
totals = [s + b for s, b in zip(stories, bugs)]

fig2, ax = plt.subplots(figsize=(9.4, 4.6), dpi=160)
fig2.patch.set_facecolor("white")
y = range(len(names))
b1 = ax.barh(y, stories, color=STORIES_COLOR, height=0.6, zorder=3, label="Stories")
b2 = ax.barh(y, bugs, left=stories, color=BUGS_COLOR, height=0.6, zorder=3, label="Bugs")
ax.set_yticks(y)
ax.set_yticklabels(names, fontsize=11)
ax.invert_yaxis()
ax.set_xlim(0, max(totals) * 1.16)
ax.xaxis.set_visible(False)
style_axes(ax)
for i, total in enumerate(totals):
    ax.text(total + max(totals) * 0.02, i, str(total), va="center", ha="left", fontsize=11, fontweight="bold", color=TEXT)

ax.set_title("Team Workload Distribution — Stories vs. Bugs per Assignee", fontsize=13, fontweight="bold", color=NAVY, loc="left", pad=14)
ax.legend(loc="lower right", frameon=False, fontsize=10, ncol=2, bbox_to_anchor=(1.0, -0.12))
fig2.tight_layout()
fig2.savefig(os.path.join(ASSETS, "chart-team-workload.png"), facecolor="white", bbox_inches="tight")
plt.close(fig2)

print("Charts written to", ASSETS)
