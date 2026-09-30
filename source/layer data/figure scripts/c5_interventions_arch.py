#!/usr/bin/env python3
"""Interventions plotted by WHERE IN THE MOUTH, not just when.

Time on x, anatomical position on y. The migration is the finding: the earliest
deliberate work is overwhelmingly on the teeth other people can see, and only
reaches the back of the mouth in the modern era. Cosmetic before therapeutic.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt

d = pd.read_csv('/home/claude/dental/interventions.csv', keep_default_na=False)
d['e0'] = pd.to_numeric(d.date_early, errors='coerce')
d['e1'] = pd.to_numeric(d.date_late, errors='coerce').fillna(d.e0)
ERA = {'Neolithic': (-5500, -2500), 'Roman': (-27, 476)}
for i, r in d.iterrows():
    if pd.isna(r.e0):
        k = 'Neolithic' if 'Neolithic' in r.date_note else 'Roman'
        d.loc[i, ['e0', 'e1']] = ERA[k]
d['mid'] = (d.e0 + d.e1) / 2
d['dated'] = pd.to_numeric(d.date_early, errors='coerce').notna()

ANT = ('incisor','canine','i1','i2','c-c','anterior','c–c')
POST = ('molar','premolar','pm1','pm2','m1','m2','m3','1pm','2pm','posterior')
def row_of(r):
    t = str(r.tooth_positions).lower(); j = str(r.jaw).lower()
    if 'n/a' in t or t.strip() == '': return 4
    ant = any(k in t for k in ANT); post = any(k in t for k in POST)
    upper = 'maxilla' in j or 'maxilla' in t
    lower = 'mandible' in j or 'mandib' in t
    if ant and not post: return 0 if upper else (2 if lower else 0)
    if post and not ant: return 1 if upper else (3 if lower else 1)
    if ant and post:     return 0 if upper else 2
    return 4
d['row'] = d.apply(row_of, axis=1)
LAB = ['UPPER  front teeth\n(incisors, canines)', 'UPPER  back teeth\n(premolars, molars)',
       'LOWER  front teeth', 'LOWER  back teeth', 'no single tooth\n(instruments, monuments)']

FN = {'cosmetic/status':'#4a3aa7', 'replacement':'#4a3aa7', 'stabilize':'#9085e9',
      'therapeutic':'#eb6834', 'palliative':'#eda100'}
def fcol(f):
    f = str(f).lower()
    if 'therap' in f: return '#eb6834'
    if 'palli'  in f: return '#eda100'
    if 'stabil' in f: return '#9085e9'
    return '#4a3aa7'
d['col'] = d.function.map(fcol)
IVC = '#4a3aa7'

rc()
fig = plt.figure(figsize=(13.4, 11.2))
gs = fig.add_gridspec(2, 2, width_ratios=[1, 6.4], height_ratios=[2.95, 2.05],
                      wspace=.03, hspace=.42)
a1, a2 = fig.add_subplot(gs[0, 0]), fig.add_subplot(gs[0, 1])
mx = fig.add_subplot(gs[1, :])
rng = np.random.default_rng(7)

for ax, (lo, hi) in ((a1, (-13000, -2400)), (a2, (-820, 1980))):
    for sp in ('top','right','left'): ax.spines[sp].set_visible(False)
    ax.spines['bottom'].set_color(GRID)
    ax.tick_params(colors=INK2, length=0, labelsize=8.4)
    ax.set_xlim(lo, hi); ax.set_ylim(-.75, 4.75)
    ax.axhspan(3.5, 4.5, color='#f4f3f0', zorder=-1)
    for y in range(5):
        ax.axhline(y, color=GRID, lw=.8, zorder=0)
    for _, r in d.iterrows():
        if r['mid'] < lo or r['mid'] > hi: continue
        y = 4 - r['row'] + rng.uniform(-.17, .17)
        if r['e1'] > r['e0']:
            ax.plot([r['e0'], r['e1']], [y, y], color=r['col'], lw=1.4,
                    alpha=.28 if r['dated'] else .15, solid_capstyle='butt', zorder=2)
        prov = r['verification_status'] != 'full text read'
        ax.plot([r['mid']], [y], 'o', ms=7, zorder=4, mew=1.4,
                mfc=r['col'] if not prov else SURF, mec=r['col'],
                alpha=1 if r['dated'] else .55)

a1.set_yticks(range(5)); a1.set_yticklabels(LAB[::-1], fontsize=8.8)
a1.tick_params(axis='y', colors=INK)
a2.set_yticks([])
a1.set_xticks([-11000, -5000]); a1.set_xticklabels(['11 000 BCE','5 000 BCE'], fontsize=7.8)
a2.set_xticks(range(-500, 1901, 300))
a2.set_xticklabels([f'{abs(v)} BCE' if v < 0 else ('0' if v == 0 else str(v))
                    for v in range(-500, 1901, 300)], fontsize=8.4)
for ax, xy in ((a1, 1.0), (a2, 0.0)):
    ax.plot([xy-.015, xy+.015], [-.012, .012], transform=ax.transAxes,
            color=MUTED, lw=1.1, clip_on=False, zorder=10)
a2.set_xlabel('year CE', fontsize=9.2, color=INK2, labelpad=9)
a1.set_title('Dentistry began at the front of the mouth…', loc='left',
             fontsize=12, color=INK, fontweight='semibold', pad=24)

from matplotlib.lines import Line2D
leg = [Line2D([],[],marker='o',ls='',mfc=c,mec=c,ms=7.5,label=l) for c,l in
       [('#4a3aa7','replacement / cosmetic'),('#9085e9','stabilise'),
        ('#eb6834','therapeutic'),('#eda100','palliative')]]
leg.append(Line2D([],[],marker='o',ls='',mfc=SURF,mec=MUTED,mew=1.4,ms=7.5,
                  label='hollow = provisional source'))
a1.legend(handles=leg, frameon=False, fontsize=8.2, loc='upper left',
          bbox_to_anchor=(0, 1.22), ncol=5, labelcolor=INK2, handletextpad=.45,
          columnspacing=1.7)

a2.annotate('Etruscan gold bands — 21 objects, almost all\nupper incisors, on women whose healthy\n'
            'teeth were removed to fit them',
            xy=(-330, 4.24), xytext=(-800, 1.20), fontsize=8.6, color=INK2,
            ha='left', va='center', linespacing=1.55,
            arrowprops=dict(arrowstyle='-', color=MUTED, lw=.9,
                            connectionstyle='arc3,rad=-0.18'))
a2.annotate('86 extracted teeth, mostly molars,\nin a Roman Forum drain',
            xy=(225, 2.96), xytext=(700, 1.20), fontsize=8.6, color=INK2,
            ha='left', va='center', linespacing=1.55,
            arrowprops=dict(arrowstyle='-', color=MUTED, lw=.9,
                            connectionstyle='arc3,rad=0.22'))

# ---------------------------------------------------------------- PANEL B
# ADHS 2009 Table 4.2.5 - quartiles of restored teeth by age. The published
# tables carry NO tooth-position breakdown for restorations (they do for plaque,
# calculus, bleeding and anterior wear), so the modern data cannot go on the
# anatomical axis above. It gets its own panel instead.
ADHS = [('16–24', 0, 1, 3), ('25–34', 1, 3, 6), ('35–44', 3, 7, 10),
        ('45–54', 7, 11, 14), ('55–64', 7, 11, 15), ('65–74', 6, 11, 15),
        ('75–84', 4, 8, 12), ('85+', 2, 7, 11)]
clean(mx, grid='x')
for i, (lab, q1, med, q3) in enumerate(ADHS):
    y = len(ADHS) - 1 - i
    mx.plot([q1, q3], [y, y], color=IVC, lw=6.5, alpha=.28,
            solid_capstyle='round', zorder=3)
    mx.plot([med], [y], 'o', ms=9, mfc=IVC, mec=SURF, mew=1.7, zorder=5)
    mx.annotate(f'{med}', (med, y), xytext=(0, 13), textcoords='offset points',
                ha='center', fontsize=9.4, color=IVC, fontweight='semibold')
    mx.annotate(f'{q1}', (q1, y), xytext=(-8, 0), textcoords='offset points',
                ha='right', va='center', fontsize=7.6, color=MUTED)
    mx.annotate(f'{q3}', (q3, y), xytext=(8, 0), textcoords='offset points',
                ha='left', va='center', fontsize=7.6, color=MUTED)
mx.set_yticks(range(len(ADHS))); mx.set_yticklabels([a[0] for a in ADHS][::-1],
                                                    fontsize=8.8)
mx.tick_params(axis='y', colors=INK)
mx.set_xlim(-1.4, 21.5); mx.set_ylim(-.85, 7.95)
mx.set_xticks(range(0, 17, 2))
mx.set_xlabel('restored teeth per person', fontsize=9.2, color=INK2, labelpad=8)
mx.set_title('And then, everywhere in it',
             loc='left', fontsize=12, color=INK, fontweight='semibold', pad=24)
mx.text(0, 1.045, 'Restored teeth per person · median with interquartile range · '
        'ADHS 2009, England, Wales & Northern Ireland, n = 6,470 · Table 4.2.5',
        transform=mx.transAxes, fontsize=8, color=MUTED, va='bottom')
mx.annotate('84%\nof dentate adults have\nat least one filling',
            (17.4, 5.6), fontsize=9.4, color=IVC, ha='left', va='center',
            linespacing=1.6, fontweight='semibold')
mx.annotate('the median British adult in 2009 carried\n'
            'SEVEN repaired teeth and 13 filled surfaces',
            (17.4, 1.9), fontsize=8.8, color=INK2, ha='left', va='center',
            linespacing=1.6)

CT = pd.crosstab(pd.cut(d.e0, [-13000,-500,0,500,1500,1900],
                        labels=['pre-500 BCE','500–1 BCE','1–500 CE','500–1500','1500–1900']),
                 d.row.map({0:'front',2:'front',1:'back',3:'back',4:'other'}))
title(fig, 'Where in the mouth, and then how much of it',
      'Deliberate dental modification · 49 archaeological cases by position in the jaw, '
      'and the modern state of an adult mouth', y=.978, ys=.947, x=.045)
notes(fig, [
 '0  The two panels answer different questions and share no axis. The upper panel can show '
 'anatomical position because every archaeological case records which tooth was worked on. The '
 'ADHS published tables carry NO tooth-position breakdown for restorations — they do for plaque, '
 'calculus, bleeding and anterior wear, but not fillings — so the modern data cannot be placed on '
 'that axis and is shown as a distribution instead.',
 '0b  Against the modern figures, the three archaeological assemblages with real denominators run '
 '1/204 (Pieve di Pava, 10th–12th c.), 1/100 (Aberdeen, 1460–1670) and 2/450 (Middenbeemster, '
 '1800s) — never above about 1%. The change at the right-hand edge is a discontinuity, not the '
 'end of a trend.',
 '1  Front-to-back ratio by era, for cases with a specified position: pre-500 BCE 7 front / 3 back · '
 '500–1 BCE 13 / 2 · 1–500 CE 3 / 0 · 500–1500 CE 2 / 1 · 1500–1900 CE 4 / 4. Early work is on the '
 'teeth other people can see; the back of the mouth is reached last.',
 '2  These are counts of documented CASES, not rates. They track excavation and publication effort. '
 'Cell counts are small — every dot is one object or one individual, and none of the era ratios '
 'above would survive a significance test. Read the pattern, not the proportions.',
 '3  Ten cases carry no published date and are drawn faded across the conventional span of their era '
 '(Neolithic, Roman). That span is a convention, not a date.',
 '4  Sources: Becker & Turfa 2017 catalogue; Oxilia 2015, 2017; Bernardini 2012; Monaco 2022; '
 'Dittmar 2026; Cox 2000; Forshaw 2026; Waters-Rist 2013; London Museum.'],
 x=.045, width=168)
fig.subplots_adjust(left=.155, right=.800, top=.860, bottom=.240)
fig.savefig('/home/claude/dental/viz/c5_interventions_arch.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c5_interventions_arch.svg')
print(CT.to_string())
