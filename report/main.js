/** Declare variables */
const fsURL =
  "https://nsdi.systems.gov.bt/server/rest/services/Hosted/INDEX_INFO/FeatureServer/0";
const fsFields = [
  "risk", // main risk index field
  "hazard",
  "vulnerabil",
  "exposure",
];
const adminFields = [
  "name_2",
  "name_1"
];

const riskColor = ["#FFFDFB", "#F5C5AB", "#E19884", "#DB6857", "#C93636"];
const hzColor = ["#FFFDFB", "#FFF1E2", "#FEDCBA", "#FCB16C", "#F78721"];
const vuColor = ["#FCFBFD", "#EDE8F4", "#CFC4E0", "#A68FC5", "#75559B"];
const epColor = ["#FEFDFB", "#F2E7D9", "#DCC19D", "#C08F4E", "#966C36"];

// Chart data - you'll need to replace these with actual data from your feature attributes
const hzLabels = ["Slope Angle", "Lithology", "Rainfall Intensity", "Historical Landslide Frequency", "Vegetation Cover", "Soil Moisture"];
const vuLabels = ["Building Density", "Building Construction Type", "Road Network Density", "Critical Infrastructure", "Land Use Type", "Terrain Stability"];
const epLabels = ["Population Density", "Vulnerable Populations", "Economic Activity", "Agricultural Land", "Tourism Infrastructure", "Cultural Heritage Sites"];

/** End Declare variables */

