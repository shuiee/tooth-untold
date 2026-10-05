/* Data for the radial timeline (radial.js). Hand-edited: change the numbers here, not in the drawing code.

   Years are calendar years, BCE negative. For each category:
     segs  stretches of time the record covers; a break between two is a gap in the line
     dens  one entry per record: [from, to, amount gathered]. null = the count is genuinely absent
           (shown as "count not in the data", and no volume circle is drawn). A record whose from and to are the
           same year (a single survey) is drawn as a point; for the per-year view it counts as one year
     angle direction of the line in degrees, clockwise from pointing right. The five are spread evenly, 72 degrees
           apart; metals, the longest record, runs horizontally where there is most room

   Where the numbers come from (source/layer data/):
     Caries        n per period, Caries Viz/c2b_caries_severity_data.csv
     Wear and LEH  period_n (adults scored for LEH), Wear and LEH/c6c_leh_combined_data.csv
     Pathogens     genomes per century, Pathogens Viz/c4b_pathogen_matrix_data.csv
     Metals        n_individuals of the British series and the modern row, Metals Viz/c3b_lead_timeline_data.csv
     Artificial interventions  x_date_early, x_date_late and denominator_individuals of the archaeological and
                   modern rows, Artificial Interventions Viz/c7_intervention_continuous_data.csv */
(function () {
  "use strict";
  // Working period boundaries for the two GHHP lines (caries, wear and LEH), pending confirmation.
  // Changing a boundary here moves it on both lines.
  const GHHP_PERIODS = [
    ["Pre-medieval", 0, 500],
    ["Early medieval", 500, 1000],
    ["High medieval", 1000, 1250],
    ["Late medieval", 1250, 1500],
    ["Early modern", 1500, 1800],
    ["Industrial", 1800, 1900],
  ];
  const ghhpSegs = () => GHHP_PERIODS.map(p => [p[1], p[2]]);
  const ghhpDens = counts => GHHP_PERIODS.map((p, i) => [p[1], p[2], counts[i]]);

  window.RADIAL_DATA = [
    {
      key: "caries", name: "Caries", angle: 108, unit: "adults recorded",
      segs: ghhpSegs(),
      dens: ghhpDens([621, 2289, 920, 1025, 1841, 531])
    },
    {
      key: "metals", name: "Metals", angle: 180, unit: "individuals measured",
      segs: [[-4040, -2525], [-2540, -825], [-840, 18], [3, 375], [360, 675], [660, 1075], [1160, 1475], [1860, 1975]],
      dens: [[-4040, -2525, 31], [-2540, -825, 13], [-840, 18, 10], [3, 375, 25], [360, 675, 50], [660, 1075, 26], [1160, 1475, 26], [1860, 1975, 77]]   // 20th century: 77 modern teeth (Kamenov et al. 2018, Table 1)
    },
    {
      key: "pathogens", name: "Pathogens", angle: 252, unit: "genomes sequenced",
      segs: [[100, 800], [900, 1900]],
      dens: [[100, 200, 3], [200, 300, 2], [300, 400, 3], [400, 500, 22], [500, 600, 5], [600, 700, 20], [700, 800, 11],
             [900, 1000, 14], [1000, 1100, 7], [1100, 1200, 10], [1200, 1300, 11], [1300, 1400, 51], [1400, 1500, 9],
             [1500, 1600, 54], [1600, 1700, 22], [1700, 1800, 13], [1800, 1900, 10]]
    },
    {
      key: "wear", name: "Wear and LEH", angle: 324, unit: "adults scored",
      segs: ghhpSegs(),
      dens: ghhpDens([531, 1995, 809, 651, 1644, 455])
    },
    {
      key: "interventions", name: "Artificial interventions", angle: 36, unit: "individuals examined",
      segs: [[900, 1200], [1460, 1670], [1800, 1899], [2009, 2009]],
      dens: [[900, 1200, 204], [1460, 1670, 100], [1800, 1899, 450], [2009, 2009, 6470]]
    },
  ];
})();
