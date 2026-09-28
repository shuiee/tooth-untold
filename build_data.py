"""
Build data/data.js for The Statistical Tooth (v2: time-scrubbed 3D tooth).

Reads the supplied source files in ../datavis data/ and writes one JS file that
assigns window.TOOTH_DATA. Nothing is estimated or synthesised. Every rule that
filters or labels a row is written out below so the team can revise it.

Run:  python3 build_data.py      (needs pandas + openpyxl)
"""
import json, math, os
import pandas as pd
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
# source files: ./source/datavis data in the shared folder, or ../datavis data next to the project
SRC = next((p for p in [os.path.join(HERE, "source", "datavis data"), os.path.join(HERE, "..", "datavis data")] if os.path.isdir(p)), os.path.join(HERE, "source", "datavis data"))
T0, T1 = 250, 1950            # records must overlap this span (scrubber centres 300-1900, window +/-50)

# Country -> region. From GHHP's own assignments where the country appears
# there; the rest (in REGION_ASSUMED) are our assignment for this prototype.
REGION = {
    "Austria": "Central and Southeastern Europe", "Cyprus": "Mediterranean",
    "France": "Northwestern Europe", "Germany": "Central and Southeastern Europe",
    "Greece": "Mediterranean", "Hungary": "Central and Southeastern Europe",
    "Latvia": "Northeastern Europe", "Lithuania": "Northeastern Europe",
    "Netherlands": "Northwestern Europe", "Poland": "Northeastern Europe",
    "Portugal": "Mediterranean", "Romania": "Central and Southeastern Europe",
    "Spain": "Mediterranean", "Sweden": "Northeastern Europe",
    "Switzerland": "Central and Southeastern Europe", "UK": "Northwestern Europe",
    "United Kingdom": "Northwestern Europe", "Ukraine": "Central and Southeastern Europe",
    "Norway": "Northeastern Europe", "Finland": "Northeastern Europe",
    "Denmark": "Northwestern Europe", "Belgium": "Northwestern Europe",
    "Italy": "Mediterranean", "Czechia": "Central and Southeastern Europe",
    "Czech Republic": "Central and Southeastern Europe", "Estonia": "Northeastern Europe",
    "Ireland": "Northwestern Europe", "Serbia": "Central and Southeastern Europe",
    "Croatia": "Central and Southeastern Europe", "Slovakia": "Central and Southeastern Europe",
    "Russia": "Northeastern Europe", "Iceland": "Northwestern Europe",
    "Bulgaria": "Central and Southeastern Europe", "Slovenia": "Central and Southeastern Europe",
    "Montenegro": "Central and Southeastern Europe", "Moldova": "Central and Southeastern Europe",
    "Belarus": "Northeastern Europe",
}
GHHP_COUNTRIES = {"Austria", "Cyprus", "France", "Germany", "Greece", "Hungary", "Latvia", "Lithuania",
                  "Netherlands", "Poland", "Portugal", "Romania", "Spain", "Sweden", "Switzerland", "UK",
                  "United Kingdom", "Ukraine"}

def clean(v):
    if v is None: return None
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, (np.floating, float)):
        return None if (math.isnan(v) or math.isinf(v)) else float(v)
    if isinstance(v, (np.bool_,)): return bool(v)
    return v
def rec(d): return {k: clean(v) for k, v in d.items()}
def region(c): return REGION.get(c)

# ---------------------------------------------------------------- pathogens (AncientMetagenomeDir)
GROUP = {"virus": ["Hepatitis B virus", "Parvovirus B19", "Variola virus", "Human alphaherpesvirus 1"],
         "parasite": ["Plasmodium falciparum", "Plasmodium vivax", "Plasmodium malariae"]}
def group_of(s):
    for g, L in GROUP.items():
        if s in L: return g
    return "bacteria"

p = pd.read_excel(os.path.join(SRC, "EU_dental_pathogens_classified.xlsx"), sheet_name="European samples")
hbv = pd.read_excel(os.path.join(SRC, "hepatitis B", "science.abi5658_data_s1.xlsx"), header=2)
hbv_dates = {r["Individual ID"]: r["Dating (C14 2-sig. or archaeological)"] for _, r in hbv.iterrows()}

