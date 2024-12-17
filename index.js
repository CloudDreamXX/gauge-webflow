(function (global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    // CommonJS (Node)
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD (RequireJS)
    define([], factory);
  } else {
    // Browser global
    global.CryptoGauge = factory();
  }
})(typeof window !== "undefined" ? window : this, function () {
  class CryptoGauge {
    /**
     * @param {string} chartContainerId - The ID of the element where the chart should be rendered.
     * @param {string|null} loaderContainerId - The ID of the loader element (can be null if not needed).
     * @param {string|null} arrowContainerId - The ID of the arrow element (can be null if not needed).
     * @param {number} defaultRotateAngle - The initial rotation angle for value=0.
     * @param {number} maxRotateAngle - The rotation angle for value=1.
     * @param {string} variant - Chart variant ("default" or "gradientSmallBar").
     */
    constructor(
      chartContainerId,
      loaderContainerId = null,
      arrowContainerId = null,
      defaultRotateAngle = 0,
      maxRotateAngle = 20,
      variant = "default",
    ) {
      this.chartContainerId = chartContainerId;
      this.loaderContainerId = loaderContainerId;
      this.arrowContainerId = arrowContainerId;
      this.defaultRotateAngle = defaultRotateAngle;
      this.maxRotateAngle = maxRotateAngle;
      this.variant = variant;

      // If loaderContainerId is provided, append spinner styles
      if (this.loaderContainerId) {
        const container = document.createElement("div");
        container.innerHTML = `
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        `;
        document.body.appendChild(container);
      }
    }

    /**
     * Fetches gauge data from the backend.
     * @param {string} token - The token (e.g. "btc").
     * @param {string|number} period - The period (e.g. "30").
     */
    async fetchGaugeData(token, period) {
      try {
        this.showLoader();
        const response = await fetch(
          `https://chart.riskprotocol.io/v1/gauge/${token}/${period}`,
          {
            method: "GET",
            headers: {
              Authorization:
                "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxNzM0NjQ0ODUxfQ.eCSsJxhkiQthWcb3PaIfjYxmu1VB3f-ig8Y3RZHb-CY",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        return await response.json();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        this.hideLoader();
      }
    }

    /**
     * Updates the chart by fetching new data and re-plotting.
     * @param {string} token - The token.
     * @param {string|number} period - The period.
     */
    async updateChart(token, period) {
      const data = await this.fetchGaugeData(token, period);
      if (data) {
        this.plotCryptoGauge(data, token, period);
        this.updateArrowPosition(data);
      }
    }

    /**
     * Plots the gauge or pie chart depending on the variant.
     * @param {object} data - Data from the backend.
     * @param {string} token - The token.
     * @param {string|number} period - The period.
     */
    plotCryptoGauge(data, token, period) {
      const dfi = data.df_crypto[0];
      const value = dfi.YTD_last;

      if (this.variant === "gradientSmallBar") {
        // gradientSmallBar variant:
        // - 30% bottom is always white
        // - the remaining 70% is split into filled (value-proportional) and remainder
        const whitePart = 30;
        const filledPart = value * 70;
        const remainderPart = (1 - value) * 70;

        const dataPie = [
          {
            type: "pie",
            values: [whitePart, filledPart, remainderPart],
            hole: 0.8, // Increased hole for thinner ring
            sort: false,
            marker: {
              colors: ["#ffffff", "#6CC2DD", "#d3d3d3"],
            },
            textinfo: "none",
            hoverinfo: "none",
            showlegend: false,
            rotation: 180, // White part at bottom center
          },
        ];

        const layoutPie = {
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          margin: { t: 0, r: 0, l: 0, b: 0 },
          width: 300, // Smaller width
          height: 150, // Smaller height
          annotations: [
            {
              x: 0.5,
              y: 0.5,
              xref: "paper",
              yref: "paper",
              text: value.toFixed(4),
              showarrow: false,
              font: {
                size: 20,
                color: "#fff",
                family: "Arial",
                weight: "bold",
              },
            },
          ],
        };

        Plotly.newPlot(this.chartContainerId, dataPie, layoutPie).then(() => {
          const chartElem = document.getElementById(this.chartContainerId);
          const plotContainer = chartElem.querySelector(".plot-container");
          if (plotContainer) {
            plotContainer.style.position = "absolute";
          }
        });
      } else {
        // default variant using a gauge indicator
        const fig = {
          data: [
            {
              type: "indicator",
              mode: "gauge+number",
              value: value,
              number: {
                font: {
                  size: 20,
                  color: "#9A59B5",
                  fontWeight: "bold",
                },
                valueformat: ".4f",
              },
              gauge: {
                axis: {
                  range: [dfi.YTD_0_percentile, dfi.YTD_100_percentile],
                  visible: false,
                },
                bar: { color: "#fff", thickness: 0.15 }, // Thinner bar
                borderwidth: 0,
                steps: [],
              },
            },
          ],
          layout: {
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { family: "Arial" },
            margin: { t: 0, r: 0, l: 0, b: 0 },
            width: 300, // Smaller width
            height: 150, // Smaller height
          },
        };

        Plotly.newPlot(this.chartContainerId, fig.data, fig.layout).then(() => {
          const chartElem = document
            .getElementById(this.chartContainerId)
            .querySelector(".plot-container");
          if (chartElem) {
            chartElem.style.position = "absolute";

            const numberElem = chartElem.querySelector(".number");
            if (numberElem) {
              numberElem.style.transform = `translate(0, 28px)`;
              numberElem.style.fontWeight = "600";
            }

            const svgElements = chartElem.getElementsByTagName("svg");
            if (svgElements.length > 0) {
              Array.from(svgElements).forEach((svg) => {
                svg.style.overflow = "visible";
              });
            }

            const paths = chartElem.getElementsByTagName("path");
            if (paths.length > 0) {
              const barPath = paths[paths.length - 1];
              barPath.style.strokeLinecap = "round";
            }
          }
        });
      }
    }

    /**
     * Updates the arrow position based on the value.
     * @param {object} data - The data from the backend.
     */
    updateArrowPosition(data) {
      if (!this.arrowContainerId) return;
      const dfi = data.df_crypto[0];
      const value = dfi.YTD_last;
      const angle =
        this.defaultRotateAngle +
        (this.maxRotateAngle - this.defaultRotateAngle) * value;

      const arrowElem = document.getElementById(this.arrowContainerId);
      if (arrowElem) {
        arrowElem.style.transform = `rotate(${angle}deg)`;
      }
    }

    /**
     * Shows the loader if defined.
     */
    showLoader() {
      if (this.loaderContainerId) {
        document.getElementById(this.loaderContainerId).style.display = "block";
        document.getElementById(this.chartContainerId).style.display = "none";
      }
    }

    /**
     * Hides the loader if defined.
     */
    hideLoader() {
      if (this.loaderContainerId) {
        document.getElementById(this.loaderContainerId).style.display = "none";
        document.getElementById(this.chartContainerId).style.display = "block";
      }
    }
  }

  return CryptoGauge;
});
