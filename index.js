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
     * @param {string} chartContainerId - ID of the element where the chart is rendered
     * @param {string|null} loaderContainerId - ID of the loader element (can be null if loader is not needed)
     * @param {string|null} arrowContainerId - ID of the arrow element (can be null if arrow is not needed)
     * @param {number} defaultRotateAngle - Initial rotation angle (e.g., 208deg) for value 0
     * @param {number} maxRotateAngle - Rotation angle for value 1 (e.g., 20deg)
     */
    constructor(
      chartContainerId,
      loaderContainerId = null,
      arrowContainerId = null,
      defaultRotateAngle = 0,
      maxRotateAngle = 20,
    ) {
      this.chartContainerId = chartContainerId;
      this.loaderContainerId = loaderContainerId;
      this.arrowContainerId = arrowContainerId;
      this.defaultRotateAngle = defaultRotateAngle;
      this.maxRotateAngle = maxRotateAngle;

      // loader styles
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

    async updateChart(token, period) {
      const data = await this.fetchGaugeData(token, period);
      if (data) {
        this.plotCryptoGauge(data, token, period);
        this.updateArrowPosition(data);
      }
    }

    plotCryptoGauge(data, token, period) {
      const dfi = data.df_crypto[0];

      const fig = {
        data: [
          {
            type: "indicator",
            mode: "gauge+number",
            value: dfi.YTD_last,
            number: {
              font: { size: 20, color: "#9A59B5", fontWeight: "bold" },
              valueformat: ".4f",
            },
            gauge: {
              axis: {
                range: [dfi.YTD_0_percentile, dfi.YTD_100_percentile],
                visible: false,
              },
              bar: { color: "#fff", thickness: 0.3 },
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
        },
      };

      Plotly.newPlot(this.chartContainerId, fig.data, fig.layout).then(() => {
        const chartElem = document.querySelector(".plotly");
        chartElem.style.position = "absolute";

        const plotContainer = chartElem.querySelector(".plot-container");
        if (plotContainer) {
          const svgElements = plotContainer.getElementsByTagName("svg");
          if (svgElements.length > 0) {
            Array.from(svgElements).forEach((svg) => {
              svg.style.overflow = "visible";
            });
          }

          const numberElem = plotContainer.querySelector(".number");
          if (numberElem) {
            numberElem.style.transform = "translate(0, 28px)";
            numberElem.style.fontWeight = "600";
          }

          const paths = plotContainer.getElementsByTagName("path");
          if (paths.length > 0) {
            const barPath = paths[paths.length - 1];
            barPath.style.strokeLinecap = "round";
          }
        }
      });
    }

    updateArrowPosition(data) {
      if (!this.arrowContainerId) return;

      const dfi = data.df_crypto[0];

      const angle =
        this.defaultRotateAngle +
        (this.maxRotateAngle - this.defaultRotateAngle) * dfi.YTD_last;

      const arrowElem = document.getElementById(this.arrowContainerId);
      if (arrowElem) {
        arrowElem.style.transform = `rotate(${angle}deg)`;
        arrowElem.style.transformOrigin = "center center";
      }
    }

    showLoader() {
      if (this.loaderContainerId) {
        document.getElementById(this.loaderContainerId).style.display = "block";
        document.getElementById(this.chartContainerId).style.display = "none";
      }
    }

    hideLoader() {
      if (this.loaderContainerId) {
        document.getElementById(this.loaderContainerId).style.display = "none";
        document.getElementById(this.chartContainerId).style.display = "block";
      }
    }
  }

  return CryptoGauge;
});
