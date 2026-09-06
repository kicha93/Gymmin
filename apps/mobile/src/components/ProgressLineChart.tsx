import { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import type { ProgressReportTrendBucket, ProgressReportTrendMetric } from "../domain/progressReport";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ProgressLineChartProps = {
  buckets: ProgressReportTrendBucket[];
  labels: string[];
  metric: ProgressReportTrendMetric;
  theme: Theme;
};

const chartWidth = 320;
const chartHeight = 128;
const horizontalPadding = 12;
const verticalPadding = 12;

export function ProgressLineChart({ buckets, labels, metric, theme }: ProgressLineChartProps) {
  const values = useMemo(
    () => buckets.map((bucket) => metric === "volume" ? bucket.totalVolumeKg : bucket.workoutCount),
    [buckets, metric]
  );
  const maximum = Math.max(...values, 1);
  const usableWidth = chartWidth - horizontalPadding * 2;
  const usableHeight = chartHeight - verticalPadding * 2;
  const points = values.map((value, index) => {
    const x = horizontalPadding + (values.length <= 1 ? 0 : index / (values.length - 1)) * usableWidth;
    const y = verticalPadding + (1 - value / maximum) * usableHeight;
    return { x, y };
  });
  const polyline = points.map((point) => String(point.x) + "," + String(point.y)).join(" ");

  return (
    <View style={styles.progressReportChart}>
      <Svg
        accessibilityLabel={metric}
        height={chartHeight}
        viewBox={"0 0 " + chartWidth + " " + chartHeight}
        width="100%"
      >
        {[0, 1, 2, 3].map((line) => {
          const y = verticalPadding + (line / 3) * usableHeight;
          return (
            <Line
              key={line}
              stroke={theme.border}
              strokeWidth={1}
              x1={horizontalPadding}
              x2={chartWidth - horizontalPadding}
              y1={y}
              y2={y}
            />
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
      </Svg>
      <View style={styles.progressReportChartLabels}>
        {labels.map((label, index) => (
          <Text
            key={String(index) + label}
            numberOfLines={1}
            style={[styles.progressReportChartLabel, { color: theme.muted }]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
