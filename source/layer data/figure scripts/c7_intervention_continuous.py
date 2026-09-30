#!/usr/bin/env python3
"""The continuous series: modified teeth per 100 individuals examined.

One measure both halves of the record can produce. On the archaeological side,
count the teeth a person deliberately altered and divide by the individuals
screened. On the modern side, the same thing: restored teeth per person, times
one hundred. Both numerators are teeth somebody worked on. Both denominators are
people examined.

The objection to joining them is detection bias, so this figure draws the bias
instead of putting it in a footnote: the faded bars show where each
archaeological point would move if excavation were missing 90% or 99% of all
interventions. Even at 99% the gap does not close.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np
from _style import *
import matplotlib.pyplot as plt
from scipy.stats import chi2

IV, IV_LT = '#4a3aa7', '#9085e9'

def pois_ci(k, alpha=.05):
    lo = chi2.ppf(alpha/2, 2*k)/2 if k > 0 else 0.0
    hi = chi2.ppf(1-alpha/2, 2*(k+1))/2
    return lo, hi

PTS = [
 ('Pieve di Pava\nTuscany, 10th–12th c.',  1050,  2, 204,
  'two grooved maxillary incisors'),
 ('Aberdeen\n1460–1670',                   1565,  3, 100,
  'two ligatured incisors, one replaced'),
 ('Middenbeemster\nNetherlands, 1800s',    1850, 16, 450,
  'two denture wearers, ~16 teeth\nspanned or braced'),
]
MOD, MODN = 6.7, 6470   # ADHS 2009 Table 4.3.1 / 4.1.1

rc()
fig, ax = plt.subplots(figsize=(12.6, 9.4))
for s in ('top','right'): ax.spines[s].set_visible(False)
ax.spines['left'].set_color(GRID); ax.spines['bottom'].set_color(GRID)
ax.tick_params(colors=INK2, length=0, labelsize=8.6)
ax.set_yscale('log'); ax.set_xlim(930, 2135); ax.set_ylim(.09, 9000)
ax.set_axisbelow(True)
for gv in [.1, 1, 10, 100, 1000]:
    ax.axhline(gv, color=GRID, lw=.7, zorder=0)
ax.set_yticks([.1, 1, 10, 100, 1000])
ax.set_yticklabels(['0.1', '1', '10', '100', '1000'])
ax.yaxis.set_minor_locator(plt.NullLocator())
ax.set_ylabel('repaired teeth per 100 individuals examined   (log scale)',
              fontsize=9.2, color=INK2, labelpad=11)
ax.set_xticks([1000, 1200, 1400, 1600, 1800, 2000])
ax.set_xlabel('year', fontsize=9.4, color=INK2, labelpad=9)

xs = [p[1] for p in PTS] + [2009]
ys = [100*p[2]/p[3] for p in PTS] + [100*MOD]

# sensitivity geometry: where each point moves under 90% / 99% detection failure
for (lab, x, k, n, note), y in zip(PTS, ys):
    ax.plot([x, x], [y, y*10], color=IV, lw=13, alpha=.13, solid_capstyle='butt', zorder=2)
    ax.plot([x, x], [y*10, y*100], color=IV, lw=13, alpha=.07, solid_capstyle='butt', zorder=2)

ax.plot(xs, ys, color=IV, lw=2.2, zorder=4, solid_capstyle='round')
for (lab, x, k, n, note), y in zip(PTS, ys):
    lo, hi = pois_ci(k)
    ax.plot([x, x], [100*lo/n, 100*hi/n], color=IV, lw=2.0, alpha=.55, zorder=5,
            solid_capstyle='round')
    ax.plot([x], [y], 'o', ms=9, mfc=IV, mec=SURF, mew=1.7, zorder=6)
    if x == 1050:
        ax.annotate(f'{lab}\n{k} teeth / {n} people = {y:.1f}', (x, 0.30),
                    xytext=(16, 0), textcoords='offset points', ha='left',
                    va='center', fontsize=8, color=INK2, linespacing=1.55)
    else:
        ax.annotate(f'{lab}\n{k} teeth / {n} people = {y:.1f}', (x, 100*lo/n),
                    xytext=(0, -14), textcoords='offset points', ha='center',
                    va='top', fontsize=8, color=INK2, linespacing=1.55)
ax.plot([2009], [100*MOD], 'o', ms=12, mfc=IV, mec=SURF, mew=2, zorder=6)
ax.annotate('670', (2009, 100*MOD), xytext=(16, 6), textcoords='offset points',
            ha='left', va='bottom', fontsize=17, color=IV, fontweight='semibold')
ax.annotate('ADHS 2009\nmean 6.7 restored teeth\nper person · n = 6,470',
            (2009, 100*MOD), xytext=(16, -6), textcoords='offset points',
            ha='left', va='top', fontsize=8.2, color=INK2, linespacing=1.55)

ax.annotate('×10  —  as if 90% were missed', (1050, 9.8*0.98),
            xytext=(1085, 34), fontsize=8.2, color=INK2, ha='left', va='center',
            arrowprops=dict(arrowstyle='-', color=MUTED, lw=.8))
ax.annotate('×100  —  as if 99% were missed', (1050, 96*0.98), xytext=(1085, 320),
            fontsize=8.2, color=INK2, ha='left', va='center',
            arrowprops=dict(arrowstyle='-', color=MUTED, lw=.8))
ax.text(1085, 2450, 'THE SHADED BARS ARE ARITHMETIC, NOT AN ESTIMATE\n'
        'observed ÷ (1 − miss rate). No taphonomic model, no evidence behind\n'
        'the 90% and 99% — they are round numbers bracketing an absurd case.',
        fontsize=8.2, color=MUTED, ha='left', va='center', linespacing=1.6)
ax.axhline(100*MOD, color=IV, lw=.9, ls=(0, (4, 4)), alpha=.45, zorder=1)
ax.annotate('even ×100 lands here — still below the modern line',
            (1330, 700), fontsize=8.6, color=INK2, ha='left', va='center')

title(fig, 'Tooth repair, drawn straight through',
      'Teeth somebody repaired, per 100 individuals examined · the same quantity on both '
      'sides of 1850 · extraction is excluded from BOTH ends', y=.972, ys=.932, x=.05)
notes(fig, [
 '1  WHY THIS CAN BE JOINED. Both numerators count teeth a person deliberately altered; both '
 'denominators count individuals examined. The modern figure is the mean number of restored '
 'teeth per person (ADHS 2009 Table 4.3.1), the archaeological figures are modified teeth '
 'divided by the assemblage screened. Ratio, archaeological mean to modern: 267×.',
 '2  WHAT THE SHADED BARS ARE. Arithmetic, not a projection: corrected = observed ÷ (1 − miss '
 'rate), so the bars are simply ×10 and ×100. Nothing estimates those rates; they are round '
 'numbers chosen to bracket an implausible case. The only figure derived from the data is the '
 'break-even, 1 − 2.51/670 = 0.99625 — archaeology would have to be missing 99.63% of every '
 'tooth repair ever performed for the two ends to meet. The bars are NOT confidence intervals.',
 '2b  THE BLIND SPOT THE BARS DO NOT COVER: therapeutic EXTRACTION. A tooth pulled years before '
 'death leaves a remodelled socket indistinguishable from one lost to disease, so no multiplier '
 'recovers it. GHHP adults lost, on average, 2.2 teeth antemortem in the high medieval period and '
 '4.2 in the early modern — 219 and 418 per 100 people. If even 5% of early modern loss were '
 'deliberate, that is 21 per 100, six times the rate plotted here. The 86 extracted teeth from '
 'the Roman Forum drain show extraction was done at volume somewhere. This figure therefore shows '
 'that TOOTH REPAIR became universal; it cannot show the same for intervention of every kind.',
 '2c  What keeps the comparison fair is symmetry: the modern 6.7 is "restored, otherwise sound" '
 'teeth, which also excludes extractions, and excludes crowns, bridges, implants and dentures. '
 'Neither end counts a pulled tooth. On the measure actually drawn — teeth repaired — the gap holds.',
 '3  WHAT IS STILL NOT TRUE. The three archaeological points do not differ significantly from '
 'one another (overlapping Poisson intervals), so the line between them asserts a trend that is '
 'not in the data. Read the line as one step, not three. And three assemblages across eight '
 'hundred years is a thin record — which is itself part of the finding: there is almost nothing '
 'to count.',
 '4  Age structure is not controlled. It does not rescue the objection either: even the youngest '
 'modern band, 16–24, has 53% of people carrying at least one filling — roughly fifteen times '
 'the highest archaeological rate here.',
 '5  Sources: Monaco et al. 2022; Dittmar et al. 2026; Waters-Rist et al. 2013 (conference '
 'poster); ADHS 2009 published tables, NHS Digital.'],
 x=.05, width=152)
fig.subplots_adjust(left=.105, right=.805, top=.845, bottom=.395)
fig.savefig('/home/claude/dental/viz/c7_intervention_continuous.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c7_intervention_continuous.svg')
# ---------------------------------------------------------------- export
import csv
SRC = {1050: ('Monaco M, Riccomi G, Minozzi S, Campana S, Giuffra V (2022). '
              'Arch Oral Biol 140:105449.', '10.1016/j.archoralbio.2022.105449',
              'full text read'),
       1565: ('Dittmar JM, Crozier R, Cameron A, Mann B, Oxenham MF (2026). '
              'Br Dent J 240(8):555-559.', '10.1038/s41415-025-9107-3',
              'full text read'),
       1850: ('Waters-Rist AL, Braekmans D, Hoogland MLP (2013). BABAO 15th Annual '
              'Conference, York.', 'BABAO 2013 poster', 'conference poster'),
       2009: ('Adult Dental Health Survey 2009 published tables, NHS Digital / NatCen.',
              'ADHS 2009 Table 4.3.1 (mean) and Table 4.1.1 (prevalence)',
              'full text read')}
COLS = ['mark_id','series','plot_role','label','x_year','x_date_early','x_date_late',
        'y_repaired_teeth_per_100','numerator_repaired_teeth','denominator_individuals',
        'numerator_detail','ci_low_per_100','ci_high_per_100','ci_method',
        'assumed_miss_rate','multiplier','source_citation','source_ref',
        'verification_status','note']
R=[]
def add(**k): R.append({c:k.get(c,'') for c in COLS})
i=0
for (lab,x,k_,n,note),y in zip(PTS,ys):
    i+=1; lo,hi=pois_ci(k_); cite,ref,ver=SRC[x]
    d0,d1 = {1050:(900,1200),1565:(1460,1670),1850:(1800,1899)}[x]
    add(mark_id=f'M{i:02d}', series='archaeological', plot_role='observed point + CI whisker',
        label=lab.replace(chr(10),' — '), x_year=x, x_date_early=d0, x_date_late=d1,
        y_repaired_teeth_per_100=round(y,3), numerator_repaired_teeth=k_,
        denominator_individuals=n, numerator_detail=note.replace(chr(10),' '),
        ci_low_per_100=round(100*lo/n,3), ci_high_per_100=round(100*hi/n,3),
        ci_method='exact Poisson on the count, 95%', source_citation=cite,
        source_ref=ref, verification_status=ver,
        note='x plotted at the midpoint of the assemblage date range')
i+=1; cite,ref,ver=SRC[2009]
add(mark_id=f'M{i:02d}', series='modern', plot_role='observed point',
    label='ADHS 2009, England', x_year=2009, x_date_early=2009, x_date_late=2009,
    y_repaired_teeth_per_100=100*MOD, numerator_repaired_teeth='6.7 (mean per person)',
    denominator_individuals=MODN,
    numerator_detail='mean restored, otherwise sound teeth, all ages, unadjusted',
    ci_method='not shown; survey SE negligible at this scale',
    source_citation=cite, source_ref=ref, verification_status=ver,
    note='EXCLUDES restored teeth that are also decayed, and excludes crowns, bridges, '
         'implants, dentures and extractions — so this value is a floor')
for (lab,x,k_,n,_),y in zip(PTS,ys):
    for miss,mult in ((0.90,10),(0.99,100)):
        i+=1
        add(mark_id=f'M{i:02d}', series='sensitivity', plot_role='shaded bar (upper end)',
            label=lab.replace(chr(10),' — '), x_year=x,
            y_repaired_teeth_per_100=round(y*mult,2),
            assumed_miss_rate=miss, multiplier=mult,
            source_citation='ARITHMETIC ONLY — observed / (1 - miss_rate)',
            source_ref='no source: this is a what-if, not an estimate',
            verification_status='not data',
            note='NOT a confidence interval and NOT a projection. The miss rates are round '
                 'numbers chosen to bracket an implausible case.')
i+=1
add(mark_id=f'M{i:02d}', series='reference', plot_role='horizontal dashed rule',
    label='modern level', x_year='', y_repaired_teeth_per_100=100*MOD,
    source_citation='ADHS 2009 Table 4.3.1', source_ref='ADHS 2009',
    verification_status='full text read', note='drawn across the full x-range')
i+=1
base = float(np.mean([100*p[2]/p[3] for p in PTS]))
add(mark_id=f'M{i:02d}', series='derived', plot_role='not plotted — quoted in notes',
    label='break-even miss rate', y_repaired_teeth_per_100=round(base,3),
    assumed_miss_rate=round(1-base/(100*MOD),5),
    source_citation='DERIVED: 1 - (archaeological mean 2.51) / (modern 670)',
    source_ref='computed from the rows above', verification_status='derived',
    note='the miss rate at which the archaeological mean would equal the modern value')

with open('/home/claude/dental/viz/c7_intervention_continuous_data.csv','w',newline='') as f:
    w=csv.DictWriter(f, fieldnames=COLS); w.writeheader(); w.writerows(R)
print(f'rows exported: {len(R)}')
for r in R:
    print(f"  {r['mark_id']} {r['series']:14s} x={str(r['x_year']):>5} "
          f"y={str(r['y_repaired_teeth_per_100']):>8}  {r['label'][:38]}")
