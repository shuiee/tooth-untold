"""Build data/layers.js: the data behind the three layer dashboards (pathogens, morphology, metals).

Standard library only, so it runs without the other build packages. Every number comes from a file in
source/layer data/ (the team's tabular datasets for each dashboard) or, for molar wear, from the GHHP file
that build_data.py also reads. Nothing is interpolated or smoothed here.

  Pathogens   Pathogens Viz/c4b_pathogen_matrix_data.csv
              share of each century's recovered genomes that belong to each organism (AncientMetagenomeDir)
  Morphology  Wear and LEH/c6b_leh_slopes_data.csv    LEH by period and age at death, with 95% intervals
              Wear and LEH/c6c_leh_combined_data.csv  the same, plus each period's overall share
              molar wear by period and age at death: computed from ghhp_dental_decoded.csv exactly as the team's
              figure script does (figure scripts/c6_wear_leh.py + _style.py load_ghhp): rows with consistent
              counts and observed dentition, adults 18-69, mean of molar_wear_mean per cell. The result matches
              the team's draft figure c6_wear_leh.png cell for cell.
  Caries      Caries Viz/c1b_caries_by_age_data.csv   share of adults with at least one carious tooth, by period and age
              Caries Viz/c2b_caries_severity_data.csv  adults by how many of their own teeth were carious, per period
  Caries plate computed from ghhp_dental_decoded.csv with the same rows as the team's severity figure
              (figure scripts/c2b_caries_severity.py: consistent counts, observed dentition, adults 18-69). Per period:
              share with any carious tooth, crude and age-standardised to the pooled age distribution of all
              periods (the eight age bands above); mean and 90th percentile of carious teeth among the affected;
              mean age; and the 10th-90th percentile of site mid-dates (rounded to the decade) as the era's span.
              The severity bands are checked against Caries Viz/c2b_caries_severity_data.csv.
  Wear and LEH, per period (morphology.eras): mean molar wear and stress-line shares from ghhp_dental_decoded.csv,
              the shares checked against c6c_leh_combined_data.csv (see below)
  Events      research/Human Correlations/timeline_events_display.csv, the team's timeline, as written (context)
  Interventions  Artificial Interventions Viz/c7_intervention_continuous_data.csv  repaired teeth per 100 individuals
              examined, three archaeological samples and the 2009 Adult Dental Health Survey, with the draft's ×10 and
              ×100 what-if bars (arithmetic only, flagged as not data in the file and on the page)
  Metals      Metals Viz/c3b_lead_timeline_data.csv   lead in childhood enamel by exposure window
              Metals Viz/particulates_metals_dataset.csv, Kamenov2018 rows: eight elements in archaeological
              and modern enamel (the draft's panel B)
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
LAY = os.path.join(HERE, "source", "layer data")
GHHP = next((p for p in [os.path.join(HERE, "source", "datavis data", "ghhp_dental_decoded.csv"),
                         os.path.join(HERE, "..", "datavis data", "ghhp_dental_decoded.csv")] if os.path.exists(p)), None)

def rows(*path):
    with open(os.path.join(LAY, *path), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))
num = lambda v: None if v in ("", None) else float(v)

# ---------------------------------------------------------------- pathogens
# Category decides the colour in the page, the same as the marks in the teeth. Organisms that are not
# disease agents (the file's is_disease_agent = False) are kept but drawn apart.
VIRUS = {"Hepatitis B virus", "Parvovirus B19", "Variola virus", "Human alphaherpesvirus 1"}
PARASITE = {"Plasmodium falciparum", "Plasmodium vivax", "Plasmodium malariae"}
P = rows("Pathogens Viz", "c4b_pathogen_matrix_data.csv")
taxa, per_century = {}, {}
for r in P:
    t, c = r["taxon"], int(r["century_ce"])
    agent = r["is_disease_agent"] == "True"
    cat = "other" if not agent else "virus" if t in VIRUS else "parasite" if t in PARASITE else "bacteria"
    T = taxa.setdefault(t, dict(taxon=t, disease=r["disease"], agent=agent, cat=cat, total=int(r["taxon_total_genomes_100_1800ce"]), cells={}))
    T["cells"][c] = [int(r["genomes_this_taxon"]), float(r["share_of_century_pct"])]
    per_century[c] = int(r["genomes_all_taxa_this_century"])
pathogens = dict(
    centuries=list(range(100, 1801, 100)), genomes=per_century, taxa=list(taxa.values()),
    source="AncientMetagenomeDir (SPAAM community, CC-BY 4.0), European dental samples, 100-1800 CE; disease labels from pathogen_reference.csv")

# ---------------------------------------------------------------- morphology
PERIODS = ["Pre-medieval", "Early medieval", "High medieval", "Late medieval", "Early modern", "Industrial"]
AGES = ["18–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–59", "60+"]
BINS = [18, 25, 30, 35, 40, 45, 50, 60, 70]
leh = {p: {} for p in PERIODS}
for r in rows("Wear and LEH", "c6b_leh_slopes_data.csv"):
    leh[r["period"]][r["age_band"]] = [float(r["pct_with_leh"]), int(r["n"]), float(r["ci_low"]), float(r["ci_high"])]
leh_all, leh_colour = {}, {}
for r in rows("Wear and LEH", "c6c_leh_combined_data.csv"):
    leh_all[r["period"]] = [float(r["period_overall_pct"]), int(r["period_n"])]
    leh_colour[r["period"]] = r["colour"]                   # the team's colour for each period's line
    assert abs(leh[r["period"]][r["age_band"]][0] - float(r["pct_with_leh"])) < 1e-6   # the two files agree

wear = {p: {} for p in PERIODS}
if GHHP:
    acc = {}
    with open(GHHP, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["counts_consistent"] != "True" or r["dentition_observed"] != "True": continue
            try: age = float(r["age_years"])
            except ValueError: continue
            if not 18 <= age < 70 or r["period"] not in PERIODS or r["molar_wear_mean"] in ("", "nan"): continue
            ab = AGES[max(i for i in range(8) if BINS[i] <= age)]
            s = acc.setdefault((r["period"], ab), [0.0, 0]); s[0] += float(r["molar_wear_mean"]); s[1] += 1
    for (p, ab), (tot, n) in acc.items(): wear[p][ab] = [round(tot / n, 3), n]
# Per period, for the teeth on the Wear and LEH plate as they step through the six periods: mean molar wear (the same
# rows as the wear grid, all ages pooled), and stress lines as the team's LEH file counts them (leh_present: a line on
# any scored tooth), with leh_max_severity, the worst tooth's Schultz stage (1 none, 2 one line, 3 two or more lines).
# The share with any line is checked against the team's file. Spans are GHHP_PERIODS in radial-data.js.
SPANS = {"Pre-medieval": [0, 500], "Early medieval": [500, 1000], "High medieval": [1000, 1250],
         "Late medieval": [1250, 1500], "Early modern": [1500, 1800], "Industrial": [1800, 1900]}
eras = []
if GHHP:
    acc = {p: dict(w=[], leh=[]) for p in PERIODS}
    with open(GHHP, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["counts_consistent"] != "True" or r["dentition_observed"] != "True": continue
            try: age = float(r["age_years"])
            except ValueError: continue
            if not 18 <= age < 70 or r["period"] not in PERIODS: continue
            if r["molar_wear_mean"] not in ("", "nan"): acc[r["period"]]["w"].append(float(r["molar_wear_mean"]))
            if r["leh_present"] not in ("", "nan") and r["leh_max_severity"] not in ("", "nan"):
                acc[r["period"]]["leh"].append((r["leh_present"] == "True", float(r["leh_max_severity"])))
    for p in PERIODS:
        W, L = acc[p]["w"], acc[p]["leh"]
        any_ = 100 * sum(a for a, _ in L) / len(L)
        assert abs(round(any_, 1) - leh_all[p][0]) < 0.051 and len(L) == leh_all[p][1], p   # matches c6c_leh_combined_data.csv
        eras.append(dict(p=p, span=SPANS[p], wear=round(sum(W) / len(W), 2), wear_n=len(W),
                         leh_any=round(any_, 1), leh_multi=round(100 * sum(s >= 3 for _, s in L) / len(L), 1),
                         schultz=round(sum(s for _, s in L) / len(L), 2), leh_n=len(L)))
morphology = dict(periods=PERIODS, ages=AGES, wear=wear, leh=leh, leh_overall=leh_all, leh_colour=leh_colour, eras=eras,
    source="Global History of Health Project, European module, decoded for this project; adults 18-69")

# ---------------------------------------------------------------- stress lines on the lower canine (Section 3's LEH figures)
# The team's draft figures C8, C9 and C10 (images supplied 2026-10-04; no CSV): every adult aged 18-69 with a scorable
# mandibular canine (leh_mandibular_canine_score 1 no line, 2 one line, 3 two or more), with no other row filter. Per
# period: carriers (score 2 or 3) and the 95% Wilson interval; the share age-standardised to the pooled age distribution
# of all 5,929 (this differs from the draft's column by at most 0.1 point); the composition by score; the slope of the
# 0/1 marker on age in years by ordinary least squares on individuals, in percentage points per decade, with each age
# band's share as a gap from the period's own share and the fitted line at the band's midpoint; and, for each cemetery
# with at least 15 scorable canines, its share, its share with two or more lines and its own slope. Counts, intervals,
# slopes, compositions and the industrial cemeteries all reproduce the drafts.
import math
MIDS = [21.5, 27.5, 32.5, 37.5, 42.5, 47.5, 55.0, 65.0]          # the age bands' midpoints, 18-24 ... 60+ (to 70)
def wilson(k, n, z=1.96):
    q = k / n; d = 1 + z * z / n; c = (q + z * z / (2 * n)) / d; h = z * math.sqrt(q * (1 - q) / n + z * z / (4 * n * n)) / d
    return [round(100 * (c - h), 1), round(100 * (c + h), 1)]
def slope(R):                                                      # pp per decade of age at death
    n = len(R); ma = sum(q[1] for q in R) / n; my = sum(q[2] >= 2 for q in R) / n
    sxx = sum((q[1] - ma) ** 2 for q in R)
    return None if sxx == 0 else sum((q[1] - ma) * ((q[2] >= 2) - my) for q in R) / sxx * 1000
leh_canine = None
if GHHP:
    can = []                                                       # (period, age, score, age band, site)
    with open(GHHP, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try: age = float(r["age_years"]); sc = float(r["leh_mandibular_canine_score"])
            except ValueError: continue
            if not 18 <= age < 70 or r["period"] not in PERIODS or sc < 1: continue
            can.append((r["period"], age, sc, max(i for i in range(8) if BINS[i] <= age), r["site_name"]))
    poolc = [sum(q[3] == b for q in can) / len(can) for b in range(8)]
    lc_eras = []
    for p in PERIODS:
        R = [q for q in can if q[0] == p]; n = len(R); k = sum(q[2] >= 2 for q in R); share = 100 * k / n
        std = sum(poolc[b] * 100 * sum(q[2] >= 2 for q in B) / len(B) for b, B in ((b, [q for q in R if q[3] == b]) for b in range(8)) if B)
        sl = slope(R); mage = sum(q[1] for q in R) / n
        cells = []
        for b in range(8):
            B = [q for q in R if q[3] == b]
            if not B: continue
            c = 100 * sum(q[2] >= 2 for q in B) / len(B)
            cells.append(dict(a=AGES[b], n=len(B), pct=round(c, 1), dev=round(c - share, 2), fit=round(sl / 10 * (MIDS[b] - mage), 2)))
        sites = {}
        for q in R: sites.setdefault(q[4], []).append(q)
        st = [dict(name=nm, n=len(S), pct=round(100 * sum(q[2] >= 2 for q in S) / len(S), 1), multi=round(100 * sum(q[2] >= 3 for q in S) / len(S), 1),
                   slope=None if slope(S) is None else round(slope(S), 2)) for nm, S in sites.items() if len(S) >= 15]
        st.sort(key=lambda d: (d["slope"] is None, d["slope"] if d["slope"] is not None else 0))
        comp = [sum(q[2] == v for q in R) for v in (1, 2, 3)]
        lc_eras.append(dict(p=p, n=n, k=k, pct=round(share, 1), ci=wilson(k, n), std=round(std, 1), slope=round(sl, 2), mean_age=round(mage, 1),
                            comp=[round(100 * c / n, 1) for c in comp], comp_n=comp, cells=cells, sites=st, sites_all=len(sites)))
    leh_canine = dict(eras=lc_eras, ages=AGES, n=len(can), sites_min=15,
        source="Global History of Health Project, European module, decoded for this project; adults 18-69 with a scorable mandibular canine; scoring after Schultz (1988)")
morphology["leh_canine"] = leh_canine

# ---------------------------------------------------------------- the team's timeline of human events
# research/Human Correlations/timeline_events_display.csv, as written: context for the sections, not data. Each event
# keeps the team's own wording of what it should do to the teeth (expected) and what has been measured (measured).
EVENTS = os.path.join(HERE, "research", "Human Correlations", "timeline_events_display.csv")
events = []
if os.path.exists(EVENTS):
    with open(EVENTS, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            events.append(dict(id=r["event_id"], start=int(r["year_start"]), end=int(r["year_end"]), act=r["act"],
                               layer=r["signal_layer"], strength=r["evidence_strength"], label=r["display_label"],
                               expected=r["expected_effect"], measured=r["measured_effect"]))

# ---------------------------------------------------------------- caries
by_age = {p: {} for p in PERIODS}
for r in rows("Caries Viz", "c1b_caries_by_age_data.csv"):
    by_age[r["period"]][r["age_band"]] = [float(r["pct_with_caries"]), int(float(r["n"]))]
sev_rows = rows("Caries Viz", "c2b_caries_severity_data.csv")
BANDS = [k for k in sev_rows[0].keys() if k not in ("", "n")]
severity = {r[""]: dict(n=int(float(r["n"])), shares=[float(r[b]) for b in BANDS]) for r in sev_rows}
caries = dict(periods=PERIODS, ages=AGES, by_age=by_age, bands=BANDS, severity=severity,
    source="Global History of Health Project, European module, decoded for this project; adults 18-69")

# ---------------------------------------------------------------- caries plate (the Caries section's figure, caries.js)
PBANDS = [(0, 0, "no caries"), (1, 2, "1–2 teeth"), (3, 4, "3–4 teeth"), (5, 9, "5–9 teeth"), (10, 999, "10+ teeth")]
def pctl(v, q):                                    # linear interpolation, as numpy's default
    v = sorted(v); k = (len(v) - 1) * q; f = int(k)
    return v[f] + (v[min(f + 1, len(v) - 1)] - v[f]) * (k - f)
plate = None
if GHHP:
    ppl = []                                       # (period, age band, carious teeth, site mid-date, age)
    with open(GHHP, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["counts_consistent"] != "True" or r["dentition_observed"] != "True": continue
            try: age = float(r["age_years"]); c = float(r["teeth_with_caries"])
            except ValueError: continue
            if not 18 <= age < 70 or r["period"] not in PERIODS or c != c: continue
            mid = num(r["site_year_mid"])
            ppl.append((r["period"], max(i for i in range(8) if BINS[i] <= age), c, mid, age))
    pool = [sum(1 for q in ppl if q[1] == b) / len(ppl) for b in range(8)]
    sev_check = {r[""]: r for r in rows("Caries Viz", "c2b_caries_severity_data.csv")}
    eras = []
    for p in PERIODS:
        R = [q for q in ppl if q[0] == p]
        anyc = lambda S: 100 * sum(q[2] > 0 for q in S) / len(S)
        std = sum(w * anyc(B) for w, B in ((pool[b], [q for q in R if q[1] == b]) for b in range(8)) if B)
        aff = [q[2] for q in R if q[2] > 0]
        mids = [q[3] for q in R if q[3] is not None]
        sev = [round(100 * sum(lo <= q[2] <= hi for q in R) / len(R), 1) for lo, hi, _ in PBANDS]
        for (_, _, lab), v in zip(PBANDS, sev): assert abs(v - float(sev_check[p][lab])) < 0.051, (p, lab)   # matches the team's figure
        assert len(R) == int(sev_check[p]["n"])
        eras.append(dict(p=p, lo=int(round(pctl(mids, .1) / 10) * 10), hi=int(round(pctl(mids, .9) / 10) * 10),
                         std=round(std, 1), crude=round(anyc(R), 1), n=len(R), age=round(sum(q[4] for q in R) / len(R), 1),
                         sev=sev, aff=round(sum(aff) / len(aff), 1), p90=int(round(pctl(aff, .9)))))
    plate = dict(eras=eras, bands=[b[2] for b in PBANDS], n=len(ppl),
        source="Global History of Health Project, European module, decoded for this project; adults 18-69")

caries["plate"] = plate

# ---------------------------------------------------------------- metals
lead = []
for r in rows("Metals Viz", "c3b_lead_timeline_data.csv"):
    lead.append(dict(series=r["series"], label=r["label"], early=int(float(r["exposure_early"])), late=int(float(r["exposure_late"])),
                     ppm=float(r["pb_ppm"]), n=None if r["n_individuals"] == "" else int(float(r["n_individuals"]))))
el = {}
for r in rows("Metals Viz", "particulates_metals_dataset.csv"):
    if r["study_id"] != "Kamenov2018" or r["measure"] != "mean concentration" or r["tissue"] != "enamel": continue
    side = "modern" if r["site"].startswith("Modern") else "arch" if r["site"].startswith("Archaeological") else None
    if side: el.setdefault(r["analyte"], {})[side] = float(r["value_mean"])
elements = [dict(el=k, arch=v["arch"], modern=v["modern"], ratio=round(v["modern"] / v["arch"], 2)) for k, v in el.items() if "arch" in v and "modern" in v]
elements.sort(key=lambda e: -e["ratio"])
metals = dict(lead=lead, elements=elements,
    source="Montgomery et al. 2010, Moore et al. 2021, Kamenov et al. 2018 (lead); Kamenov et al. 2018, Table 1 (elements)")

# ---------------------------------------------------------------- artificial interventions
marks, whatif = [], {}
for r in rows("Artificial Interventions Viz", "c7_intervention_continuous_data.csv"):
    if r["series"] in ("archaeological", "modern"):
        marks.append(dict(id=r["mark_id"], series=r["series"], label=r["label"], x=int(float(r["x_year"])),
                          early=int(float(r["x_date_early"])), late=int(float(r["x_date_late"])), per100=float(r["y_repaired_teeth_per_100"]),
                          teeth=r["numerator_repaired_teeth"], n=int(float(r["denominator_individuals"])),
                          lo=num(r["ci_low_per_100"]), hi=num(r["ci_high_per_100"]), source=r["source_citation"]))
    elif r["series"] == "sensitivity":
        whatif.setdefault(r["label"], {})[int(float(r["multiplier"]))] = float(r["y_repaired_teeth_per_100"])
    elif r["series"] == "derived":
        breakeven = float(r["assumed_miss_rate"])
for m in marks:
    m["whatif"] = whatif.get(m["label"])
interventions = dict(marks=marks, breakeven=breakeven,
    source="Monaco et al. 2022; Dittmar et al. 2026; Waters-Rist et al. 2013 (conference poster); ADHS 2009 published tables, NHS Digital")

out = dict(caries=caries, interventions=interventions, pathogens=pathogens, morphology=morphology, metals=metals, events=events)
p = os.path.join(HERE, "data", "layers.js")
with open(p, "w", encoding="utf-8") as f:
    f.write("// Generated by build_layers.py from source/layer data/. Do not edit by hand.\nwindow.LAYER_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(p, round(os.path.getsize(p) / 1024, 1), "KB ·", sum(len(v) for v in by_age.values()), "caries cells ·", len(taxa), "organisms ·", sum(len(v) for v in wear.values()), "wear cells ·", len(lead), "lead rows ·", len(elements), "elements")
