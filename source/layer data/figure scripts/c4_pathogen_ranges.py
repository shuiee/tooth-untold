#!/usr/bin/env python3
"""Pathogens as a TAXON RANGE CHART, borrowed from palaeontology.

This dataset is presence-only and its counts track sequencing campaigns, not
disease. Palaeontologists have the identical problem with the fossil record and
solved it with stratigraphic range charts: each taxon is a bar from first to
last observed appearance, with occurrences marked along it. Nothing in the form
implies prevalence, and the sampling strip underneath shows where the effort went.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd, json
from _style import *
import matplotlib.pyplot as plt

P = json.load(open('/home/claude/dental/viz_path.json'))
cents = sorted(int(k) for k in P)
tax = {}
for c in cents:
    for sp, v in P[str(c)]['species'].items():
        tax.setdefault(sp, {})[c] = v
rows = sorted(({'sp': sp, 'occ': d, 'first': min(d), 'last': max(d),
                'n': sum(d.values())} for sp, d in tax.items()),
              key=lambda r: (r['first'], -r['n']))
rc()
fig = plt.figure(figsize=(13.8, 8.8))
gs = fig.add_gridspec(2, 1, height_ratios=[5.6, 1], hspace=.10)
ax, bx = fig.add_subplot(gs[0]), fig.add_subplot(gs[1])

for a_ in (ax, bx):
    for s in ('top','right','left'): a_.spines[s].set_visible(False)
    a_.spines['bottom'].set_color(GRID)
    a_.tick_params(colors=INK2, length=0, labelsize=8.4)
    a_.set_xlim(20, 1890); a_.set_axisbelow(True)
    a_.grid(axis='x', color=GRID, lw=.7, zorder=0)

MAXN = max(r['n'] for r in rows)
for i, r in enumerate(rows):
    y = len(rows) - 1 - i
    single = r['first'] == r['last']
    ax.plot([r['first'] - 40, r['last'] + 40], [y, y], color=PATH,
            lw=3.4 if r['n'] > 5 else 2.0, alpha=.30 if single else .42,
            solid_capstyle='round', zorder=3)
    for c, v in r['occ'].items():
        ax.plot([c], [y], 'o', ms=3.6 + 9.5 * (v / MAXN) ** .45, mfc=PATH,
                mec=SURF, mew=1.1, zorder=5)
    lab = r['sp'] if len(r['sp']) < 26 else r['sp'][:24] + '…'
    ax.annotate(lab, (r['first'] - 60, y), ha='right', va='center',
                fontsize=8.8, color=INK if r['n'] > 5 else INK2,
                fontstyle='italic' if ' ' in r['sp'] else 'normal')
    ax.annotate(f"{r['n']}", (r['last'] + 70, y), ha='left', va='center',
                fontsize=8, color=MUTED)

ax.set_ylim(-.9, len(rows) - .2); ax.set_yticks([])
ax.set_xticks(range(100, 1801, 200)); ax.set_xticklabels([])
ax.tick_params(axis='x', length=0)

yp = {r['sp']: len(rows) - 1 - i for i, r in enumerate(rows)}
SIDE = [('Yersinia pestis',   'runs 300–1700, then stops entirely —\nno plague at all in the 1800s bin'),
        ('Mycobacterium leprae', 'peaks at 1200: 55% of that\ncentury’s genomes, then recedes'),
        ('Treponema pallidum',   'syphilis — appears at 1500,\ngone after 1600')]
for sp, txt in SIDE:
    ax.annotate(txt, (1955, yp[sp]), ha='left', va='center', fontsize=8.4,
                color=INK2, linespacing=1.5, annotation_clip=False)
    ax.plot([1900, 1940], [yp[sp], yp[sp]], color=MUTED, lw=.7, alpha=.5,
            clip_on=False, zorder=2)

tot = [P[str(c)]['total'] for c in cents]
bx.bar(cents, tot, width=62, color=FAINT, zorder=3)
for c, t in zip(cents, tot):
    if t >= 20:
        bx.annotate(str(t), (c, t), xytext=(0, 3), textcoords='offset points',
                    ha='center', fontsize=7.4, color=INK2)
bx.set_ylim(0, 66); bx.set_yticks([])
bx.set_xticks(range(100, 1801, 200))
bx.set_xticklabels([str(c) for c in range(100, 1801, 200)], fontsize=8.6)
bx.set_xlabel('century CE', fontsize=9.2, color=INK2, labelpad=8)
bx.text(0, 1.10, 'SAMPLING EFFORT — genomes sequenced per century. The two tall bars are '
        'plague-cemetery campaigns, not epidemics.', transform=bx.transAxes,
        fontsize=8, color=MUTED, va='bottom')
bx.axvspan(760, 840, color=SURF, zorder=4)
bx.annotate('no data\n800s', (800, 30), ha='center', va='center', fontsize=7.4,
            color=MUTED, zorder=5, linespacing=1.4)

title(fig, 'What the mouth was carrying, and when',
      'First-to-last appearance of every pathogen recovered from European dental '
      'remains · AncientMetagenomeDir · 18 taxa, 263 genomes', y=.976, ys=.940, x=.05)
notes(fig, [
 '1  This is a range chart, not a time series. Bar length is the span between first and last '
 'observed appearance; dot size is the number of genomes in that century. NONE of it is '
 'prevalence — the record carries no denominator, so nothing here says how common a disease was.',
 '2  Absence of a bar means nobody has sequenced it there, not that the organism was absent. '
 'The 800s are empty entirely. Four taxa are single-century singletons (H. influenzae, '
 'M. oralis, S. pneumoniae, E. rhusiopathiae) and should be read as one lucky sample each.',
 '3  The sampling strip is the honest counterweight: 51 genomes in the 1300s and 54 in the 1500s '
 'are plague-cemetery excavations. Composition within a century is more defensible than counts '
 'across centuries.',
 '4  The record stops at 1850 — the index floors sample_age at 100 BP. After that, pathogens were '
 'read from better specimens than teeth.',
 '5  Source: AncientMetagenomeDir (SPAAM community), CC-BY 4.0, European dental samples.'],
 x=.05, width=176)
fig.subplots_adjust(left=.185, right=.735, top=.880, bottom=.275)
fig.savefig('/home/claude/dental/viz/c4_pathogen_ranges.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c4_pathogen_ranges.svg')
for r in rows: print(f"{r['sp']:30s} {r['first']:>5}-{r['last']:<5} n={r['n']}")
