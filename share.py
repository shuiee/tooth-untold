"""Build share/statistical-tooth.html: one standalone, editable HTML document for collaborators.

Unlike dist/ (made for the Claude artifact, which adds its own <!doctype>), this file is a complete
page: doctype, <head>, <body>. The readable code comes first and the large generated data blocks last,
so people can open it in any editor and find their way. Run after build_data.py and bundle.py."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(HERE, p), encoding="utf-8").read()

src = rd("index.html")
src = src.replace('<meta charset="utf-8">\n', "", 1)
head_part, body_part = src.split("</style>", 1)
title_meta_style = head_part + "</style>"
body_html = body_part.split("<script", 1)[0].strip()

app = rd("app.js")
assert app.rstrip().endswith("})();")
app = app.replace("(function () {", "window.startStatisticalTooth = (function () {", 1)
app = app.rstrip()[:-len("})();")] + "});\n"

GUIDE = """<!--
  THE TOOTH UNTOLD · What can a tooth remember?
  Harvard MDE data-visualisation prototype. One self-contained page: open it in Chrome, Safari or Firefox.
  It needs an internet connection for the fonts and d3, and a browser with WebGL2 for the 3D teeth.

  THE FLOW
    Intro      the engraved jaw opens, four teeth line up, the first molar and canine become point clouds.
    Overview   the two teeth alone play through 300-1900 CE (no timeline); marks arrive century by century.
    Layers     the teeth separate into four sheets: pathogens, morphology, metals, caries. Click one.
    Dashboard  that layer's teeth, with a draggable cross-section "film", beside charts drawn from the team's
               tabular datasets (window.LAYER_DATA). The "human x layer" event strips are still placeholders.
               Caries shows the caries plate instead: decay spreading from the fissures, era by era.

  WHAT IS IN THIS FILE (top to bottom)
    1. <head>       styles. Colours, fonts and layout are CSS variables in :root.
    2. <body>       page markup: layer tabs, teeth, layer sheets, dashboard panel, intro layers.
    3. Library      d3 7.9.0 from a public CDN.
    4. tooth.js     the 3D renderer. The tooth is a signed-distance shape ray-marched in a WebGL2
                    shader and drawn as an engraving. shape() holds the anatomy of each tooth type.
    5. caries.js    the caries plate (the Caries dashboard): decay solved to each era's rate, drawn in SVG.
    6. app.js       the storyline: intro, pooling of the data per 100-year window, particles,
                    overview playback, layer sheets and dashboards.
    7. DATA         generated blocks, large and not meant for hand edits:
                      window.ERA_IMAGES  pictures: the intro jaw engraving (jaw-arches), event pictures (event-...)
                      window.TOOTH_DATA  every record the page draws (see "Data" below)
                      window.TOOTH_MODELS canine distance volumes and tooth point clouds (build_models.py)
                      window.LAYER_DATA  the dashboards' chart data (build_layers.py, from source/layer data/)
    8. Start call   window.startStatisticalTooth() runs the page once the data has loaded.

  COMMON EDITS (all in app.js unless noted)
    Layers            LAYERS: name, description, chart title, legend series and placeholder events for each
                      layer. Event pictures are window.ERA_IMAGES["event-..."] (images/event-*.jpg in the source).
    Dashboard         CHARTS: each layer's chart titles, subtitles and notes. dashHTML() lays out the panel;
                      drawPathogenMatrix(), drawWear(), drawLEH(), drawLead() and drawElements() draw the charts.
    Caries plate      caries.js: CONTEXT (era events and text), frac() (the expanded scale), NOTES, the cusp lobes.
    Cross-section     CUT_MIN / CUT_MAX (depth range), drawFilm() (the film strip), setCut() and the #cut slider.
    Which marks show  paramsFor() and showsRec() keep only the chosen layer's traces in the teeth.
    Overview speed    SPEED is years per second; stepPlay() holds briefly at 1900, then enterLayers() runs.
    Intro jaw         loadJaw(), jawInk() and jawPose(). The picture is window.ERA_IMAGES["jaw-arches"]:
                      both arches opened flat, the hinge on the horizontal centre line. JAW_TEETH places the rings.
    Intro timing      intro(): the wait(...) and tween(...) durations, in ms.
    Colours           CAT (marks in the tooth) and the CSS variables in :root.
    Tooth anatomy     Canines come from sculpted models (build_models.py); the first molar is still the
                      constructed shape in builtShape() in tooth.js. 1 unit = 10 mm, gum line at y = 0.

  TEST SHORTCUTS (add to the file's address)
    ?scene=main&t=1347        skip the intro and show the overview at a year (&play=1 to play from there)
    ?scene=layers             the separated layer sheets
    ?scene=layer&layer=metals one layer's dashboard (pathogens, morphology, metals or caries); &cut=-0.3 sets the film
    &still=1  &notrans=1      no travelling marks / no CSS transitions (for screenshots)
    ?freeze=0|0.5|1|2|3       hold one intro frame (0 closed jaw, 0.5 half open, 1 open, 2 lineup, 3 cloud)

  DATA (window.TOOTH_DATA)
    Built by build_data.py from four supplied sources. No synthetic values anywhere.
      pathogens    AncientMetagenomeDir European dental samples (CC-BY 4.0), reclassified sheet, plus
                   Kocher et al. 2021 Data S1 for radiocarbon dates. One record per sample and organism.
      metagenomes  dental calculus or teeth sequenced as a community, with no pathogen genome listed.
      metals       enamel lead, bone metals and particles in calculus, from published studies.
      sites        Global History of Health Project skeletal series, one row per cemetery, with pooled
                   counts for decay, tooth loss, stress lines (per tooth position) and molar wear.
    Rules the page follows: DNA counts are research effort, not prevalence. Ages are rounded to
    100 years. Historical text and pictures are context, not data. Entry routes are illustrations.

  To regenerate the data, or to edit the code as separate files, ask for the source folder:
  build_data.py, bundle.py, share.py, index.html, app.js, tooth.js, caries.js, data/.
-->"""

data = "\n".join(
    "<script>/* " + p + " (generated) */\n" + rd(p).replace("</script", "<\\/script") + "\n</script>"
    for p in ["data/images.js", "data/data.js", "data/models.js", "data/layers.js"])

doc = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
       "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
       + GUIDE + "\n" + title_meta_style + "\n<style>body{margin:0}</style>\n</head>\n<body>\n"
       + body_html + "\n\n"
       "<!-- 3 · library -->\n"
       "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js\"></script>\n\n"
       "<!-- 4 · renderer -->\n<script>\n" + rd("tooth.js").replace("</script", "<\\/script") + "\n</script>\n\n"
       "<!-- 5 · caries plate -->\n<script>\n" + rd("caries.js").replace("</script", "<\\/script") + "\n</script>\n\n"
       "<!-- 6 · storyline and interface -->\n<script>\n" + app.replace("</script", "<\\/script") + "\n</script>\n\n"
       "<!-- 7 · generated data -->\n" + data + "\n\n"
       "<!-- 8 · start -->\n<script>window.startStatisticalTooth();</script>\n</body>\n</html>\n")

os.makedirs(os.path.join(HERE, "share"), exist_ok=True)
out = os.path.join(HERE, "share", "statistical-tooth.html")
open(out, "w", encoding="utf-8").write(doc)
print(out, round(len(doc.encode()) / 1024), "KB")
