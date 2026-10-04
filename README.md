**[Open the interactive prototype →](https://shuiee.github.io/tooth-untold-prototype/)**  
<sub>Hosted on GitHub Pages from the public repository [shuiee/tooth-untold-prototype](https://github.com/shuiee/tooth-untold-prototype), which holds only the page. This repository, with the code and datasets, stays private.</sub>

# The Tooth Untold

**What can a tooth remember?** An interactive data story. Two composite teeth, a first molar and a canine, are cut open inside their jaw and change as they play through 300 to 1900 CE. Then a radial timeline shows how far back each kind of evidence reaches (caries, pathogens, wear and LEH, metals, artificial interventions), and each record opens its own section. Everything after the intro is laid out like a scientific journal: running heads, plates and figures with numbered notes, page numbers; no captions. Decay, childhood stress lines, chewing wear, tartar, enamel lead and disease DNA all come from published European datasets. Nothing on the page is simulated. The dashboards' charts come from the team's tabular datasets; their event strips are still marked placeholders.

Harvard MDE data-visualisation prototype. The page itself is still titled *The Statistical Tooth*.

---

## Quick start

| I want to… | Do this |
|---|---|
| **See it** | Open the [live page](https://shuiee.github.io/tooth-untold-prototype/), or open `share/statistical-tooth.html` in Chrome, Safari or Firefox (internet needed for the font and two libraries; WebGL2 needed for the teeth). |
| **Edit the page** | In this folder run `python3 -m http.server 8000`, open http://localhost:8000, edit `index.html`, `app.js` or `tooth.js`, and refresh. |
| **Rebuild the data** | `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`, then `python3 build_data.py`, `python3 build_models.py` and `python3 prepare_jaw.py`. `python3 build_layers.py` (the dashboard charts) needs no packages. |
| **Make the single-file versions** | `python3 bundle.py` writes `dist/` and `data/images.js`; `python3 share.py` writes `share/`. |
| **Update the live page** | After `share.py`, copy `share/statistical-tooth.html` to `index.html` in [shuiee/tooth-untold-prototype](https://github.com/shuiee/tooth-untold-prototype) and push. GitHub Pages republishes it within a minute or two. |

Serve the folder rather than double-clicking `index.html`. Browsers block some loading from `file://`. `share/statistical-tooth.html` works either way because everything is inside it.

---

## What's in the folder

```
index.html          layout and styles (all text in Lora for now: --serif and --label in :root; colours are CSS variables there too)
app.js              the storyline: intro, pooling per 100-year window, marks, overview playback, radial timeline scene, dashboards
tooth.js            the 3D renderer (WebGL2 ray-marched distance fields, stipple shading, cut section)
radial.js           the radial timeline: hand-built SVG, no libraries (window.ToothRadial)
caries.js           section 1's caries plate: each period's decay solved to its rate, the period run and the readout (window.CariesPlate); app.js lays the decay on the 3D molar
wearleh.js          section 3's wear landscape (SVG + d3; window.WearLEH)
lehfigs.js          section 3's stress-line figures, after the team's drafts C10, C9 and C8 (SVG + d3; window.LEHFigs)
radial-data.js      the radial timeline's five kinds of record: hand-edited, the one data file outside data/
data/
  data.js           every record the page draws        ← build_data.py
  models.js         canine volumes + tooth point clouds ← build_models.py
  layers.js         the dashboards' chart data          ← build_layers.py
  world.js          Natural Earth 1:50m outlines (not loaded at the moment: the Limitations map went with the v6 flow)
  images.js         pictures (the intro jaw)            ← bundle.py (from images/)
build_data.py       source spreadsheets → data/data.js (every filtering rule is commented)
build_models.py     source tooth models → data/models.js
build_layers.py     source/layer data/ (+ the GHHP file) → data/layers.js (standard library only)
prepare_jaw.py      source jaw engraving → images/jaw-arches.webp (cuts it out of its white background)
bundle.py           → dist/statistical-tooth.html (for the Claude artifact, which adds its own <!doctype>)
share.py            → share/statistical-tooth.html (complete standalone page with an editing guide at the top)
images/             pictures bundle.py embeds (see images/README.txt)
source/
  datavis data/     the datasets build_data.py reads
  teeth models/     the ZBrush tooth models (canines, premolars and first molars); build_models.py reads the canines and premolars
  jaw engraving/    the team's jaw engraving prepare_jaw.py reads
  layer data/       the team's tabular datasets and draft charts for each dashboard, and the scripts behind the drafts
research/           the team's research folder from Google Drive: papers, extra datasets, the prototype video (see research/README.md)
requirements.txt    Python packages for the builds (the page itself needs none)
```

Never edit `data/*.js` or `images/jaw-arches.webp` by hand. They're regenerated by the build scripts.

---

## How it works

**Storyline** (`app.js`, `intro()` then `enterMain()`)

1. **The jaw opens.** The team's engraving shows both dental arches opened out flat, with the jaw hinge on the horizontal centre line. It starts closed: the lower jaw is folded up onto the upper teeth, so we see the back of the print. The print inks itself in, darkest strokes first. Then the lower jaw swings down towards the viewer on its hinge until the picture lies flat as drawn. Rings mark the four lineup teeth on the lower arch.
2. The jaw steps aside. Four teeth line up, drawn from the models: first molar, two premolars, canine. The premolars fade and the molar and canine close in.
3. The drawings become rotating 3D point clouds.
4. **Overview.** Only the two teeth play through 300 → 1900 at `SPEED` years a second, with no timeline and no caption; a small readout under them gives the year. They are the same realistic ground sections as the section plates, out of the jaw with no gum or bone, the nerve and blood vessels running up each canal, in the same view. Every kind of record arrives on them over time: decay, wear, stress lines, lead in the enamel, tartar, and disease DNA, drawn as microbes that rise from the root tip up the canal into the dentine and pulp. At 1900 the teeth pool all periods.
5. **Radial timeline** (Plate II, on the same paper as the rest of the journal), drawn in perspective with no caption. Its centre point is the centre of the page, in the gap between the first molar (left, as on every plate) and the canine (right), the whole, uncut 3D models, set large and deep in the page. Five lines leave that point, one for each kind of record: **Caries**, **Pathogens**, **Wear and LEH**, **Metals**, **Artificial interventions**, each named at its far end, all names the same size. Along each line a hollow circle marks the year each record begins, and the line is darker over the years its records cover, so a gap in the record is a pale stretch. Distance from the centre is how long before the latest record (2009) a year is, on one square-root scale for every line, so the last two thousand years have room beside the six thousand of the metals record. Where records crowd (the seventeen centuries of pathogens), the circles shrink to fit, like beads. The lines lie on a cone pointing at the viewer, so lines widen and circles grow the further back they reach; inside the teeth the lines are soft and blurred, outside crisp. Hover or focus a circle for its years and how much was gathered; hovering a line dims the others. One entrance: each line shoots out of the centre towards you, dropping its circles as it passes their years, then the names appear. On tall narrow screens the whole set turns to whichever angle fits largest, long names break onto two lines, a hover readout moves to whichever side is clear, and the figure keeps clear of the running head and the Replay button. Clicking a name opens that record's section; **Replay** runs the overview again.
6. **Sections** (1 Caries, 2 Pathogens, 3 Wear and LEH, 4 Metals, 5 Artificial interventions). Each is a journal spread, the plate taking the wider share of the page (about 58%): the plate on the left (the 3D teeth showing only that record's traces, drawn in the view that suits the record, with atlas-style labels on hairline leaders) and the article on the right: the figures, each with its numbered notes, with no section header and no captions (the running head names the section; the section's number, name and dek, and each figure's title and summary, stay for screen readers). The running head links every section and back to Plate II. The plates show the teeth out of the jaw (no gums or bone), and caries, pathogens and metals show the first molar alone (their records are not tooth-specific; DNA and tartar marks all go on it). Every plate has **Top**, **Side**, **Section** and **Perspective** buttons under it; turning the teeth by hand from Top or Side moves the choice to Perspective, and the − and + buttons beside them zoom, as does the mouse wheel over the teeth (on narrow screens, where the wheel scrolls the page, ctrl+wheel or a pinch); a view button resets the zoom. Each section opens in its own view:
   - **Top** for caries: the first molar from above, the decay on its chewing surface (below).
   - **Section** (cut open) for pathogens (DNA is recovered from inside the tooth) and metals (lead is locked inside the enamel). These are drawn as realistic ground sections out of the jaw, with no gum or bone: translucent enamel with growth lines, dentine with tubules, cementum on the root, and the pulp with its nerve, artery and vein running up each canal. On the Pathogens plate the marks are drawn as microbes (bacteria as rods, viruses as spiked spheres, malaria parasites inside a red blood cell) and sit in the dentine and pulp.
   - **Both teeth whole, from the side** for wear and LEH, in two acts: first the molar alone with the wear panel, then the canine and the LEH panel come in. Each act steps through the six periods: the molar wears down to each period's 60+ stage over a roughened worn surface, the crown it lost drawn in translucent layers by the age band by which each was gone, in Fig. 3.2's colours (blue at 18–24 to orange at 60+), and the canine's stress lines are drawn after Schultz's standard, exaggerated: one deep, wavy groove as strong as the share of adults with a line on the lower canine and three more as strong as the share with two or more, each full at the record's highest share. Buttons under the plate switch to **Top**, **Section** and **Perspective** views; dragging still turns the teeth. **Replay**, at the plate's top left, runs both acts and the panels again.
   - **Both teeth whole** for artificial interventions (no repairs are drawn: they are too rare to place on a composite tooth).

   The figures:
   - **Pathogens:** on opening, the plate plays the pathogen record onto the tooth a century at a time (`startPseq()`, `PSEQ.STEP` ms per century, slower than the overview): only pathogens, each century's genomes rising up the canal and staying, the year under the plate and that century's rung lit on the strand, until every century is in; **Replay** runs it again. The figure is the team's organism-by-century matrix drawn as a strand, like DNA. Each rung is a century from 100 to 1800 CE, made of 50 dots shared among the organisms recovered from it (one dot for every 2% of that century's genomes); the dark dots are the century's largest share, named beside the rung, and a bar gives the century's genome count. The ribbon turns over only beside small or empty centuries, so the large ones face the reader. Under the strand, a key lists every organism by kind (bacteria, viruses, malaria parasites, not disease agents, not named) with its genome total. Hovering lights one organism's dots in every century; choosing it (in the key or on the strand) colours its line and pulls its dots out into a row per century, a readable share of each century, with a line that reads its record out. Shaded bands are world events from the team's events list (first plague pandemic 541–750, Black Death 1347–1351, syphilis spreading through Europe from 1495), marked as context, not data.
   - **Caries:** the caries plate (`caries.js`, drawn by `drawCariesOverlay()` in `app.js`). On the plate, the first molar's chewing surface carries the decay, spreading from the fissures: six periods play in sequence as one lesion that grows and recedes, each leaving its outline (no labels on the molar: the timeline beside it names the eras), and the lesion is carved into the molar's chewing surface by the renderer (`cavDepth()` in `tooth.js`, three illustrative depths: lesion, cavitated body, core), so the crown loses height where it decays, in every view; outlines on the far side of the crown are hidden; **Replay** at the plate's top left runs the periods again (the outlines hide in the Section view, where the cut shows the carved surface). The shaded share of the crown is the share of adults with caries, age-standardised, on an expanded scale the notes state. The caries page has no section header, so the plate and article get the full height. Between them runs an era timeline (`#eraLine`, `eraLineDraw()` in `app.js`): vertical on wide screens, horizontal where the plate and article stack. It is a time scale cut into one coloured, numbered segment per period (the spans overlap, so each segment runs between the midpoints of neighbouring periods), with the period's name and years beside it. A click or a drag anywhere on it picks the period under the pointer, and arrow keys step; the molar and every figure jump there, and it follows the run as the periods play. The article opens with the period's name, years, sample size, crude rate and mean age at death, then three figures as pictograms in a row, each number and caption beside its icons: ten people filled to the share of adults with caries, and two 28-tooth mouths filled to the average count of carious teeth in an affected mouth and to the worst-affected tenth's count (a schematic mouth, as the notes say). Below them sits one severity bar per period. Pressing the period already open on the timeline (or Escape on it), or clicking anywhere off the timeline and the article, shows all six periods at once: the molar carries all six lesions overlapped (carved to the furthest any period reached), each period's outline in its timeline colour with a faint fill so the overlaps build up, and the article shows the team's severity figure (C2B) as one stacked bar per period, numbered and coloured as on the timeline, with a **Break down by age** button under it that swaps in their caries-by-age figure (C1B), one line per period in the timeline's colours, with the 18–24 comparison computed from the same cells (`all()`, `drawSev()`, `drawAge()` in `caries.js`; the colours are `ERA_COL` in `app.js`). A click on a bar, a line, an outline, or a period in the timeline opens that period's events (from the team's timeline) and a six-period comparison.
   - **Wear and LEH:** two boxed panels that scroll on their own and split the column half and half; either can be minimized to its title bar so the other takes the whole column (one always stays open). **Fig. 3.2**, mean molar wear by period and age at death as a landscape on isometric axes, the Industrial 18–24 cell the nearest corner, ages reading left to right: each cell a peak shaped like a molar's crown (five cusps, the central fissure, the molar's worn-surface ripple), drawn as a wire mesh over its surface, isocurves in both directions, so the cells join into one sheet that rises into crowns. Height is the Smith stage above 1, on the same scale as the layers on the molar; colour runs from blue (18–24) to orange (60+), deeper for more wear. As each period plays its row lifts and brightens; afterwards a click on a peak sets the teeth to that period and opens its row of the original grid, comparisons with the neighbouring periods, and the team's timeline events that overlap it. **Fig. 3.3** (after the team's C10), the share of adults with a stress line (LEH) on the lower canine, by period, with 95% intervals: each bar grows from left to right while the canine takes its period, finishing with it, drawn like a groove on a tooth but true in length. Once its bars are in, the **human correlations** of one period appear under its notes (Industrial unless a bar is picked: the period's figures and the timeline events that overlap it; a click on a bar switches period, a click anywhere else in the panel goes back to Industrial), and under them two buttons, **Break down by age** and **Break down by severity**, each opening its breakdown below (a second click closes it). **Break down by age** brings in **Fig. 3.4** (after C9): each period's share by age at death as a gap from its own share, a ribbon twisted around its fitted line, the periods loading in order; beside it the slope in each cemetery of a period, black where it falls with age and grey where it rises (Industrial first; a click on a ribbon switches period). **Break down by severity** sends copies of the bars flying down inside the panel (which scrolls with them) into **Fig. 3.5** (after C8): all six widen and flatten into full rows, then each row splits by how many lines the canine carries, one after another, then each period's cemeteries fade in. Hovering a period's column shakes all its cemeteries and dims the other periods in both panels; moving away restores them.
   - **Artificial interventions:** repaired teeth per 100 individuals examined, three archaeological samples against the 2009 Adult Dental Health Survey, with the draft's ×10 and ×100 what-if bars (labelled as arithmetic, not data). The plate shows no traces: repairs are too rare to place on a composite tooth.
   - **Metals:** lead in childhood enamel from the Neolithic to 20th-century births, and eight elements in modern against archaeological enamel.

   The "human × layer" event strips under the charts are still **placeholders**.

**The jaw animation** is plain CSS 3D. `#jaw .rig` holds the upper half, a flat canvas that never moves, and `.jw-lo`, the lower half, hinged at its top edge. `jawPose(k)` rotates the lower half from 179.4° (closed) to 0° (open) and lightly darkens faces that turn away from the light. `jawInk(p)` fills in the back of the print. Both are driven by `tween()` in `intro()`.

**Data flow**

`source/` → `build_data.py` → `data/data.js` → `composite(t)` in `app.js` pools everything whose dating overlaps a 100-year window. The pooled values drive:
- `paramsFor()`, which sets the renderer uniforms: wear plane, cavity size, stress-line grooves, tartar collar, lead stipple;
- `updateParticles()`, which places one mark per DNA find on the cut face;
- `paramsFor()` and `showsRec()` also decide which layer's traces a tooth carries (`S.show`).

GHHP skeletal sites are weighted by the share of their date range inside the window. DNA finds are dated to the nearest 100 years, so marks change once per century.

**Renderer** (`tooth.js`)

- **The shape.** Each tooth is a signed-distance field, ray-marched in a fragment shader:
  - The canines are distance volumes built from the sculpted models. They carry three channels: distance to the surface, enamel mask and pulp distance.
  - The first molar is still a constructed shape (`builtShape()`) until a molar model arrives.
- **The cut.** The section is the plane z = 0.
- **Placing marks.** A JavaScript copy of the distance function (`outerJS`, `volSample`) puts marks and label anchors exactly on the surfaces the shader draws.

---

## Where to change things

| Change | Where |
|---|---|
| The four sections | `LAYERS` in `app.js`: number, name, dek, plate views and placeholder events; keys match `radial-data.js` |
| Journal frame | `setPage()` in `app.js` (running head, page numbers); `plateLabels()` (the labels on the plate); styles `.rh`, `.sec`, `.fig`, `.notes`, `.folio` in `index.html` |
| A layer's charts | `CHARTS` in `app.js` (titles, subtitles, notes); `drawPathogenStrand()` (the pathogen record drawn as a strand: `STRAND_NAME`, `STRAND_CONTEXT` for the world events), `drawLead()`, `drawElements()`. The data comes from `build_layers.py`: change a dataset in `source/layer data/`, rerun it, then `bundle.py`. |
| The Wear and LEH section | `wearHTML()`, `wearMount()`, `wearSeq()` and `wearPick()` in `app.js` (the period-by-period sequence, the panels, the period detail; `S.wl` drives the teeth through `paramsFor()`, `S.viewMode` the four views); the stress-line half is `lehPick()` and `lehView()` (the bar's detail and its breakdowns); the figures are `wearleh.js` (wear) and `lehfigs.js` (stress lines); the data is `morphology.eras`, `morphology.leh_canine` (the lower canine, recomputed from the GHHP file and checked against the team's drafts C8–C10) and `events` from `build_layers.py`. The lost crown's layers are `strataOf()` in `app.js` and `capCol()` in the `tooth.js` shader; the worn surface's ripple is `wearN()` in `tooth.js` (shader and JavaScript copies). `?debug=1` exposes the section as `window.__wl`. |
| The caries plate | `caries.js`: `CONTEXT` (each period's events and text, which are context, not data), `frac()` (the expanded scale), `NOTES`, `pictos()` (the pictograms), the cusp lobes and fissures the lesion grows from. On the molar: `drawCariesOverlay()` and `chewingSurface()` in `app.js` (the surface's height map, the crown's footprint, the outlines and marks). Its numbers are `caries.plate` from `build_layers.py`. `CariesPlate.check(LAYER_DATA.caries.plate)` in the browser console reports each period's shaded share against its target. |
| Plate views | `view` in each `LAYERS` entry: `"cut"`, `"whole"` or `"aerial"` per tooth, the section's opening view (`defView()`); the buttons set `S.viewMode` (`VIEWMODE` maps them to views); `frameView()` sets each view's camera; `plateLabels()` labels each view; `SOLO` lists the sections that show the molar alone |
| Event pictures | Save `images/event-<name>.jpg` (the names are the `img` keys in `LAYERS`, e.g. `event-justinian`), then run `bundle.py`. |
| Which traces each layer shows | `paramsFor()` (wear, decay, stress lines, lead, tartar) and `showsRec()` (which records become marks) |
| Overview speed | `SPEED` (years per second); `stepPlay()` holds briefly at 1900, then `enterRadial()` runs |
| Radial timeline data | `radial-data.js`: each record's `segs` (covered years, BCE negative), `dens` (`[from, to, amount]`, `null` = count absent), angle and unit. The caries and wear period boundaries are in `GHHP_PERIODS`, once for both lines. |
| Radial timeline geometry | `R0` (where the lines leave the teeth), `RMAX`, `NOW` and the square-root scale `rAge()` at the top of `radial.js`; the perspective is `CAM`, `Z_HUB` (depth of the teeth), `Z_END` (depth of the oldest year) and `TILT`; tooth sizes `TOOTH_H` and `GAP`; on tall screens the whole set turns to whichever angle fits largest (`PORTRAIT`, `TURN_STEP`), and long names break onto two lines (`WRAP_AT`). The five angles in `radial-data.js` are 72 degrees apart. The look is the `.rd-*` rules in `index.html`. |
| Radial timeline teeth | `radialTeeth()` and `RADIAL_VIEW` in `app.js` (which renderer view; the teeth are the whole, uncut models, out of the jaw) |
| Intro timing | `intro()`: the `wait()` and `tween()` durations (jaw: 1600 ms ink, 3000 ms swing). |
| Intro jaw picture | Replace `source/jaw engraving/jaw-arches.webp` (both arches opened flat, hinge on the centre line), run `prepare_jaw.py` then `bundle.py`. If the teeth move, update the ring positions in `JAW_TEETH` in `app.js`. |
| Jaw motion | `jawPose()`: closed angle, tilt of the closed jaw, shading. Perspective is `#jaw{perspective}` in `index.html`. |
| Colours, type, layout | CSS variables and rules at the top of `index.html`; mark colours in `CAT` in `app.js` |
| Surface stipple, cut-face fills, bone and gum | The `FS` shader in `tooth.js` (`stipple()`, the `onCut` branch, `blockD()` and `gumD()`) |
| Add a tooth model | Add an entry to `TEETH` in `build_models.py`; for the main view, map it in `modelKey()` in `tooth.js` |
| A new data source | `build_data.py` (keep one record per sample and write down every filtering rule) |

**Test shortcuts.** Add these to the address:
- `?scene=main&t=1347` skips the intro and shows the overview at a year (`&play=1` plays on from there).
- `?scene=radial` opens the radial timeline (`&animate=1` plays its entrance); `?scene=layer&layer=caries` opens one section (`caries`, `pathogens`, `wear`, `metals`, `interventions`).
- `&jaw=max` shows the upper jaw.
- `&still=1` places marks without travel; `&notrans=1` turns off CSS transitions.
- `?freeze=0|0.5|1|2|3` holds one intro frame: closed jaw, half open, open with rings, lineup, point cloud.
- `&debug=1` exposes `window.__dbg`.

**Before calling a change done**, watch the real intro play (no shortcuts) at about 1440, 1024, 760 and 390 px wide. A layout bug once hid the teeth completely below 900 px.

---

## Rules for the data

1. **No invented values.** Every number traces to a row in `source/`. Missing data shows as "not measured" or "too few teeth", never as a guess.
2. **Counts are not prevalence.** DNA finds show where researchers looked and found DNA. Plague is heavily studied.
3. **Label data and context separately.** Story markers, historical text, pictures, the jaw engraving, entry routes and anatomy are context or illustration, and the page says so.
4. **Tooth-specific scores stay on their tooth.** GHHP scores stress lines on incisors and canines and wear on first and second molars only. Decay and tooth loss are whole-mouth rates.
5. **Metals.** Only enamel lead goes inside the tooth; bone metals stay in the table. Homeostatic elements (Zn, Cu, Fe, Mn) are excluded.
6. **Minimum sample sizes.** Rates need at least 150 teeth or tooth positions; stress lines and wear need at least 15 people.

---

## Open work

- [ ] **Event strips.** The "human × layer" events in `LAYERS` still need dates and pictures.
- [ ] **Removed for now in v6**: the timeline, story markers, header (Lower/Upper, Region), number callouts, end panel and Limitations. They are in the Git history (commit `26ad507`) if any should come back.
- [ ] **Use the first molar models.** `mandibular-first-molar.zip` and `maxillary-first-molar.zip` are now in `source/teeth models/`, in the same format as the canines. Add them to `TEETH` in `build_models.py` so the molar, which carries the wear data, stops being a constructed shape.
- [ ] **Model credit and licence.** The ZBrush models in `source/teeth models/` arrived without author or licence information. Confirm both before public release and add the credit line to `limitsHTML()`.
- [ ] **Before making the repository public**, remove the journal articles in `research/` (they are copyrighted; keep citations instead) and check the terms of each dataset.
- [ ] **Jaw engraving credit.** Name the source of the engraving in `source/jaw engraving/` in `limitsHTML()`. Its lower arch is a mirrored copy of the upper one; a real lower-jaw engraving could replace it.
- [ ] **GHHP terms.** The page is now public on GitHub Pages. Check the Global History of Health Project's terms, because it contains per-site figures derived from GHHP data.
- [ ] **Upper molar section.** With three roots, the z = 0 cut shows little root. Revisit when the molar model arrives.

---

## Sources

- **AncientMetagenomeDir** (SPAAM community, CC-BY 4.0; Fellows Yates et al. 2021, *Scientific Data* 8:31), reclassified in `EU_dental_pathogens_classified.xlsx`.
- **Kocher et al. 2021**, *Science*, Data S1 (hepatitis B radiocarbon dates).
- **Global History of Health Project**, European module: `ghhp_dental_decoded.csv`.
- **Metals and particulates literature compilation**: `EU_particulates_metals_literature.xlsx`. Each row cites its paper.
- **Mühlemann et al. 2018** (github.com/acorg/parvo-2018) was checked: its samples are already in AncientMetagenomeDir.
- **Natural Earth**, via world-atlas@2.0.2 (map outlines).
- **Jaw engraving**: supplied by the team (source to be credited).
- **Dashboard datasets**: the team's tabular extracts in `source/layer data/` (AncientMetagenomeDir; GHHP European module; Montgomery et al. 2010, Moore et al. 2021, Kamenov et al. 2018). Molar wear is recomputed from the GHHP file with the team's own method and matches their draft cell for cell.
- **Libraries**: d3 7.9.0, topojson-client 3.1.0; typeface Lora (Google Fonts).