pathogens, dup_notes = [], []
sg = p[p.singlegenome_species.notna() & (p.approx_year_ce >= T0) & (p.approx_year_ce < T1)]
sg = sg[sg.contamination_risk != "high"]
for (sample, species), g in sg.groupby(["sample_name", "singlegenome_species"], sort=False):
    r = g.iloc[0]
    if len(g) > 1:
        dup_notes.append(f"{sample} ({species}) listed by {', '.join(g.project_name)}")
    yr = int(r.approx_year_ce)
    early, late, precise = yr - 50, yr + 50, None
    note = f"Reported as {int(r.sample_age)} BP, rounded to the nearest 100 years"
    if sample in hbv_dates and isinstance(hbv_dates[sample], str) and " cal CE" in hbv_dates[sample]:
        precise = hbv_dates[sample]
        try:
            a, b = precise.split(" cal")[0].split("-"); early, late = int(a), int(b)
            note += f"; radiocarbon {precise} (Kocher et al. 2021, Data S1)"
        except Exception:
            pass
    lim = ["Detection shows the organism's DNA survived in sampled dental material. It does not show active infection or cause of death.",
           "Counts reflect where researchers looked, not how common the disease was."]
    if species == "Salmonella enterica": lim.append("Serovar unresolved: may be human-adapted (Paratyphi C) or zoonotic.")
    if species == "Clostridium tetani": lim.append("Classed as environmental: may reflect soil organisms rather than infection.")
    if r.contamination_risk == "moderate": lim.append("Moderate contamination risk in the source classification.")
    if len(g) > 1: lim.append("Same sample appears in more than one publication; counted once here.")
    pathogens.append(rec(dict(
        id=f"P-{sample}-{species[:8]}", kind="pathogen", cat=group_of(species), name=species, disease=r.disease,
        site=r.site_name, country=r.geo_loc_name, region=region(r.geo_loc_name),
        region_assumed=r.geo_loc_name not in GHHP_COUNTRIES, lat=r.latitude, lon=r.longitude,
        sample=sample, material=r.material, year=yr, early=early, late=late, precise=precise, date_note=note,
        status="Detected in sampled dental material",
        measure="Genome-level identification (AncientMetagenomeDir single-genome record)",
        transmission=r.transmission, driver=r.anthropogenic_driver_primary, host_adaptation=r.host_adaptation,
        confidence="high" if (r.contamination_risk == "low" and species not in ("Salmonella enterica", "Clostridium tetani")) else "moderate",
        confidence_note=f"Contamination risk: {r.contamination_risk}. Date resolution about ±50 years" + (" (radiocarbon-dated)" if precise else "") + ".",
        source=f"{', '.join(g.project_name)} via AncientMetagenomeDir", doi=r.publication_doi, limitation=" ".join(lim),
    )))

metagenomes = []
mg = p[p.singlegenome_species.isna() & (p.approx_year_ce >= T0) & (p.approx_year_ce < T1)]
for key, g in mg.groupby(["project_name", "site_name", "approx_year_ce"], sort=False):
    r = g.iloc[0]; yr = int(r.approx_year_ce)
    metagenomes.append(rec(dict(
        id=f"M-{r.project_name}-{r.site_name}-{yr}", kind="metagenome", cat="sampled", name="Oral microbiome sampled",
        site=r.site_name, country=r.geo_loc_name, region=region(r.geo_loc_name),
        region_assumed=r.geo_loc_name not in GHHP_COUNTRIES, lat=r.latitude, lon=r.longitude,
        sample=", ".join(g.sample_name.astype(str)), material=", ".join(sorted(g.material.unique())),
        year=yr, early=yr - 50, late=yr + 50, n=len(g),
        date_note=f"Reported as {int(r.sample_age)} BP, rounded to the nearest 100 years",
        status="Sequenced; no pathogen genome listed in this dataset", measure="Community metagenome (oral)",
        confidence="high", confidence_note="Sampling record.", source=f"{r.project_name} via AncientMetagenomeDir",
        doi=r.publication_doi,
        limitation="Sequenced as a microbial community. No pathogen genome is listed, which does not mean these people were free of disease.",
    )))

