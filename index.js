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
     * @param {boolean} isBig - If true, the chart is rendered in a bigger size
     */
    constructor(
      chartContainerId,
      loaderContainerId = null,
      arrowContainerId = null,
      defaultRotateAngle = 0,
      maxRotateAngle = 20,
      isBig = false,
    ) {
      this.chartContainerId = chartContainerId;
      this.loaderContainerId = loaderContainerId;
      this.arrowContainerId = arrowContainerId;
      this.defaultRotateAngle = defaultRotateAngle;
      this.maxRotateAngle = maxRotateAngle;
      this.isBig = isBig;

      // Add loader styles if a loader container is provided
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
     * Fetches gauge data from the API.
     * @param {string} token - The token to fetch data for.
     * @param {string} period - The period to fetch data for.
     * @returns {Promise<Object>} - The fetched data as a JSON object.
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
     * Updates the chart with new data.
     * @param {string} token - The token to update the chart for.
     * @param {string} period - The period to update the chart for.
     */
    async updateChart(token, period) {
      const data = await this.fetchGaugeData(token, period);
      if (data) {
        this.plotCryptoGauge(data, token, period);
        this.updateArrowPosition(data);
      }
    }

    /**
     * Plots the crypto gauge using Plotly.
     * @param {Object} data - The data to plot.
     * @param {string} token - The token being plotted.
     * @param {string} period - The period being plotted.
     */
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

      if (this.isBig) {
        fig.layout.margin.t = 30;
        fig.layout.margin.r = 30;
        fig.layout.margin.l = 30;
      }

      Plotly.newPlot(this.chartContainerId, fig.data, fig.layout).then(() => {
        const chartElem = document.querySelector(".plot-container");
        chartElem.style.position = "absolute";

        const numberElem = chartElem.querySelector(".number");

        const svgElements = chartElem.getElementsByTagName("svg");

        if (svgElements.length > 0) {
          Array.from(svgElements).forEach((svg) => {
            svg.style.overflow = "visible";
          });
        }

        if (this.isBig) {
          numberElem.style.display = "none";
          document.querySelector(".gauge2-value").innerHTML =
            numberElem.innerHTML;
        } else {
          numberElem.style.transform = "translate(0, 28px)";
          numberElem.style.fontWeight = "600";
        }

        const paths = chartElem.getElementsByTagName("path");
        if (paths.length > 0) {
          const barPath = paths[paths.length - 1];
          barPath.style.strokeLinecap = "round";
        }
      });
    }

    /**
     * Updates the position of the arrow indicator.
     * @param {Object} data - The data used to calculate the angle.
     */
    updateArrowPosition(data) {
      if (!this.arrowContainerId) return;

      const dfi = data.df_crypto[0];

      const angle =
        this.defaultRotateAngle +
        (this.maxRotateAngle - this.defaultRotateAngle) * dfi.YTD_last;

      const arrowElem = document.getElementById(this.arrowContainerId);
      console.log("arrowElem", arrowElem, angle);
      if (arrowElem) {
        arrowElem.style.transform = `rotate(${angle}deg)`;
      }
    }

    /**
     * Displays the loading indicator.
     */
    showLoader() {
      if (this.loaderContainerId) {
        document.getElementById(this.loaderContainerId).style.display = "block";
        document.getElementById(this.chartContainerId).style.display = "none";
      }
    }

    /**
     * Hides the loading indicator.
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
