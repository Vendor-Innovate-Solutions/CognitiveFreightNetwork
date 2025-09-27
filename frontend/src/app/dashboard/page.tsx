"use client";

import { useEffect, useState, useRef } from "react";
import SmartChart from "@/components/dashboard/SmartChart";
import { mockChartData } from "@/data/ChartMockData";
import * as htmlToImage from "html-to-image";
import download from "downloadjs";
import {jsPDF} from "jspdf";

export default function DashboardPage() {
  const [chartData, setChartData] = useState<typeof mockChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChartData(mockChartData);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Export charts as PNG
  const exportPNG = async () => {
    if (!chartRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(chartRef.current);
      const blob = await (await fetch(dataUrl)).blob();
      download(blob, "charts.png", "image/png");
    } catch (error) {
      console.error("Error exporting PNG:", error);
    }
  };

  // Export charts as PDF
  const exportPDF = async () => {
    if (!chartRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(chartRef.current);
      const pdf = new jsPDF("landscape");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("charts.pdf");
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  // Export data as CSV
  const exportCSV = () => {
    if (!chartData) return;

    const { dataPoints, xAxisKey, yAxisKeys } = chartData;
    const headers = [xAxisKey, ...yAxisKeys.map((y) => y.key)];
    const rows = dataPoints.map((dp) =>
      headers.map((key) => `"${dp[key as keyof typeof dp]}"`).join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    download(blob, "chart-data.csv", "text/csv");
  };

  return (
    <div className="p-6 bg-background">
      <div className="flex gap-2 mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={exportPNG}
        >
          Export PNG
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={exportPDF}
        >
          Export PDF
        </button>
        <button
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          onClick={exportCSV}
        >
          Export CSV
        </button>
      </div>

      <div ref={chartRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SmartChart
          title="Port Dwell Time Analysis (Auto)"
          subtitle="Last 7 Days"
          data={chartData}
          isLoading={loading}
        />
        <SmartChart
          title="Another View (Auto)"
          subtitle="Last 30 Days"
          data={chartData}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