# ---------------------------------------------------------------- metals and particles
m = pd.read_excel(os.path.join(SRC, "EU_particulates_metals_literature.xlsx"), sheet_name="Dataset")
GEO = {  # town-level coordinates added for mapping; the metals sheet has none
    "Franciscan Friary, Svendborg - cloister walk": (55.06, 10.61), "Franciscan Friary, Svendborg - Hardenberg crypt": (55.06, 10.61),
    "Laymen cemetery, Franciscan Friary, Svendborg": (55.06, 10.61), "Franciscan Friary, Svendborg": (55.06, 10.61),
    "Ole Wormsgade, Horsens": (55.86, 9.85), "Lindegaarden, Ribe": (55.33, 8.76),
    "S Francesco a Folloni, Montella - cloister walk": (40.84, 15.02), "S Francesco a Folloni, Montella - Iannelli crypt": (40.84, 15.02),
    "Several Danish medieval cemeteries": (55.5, 9.6), "Cistercian Abbey, Oem - cloister walk": (56.1, 9.7),
    "Danish medieval cemeteries (control group)": (55.5, 9.6), "Grave soil transect (diagenesis control)": (55.5, 9.6),
    "St. Athanasius Church necropolis, Niculitel": (45.18, 28.49), "Cross Street Chapel Cemetery, Manchester": (53.48, -2.24),
    "Britain, multiple": (52.6, -1.6), "Roman Britain, multiple": (52.0, -1.0), "Scotland and Ireland": (55.8, -4.6),
    "Casal Bertone and Castellaccio Europarco, Rome": (41.9, 12.53),
}
HARM = {"Pb": "Lead (Pb)", "Hg": "Mercury (Hg)", "As": "Arsenic (As)"}
metals = []
for i, r in m.iterrows():
    if pd.isna(r.date_early) or pd.isna(r.date_late): continue
    if r.date_late <= T0 or r.date_early >= T1: continue
    if (r.date_late - r.date_early) > 450: continue            # drops reviews and multi-millennium pools
    tissue = str(r.tissue)
    if r.analyte_class == "heavy metal":
        if r.analyte not in HARM: continue                     # homeostatic elements excluded (source readme)
        if tissue == "enamel" and r.study_id == "Kamenov2018" and "Modern" not in str(r.site): continue
        name = HARM[r.analyte]; cat = "metal"
    elif r.analyte_class == "particulate" and tissue == "dental calculus":
        name = str(r.analyte).capitalize(); cat = "particle"
    else:
        continue
    lat, lon = GEO.get(r.site, (None, None))
    bone = tissue in ("cortical bone", "bone (mixed)", "trabecular bone")
    off_max = 50 if tissue == "cortical bone" else (0 if pd.isna(r.exposure_offset_max_years) else r.exposure_offset_max_years)
    verified = "user-supplied PDF" in str(r.access)
    approx = "APPROXIMATE" in str(r.value_note)
    lim = []
    if bone: lim += ["Measured in bone, not teeth. Bone takes up metals from soil after burial.", "Bone integrates the last decades of life (0-50 yr offset applied)."]
    if tissue == "enamel": lim.append("Enamel forms in childhood and never remodels, so it records exposure decades before burial.")
    if tissue == "soil (control)": lim.append("Grave soil control, not a body tissue.")
    if tissue == "dental calculus": lim.append("Particles can enter calculus by breathing, eating, craft work or post-mortem soil.")
    if cat == "metal": lim.append("A concentration does not identify the source of the metal.")
    if approx: lim.append("Value read from a published figure, not a table.")
    if not verified: lim.append("Not yet checked against the PDF: provisional.")
    val = None if pd.isna(r.value_mean) else float(r.value_mean)
    unit = str(r.unit).replace("ppm", "mg/kg") if tissue == "enamel" else r.unit
    metals.append(rec(dict(
        id=f"X-{r.study_id}-{i}", kind="metal", cat=cat, name=name, analyte=r.analyte, site=r.site, country=r.country,
        region=region(r.country), region_assumed=r.country not in GHHP_COUNTRIES, lat=lat, lon=lon,
        sample=r.element_or_taxon_detail, material=tissue, early=int(r.date_early), late=int(r.date_late),
        exposure_early=int(r.date_early - (off_max or 0)), n=None if pd.isna(r.n_individuals) else int(r.n_individuals),
        status="Measured" if val is not None else "Reported without a single value",
        measure=r.measure, value=val, unit=unit, value_note=None if pd.isna(r.value_note) else r.value_note,
        method=r.method, diagenesis=r.diagenesis_controlled, in_tooth=tissue in ("enamel", "dental calculus"),
        confidence="low" if (approx or not verified or tissue == "soil (control)") else "moderate",
        confidence_note=("Checked against the paper's PDF. " if verified else "Provisional. ") + f"Diagenesis control: {r.diagenesis_controlled}.",
        source=f"{r.citation}, {r.journal}", doi=r.doi,
        date_note=f"Burial/site range {int(r.date_early)}-{int(r.date_late)} CE",
        limitation=" ".join(lim),
    )))