require([
  "esri/core/urlUtils",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/smartMapping/renderers/color",
  "esri/widgets/Legend",
], (urlUtils, Map, MapView, FeatureLayer, colorRendererCreator, Legend) =>
  (async () => {
    document.getElementById("btnPrint").addEventListener("click", () => {
      window.print();
    });

    // UPDATE DATE TIME //
    const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedDate = dateFormatter.format(new Date());
    document.getElementById("today-date").innerHTML = formattedDate;

    const urlObject = urlUtils.urlToObject(document.location.href);

    let featureGeometry;
    let featureAttributes;

    if (urlObject.query) {
      const featureLayer = new FeatureLayer({
        url: fsURL,
      });
  
      let query = featureLayer.createQuery();
      query.where = `${adminFields[0]} = '${urlObject.query.id}'`; // Ensure 'name_1' exists in the layer
      query.outFields = ["*"];

      const queryResult = await featureLayer.queryFeatures(query);
      const features = queryResult.features;

      if (features.length > 0) {
        featureGeometry = features[0].geometry.extent; // Use features[0]
        featureAttributes = features[0].attributes;
      } else {
        console.log("No features found for the given ID:", urlObject.query.id);
        return;
      }

    } else {
      console.log("no url parameter");
      return;
    }

    // Set admin names
    const adminNode = document.getElementById("admin-node");
    const adminNames = adminFields.map(adminField => featureAttributes[adminField]);
    adminNode.innerHTML = adminNames.join(", ");

    // SUMMARY SECTION //
    const adminSum = document.getElementById("admin-sum-name");
    adminSum.innerHTML = adminNames.join(", ");
    const summaryScore = document.getElementById("summary-score");
    summaryScore.innerHTML = featureAttributes[fsFields[0]].toFixed(1); // Assuming risk_index is the main score
    const summaryClass = document.getElementById("summary-class");
    // You'll need to add a classification field to your feature service or implement classification logic here
    summaryClass.innerHTML = getRiskClass(featureAttributes[fsFields[0]]);
    
    // Set hazard section values
    document.getElementById("hz-class").innerHTML = getRiskClass(featureAttributes["hazard"]);
    document.getElementById("hz-risk-score").innerHTML = featureAttributes["hazard"].toFixed(1);
    document.getElementById("hz-admin-name").innerHTML = adminNames.join(", ");
    
    // Set vulnerability section values
    document.getElementById("vu-class").innerHTML = getRiskClass(featureAttributes["vulnerabil"]);
    document.getElementById("vu-risk-score").innerHTML = featureAttributes["vulnerabil"].toFixed(1);
    document.getElementById("vu-admin-name").innerHTML = adminNames.join(", ");
    
    // Set exposure section values (changed from cc to ep)
    document.getElementById("ep-class").innerHTML = getRiskClass(featureAttributes["exposure"]);
    document.getElementById("ep-risk-score").innerHTML = featureAttributes["exposure"].toFixed(1);
    document.getElementById("ep-admin-name").innerHTML = adminNames.join(", ");

    // DIMENSIONS BAR CHART //
    const dimensionsChartNode = document.getElementById("dimensions-bar-chart");
    const dimensionsBarChart = createBarChart(dimensionsChartNode);
    
    // UPDATE DIMENSION CHART DATA //
    let dimensionStats = [
      featureAttributes[fsFields[1]], // hazard
      featureAttributes[fsFields[2]], // vulnerability
      featureAttributes[fsFields[3]]  // exposure
    ];
    dimensionsBarChart.data.datasets[0].data = dimensionStats;
    dimensionsBarChart.update();

    // CREATE POLAR CHARTS //
    // Hazard polar chart
    const hzChartNode = document.getElementById("hz-chart-node");
    const hzPolarChart = createPolarChart(hzChartNode, hzLabels, "#F78721");
    // Update with actual data - you'll need to add these fields to your feature service
    hzPolarChart.data.datasets[0].data = [
      featureAttributes["slope_angle"] || 0,
      featureAttributes["lithology"] || 0,
      featureAttributes["rainfall"] || 0,
      featureAttributes["landslide_freq"] || 0,
      featureAttributes["vegetation"] || 0,
      featureAttributes["soil_moisture"] || 0
    ];
    hzPolarChart.update();
    
    // Vulnerability polar chart
    const vuChartNode = document.getElementById("vu-chart-node");
    const vuPolarChart = createPolarChart(vuChartNode, vuLabels, "#75559B");
    vuPolarChart.data.datasets[0].data = [
      featureAttributes["bldg_density"] || 0,
      featureAttributes["bldg_type"] || 0,
      featureAttributes["road_density"] || 0,
      featureAttributes["infrastructure"] || 0,
      featureAttributes["land_use"] || 0,
      featureAttributes["terrain_stab"] || 0
    ];
    vuPolarChart.update();
    
    // Exposure polar chart
    const epChartNode = document.getElementById("ep-chart-node");
    const epPolarChart = createPolarChart(epChartNode, epLabels, "#966C36");
    epPolarChart.data.datasets[0].data = [
      featureAttributes["pop_density"] || 0,
      featureAttributes["vuln_pop"] || 0,
      featureAttributes["economic"] || 0,
      featureAttributes["agriculture"] || 0,
      featureAttributes["tourism"] || 0,
      featureAttributes["heritage"] || 0
    ];
    epPolarChart.update();

    // UPDATE ALL TABLES //
    // HAZARD TABLE //
    document.getElementById('hz-score1').innerHTML = hzPolarChart.data.datasets[0].data[0].toFixed(1);
    document.getElementById('hz-score2').innerHTML = hzPolarChart.data.datasets[0].data[1].toFixed(1);
    document.getElementById('hz-score3').innerHTML = hzPolarChart.data.datasets[0].data[2].toFixed(1);
    document.getElementById('hz-score4').innerHTML = hzPolarChart.data.datasets[0].data[3].toFixed(1);
    document.getElementById('hz-score5').innerHTML = hzPolarChart.data.datasets[0].data[4].toFixed(1);
    document.getElementById('hz-score6').innerHTML = hzPolarChart.data.datasets[0].data[5].toFixed(1);

    // VULNERABILITY TABLE //
    document.getElementById('vu-score1').innerHTML = vuPolarChart.data.datasets[0].data[0].toFixed(1);
    document.getElementById('vu-score2').innerHTML = vuPolarChart.data.datasets[0].data[1].toFixed(1);
    document.getElementById('vu-score3').innerHTML = vuPolarChart.data.datasets[0].data[2].toFixed(1);
    document.getElementById('vu-score4').innerHTML = vuPolarChart.data.datasets[0].data[3].toFixed(1);
    document.getElementById('vu-score5').innerHTML = vuPolarChart.data.datasets[0].data[4].toFixed(1);
    document.getElementById('vu-score6').innerHTML = vuPolarChart.data.datasets[0].data[5].toFixed(1);

    // EXPOSURE TABLE //
    document.getElementById('ep-score1').innerHTML = epPolarChart.data.datasets[0].data[0].toFixed(1);
    document.getElementById('ep-score2').innerHTML = epPolarChart.data.datasets[0].data[1].toFixed(1);
    document.getElementById('ep-score3').innerHTML = epPolarChart.data.datasets[0].data[2].toFixed(1);
    document.getElementById('ep-score4').innerHTML = epPolarChart.data.datasets[0].data[3].toFixed(1);
    document.getElementById('ep-score5').innerHTML = epPolarChart.data.datasets[0].data[4].toFixed(1);
    document.getElementById('ep-score6').innerHTML = epPolarChart.data.datasets[0].data[5].toFixed(1);

    // CREATE RISK LAYER AND VIEWS //
    createRiskLayerAndView(fsFields[0], "viewRisk", "legendRisk", riskColor);
    createRiskLayerAndView(fsFields[1], "viewHZ", "legendHZ", hzColor);
    createRiskLayerAndView(fsFields[2], "viewVU", "legendVU", vuColor);
    createRiskLayerAndView(fsFields[3], "viewEP", "legendEP", epColor);

    // Helper function to classify risk scores
    function getRiskClass(score) {
      if (score < 2) return "Very Low";
      if (score < 4) return "Low";
      if (score < 6) return "Medium";
      if (score < 8) return "High";
      return "Very High";
    }

    function createBarChart(barNode) {
      const chart = new Chart(barNode, {
        type: "bar",
        data: {
          labels: ["Hazard", "Vulnerability", "Exposure"],
          datasets: [{
            axis: "y",
            data: [0.0, 0.0, 0.0],
            backgroundColor: ["#F78721", "#75559B", "#966C36"],
            datalabels: {
              color: "white",
              anchor: "end",
              align: "left",
              offset: 10,
            },
          }],
        },
        plugins: [ChartDataLabels],
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: false,
            tooltip: {
              enabled: true,
              callbacks: {
                title: (context) => context[0].label, // Dynamic title
                label: function(context) {
                  if (context.dataIndex === 0) {
                    return "The likelihood of landslide events based on terrain characteristics";
                  } else if (context.dataIndex === 1) {
                    return "The susceptibility of terrain and infrastructure to landslides";
                  } else {
                    return "Population and assets at risk from landslide events";
                  }
                },
              },
            },
          },
          scales: {
            y: {
              ticks: { autoSkip: false },
            },
            x: {
              min: 0,
              max: 10,
              ticks: { stepSize: 2 },
              grid: { display: false },
            },
          },
        },
      });

      // Add a method to update the chart data dynamically
      chart.updateData = function(newData) {
      if (!Array.isArray(newData) || newData.length !== 3) {
        console.error("Invalid data format. Expected an array of 3 numbers.");
        return;
      }

      // Normalize the data to a range of 1–10
      const min = Math.min(...newData);
      const max = Math.max(...newData);
      const normalizedData = newData.map(value => {
        return min === max ? 5 : ((value - min) / (max - min)) * 9 + 1; // Scale to 1–10
      });

      console.log("Updating bar chart data (normalized):", normalizedData); // Debugging line
      this.data.datasets[0].data = normalizedData;
      this.update();
    };

      return chart;
    }
    

    function createPolarChart(chartNode, labels, color) {
      return new Chart(chartNode, {
        type: 'polarArea',
        data: {
          labels: labels,
          datasets: [{
            data: new Array(labels.length).fill(0),
            backgroundColor: [
              `${color}80`, // slightly transparent versions of the main color
              `${color}90`,
              `${color}A0`,
              `${color}B0`,
              `${color}C0`,
              `${color}D0`
            ],
            borderColor: color,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.label}: ${context.raw.toFixed(1)}`;
                }
              }
            }
          },
          scales: {
            r: {
              min: 0,
              max: 10,
              ticks: {
                stepSize: 2,
                display: false
              }
            }
          }
        }
      });
    }

    function createRiskLayerAndView(layerTitle, viewDiv, legendDiv, colorScheme) {
      const layer = new FeatureLayer({
        url: fsURL,
        labelingInfo: [{
          labelExpressionInfo: {
            expression: "$feature.name_2",
          }
        }],
        outFields: ["*"],
      });

      const view = new MapView({
        container: viewDiv,
        map: new Map({
          basemap: "topo-vector",
          layers: [layer],
        }),
        ui: { components: [] },
        constraints: { rotationEnabled: false },
        highlightOptions: { fillOpacity: 0 }
      });

      new Legend({
        view: view,
        container: legendDiv,
        layerInfos: [{
          layer: layer,
          title: "Legend",
        }],
      });

      view.when(() => {
        disableZooming(view);
        generateRenderer(view, layer, layerTitle, colorScheme);
        view.goTo({
          target: featureGeometry,
          zoom: 9
        });
        view.whenLayerView(layer).then((layerView) => {
          layerView.highlight(featureAttributes["id2"]);
        });
      }, (error) => {
        console.error(error);
      });
    }

    function disableZooming(view) {
      view.popup.actions = [];
      view.ui.components = [];

      function stopEvtPropagation(event) {
        event.stopPropagation();
      }

      view.on("mouse-wheel", stopEvtPropagation);
      view.on("double-click", stopEvtPropagation);
      view.on("double-click", ["Control"], stopEvtPropagation);
      view.on("drag", stopEvtPropagation);
      view.on("drag", ["Shift"], stopEvtPropagation);
      view.on("drag", ["Shift", "Control"], stopEvtPropagation);

      view.on("key-down", (event) => {
        const prohibitedKeys = [
          "+", "-", "Shift", "_", "=",
          "ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft",
        ];
        if (prohibitedKeys.includes(event.key)) {
          event.stopPropagation();
        }
      });
    }

    function generateRenderer(view, featureLayer, thematicField, colorScheme) {
      const params = {
        view: view,
        layer: featureLayer,
        field: thematicField,
        classificationMethod: "natural-breaks",
        numClasses: 5,
        defaultSymbolEnabled: false,
      };

      colorRendererCreator
        .createClassBreaksRenderer(params)
        .then((rendererResponse) => {
          const newRenderer = rendererResponse.renderer;
          const breakInfos = newRenderer.classBreakInfos;

          breakInfos[0].label = `Very Low (${breakInfos[0].minValue.toFixed(1)} - ${breakInfos[0].maxValue.toFixed(1)})`;
          breakInfos[1].label = `Low (${breakInfos[1].minValue.toFixed(1)} - ${breakInfos[1].maxValue.toFixed(1)})`;
          breakInfos[2].label = `Medium (${breakInfos[2].minValue.toFixed(1)} - ${breakInfos[2].maxValue.toFixed(1)})`;
          breakInfos[3].label = `High (${breakInfos[3].minValue.toFixed(1)} - ${breakInfos[3].maxValue.toFixed(1)})`;
          breakInfos[4].label = `Very High (${breakInfos[4].minValue.toFixed(1)} - ${breakInfos[4].maxValue.toFixed(1)})`;

          for (let i = 0; i < breakInfos.length; i++) {
            breakInfos[i].symbol.color = colorScheme[i];
          }
          
          featureLayer.renderer = newRenderer;
        });
    }
  })());