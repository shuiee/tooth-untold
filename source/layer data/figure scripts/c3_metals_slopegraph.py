#!/usr/bin/env python3
"""Metals as a SLOPEGRAPH, not a timeline.

The finding in this layer is not a trajectory - it is a contrast with controls.
Four industrial metals rise nine- to fourteen-fold in the same tissue at the
same life stage, while the dietary and geological elements barely move and
strontium FALLS. A log axis is required: the values span five orders of
magnitude, from 0.072 ppm chromium to 3075 ppm magnesium.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt

M = pd.read_csv('/home/claude/dental/particulates_metals_dataset.csv')
K = M[M.citation.str.contains('Kamenov') & (M.tissue == 'enamel')
      & ~M.analyte.str.contains('MTC')]
arch = K[K.site.str.contains('Archaeological')].set_index('analyte').value_mean
mod  = K[K.site.str.contains('Modern')].set_index('analyte').value_mean
els  = [e for e in ['Cu','Cr','Pb','Ni','Zn','Mg','Ba','Sr'] if e in arch and e in mod]

INDUSTRIAL = {'Pb','Cu','Cr','Ni'}
rc()
fig, ax = plt.subplots(figsize=(10.6, 8.6))
for s in ('top','right','bottom'): ax.spines[s].set_visible(False)
ax.spines['left'].set_visible(False)
ax.set_yscale('log'); ax.set_xlim(-.40, 1.95)
ax.tick_params(length=0, labelsize=8.2, colors=INK2)
ax.set_xticks([0, 1])
ax.set_xticklabels(['archaeological enamel\n4040 BCE – 1775 CE\nn = 38',
                    'modern enamel\n1860 – 1975\n20th-century births'], fontsize=9.6)
ax.tick_params(axis='x', colors=INK, pad=12)
for gv in [0.05, 0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000, 5000]:
    ax.axhline(gv, color=GRID, lw=.7, zorder=0)
ax.set_yticks([0.1, 1, 10, 100, 1000])
ax.set_yticklabels(['0.1', '1', '10', '100', '1000'])
ax.yaxis.set_minor_locator(plt.NullLocator())
ax.set_ylabel('parts per million by mass, log scale', fontsize=9, color=INK2, labelpad=10)
ax.set_ylim(0.04, 6500)

def spread(vals, gap):
    """Push label positions apart in log space, preserving order."""
    idx = np.argsort(vals); out = np.array(vals, dtype=float)
    lv = np.log10(out[idx])
    for i in range(1, len(lv)):
        if lv[i] - lv[i-1] < gap: lv[i] = lv[i-1] + gap
    out[idx] = 10 ** lv
    return out

A = np.array([arch[e] for e in els]); Mv = np.array([mod[e] for e in els])
Ay, My = spread(A, .135), spread(Mv, .145)

for e in els:
    a, m = arch[e], mod[e]
    hot = e in INDUSTRIAL
    col = METAL if hot else FAINT
    ax.plot([0, 1], [a, m], color=col, lw=2.6 if hot else 1.7,
            zorder=4 if hot else 3, solid_capstyle='round', alpha=1 if hot else .95)
    for x, v in ((0, a), (1, m)):
        ax.plot([x], [v], 'o', ms=8 if hot else 6.5, mfc=col, mec=SURF, mew=1.6,
                zorder=5)

for k, e in enumerate(els):
    a, m, hot = arch[e], mod[e], e in INDUSTRIAL
    col = METAL if hot else FAINT
    r = m / a
    ax.plot([-.055, -.105], [a, Ay[k]], color=col, lw=.8, alpha=.55, zorder=2)
    ax.annotate(f'{a:g}', (-.115, Ay[k]), ha='right', va='center',
                fontsize=8.6, color=INK if hot else INK2)
    ax.plot([1.055, 1.115], [m, My[k]], color=col, lw=.8, alpha=.55, zorder=2)
    lab = f'{e}   {m:g}    ×{r:.1f}' if r >= 1 else f'{e}   {m:g}    ×{r:.2f}'
    ax.annotate(lab, (1.135, My[k]), ha='left', va='center',
                fontsize=10 if hot else 9.2,
                color=INK if hot else INK2,
                fontweight='semibold' if hot else 'normal')

ax.text(.50, 26, 'four industrial metals rise together',
        fontsize=11, color=METAL, fontweight='semibold', ha='center', va='center')
ax.text(.50, 700, 'dietary and geological elements barely move —\n'
        'strontium actually falls', fontsize=9.6, color=INK2, ha='center',
        va='center', linespacing=1.55)

title(fig, 'The enamel ran its own controlled experiment',
      'Trace elements in human tooth enamel · childhood exposure on both sides · '
      'Kamenov et al. 2018, Table 1', y=.972, ys=.930, x=.045)
notes(fig, [
 '1  Both columns are enamel, both are CHILDHOOD exposure, both measured by solution ICP-MS on '
 'cleaned enamel in the same study. The archaeological samples passed the MTC diagenesis screen. '
 'This is a like-for-like comparison, which is why the contrast between the two groups of '
 'elements can be read as real rather than methodological.',
 '2  The left column is a single pooled value spanning 5,815 years, not a period. Kamenov reports '
 'that only 7 of the 38 archaeological samples exceed 1 ppm lead, so that baseline is genuinely '
 'flat rather than an average hiding variation.',
 '3  What this figure does NOT show: modern lead is not the highest lead ever recorded in enamel. '
 'Five Roman Empire sites average 7.00 ppm (Moore et al. 2021), above the modern 6.55. The claim '
 'here is about the control structure, not about an all-time maximum.',
 '4  Even magnesium, the most abundant element shown, is 0.31% of enamel by mass. Lead at its '
 'modern maximum is 0.00066%. None of these is a visible fraction of a tooth.'],
 x=.045, width=148)
fig.subplots_adjust(left=.115, right=.815, top=.845, bottom=.285)
fig.savefig('/home/claude/dental/viz/c3_metals_slopegraph.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c3_metals_slopegraph.svg')
for e in els: print(f'{e:3s} {arch[e]:9.3f} -> {mod[e]:9.3f}   x{mod[e]/arch[e]:.2f}')
