#!/usr/bin/env python3
"""Lead in childhood enamel over time, plus the multi-element control.

The slopegraph alone compressed 5,800 years into one pooled point. The metals
file actually holds 13 separately dated enamel lead windows, including a clean
seven-point British chronological series. Panel A puts those back.

Every measurement is drawn as a BAND spanning its exposure window, not a point:
the windows are 300-1,500 years wide, they overlap, and a dot would invent a
precision the data does not have.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd
from _style import *
import matplotlib.pyplot as plt

M = pd.read_csv('/home/claude/dental/particulates_metals_dataset.csv')
E = M[(M.analyte == 'Pb') & (M.tissue == 'enamel') & M.exposure_year_early.notna()]

# Montgomery's British chronological series - the backbone
BRIT = [(-4040, -2525, 0.100, 31, 'Neolithic'),
        (-2540,  -825, 0.060, 13, 'Bronze Age'),
        ( -840,    18, 0.060, 10, 'Iron Age'),
        (    3,   375, 1.210, 25, 'Roman Britain'),
        (  360,   675, 0.390, 50, 'post-Roman'),
        (  660,  1075, 1.930, 26, 'early medieval'),
        ( 1160,  1475, 4.690, 26, 'late medieval')]
# Roman-world comparanda: the imperial core against the province
ROMAN = [(-39, 275, 3.610, 17, 'Rome — Casal Bertone\n& Castellaccio'),
         (-39, 375, 2.000, 66, 'five Empire sites'),
         ( -9, 400, 7.000, 107, 'five Empire sites\n(second cohort)')]
MODERN = (1860, 1975, 6.550, '20th-century births')
POOLED = (-4040, 1775, 0.630, 38)

rc()
fig = plt.figure(figsize=(14.4, 10.4))
gs = fig.add_gridspec(2, 1, height_ratios=[2.05, 1], hspace=.50)
ax, bx = fig.add_subplot(gs[0]), fig.add_subplot(gs[1])

# ---------------------------------------------------------------- PANEL A
for s in ('top', 'right'): ax.spines[s].set_visible(False)
ax.spines['left'].set_color(GRID); ax.spines['bottom'].set_color(GRID)
ax.tick_params(colors=INK2, length=0, labelsize=8.6)
ax.set_yscale('log'); ax.set_ylim(.0022, 26); ax.set_xlim(-4400, 2260)
ax.set_axisbelow(True)
for g in [.01, .1, 1, 10]: ax.axhline(g, color=GRID, lw=.7, zorder=0)
ax.set_yticks([.01, .1, 1, 10]); ax.set_yticklabels(['0.01', '0.1', '1', '10'])
ax.yaxis.set_minor_locator(plt.NullLocator())
ax.set_ylabel('lead in childhood enamel, ppm  (log scale)', fontsize=9.2,
              color=INK2, labelpad=10)
ax.set_xticks([-4000, -3000, -2000, -1000, 0, 1000, 2000])
ax.set_xticklabels(['4000 BCE', '3000', '2000', '1000 BCE', '0', '1000 CE', '2000'],
                   fontsize=8.6)
ax.set_xlabel('offset-corrected childhood exposure window', fontsize=9.2,
              color=INK2, labelpad=9)

ax.axhspan(POOLED[2]*.97, POOLED[2]*1.03, xmin=0, xmax=1, color=METAL, alpha=.16, zorder=1)
ax.annotate(f'Kamenov pooled archaeological baseline, {POOLED[2]} ppm  (n={POOLED[3]}, '
            'spans the whole axis)', (-4300, .70), fontsize=7.8, color=METAL,
            va='bottom', alpha=.85)

for e0, e1, v, n, lab in ROMAN:
    ax.plot([e0, e1], [v, v], color=METAL, lw=7, alpha=.22, solid_capstyle='butt', zorder=2)
mid = lambda a, b: (a + b) / 2
ax.annotate('Rome itself 3.6 · Empire sites 2.0 and 7.0 ppm —\n'
            'the imperial core ran hotter than the province',
            (mid(-39, 375), 7.0), xytext=(-1750, 15.5), fontsize=8.4, color=INK2,
            ha='left', linespacing=1.55,
            arrowprops=dict(arrowstyle='-', color=MUTED, lw=.8))

xs, ys = [], []
for e0, e1, v, n, lab in BRIT:
    ax.plot([e0, e1], [v, v], color=METAL, lw=5.2, solid_capstyle='butt', zorder=4)
    xs.append(mid(e0, e1)); ys.append(v)
ax.plot(xs, ys, color=METAL, lw=1.3, ls=(0, (2, 2)), alpha=.55, zorder=3)
for (e0, e1, v, n, lab), x in zip(BRIT, xs):
    up = lab in ('Roman Britain', 'early medieval', 'late medieval', 'Neolithic')
    ax.annotate(f'{lab}\n{v} ppm · n={n}', (x, v), xytext=(0, 13 if up else -14),
                textcoords='offset points', ha='center',
                va='bottom' if up else 'top', fontsize=7.8, color=INK2,
                linespacing=1.5)

e0, e1, v, lab = MODERN
ax.plot([e0, e1], [v, v], color=METAL, lw=6.5, solid_capstyle='butt', zorder=5)
ax.annotate(f'modern\n{v} ppm', (mid(e0, e1), v), xytext=(16, 4),
            textcoords='offset points', ha='left', va='center', fontsize=8.6,
            color=METAL, fontweight='semibold', linespacing=1.5)
ax.annotate('one individual (Gristhorpe, 0.003 ppm) is omitted — n=1',
            (-4300, .0030), fontsize=7.4, color=MUTED, va='bottom')

ax.set_title('A   Britain’s own lead: flat for three millennia, then Rome',
             loc='left', fontsize=12.5, color=INK, fontweight='semibold', pad=26)
ax.text(0, 1.035, 'Each bar spans the exposure window of that measurement. Dashed line '
        'joins the British series only — it is a reading aid, not interpolation.',
        transform=ax.transAxes, fontsize=8, color=MUTED, va='bottom')

# ---------------------------------------------------------------- PANEL B
K = M[M.citation.str.contains('Kamenov') & (M.tissue == 'enamel')
      & ~M.analyte.str.contains('MTC')]
arch = K[K.site.str.contains('Archaeological')].set_index('analyte').value_mean
mod = K[K.site.str.contains('Modern')].set_index('analyte').value_mean
els = ['Cu', 'Cr', 'Pb', 'Ni', 'Zn', 'Mg', 'Ba', 'Sr']
IND = {'Pb', 'Cu', 'Cr', 'Ni'}
for s in ('top', 'right', 'left', 'bottom'): bx.spines[s].set_visible(False)
bx.set_yscale('log'); bx.set_xlim(-.5, 1.85); bx.set_ylim(.012, 200000)
bx.yaxis.set_minor_locator(plt.NullLocator())
bx.set_xticks([0, 1]); bx.set_yticks([])
bx.set_xticklabels(['archaeological\n4040 BCE – 1775 CE', 'modern\n1860 – 1975'],
                   fontsize=8.8)
bx.tick_params(length=0, colors=INK2)

def spread(v, gap):
    idx = np.argsort(v); out = np.array(v, float); sv = out[idx]
    for i in range(1, len(sv)):
        if sv[i] - sv[i-1] < gap: sv[i] = sv[i-1] + gap
    out[idx] = 10 ** sv if False else sv
    return out
lv = spread([np.log10(mod[e]) for e in els], .42)
for i, e in enumerate(els):
    a, m = arch[e], mod[e]
    hot = e in IND
    col = METAL if hot else FAINT
    bx.plot([0, 1], [a, m], color=col, lw=2.4 if hot else 1.5,
            zorder=4 if hot else 3, solid_capstyle='round')
    for x, v in ((0, a), (1, m)):
        bx.plot([x], [v], 'o', ms=7 if hot else 5.5, mfc=col, mec=SURF, mew=1.5, zorder=5)
    bx.plot([1.05, 1.11], [m, 10**lv[i]], color=col, lw=.8, alpha=.5, zorder=2)
    bx.annotate(f'{e}   {a:g} → {m:g}    ×{m/a:.1f}', (1.13, 10**lv[i]),
                va='center', fontsize=8.6 if hot else 8,
                color=INK if hot else INK2,
                fontweight='semibold' if hot else 'normal')
bx.set_title('B   And the elements that are not industrial did not move',
             loc='left', fontsize=12.5, color=INK, fontweight='semibold', pad=26)
bx.text(0, 1.055, 'The same eight elements, same tissue, same lab. Four climb nine- to '
        'fourteenfold; strontium falls.', transform=bx.transAxes, fontsize=8,
        color=MUTED, va='bottom')

title(fig, 'Lead in the mouth, from the Neolithic to leaded petrol',
      'Childhood exposure recorded in enamel, which forms once and never remodels · '
      'Montgomery et al. 2010, Moore et al. 2021, Kamenov et al. 2018',
      y=.977, ys=.947, x=.045, ts=16)
notes(fig, [
 '1  THE BRITISH SEQUENCE. 0.10 → 0.06 → 0.06 ppm across the Neolithic, Bronze and Iron Ages: '
 'three millennia of essentially no lead. Then 1.21 under Roman Britain, a twentyfold rise. Then '
 '0.39 after Rome withdraws — the only signal in this project that falls because an economy '
 'stopped. Then 1.93 and 4.69 through the Middle Ages, and 6.55 in the twentieth century.',
 '2  MEDIEVAL LEAD EXCEEDS THE ROMAN PROVINCE. 4.69 ppm at 1160–1475 against 1.21 in Roman '
 'Britain. Lead did not peak with Rome and decline; it peaked, collapsed, and then climbed past '
 'the earlier peak centuries before industry.',
 '3  WHY BARS AND NOT POINTS. Exposure windows are 300–1,500 years wide and overlap. A point '
 'would assert a precision the data does not have. The dashed line joins the British series only, '
 'as a reading aid; it is not interpolation, and no measurement exists between the bars.',
 '4  The pale Roman-world bars come from different studies and sites than the British series, '
 'so they are comparanda, not part of the sequence. Kamenov’s pooled archaeological value of 0.63 '
 'ppm spans the whole axis and is a single number for 5,800 years — it is drawn as a horizontal '
 'band precisely so it is not mistaken for a datapoint.',
 '5  One measurement is omitted from panel A: Gristhorpe, Yorkshire, 0.003 ppm, n = 1. A single '
 'Bronze Age man should not anchor a baseline.',
 '6  All values are offset-corrected to childhood exposure, not burial date. All archaeological '
 'rows passed a diagenesis screen; see the dataset’s diagenesis_controlled column.'],
 x=.045, width=168)
fig.subplots_adjust(left=.085, right=.795, top=.868, bottom=.268)
fig.savefig('/home/claude/dental/viz/c3b_lead_timeline.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c3b_lead_timeline.svg')

rows = [dict(series='britain_chronological', label=l, exposure_early=a,
             exposure_late=b, pb_ppm=v, n_individuals=n) for a,b,v,n,l in BRIT]
rows += [dict(series='roman_world_comparandum', label=l.replace('\n',' '),
              exposure_early=a, exposure_late=b, pb_ppm=v, n_individuals=n)
         for a,b,v,n,l in ROMAN]
rows += [dict(series='modern', label=MODERN[3], exposure_early=MODERN[0],
              exposure_late=MODERN[1], pb_ppm=MODERN[2], n_individuals=None),
         dict(series='pooled_baseline', label='Kamenov archaeological pooled',
              exposure_early=POOLED[0], exposure_late=POOLED[1], pb_ppm=POOLED[2],
              n_individuals=POOLED[3]),
         dict(series='omitted', label='Gristhorpe, Yorkshire', exposure_early=-2240,
              exposure_late=-1525, pb_ppm=0.003, n_individuals=1)]
pd.DataFrame(rows).to_csv('/home/claude/dental/viz/c3b_lead_timeline_data.csv', index=False)
print(pd.DataFrame(rows).to_string(index=False))
