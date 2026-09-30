#!/usr/bin/env python3
"""Pathogens as a COMPOSITION MATRIX.

Replaces the range chart's two weakest encodings: dot size (illegible at this
scale) and a sampling strip that did not line up with anything above it.

Cell colour is now SHARE OF THAT CENTURY'S RECOVERIES, which is the closest
thing to a prevalence-like measure this index can honestly support. Effort
cancels in the numerator and denominator: a century where 51 genomes were
sequenced and 35 were plague reads 69% plague, regardless of how hard anyone dug.
The sampling header sits in the SAME column grid, so effort is one glance away
from every cell it qualifies.
"""
import sys; sys.path.insert(0, '/home/claude/dental/viz')
import numpy as np, pandas as pd, json
from _style import *
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

AQUA = ['#d6f2e6','#aee5cd','#84d8b3','#57ca98','#1baf7a','#179468','#137a56','#0e5f43']
CMAP = LinearSegmentedColormap.from_list('path', AQUA)

# Disease labels come from pathogen_reference.csv, built earlier in this project
# with per-organism justifications. Two entries are NOT disease agents and are
# marked as such: Tannerella forsythia and Methanobrevibacter oralis are oral
# residents, in the record because someone reconstructed their genome, not
# because anybody was ill.
REF = pd.read_csv('/home/claude/dental/pathogen_reference.csv').set_index('species')
SHORT = {'Respiratory and invasive disease': 'pneumonia, meningitis',
         'Enteric fever / salmonellosis': 'enteric fever · typhoid & paratyphoid',
         'Herpes simplex (HSV-1)': 'oral herpes',
         'Syphilis / yaws / bejel': 'syphilis · yaws · bejel (by subspecies)',
         'Oral commensal (archaeon)': 'NOT a disease — oral archaeon',
         'Periodontal disease': 'NOT an epidemic disease — gum disease',
         'Fifth disease': 'fifth disease (erythema infectiosum)',
         'Louse-borne relapsing fever': 'louse-borne relapsing fever',
         'Pneumonia, meningitis': 'pneumonia, meningitis',
         'Plague': 'plague — bubonic, pneumonic, septicaemic',
         'Malaria': 'malaria', 'Leprosy': 'leprosy', 'Smallpox': 'smallpox',
         'Tetanus': 'tetanus', 'Hepatitis B': 'hepatitis B',
         'Erysipeloid': 'erysipeloid — a zoonosis of animal handling'}
def disease(sp):
    d = REF.loc[sp, 'disease'] if sp in REF.index else ''
    return SHORT.get(d, str(d).lower())
NONDISEASE = {'Tannerella forsythia', 'Methanobrevibacter oralis'}

P = json.load(open('/home/claude/dental/viz_path.json'))
CENT = list(range(100, 1900, 100))
tax = {}
for c in CENT:
    for sp, v in P.get(str(c), {}).get('species', {}).items():
        tax.setdefault(sp, {})[c] = v
rows = sorted(tax.items(), key=lambda kv: (min(kv[1]), -sum(kv[1].values())))
N = {c: P.get(str(c), {}).get('total', 0) for c in CENT}
TOT = {sp: sum(d.values()) for sp, d in tax.items()}

M = np.full((len(rows), len(CENT)), np.nan)
K = np.zeros_like(M)
for i, (sp, d) in enumerate(rows):
    for j, c in enumerate(CENT):
        if N[c] and c in d:
            M[i, j] = 100 * d[c] / N[c]; K[i, j] = d[c]

rc()
fig = plt.figure(figsize=(16.4, 9.9))
gs = fig.add_gridspec(2, 1, height_ratios=[1, 12], hspace=.035)
hx, ax = fig.add_subplot(gs[0]), fig.add_subplot(gs[1])

# ---- header: sampling effort, same columns ---------------------------------
hx.bar(range(len(CENT)), [N[c] for c in CENT], width=.86, color=FAINT, zorder=3)
for j, c in enumerate(CENT):
    if N[c]:
        hx.annotate(str(N[c]), (j, N[c]), xytext=(0, 2), textcoords='offset points',
                    ha='center', fontsize=6.8, color=INK2)
hx.set_xlim(-.5, len(CENT)-.5); hx.set_ylim(0, 78)
hx.set_xticks([]); hx.set_yticks([])
for s in hx.spines.values(): s.set_visible(False)
hx.text(-.85, 30, 'genomes\nsequenced', ha='right', va='center', fontsize=7.6,
        color=MUTED, linespacing=1.5)
hx.axvspan(6.5, 7.5, color='#f0efec', zorder=1)

# ---- matrix ----------------------------------------------------------------
im = ax.imshow(M, cmap=CMAP, vmin=0, vmax=90, aspect='auto')
ax.set_xticks(range(len(CENT)))
ax.set_xticklabels([f'{c}s' for c in CENT], fontsize=8, rotation=0)
ax.set_yticks(range(len(rows))); ax.set_yticklabels([])
ax.tick_params(colors=INK, length=0)
for i, (sp, _) in enumerate(rows):
    nd = sp in NONDISEASE
    ax.text(-.012, i - .17, sp if len(sp) < 27 else sp[:25]+'…',
            ha='right', va='center', fontsize=8.8, fontstyle='italic',
            color=INK2 if nd else INK, transform=ax.get_yaxis_transform(),
            clip_on=False)
    ax.text(-.012, i + .22, disease(sp), ha='right', va='center', fontsize=7.4,
            color=MUTED, transform=ax.get_yaxis_transform(), clip_on=False)