# ---------------------------------------------------------------- GHHP tooth conditions
d = pd.read_csv(os.path.join(SRC, "ghhp_dental_decoded.csv"), low_memory=False)
d = d[(d.site_year_late > T0) & (d.site_year_early < T1)]
LEH = {"max_canine": "leh_maxillary_canine_score", "man_canine": "leh_mandibular_canine_score",
       "max_incisor": "leh_maxillary_incisor_score", "man_incisor": "leh_mandibular_incisor_score"}
sites = []
for sid, g in d.groupby("site_id"):
    r = g.iloc[0]
    ok = g[g.counts_consistent == True]
    leh = {}
    for k, col in LEH.items():
        s = g[col].dropna()
        leh[k] = [int(len(s)), int((s >= 2).sum()), int((s >= 3).sum())]   # observed, >=1 line, >=2 lines
    s_any = g[g.leh_teeth_observed > 0]
    leh["any"] = [int(len(s_any)), int(s_any.leh_present.sum()), int((s_any.leh_max_severity >= 3).sum())]
    wear = {}
    for k, col in (("m1", "m1_wear_mean"), ("m2", "m2_wear_mean"), ("all", "molar_wear_mean")):
        s = g[col].dropna(); wear[k] = [int(len(s)), float(s.sum())]
    span = int(r.site_year_late - r.site_year_early)
    sites.append(rec(dict(
        id=f"G-{sid}", kind="ghhp", cat="condition", name=r.site_name_long, site=r.site_name_long, country=r.country,
        region=r.region, region_assumed=False, lat=r.latitude, lon=r.longitude, topography=r.topography, period=r.period,
        early=int(r.site_year_early), late=int(r.site_year_late), span=span, n=int(len(g)),
        n_dent=int(g.dentition_observed.sum()), settlement=r.settlement_size, urban=r.urban_rural, context=r.socioeconomic_context,
        teeth=int(ok.teeth_present.sum()), carious=int(ok.teeth_with_caries.sum()),
        positions=int(ok.tooth_positions_observed.sum()), amtl=int(ok.teeth_lost_antemortem.sum()),
        leh=leh, wear=wear, material="Skeletal dentition (macroscopic scoring)", status="Scored by GHHP observers",
        confidence="high" if span <= 150 else ("moderate" if span <= 300 else "low"),
        confidence_note=f"Site dated {int(r.site_year_early)}-{int(r.site_year_late)} CE ({span}-year span).",
        source="Global History of Health Project, European module", doi=None,
        limitation="Skeletons are the people who died and were buried here, not the living population. Wear reflects diet, food processing and tooth use together. Rows with inconsistent tooth counts are left out of caries and tooth-loss rates.",
    )))

all_sp = sorted(p.singlegenome_species.dropna().unique())
out = dict(
    meta=dict(range=[300, 1900], window=100, duplicates=dup_notes, built_from=[
        "EU_dental_pathogens_classified.xlsx (AncientMetagenomeDir, CC-BY 4.0)",
        "hepatitis B/science.abi5658_data_s1.xlsx (Kocher et al. 2021)",
        "EU_particulates_metals_literature.xlsx",
        "ghhp_dental_decoded.csv (Global History of Health Project)",
        "github.com/acorg/parvo-2018 (Mühlemann et al. 2018): same samples as Muhlemann2018b rows"]),
    pathogens=pathogens, metagenomes=metagenomes, metals=metals, sites=sites,
)
os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
with open(os.path.join(HERE, "data", "data.js"), "w") as f:
    f.write("// Generated by build_data.py from the supplied source files. Do not edit by hand.\n")
    f.write("window.TOOTH_DATA = " + json.dumps(out, ensure_ascii=False, default=str) + ";\n")
print(f"pathogens {len(pathogens)}  metagenome sets {len(metagenomes)}  metals/particles {len(metals)}  GHHP sites {len(sites)}")
print("in-tooth metal rows:", [(x['site'][:30], x['early'], x['late'], x['value'], x['unit']) for x in out['metals'] if x['material'] == 'enamel'])
print("unmapped regions:", sorted({x['country'] for x in pathogens + metagenomes if x['region'] is None}))
