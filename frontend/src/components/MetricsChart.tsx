import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";

import type { MetricType, SiteMetric } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const METRIC_LABELS: Record<MetricType, string> = {
  ndvi: "NDVI (vegetation index)",
  carbon_stock_tco2e: "Carbon stock (tCO₂e)",
  biodiversity_index: "Biodiversity index",
  canopy_cover_pct: "Canopy cover (%)",
};

const METRIC_COLORS: Record<MetricType, string> = {
  ndvi: "#1a7f4b",
  carbon_stock_tco2e: "#b98a2f",
  biodiversity_index: "#3a6ea5",
  canopy_cover_pct: "#7c4dbd",
};

interface Props {
  metricType: MetricType;
  metrics: SiteMetric[];
}

export function MetricsChart({ metricType, metrics }: Props) {
  const points = metrics
    .filter((m) => m.metric_type === metricType)
    .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));

  const data: ChartData<"line"> = {
    labels: points.map((p) =>
      new Date(p.recorded_on).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
    ),
    datasets: [
      {
        label: METRIC_LABELS[metricType],
        data: points.map((p) => p.value),
        borderColor: METRIC_COLORS[metricType],
        backgroundColor: METRIC_COLORS[metricType],
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="chart-card">
      <h3>{METRIC_LABELS[metricType]}</h3>
      <Line
        data={data}
        options={{
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: false } },
        }}
      />
    </div>
  );
}
