#!/usr/bin/env python3
"""Caries prevalence by age, one line per period.

Replaces the matrix. Same underlying numbers, but the comparison the story needs
- one era against another AT THE SAME POINT IN LIFE - becomes a vertical gap
between two lines rather than two cells you have to hunt for.

On the axis: in a skeletal sample, age at death is the only measure of how long
a person's teeth were actually in use. Reading one line left to right is caries
accumulating over a lifetime. Reading between lines at one age is the era effect.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt

a = load_ghhp(); rc()
a = a.copy(); a['any_caries'] = a.any_caries.astype(float)
X = [21.5, 27.5, 32.5, 37.5, 42.5, 47.5, 55, 65]
P = a.pivot_table(index='period', columns='ab', values='any_caries',
                  aggfunc='mean', observed=False).reindex(PERIODS).astype(float) * 100
N = a.pivot_table(index='period', columns='ab', values='any_caries',
                  aggfunc='size', observed=False).reindex(PERIODS).astype(float)

# periods are ORDERED, so this is an ordinal ramp, not a categorical palette
RAMP = ['#b7d3f6', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#0d366b']
EMPH = {'Industrial', 'High medieval'}

fig, ax = plt.subplots(figsize=(12.2, 8.4))
clean(ax)
def spread(v, gap):
    idx = np.argsort(v); out = np.array(v, float); sv = out[idx]
    for i in range(1, len(sv)):
        if sv[i] - sv[i-1] < gap: sv[i] = sv[i-1] + gap
    out[idx] = sv; return out
ENDS = spread([P.loc[p].values[-1] for p in PERIODS], 2.6)

for i, p in enumerate(PERIODS):
    y = P.loc[p].values
    hot = p in EMPH
    ax.plot(X, y, color=RAMP[i], lw=3.0 if hot else 1.7, zorder=5 if hot else 3,
            solid_capstyle='round', alpha=1 if hot else .85)
    ax.plot(X, y, 'o', color=RAMP[i], ms=6.5 if hot else 4.5, mec=SURF, mew=1.3,
            zorder=6 if hot else 4)
    ax.plot([X[-1]+1.0, X[-1]+3.4], [y[-1], ENDS[i]], color=RAMP[i], lw=.8,
            alpha=.55, zorder=2, clip_on=False)
    ax.annotate(f'{p}   {y[-1]:.0f}%', (X[-1]+4.0, ENDS[i]), va='center',
                fontsize=9 if hot else 8.4, color=RAMP[i] if hot else INK2,
                fontweight='semibold' if hot else 'normal', annotation_clip=False)
    if hot:
        ax.annotate(f'{y[0]:.0f}%', (X[0], y[0]), xytext=(-10, 0),
                    textcoords='offset points', ha='right', va='center',
                    fontsize=10.5, color=RAMP[i], fontweight='semibold')

ax.set_xlim(14.5, 82); ax.set_ylim(16, 95)
ax.set_xticks(X)
ax.set_xticklabels(['18–24','25–29','30–34','35–39','40–44','45–49','50–59','60+'],
                   fontsize=9)
ax.set_yticks(range(20, 91, 10))
ax.set_yticklabels([f'{v}%' for v in range(20, 91, 10)])
ax.set_xlabel('age at death — how many years these teeth were actually in use',
              fontsize=9.4, color=INK2, labelpad=10)
ax.set_ylabel('share of adults with at least one carious tooth',
              fontsize=9.4, color=INK2, labelpad=10)

ax.annotate('', xy=(21.5, 79.0), xytext=(21.5, 29.3),
            arrowprops=dict(arrowstyle='<->', color=INK2, lw=1.2, alpha=.6))
ax.text(23.2, 36.5, 'At 18–24, 72% of high-medieval young adults\n'
        'still had no caries at all.\nBy the industrial period only 20% did.',
        fontsize=9.6, color=INK2, linespacing=1.7)
ax.annotate('by 60, everyone converges —\nlive long enough and the era stops mattering',
            xy=(65, 60), xytext=(44.0, 24.5), fontsize=8.8, color=INK2,
            ha='left', linespacing=1.55,
            arrowprops=dict(arrowstyle='-', color=MUTED, lw=.9,
                            connectionstyle='arc3,rad=-0.2'))

title(fig, 'By the industrial era, caries arrived before adulthood',
      'Share of adults carrying at least one carious tooth · GHHP European module · '
      'every point n ≥ 25', y=.973, ys=.933, x=.05)
notes(fig, [
 '0  THE 18–24 COMPARISON. Industrial 66 of 82 affected (80.5%), high medieval 22 of 79 (27.8%). '
 'Difference 52.6 percentage points, 95% CI 39.6 to 65.7; ratio 2.9×; Fisher exact p = 1.2e-11. '
 'Read as escaping: the odds of reaching your mid-twenties with an intact mouth fell about '
 'elevenfold. Small cells, but far too large a gap to be sampling noise.',
 '1  HOW TO READ IT. Along a line: caries accumulating over one lifetime — expected, not news. '
 'Between lines at the same age: the era effect, which is the point. The industrial line is '
 'highest in every age band EXCEPT 50–59, where early modern edges it (70.8% against 68.8%). '
 'The claim this figure supports is about the young end, where four in five industrial young '
 'adults were already affected, not about '
 'uniform superiority across the whole range.',
 '2  WHY AGE IS THE AXIS. Age at death explains more variance in this dataset than historical '
 'period does (for antemortem tooth loss, adjusted R² = 0.28 by age alone), and the period samples '
 'differ in mean age at death by up to 13 years. A single number per period would blend the two '
 'effects together and report the mixture as history.',
 '3  The medieval dip is real and not a sampling accident: the early and high medieval lines sit '
 'BELOW the pre-medieval one across most of the range. Caries did not rise steadily — it fell for '
 'several centuries before the sugar era.',
 '4  The lines converge above age 50. That is partly saturation and partly survivorship: reaching '
 '60 in any era meant outliving most of your cohort.',
 '5  Source: Global History of Health Project European module, decoded for this project. Periods '
 'follow Wittwer-Backofen & Engel (2019), The Backbone of Europe, CUP.'],
 x=.05, width=158)
fig.subplots_adjust(left=.095, right=.800, top=.855, bottom=.370)
fig.savefig('/home/claude/dental/viz/c1b_caries_by_age.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c1b_caries_by_age.svg')
out = P.round(1).stack().rename('pct_with_caries').reset_index()
out.columns = ['period','age_band','pct_with_caries']
out['n'] = N.stack().values
out.to_csv('/home/claude/dental/viz/c1b_caries_by_age_data.csv', index=False)
print(P.round(1).to_string())