for s in ax.spines.values(): s.set_visible(False)
ax.set_xticks(np.arange(-.5, len(CENT), 1), minor=True)
ax.set_yticks(np.arange(-.5, len(rows), 1), minor=True)
ax.grid(which='minor', color=SURF, lw=1.8); ax.tick_params(which='minor', length=0)
ax.axvspan(6.5, 7.5, color='#f0efec', zorder=4)
ax.annotate('no\ndata', (7, len(rows)/2-.5), ha='center', va='center', fontsize=7.4,
            color=MUTED, zorder=5, linespacing=1.4)

for i in range(len(rows)):
    for j in range(len(CENT)):
        if np.isnan(M[i, j]): continue
        ax.text(j, i, f'{M[i,j]:.0f}', ha='center', va='center', fontsize=7.4,
                color=SURF if M[i, j] > 48 else INK, fontweight='semibold')
for i, (sp, d) in enumerate(rows):
    ax.annotate(f'{TOT[sp]}', (len(CENT)-.35, i), xytext=(10, 0),
                textcoords='offset points', ha='left', va='center',
                fontsize=8, color=INK2, annotation_clip=False)
ax.annotate('total\ngenomes', (len(CENT)-.35, -1.15), xytext=(10, 0),
            textcoords='offset points', ha='left', va='center', fontsize=7.4,
            color=MUTED, linespacing=1.5, annotation_clip=False)
ax.set_xlabel('century CE', fontsize=9.4, color=INK2, labelpad=9)

cb = fig.colorbar(im, ax=[hx, ax], fraction=.014, pad=.085)
cb.set_label('share of that century’s recovered genomes (%)', fontsize=8.2,
             color=INK2, labelpad=8)
cb.outline.set_visible(False); cb.ax.tick_params(colors=INK2, length=0, labelsize=7.6)

title(fig, 'Which disease dominated the record, century by century',
      'Each cell: the share of that century’s sequenced genomes belonging to this '
      'organism · AncientMetagenomeDir, European dental samples, 100–1800 CE',
      y=.975, ys=.940, x=.045, ts=16)
notes(fig, [
 '1  WHY SHARE AND NOT COUNT. A raw count tells you how much sequencing was done, which tracks '
 'excavation funding. A share is a ratio of two numbers from the same century, so effort largely '
 'cancels: the 1300s yielded 51 genomes and 35 were Yersinia pestis — 69% — whether the dig was '
 'large or small. Shares are comparable DOWN a column. They are still not prevalence in a '
 'population: the denominator is genomes recovered, not people alive.',
 '2  A column with a tiny denominator is fragile. The 200s rest on two genomes, so each is 50%. '
 'The header bar gives every column its n; read the two together. Columns with n < 5 are the 100s, 200s and 300s.',
 '3  WHAT THIS IS NOT. It is not the percentage of the oral microbiome these organisms made up. '
 'AncientMetagenomeDir is an index of samples and accessions — it carries no taxonomic abundance '
 'at all. See the accompanying note on what obtaining that would require.',
 '4  The 800s are empty: no European dental samples in the index for that century. The record '
 'ends at 1800 because the index floors sample_age at 100 BP.',
 '4b  DISEASE LABELS. From pathogen_reference.csv, compiled for this project. Two rows are not '
 'disease agents at all: Tannerella forsythia is a periodontal organism and Methanobrevibacter '
 'oralis an oral archaeon — both live in healthy mouths and appear here only because someone '
 'reconstructed their genome from calculus. Three rows are Plasmodium species that all cause '
 'malaria but differ in severity and climate tolerance: falciparum is the lethal one, vivax was '
 'historically the dominant European form, malariae causes quartan fever. Treponema pallidum '
 'subspecies determine whether the disease is syphilis, yaws or bejel, and the index does not '
 'record which. Haemophilus influenzae does NOT cause influenza — it was misnamed after being '
 'wrongly blamed for the 1890 pandemic.',
 '5  Source: AncientMetagenomeDir (SPAAM community), CC-BY 4.0. Colour ramp is a single-hue '
 'sequential scale derived from categorical slot 3.'],
 x=.045, width=192)
fig.subplots_adjust(left=.255, right=.855, top=.855, bottom=.300)
fig.savefig('/home/claude/dental/viz/c4b_pathogen_matrix.png', dpi=200)
fig.savefig('/home/claude/dental/viz/c4b_pathogen_matrix.svg')

out = []
for i, (sp, d) in enumerate(rows):
    for j, c in enumerate(CENT):
        if np.isnan(M[i, j]): continue
        out.append(dict(taxon=sp, disease=disease(sp),
                        is_disease_agent=sp not in NONDISEASE,
                        century_ce=c, genomes_this_taxon=int(K[i, j]),
                        genomes_all_taxa_this_century=N[c],
                        share_of_century_pct=round(M[i, j], 2),
                        taxon_total_genomes_100_1800ce=TOT[sp]))
pd.DataFrame(out).to_csv('/home/claude/dental/viz/c4b_pathogen_matrix_data.csv', index=False)
print(f'{len(rows)} taxa x {len(CENT)} centuries · {len(out)} non-empty cells')
print('columns with n<5:', [c for c in CENT if 0 < N[c] < 5], '· empty:',
      [c for c in CENT if N[c] == 0])
