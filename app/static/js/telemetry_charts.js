/**
 * Chart coordinator for Aegis-Eye Forensic Telemetry
 */

let categoryChartInstance = null;
let riskChartInstance = null;

export const TelemetryCharts = {
  renderCharts(fleetData) {
    const categoryCtx = document.getElementById('categoryShareChart').getContext('2d');
    const riskCtx = document.getElementById('riskTrendChart').getContext('2d');

    // Clean up old instances to avoid visual glitch overlaps
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }
    if (riskChartInstance) {
      riskChartInstance.destroy();
    }

    if (!fleetData || fleetData.length === 0) return;

    // 1. Process category distribution values
    const categories = {
      "Cleared": 0,
      "Chemical": 0,
      "Pathology": 0,
      "Trauma": 0
    };

    fleetData.forEach(item => {
      const v = item.overall_verdict;
      if (v.includes("COMPLETE") || v.includes("NO CRITICAL")) {
        categories["Cleared"] += 1;
      } else if (v.includes("PATHOLOGICAL")) {
        categories["Pathology"] += 1;
      } else if (v.includes("HEAD TRAUMA") || v.includes("CONCUSSION") || v.includes("TRAUMA")) {
        categories["Trauma"] += 1;
      } else {
        categories["Chemical"] += 1;
      }
    });

    categoryChartInstance = new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: [
            '#22c55e', // Cyber Green (Cleared)
            '#f43f5e', // Tactical Red-Orange (Chemical)
            '#3b82f6', // Clinical Blue (Pathology)
            '#eab308'  // Flash Amber (Trauma)
          ],
          borderColor: '#09090b',
          borderWidth: 1.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 9 }
            }
          }
        }
      }
    });

    // 2. Process risk trend chronologically (sort timestamp ascending)
    const sortedData = [...fleetData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Take the last 15 elements to avoid chart overflow
    const chartData = sortedData.slice(-15);
    const labels = chartData.map(item => {
      const d = new Date(item.timestamp);
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    });
    
    const riskScores = chartData.map(item => item.redness_score); // redness avg or risk
    const dilationScores = chartData.map(item => item.dilation_score); // dilation ratio
    
    riskChartInstance = new Chart(riskCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Redness Ratio',
            data: riskScores,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.05)',
            borderWidth: 1.5,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Pupil PIR',
            data: dilationScores,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            borderWidth: 1.5,
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 8 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.02)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 7 } }
          },
          y: {
            min: 0,
            max: 0.6,
            grid: { color: 'rgba(255, 255, 255, 0.02)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 7 } }
          }
        }
      }
    });
  }
};
