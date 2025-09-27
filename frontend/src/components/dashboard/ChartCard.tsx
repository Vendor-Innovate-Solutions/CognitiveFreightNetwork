"use client";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartCardProps } from "@/types/chart";
import { Loader2, AlertCircle, BarChart3, Download, FileImage, FileText, Database } from "lucide-react";
import * as htmlToImage from "html-to-image";
import download from "downloadjs";
import jsPDF from "jspdf";
export default function ChartCard({
  title,
  subtitle,
  data,
  isLoading,
  error,
  children,
}: React.PropsWithChildren<ChartCardProps>) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const exportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(chartRef.current);
      const blob = await (await fetch(dataUrl)).blob();
      download(blob, `${title.replace(/\s+/g, '_')}.png`, "image/png");
    } catch (error) {
      console.error("Error exporting PNG:", error);
    }
  };

  const exportPDF = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(chartRef.current);
      const pdf = new jsPDF("landscape");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const { dataPoints, xAxisKey, yAxisKeys } = data;
    const headers = [xAxisKey, ...yAxisKeys.map((y) => y.key)];
    const rows = dataPoints.map((dp) =>
      headers.map((key) => `"${dp[key as keyof typeof dp]}"`).join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    download(blob, `${title.replace(/\s+/g, '_')}.csv`, "text/csv");
  };

  return (
    <Card className="w-full bg-card/95 backdrop-blur-sm border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl overflow-hidden">
      <CardHeader className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground break-words leading-tight">
            {title}
          </CardTitle>

          {subtitle && (
            <p className="text-sm sm:text-base text-muted-foreground break-words mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="p-2 bg-primary/15 rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          
          {data && !isLoading && !error && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors duration-200 group"
                title="Export Options"
              >
                <Download className="w-4 h-4 text-accent group-hover:text-accent-foreground" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-12 bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                  <button
                    onClick={() => { exportPNG(); setShowExportMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-foreground"
                  >
                    <FileImage className="w-4 h-4" />
                    Export PNG
                  </button>
                  <button
                    onClick={() => { exportPDF(); setShowExportMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-foreground"
                  >
                    <FileText className="w-4 h-4" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => { exportCSV(); setShowExportMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-foreground"
                  >
                    <Database className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent ref={chartRef} className="w-full flex flex-col items-center justify-center px-5 sm:px-6 py-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 sm:py-16">
            <Loader2 className="animate-spin text-primary w-8 h-8" />

            <p className="text-muted-foreground text-sm sm:text-base font-medium text-center">
              Loading chart data...
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 sm:py-16">
            <AlertCircle className="w-8 h-8 text-destructive" />

            <div className="text-center max-w-sm">
              <p className="text-destructive font-medium text-sm sm:text-base">
                Unable to load data
              </p>

              <p className="text-destructive/80 text-xs sm:text-sm break-words leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && data && data.dataPoints.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-12 sm:py-16">
            <BarChart3 className="w-8 h-8 text-muted-foreground/50" />

            <p className="text-muted-foreground text-sm sm:text-base text-center">
              No data available for this period
            </p>
          </div>
        )}

        {!isLoading && !error && data && data.dataPoints.length > 0 && (
          <div className="w-full h-64 sm:h-80 md:h-96 lg:aspect-[16/9] min-h-0">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
