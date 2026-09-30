#!/usr/bin/env python3
"""Caries DISTRIBUTION - the same data as the prevalence matrix, asking a
different question.

Prevalence answers "how many people were affected". It cannot distinguish a
population where the disease SPREADS to more people from one where the already
affected get WORSE. Wittwer-Backofen & Engel treat those as separate mechanisms.
This figure separates them: the left column is the share who escaped entirely,
the ridges are how bad it got for everyone else.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt
from scipy.stats import gaussian_kde

a = load_ghhp(); rc()
fig = plt.figure(figsize=(12.2, 7.9))
gs = fig.add_gridspec(1, 2, width_ratios=[1, 3.45], wspace=.045)
axL, axR = fig.add_subplot(gs[0]), fig.add_subplot(gs[1])

STEP = 1.0
rows = []
for i, p in enumerate(PERIODS):
    s = a[a.period == p].caries_rate.dropna()
    rows.append(dict(p=p, n=len(s), zero=(s == 0).mean(),
                     nz=s[s > 0].values, med=s[s > 0].median(),
                     p95=s[s > 0].quantile(.95)))

# --- left: the share who escaped -------------------------------------------
clean(axL, grid='x')
for i, r in enumerate(rows):
    y = -i * STEP
    axL.barh(y, r['zero'] * 100, height=.52, color=GHHP, alpha=.30, zorder=3)
    axL.plot([r['zero'] * 100], [y], 'o', ms=8, mfc=GHHP, mec=SURF, mew=1.5, zorder=4)
    axL.annotate(f"{r['zero']*100:.0f}%", (r['zero'] * 100, y), xytext=(9, 0),
                 textcoords='offset points', va='center', fontsize=10,
                 color=GHHP, fontweight='semibold')
axL.set_xlim(0, 62); axL.set_ylim(-5.85, .72)
axL.set_yticks([-i * STEP for i in range(6)]); axL.set_yticklabels(PERIODS, fontsize=9.6)
axL.tick_params(axis='y', colors=INK)
axL.set_xticks([0, 20, 40, 60]); axL.set_xticklabels(['0', '20%', '40%', '60%'])
axL.set_title('Escaped entirely', loc='left', fontsize=11, color=INK,
              fontweight='semibold', pad=14)
axL.text(0, 1.012, 'share with no carious tooth', transform=axL.transAxes,
         fontsize=7.8, color=MUTED, va='bottom')

# --- right: how bad it got for the rest -------------------------------------
clean(axR, grid=None)
axR.grid(axis='x', color=GRID, lw=.7, zorder=0)
xs = np.linspace(0, 1, 400)
for i, r in enumerate(rows):
    y = -i * STEP
    k = gaussian_kde(r['nz'], bw_method=.28)
    d = k(xs); d = d / d.max() * .60
    axR.fill_between(xs, y, y + d, color=GHHP, alpha=.22, zorder=3)
    axR.plot(xs, y + d, color=GHHP, lw=1.7, zorder=4, solid_capstyle='round')
    axR.plot([r['med']], [y], 'o', ms=7, mfc=GHHP, mec=SURF, mew=1.5, zorder=6)
    axR.plot([r['p95']], [y], '|', ms=11, color=GHHP, mew=2, zorder=6)
    axR.annotate(f"median {r['med']:.2f}", (r['med'], y), xytext=(9, 4),
                 textcoords='offset points', ha='left', va='bottom',
                 fontsize=7.8, color=INK2)
    axR.annotate(f"n={len(r['nz'])}", (1.0, y), xytext=(9, 0),
                 textcoords='offset points', va='center', fontsize=7.4, color=MUTED)
axR.set_xlim(-.02, 1.02); axR.set_ylim(-5.85, .72)
axR.set_yticks([]); axR.spines['left'].set_visible(False)
axR.set_xticks([0, .25, .5, .75, 1.0])
axR.set_xticklabels(['0', 'a quarter', 'half', 'three quarters', 'every tooth'])
axR.set_title('How bad it got for everyone else', loc='left', fontsize=11,
              color=INK, fontweight='semibold', pad=14)
axR.text(0, 1.012, 'share of a person\'s own teeth that were carious · '
         'affected individuals only · ● median, | 95th percentile',
         transform=axR.transAxes, fontsize=7.8, color=MUTED, va='bottom')

axR.annotate('by the Industrial period the 95th\npercentile reaches EVERY tooth',
             xy=(rows[5]['p95'], -5 * STEP - .04), xytext=(.50, -5.42),
             fontsize=8.8, color=INK2, ha='left', va='center', linespacing=1.5,
             annotation_clip=False,
             arrowprops=dict(arrowstyle='-', color=MUTED, lw=.9,
                             connectionstyle='arc3,rad=0.25'))

title(fig, 'Caries spread to more people AND got worse for each of them',
      'Two mechanisms a prevalence figure cannot separate · GHHP European module · '
      'adults 18–69', y=.973, ys=.928)
notes(fig, [
 '1  These are the two halves of one number. Between the high medieval and the Industrial period '
 'the share escaping caries entirely fell from 47% to 24%, while among those affected the median '
 'share of their own teeth that were carious rose from 0.125 to 0.250 and the 95th percentile from '
 '0.50 to 1.00. The disease both spread and intensified; a mean would show one blended change.',
 '2  Densities are kernel estimates over affected individuals only, each scaled to the same peak '
 'height — compare shape and position, not area. The underlying values are lumpy (a person with '
 '16 observed teeth can only take values in sixteenths), so the smooth curves are a reading aid.',
 '3  Age is not controlled here. This figure is about distribution shape; for the age structure '
 'see the prevalence matrix, where age is an axis.',
 '4  Source: Global History of Health Project European module, decoded for this project.'],
 width=152)
fig.subplots_adjust(left=.125, right=.965, top=.845, bottom=.245)
fig.savefig('/home/claude/dental/viz/c2_caries_distribution.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c2_caries_distribution.svg')
for r in rows:
    print(f"{r['p']:16s} n={r['n']:5d} zero={r['zero']*100:5.1f}%  "
          f"median={r['med']:.3f} p95={r['p95']:.3f}")
