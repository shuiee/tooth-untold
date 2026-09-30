#!/usr/bin/env python3
"""Wear and childhood stress on the same age x period grid as caries.

Two indicators that behave completely differently with age, which is exactly
why they belong on an axis that shows age. Wear ACCUMULATES - it should rise
across every row. Hypoplasia is fixed in childhood and never remodels, so it
should be FLAT across a row. Where it is not flat, something is wrong with the
sample rather than with the teeth.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt

a = load_ghhp(); rc()
a = a.copy(); a['leh_present'] = a.leh_present.astype(float)
W = a.pivot_table(index='period', columns='ab', values='molar_wear_mean',
                  aggfunc='mean', observed=False).reindex(PERIODS).astype(float)
WN = a.pivot_table(index='period', columns='ab', values='molar_wear_mean',
                   aggfunc='count', observed=False).reindex(PERIODS).astype(float)
L = a.pivot_table(index='period', columns='ab', values='leh_present',
                  aggfunc='mean', observed=False).reindex(PERIODS).astype(float) * 100
LN = a.pivot_table(index='period', columns='ab', values='leh_present',
                   aggfunc='count', observed=False).reindex(PERIODS).astype(float)

fig, axes = plt.subplots(2, 1, figsize=(11.8, 9.9),
                         gridspec_kw=dict(hspace=.36))

def grid(ax, D, N, vmin, vmax, fmt, thresh, ttl, sub, cmap, cblab):
    im = ax.imshow(D.values, cmap=cmap, vmin=vmin, vmax=vmax, aspect='auto')
    ax.set_xticks(range(len(AGE_LABS))); ax.set_xticklabels(AGE_LABS, fontsize=8.8)
    ax.set_yticks(range(len(PERIODS)));  ax.set_yticklabels(PERIODS, fontsize=9.2)
    ax.tick_params(colors=INK, length=0)
    for s in ax.spines.values(): s.set_visible(False)
    ax.set_xticks(np.arange(-.5, len(AGE_LABS), 1), minor=True)
    ax.set_yticks(np.arange(-.5, len(PERIODS), 1), minor=True)
    ax.grid(which='minor', color=SURF, lw=2.4); ax.tick_params(which='minor', length=0)
    for i in range(D.shape[0]):
        for j in range(D.shape[1]):
            v = D.values[i, j]
            if np.isnan(v): continue
            lo = v > thresh
            ax.text(j, i - .11, fmt.format(v), ha='center', va='center',
                    fontsize=9.6, color=SURF if lo else INK, fontweight='semibold')
            ax.text(j, i + .25, f'n={N.values[i,j]:.0f}', ha='center', va='center',
                    fontsize=6.2, color=SURF if lo else MUTED, alpha=.75)
    ax.set_title(ttl, loc='left', fontsize=12, color=INK, fontweight='semibold', pad=24)
    ax.text(0, 1.035, sub, transform=ax.transAxes, fontsize=8, color=MUTED, va='bottom')
    cb = fig.colorbar(im, ax=ax, fraction=.018, pad=.012)
    cb.set_label(cblab, fontsize=7.8, color=INK2, labelpad=7)
    cb.outline.set_visible(False)
    cb.ax.tick_params(colors=INK2, length=0, labelsize=7.4)

grid(axes[0], W, WN, 2.0, 5.9, '{:.1f}', 4.35,
     'Molar wear — accumulates, so every row should rise',
     'Mean Smith (1984) stage, 1–8 · rises left to right within a period, '
     'and the whole grid cools toward the Industrial row',
     CMAP_BLUE, 'Smith stage')
grid(axes[1], L, LN, 25, 65, '{:.0f}%', 47,
     'Childhood stress — fixed in childhood, so every row should be FLAT',
     'Share with linear enamel hypoplasia · enamel does not remodel, so age at '
     'death should not matter',
     CMAP_BLUE, '% with LEH')

axes[0].annotate('an Industrial 40-year-old has less worn molars\n'
                 'than a high-medieval 25-year-old',
                 xy=(4, 5), xytext=(2.05, 6.55), fontsize=8.6, color=INK2,
                 ha='left', va='center', linespacing=1.5, annotation_clip=False,
                 arrowprops=dict(arrowstyle='-', color=MUTED, lw=.9,
                                 connectionstyle='arc3,rad=-0.2'))
axes[0].set_ylim(6.75, -0.55)
axes[1].annotate('the Industrial row is the only one that climbs with age.\n'
                 'A childhood marker cannot do that — this is sample composition',
                 xy=(6, 5), xytext=(2.6, 6.55), fontsize=8.6, color=INK2,
                 ha='left', va='center', linespacing=1.5, annotation_clip=False,
                 arrowprops=dict(arrowstyle='-', color=MUTED, lw=.9,
                                 connectionstyle='arc3,rad=-0.2'))
axes[1].set_ylim(6.75, -0.55)
axes[1].set_xlabel('age at death', fontsize=9.2, color=INK2, labelpad=9)

title(fig, 'Two indicators, two opposite relationships with age',
      'GHHP European module · adults 18–69 · the same grid as the caries matrix',
      y=.978, ys=.946, x=.055, ts=16)
notes(fig, [
 '1  WEAR behaves as it should: rising across every row, because attrition accumulates over a '
 'lifetime. The signal is the whole grid cooling downward — an Industrial 40-year-old (3.27) has '
 'less worn molars than a high-medieval 25-year-old (3.45). Steel roller mills removed the stone '
 'grit that millstones shed into flour.',
 '2  Wear is recorded for only a small fraction of the GHHP database, which Wittwer-Backofen & '
 'Engel (2019) warn "might represent a specific selection of sites… the results should not be '
 'generalized". Several Industrial cells fall below n = 30; read them with that in mind.',
 '3  HYPOPLASIA should be flat across a row, because the defect forms before age six and enamel '
 'never remodels. In the five earlier periods it broadly is. The Industrial row climbs from 53% to '
 '61%, which no biological mechanism explains — it is most likely composition, different Industrial '
 'sites contributing different age groups.',
 '4  A claim that wear masks hypoplasia was tested and rejected: p = 0.1865 (first molars) and '
 'p = 0.0717 (second molars) in the published analysis; individual-level correlation here is −0.064.',
 '5  Source: Global History of Health Project European module, decoded for this project.'],
 x=.055, width=150)
fig.subplots_adjust(left=.145, right=.955, top=.878, bottom=.255)
fig.savefig('/home/claude/dental/viz/c6_wear_leh.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c6_wear_leh.svg')
print(W.round(2).to_string()); print(); print(L.round(0).to_string())
