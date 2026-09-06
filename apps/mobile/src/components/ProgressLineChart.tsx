import React, { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import type { ProgressReportTrendBucket, ProgressReportTrendMetric } from "../domain/progressReport";
import type { LanguageCode } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ProgressLineChartProps = {
  buckets: ProgressReportTrendBucket[];
  labels: string[];
  language: LanguageCode;
  legendLabel: string;
  metric: ProgressReportTrendMetric;
  theme: Theme;
};

const chartWidth = 320;
const chartHeight = 142;
const chartLeft = 43;
const chartRight = 8;
const verticalPadding = 12;
const chartBottom = 28;

function formatAxisValue(value: number, metric: ProgressReportTrendMetric, language: LanguageCode) {
  if (metric === "workouts") return String(Math.round(value));
  if (value >= 1000) {
    const tons = Math.round(value / 100) / 10;
    return (language === "pl" ? String(tons).replace(".", ",") : String(tons)) + " t";
  }
  return String(Math.round(value)) + " kg";
}

export function ProgressLineChart({ buckets, labels, language, legendLabel, metric, theme }: ProgressLineChartProps) {
  const values = useMemo(
    () => buckets.map((bucket) => metric === "volume" ? bucket.totalVolumeKg : bucket.workoutCount),
    [buckets, metric]
  );
  const rawMaximum = Math.max(...values, 1);
  const maximum = metric === "workouts" ? Math.max(3, Math.ceil(rawMaximum / 3) * 3) : rawMaximum;
  const usableWidth = chartWidth - chartLeft - chartRight;
  const usableHeight = chartHeight - verticalPadding - chartBottom;
  const points = values.map((value, index) => {
    const x = chartLeft + (values.length <= 1 ? 0 : index / (values.length - 1)) * usableWidth;
    const y = verticalPadding + (1 - value / maximum) * usableHeight;
    return { x, y };
  });
  const polyline = points.map((point) => String(point.x) + "," + String(point.y)).join(" ");

  return (
    <View style={styles.progressReportChart}>
      <View style={styles.progressReportChartLegend}>
        <View style={[styles.progressReportChartLegendDot, { backgroundColor: theme.primary }]} />
        <Text style={[styles.progressReportChartLegendText, { color: theme.muted }]}>
          {legendLabel + (metric === "volume" ? " (kg)" : "")}
        </Text>
      </View>
      <Svg
        accessibilityLabel={legendLabel}
        height={chartHeight}
        viewBox={"0 0 " + chartWidth + " " + chartHeight}
        width="100%"
      >
        {[0, 1, 2, 3].map((line) => {
          const y = verticalPadding + (line / 3) * usableHeight;
          const value = maximum * (1 - line / 3);
          return (
            <React.Fragment key={line}>
              <SvgText fill={theme.muted} fontSize={8.5} textAnchor="end" x={chartLeft - 6} y={y + 3}>
                {formatAxisValue(value, metric, language)}
              </SvgText>
              <Line
                stroke={theme.border}
                strokeWidth={1}
                x1={chartLeft}
                x2={chartWidth - chartRight}
                y1={y}
                y2={y}
              />
            </React.Fragment>
          );
        })}
        <Polyline
          fill="none"
          points={polyline}
          stroke={theme.primary}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            fill={theme.card}
            r={3.5}
            stroke={theme.primary}
            strokeWidth={2}
          />
        ))}
        {labels.map((label, index) => (
          <SvgText
            key={String(index) + label}
            fill={theme.muted}
            fontSize={8.5}
            textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
            x={points[index]?.x ?? chartLeft}
            y={chartHeight - 5}
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
