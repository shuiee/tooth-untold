#!/usr/bin/env python3
"""Caries severity as one composition, replacing the escape-rate + ridgeline pair.

Why this replaces the earlier version:
  - it shows % WHO HAD caries, not the complement
  - no median: the median is useless here, moving only 2,2,2,2,3,3 across the
    whole record while the 90th percentile goes 6 -> 10. A heavily right-skewed
    count needs its tail shown, not its centre
  - one axis, share of all adults, explicitly labelled
  - severity in NUMBER OF TEETH, not a share of a shifting denominator
  - the change over time is a change in the shape of a single bar
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt

a = load_ghhp(); rc()
BANDS = [(0, 0, 'no caries'), (1, 2, '1–2 teeth'), (3, 4, '3–4 teeth'),
         (5, 9, '5–9 teeth'), (10, 99, '10+ teeth')]
# severity is ORDERED -> ordinal ramp; "no caries" is absence, so it is neutral
COL = ['#dcdbd6', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b']

M = pd.DataFrame(index=PERIODS, columns=[b[2] for b in BANDS], dtype=float)
NN = {}
for p in PERIODS:
    d = a[a.period == p].teeth_with_caries.dropna()
    NN[p] = len(d)
    for lo, hi, lab in BANDS:
        M.loc[p, lab] = 100 * ((d >= lo) & (d <= hi)).mean()

fig, ax = plt.subplots(figsize=(12.8, 7.4))
for s in ('top', 'right', 'left'): ax.spines[s].set_visible(False)
ax.spines['bottom'].set_color(GRID)
ax.tick_params(colors=INK2, length=0, labelsize=8.6)
ax.set_axisbelow(True); ax.grid(axis='x', color=GRID, lw=.7, zorder=0)

H = .62
for i, p in enumerate(PERIODS):
    y = len(PERIODS) - 1 - i
    left = 0.0
    for j, (_, _, lab) in enumerate(BANDS):
        w = M.loc[p, lab]
        ax.barh(y, w, left=left, height=H, color=COL[j], zorder=3,
                edgecolor=SURF, linewidth=1.6)
        if w >= 4.2:
            ax.text(left + w/2, y, f'{w:.0f}', ha='center', va='center',
                    fontsize=9, fontweight='semibold',
                    color=SURF if j >= 2 else INK)
        left += w
    ax.annotate(f'n = {NN[p]:,}', (101.2, y), fontsize=7.8, color=MUTED,
                va='center', annotation_clip=False)

ax.set_yticks(range(len(PERIODS)))
ax.set_yticklabels(PERIODS[::-1], fontsize=10)
ax.tick_params(axis='y', colors=INK)
ax.set_xlim(0, 100); ax.set_ylim(-1.15, len(PERIODS) - .10)
ax.set_xticks(range(0, 101, 10))
ax.set_xticklabels([f'{v}%' for v in range(0, 101, 10)])
ax.set_xlabel('share of all adults in the period', fontsize=9.6, color=INK2, labelpad=10)

from matplotlib.patches import Patch
ax.legend(handles=[Patch(facecolor=c, label=l) for c, (_, _, l) in zip(COL, BANDS)],
          frameon=False, fontsize=9, loc='upper left', bbox_to_anchor=(0, 1.135),
          ncol=5, labelcolor=INK2, handlelength=1.5, handleheight=1.0,
          columnspacing=1.9, title='number of that person’s own teeth that were carious',
          title_fontsize=8.4, alignment='left')
ax.get_legend().get_title().set_color(MUTED)

ax.annotate('', xy=(24.1, -.95), xytext=(47.2, -.95),
            arrowprops=dict(arrowstyle='<|-', color=INK2, lw=1.1, alpha=.65))
ax.text(25.5, -.70, 'untouched mouths: 47% → 24%', fontsize=9, color=INK2)
ax.annotate('', xy=(100, 5.52), xytext=(71.6, 5.52),
            arrowprops=dict(arrowstyle='-|>', color=INK2, lw=1.1, alpha=.65))
ax.text(70.5, 5.74, 'five or more carious teeth: 9% → 28%', fontsize=9,
        color=INK2, ha='right')

title(fig, 'Fewer people escaped, and those who didn’t had it worse',
      'Every adult in the record, sorted by how many of their own teeth were carious · '
      'GHHP European module · adults 18–69', y=.972, ys=.933, x=.048)
notes(fig, [
 '1  WHY NOT A MEDIAN. Among affected individuals the median number of carious teeth is 2, 2, 2, '
 '2, 3, 3 across the six periods — almost flat. The mean moves 3.2 → 4.6 and the 90th percentile '
 '6 → 10. The distribution is heavily right-skewed with most of its mass at one or two teeth, so '
 'the centre is the least informative summary available. This figure shows the whole shape instead.',
 '2  WHY TEETH AND NOT PERCENTAGES. A person’s own tooth count varies: mean teeth observed per '
 'adult ranges from 17.3 (Industrial) to 19.8 (High medieval). A share of a shifting denominator '
 'is harder to hold in mind than a count, and the denominator drift is only about 13%.',
 '3  WHAT MOVES. The untouched share falls from 47% in the high medieval period to 24% in the '
 'industrial. The severely affected share — five or more carious teeth — rises from 9% to 28%. '
 'The worst band, ten or more, goes from 0.5% to 8.7%, a seventeenfold increase. Both mechanisms '
 'run at once, and a single average would report only their blend.',
 '4  Age is not controlled here; this figure is about the shape of the distribution. For the age '
 'structure see the companion figure, where age is the x-axis.',
 '5  Source: Global History of Health Project European module, decoded for this project.'],
 x=.048, width=156)
fig.subplots_adjust(left=.155, right=.935, top=.820, bottom=.330)
fig.savefig('/home/claude/dental/viz/c2b_caries_severity.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c2b_caries_severity.svg')
M.round(1).assign(n=[NN[p] for p in PERIODS]).to_csv(
    '/home/claude/dental/viz/c2b_caries_severity_data.csv')
print(M.round(1).to_string())
