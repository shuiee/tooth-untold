#!/usr/bin/env python3
"""Caries PREVALENCE as an age x period matrix.

Why a matrix and not a line: age at death explains more variance in every GHHP
indicator than time does, and the period samples differ in mean age at death by
up to 13 years. A line of period means confounds the two. Making age an axis is
the only honest way to show this dataset.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt

a = load_ghhp(); rc()
a = a.copy(); a['any_caries'] = a.any_caries.astype(float)
P = a.pivot_table(index='period', columns='ab', values='any_caries',
                  aggfunc='mean', observed=False).reindex(PERIODS).astype(float) * 100
N = a.pivot_table(index='period', columns='ab', values='any_caries',
                  aggfunc='size', observed=False).reindex(PERIODS).astype(float)

fig, ax = plt.subplots(figsize=(11.6, 6.4))
im = ax.imshow(P.values, cmap=CMAP_BLUE, vmin=20, vmax=90, aspect='auto')
ax.set_xticks(range(len(AGE_LABS))); ax.set_xticklabels(AGE_LABS, fontsize=9)
ax.set_yticks(range(len(PERIODS)));  ax.set_yticklabels(PERIODS, fontsize=9.6)
ax.tick_params(colors=INK, length=0)
for s in ax.spines.values(): s.set_visible(False)
ax.set_xticks(np.arange(-.5, len(AGE_LABS), 1), minor=True)
ax.set_yticks(np.arange(-.5, len(PERIODS), 1), minor=True)
ax.grid(which='minor', color=SURF, lw=2.4); ax.tick_params(which='minor', length=0)

for i in range(P.shape[0]):
    for j in range(P.shape[1]):
        v = P.values[i, j]
        if np.isnan(v): continue
        ax.text(j, i - .12, f'{v:.0f}%', ha='center', va='center', fontsize=10.2,
                color=SURF if v > 62 else INK, fontweight='semibold')
        ax.text(j, i + .24, f'n={N.values[i,j]:.0f}', ha='center', va='center',
                fontsize=6.4, color=SURF if v > 62 else MUTED, alpha=.75)

ax.set_xlabel('age at death', fontsize=9.4, color=INK2, labelpad=9)

# the two cells the argument rests on
ax.annotate('80% of 18–24s already carious — higher than any\n'
            '60-year-old cohort in eighteen preceding centuries',
            xy=(0, 5.42), xytext=(0.45, 6.30), fontsize=8.8, color=INK2,
            ha='left', va='center', linespacing=1.55, annotation_clip=False,
            arrowprops=dict(arrowstyle='-', color=MUTED, lw=.9,
                            connectionstyle='arc3,rad=-0.25'))
ax.set_ylim(6.55, -0.55)

cb = fig.colorbar(im, ax=ax, fraction=.020, pad=.014)
cb.set_label('% with caries', fontsize=8.2, color=INK2, labelpad=8)
cb.outline.set_visible(False); cb.ax.tick_params(colors=INK2, length=0, labelsize=7.8)

title(fig, 'By the Industrial period, caries no longer waits for middle age',
      'Share of adults with at least one carious tooth · GHHP European module · '
      'every cell n ≥ 25', y=.975, ys=.933)
notes(fig, [
 '0  The 18–24 column does NOT rise steadily: 56% pre-medieval, 30% and 28% through the early and '
 'high medieval, then 55%, 58%, and 80%. The medieval dip is as real as the industrial spike.',
 '1  Age at death is an axis here, not a control. It explains more variance in every GHHP oral '
 'health indicator than historical period does (antemortem tooth loss: adjusted R² = 0.28 by age '
 'alone). A single line of period means would confound the two.',
 '2  Read DOWN a column, not across a row: within one age band, the rise over time is the signal. '
 'Reading across a row shows caries accumulating over a lifetime, which is expected and not news.',
 '3  The Industrial row is nearly flat. By then the disease arrives before adulthood, so age stops '
 'discriminating — the population is saturated.',
 '4  Source: Global History of Health Project European module, decoded for this project. '
 'Period definitions follow Wittwer-Backofen & Engel (2019), The Backbone of Europe, CUP.'])
fig.subplots_adjust(left=.135, right=.955, top=.840, bottom=.325)
fig.savefig('/home/claude/dental/viz/c1_caries_prevalence.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c1_caries_prevalence.svg')
print(P.round(1).to_string())
