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
     * @param {string} variant - Chart variant (default, gradientSmallBar)
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
      const value = dfi.YTD_last;

      let numberColor = "#9A59B5";
      let barThickness = 0.3;
      let steps = [];
      let barColor = "#fff";
      let numberFontSize = 20;
      let numberTranslateY = 28;

      if (this.variant === "gradientSmallBar") {
        numberColor = "#fff";
        barThickness = 0.1;
        steps = [
          { range: [0, 0.2], color: "#6D65A5" },
          { range: [0.2, 0.4], color: "#86C7B7" },
          { range: [0.4, 0.6], color: "#CCD0D5" },
          { range: [0.6, 0.8], color: "#E4E7EA" },
          { range: [0.8, 1], color: "#F1989F" },
        ];

        // Бар цвет можно убрать, чтобы цвет был только steps
        barColor = null;

        // Можно подрегулировать размер и позицию числа
        numberFontSize = 20;
        numberTranslateY = 28;
      }

      const fig = {
        data: [
          {
            type: "indicator",
            mode: "gauge+number",
            value: value,
            number: {
              font: {
                size: numberFontSize,
                color: numberColor,
                fontWeight: "bold",
              },
              valueformat: ".4f",
            },
            gauge: {
              axis: {
                range: [dfi.YTD_0_percentile, dfi.YTD_100_percentile],
                visible: false,
              },
              bar: { color: barColor, thickness: barThickness },
              borderwidth: 0,
              steps: steps,
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
        const chartElem = document
          .getElementById(this.chartContainerId)
          .querySelector(".plot-container");
        if (chartElem) {
          chartElem.style.position = "absolute";

          const numberElem = chartElem.querySelector(".number");
          if (numberElem) {
            numberElem.style.transform = `translate(0, ${numberTranslateY}px)`;
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
