"""Shared style. Palette validated:
node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#4a3aa7" --mode light --pairs adjacent
-> ALL CHECKS PASS
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

GHHP, METAL, PATH, IV = '#2a78d6', '#eb6834', '#1baf7a', '#4a3aa7'
INK, INK2, MUTED, GRID, SURF = '#0b0b0b', '#52514e', '#8a8880', '#e6e5e1', '#fcfcfb'
FAINT = '#b9b7b0'

# documented blue sequential ramp, steps 100 -> 700
BLUE = ['#cde2fb','#b7d3f6','#9ec5f4','#86b6ef','#6da7ec','#5598e7','#3987e5',
        '#2a78d6','#256abf','#1c5cab','#184f95','#104281','#0d366b']
CMAP_BLUE = LinearSegmentedColormap.from_list('ghhp', BLUE)
ORANGE = ['#fbe0d3','#f7c2a8','#f2a37d','#ee8553','#eb6834','#c8542a','#a34320','#7d3318']
CMAP_ORANGE = LinearSegmentedColormap.from_list('metal', ORANGE)

PERIODS = ['Pre-medieval','Early medieval','High medieval','Late medieval',
           'Early modern','Industrial']
AGE_BINS = [18,25,30,35,40,45,50,60,70]
AGE_LABS = ['18–24','25–29','30–34','35–39','40–44','45–49','50–59','60+']

def rc():
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,
        'axes.edgecolor':GRID,'axes.linewidth':.8,'figure.facecolor':SURF,
        'axes.facecolor':SURF,'savefig.facecolor':SURF})

def clean(ax, grid='y'):
    for s in ('top','right'): ax.spines[s].set_visible(False)
    ax.spines['left'].set_color(GRID); ax.spines['bottom'].set_color(GRID)
    ax.tick_params(colors=INK2, length=0, labelsize=8.2)
    ax.set_axisbelow(True)
    if grid: ax.grid(axis=grid, color=GRID, lw=.7, zorder=0)

def title(fig, t, sub, y=.965, ys=.925, x=.055, ts=16.5, ss=9.6):
    fig.suptitle(t, x=x, y=y, ha='left', fontsize=ts, color=INK, fontweight='semibold')
    fig.text(x, ys, sub, fontsize=ss, color=INK2, va='top')

def notes(fig, lines, x=.055, y=.012, width=150, size=7.3):
    import textwrap
    fig.text(x, y, '\n'.join(textwrap.fill(n, width, subsequent_indent='   ')
                             for n in lines),
             ha='left', va='bottom', fontsize=size, color=MUTED, linespacing=1.62)

def load_ghhp():
    import pandas as pd, numpy as np
    g = pd.read_csv('/home/claude/ghhp/ghhp_dental_decoded.csv')
    g = g[g.counts_consistent & g.dentition_observed]
    a = g[(g.age_years >= 18) & (g.age_years < 70)].copy()
    a['ab'] = pd.cut(a.age_years, AGE_BINS, right=False, labels=AGE_LABS)
    a['period'] = pd.Categorical(a.period, PERIODS, ordered=True)
    return a[a.period.notna()]
