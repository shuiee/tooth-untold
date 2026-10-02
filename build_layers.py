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
  Metals      Metals Viz/c3b_lead_timeline_data.csv   lead in childhood enamel by exposure window
              Metals Viz/particulates_metals_dataset.csv, Kamenov2018 rows: eight elements in archaeological
              and modern enamel (the draft's panel B)
  Caries      computed from ghhp_dental_decoded.csv with the same rows as the team's severity figure
              (figure scripts/c2b_caries_severity.py: consistent counts, observed dentition, adults 18-69). Per period:
              share with any carious tooth, crude and age-standardised to the pooled age distribution of all
              periods (the eight age bands above); mean and 90th percentile of carious teeth among the affected;
              mean age; and the 10th-90th percentile of site mid-dates (rounded to the decade) as the era's span.
              The severity bands are checked against Caries Viz/c2b_caries_severity_data.csv.
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
leh_all = {}
for r in rows("Wear and LEH", "c6c_leh_combined_data.csv"):
    leh_all[r["period"]] = [float(r["period_overall_pct"]), int(r["period_n"])]
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
morphology = dict(periods=PERIODS, ages=AGES, wear=wear, leh=leh, leh_overall=leh_all,
    source="Global History of Health Project, European module, decoded for this project; adults 18-69")

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

# ---------------------------------------------------------------- caries
BANDS = [(0, 0, "no caries"), (1, 2, "1–2 teeth"), (3, 4, "3–4 teeth"), (5, 9, "5–9 teeth"), (10, 999, "10+ teeth")]
def pctl(v, q):                                    # linear interpolation, as numpy's default
    v = sorted(v); k = (len(v) - 1) * q; f = int(k)
    return v[f] + (v[min(f + 1, len(v) - 1)] - v[f]) * (k - f)
caries = None
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
        sev = [round(100 * sum(lo <= q[2] <= hi for q in R) / len(R), 1) for lo, hi, _ in BANDS]
        for (_, _, lab), v in zip(BANDS, sev): assert abs(v - float(sev_check[p][lab])) < 0.051, (p, lab)   # matches the team's figure
        assert len(R) == int(sev_check[p]["n"])
        eras.append(dict(p=p, lo=int(round(pctl(mids, .1) / 10) * 10), hi=int(round(pctl(mids, .9) / 10) * 10),
                         std=round(std, 1), crude=round(anyc(R), 1), n=len(R), age=round(sum(q[4] for q in R) / len(R), 1),
                         sev=sev, aff=round(sum(aff) / len(aff), 1), p90=int(round(pctl(aff, .9)))))
    caries = dict(eras=eras, bands=[b[2] for b in BANDS], n=len(ppl),
        source="Global History of Health Project, European module, decoded for this project; adults 18-69")

out = dict(pathogens=pathogens, morphology=morphology, metals=metals, caries=caries)
p = os.path.join(HERE, "data", "layers.js")
with open(p, "w", encoding="utf-8") as f:
    f.write("// Generated by build_layers.py from source/layer data/. Do not edit by hand.\nwindow.LAYER_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(p, round(os.path.getsize(p) / 1024, 1), "KB ·", len(taxa), "organisms ·", sum(len(v) for v in wear.values()), "wear cells ·", len(lead), "lead rows ·", len(elements), "elements ·", len(caries["eras"]) if caries else 0, "caries eras")
