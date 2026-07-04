"use client";

import React from "react";

export interface SparklineDatum {
  label: string;
  value: number;
}

interface SparklineChartProps {
  data: SparklineDatum[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDots?: boolean;
  showLabels?: boolean;
  formatValue?: (v: number) => string;
}

export function SparklineChart({
  data,
  width = 300,
  height = 80,
  color = "#2E403B",
  fillOpacity = 0.08,
  showDots = true,
  showLabels = false,
  formatValue,
}: SparklineChartProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94A3B8",
          fontSize: "0.75rem",
        }}
      >
        No data
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const padding = { top: 12, right: 8, bottom: showLabels ? 20 : 8, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
    const y = padding.top + chartH - ((d.value - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`
      : "";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
    >
      {/* Horizontal grid line at zero if applicable */}
      {minVal === 0 && (
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={padding.left + chartW}
          y2={padding.top + chartH}
          stroke="#E2E8F0"
          strokeWidth={1}
        />
      )}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill={color} fillOpacity={fillOpacity} />}

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="white" stroke={color} strokeWidth={2} />
        ))}

      {/* Labels */}
      {showLabels &&
        points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#94A3B8"
          >
            {p.label}
          </text>
        ))}
    </svg>
  );
}

export interface BarChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartDatum[];
  width?: number;
  height?: number;
  barColor?: string;
  showValues?: boolean;
  formatValue?: (v: number) => string;
}

export function BarChart({
  data,
  width = 300,
  height = 120,
  barColor = "#2E403B",
  showValues = true,
  formatValue,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94A3B8",
          fontSize: "0.75rem",
        }}
      >
        No data
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: showValues ? 22 : 8, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barWidth = Math.max(8, (chartW / data.length) * 0.65);
  const gap = chartW / data.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
    >
      {/* Baseline */}
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={padding.left + chartW}
        y2={padding.top + chartH}
        stroke="#E2E8F0"
        strokeWidth={1}
      />

      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = padding.left + i * gap + (gap - barWidth) / 2;
        const y = padding.top + chartH - barH;
        const color = d.color ?? barColor;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={color}
              rx={3}
              ry={3}
              opacity={0.85}
            />
            {showValues && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="#475569"
              >
                {formatValue ? formatValue(d.value) : d.value}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize={9}
              fill="#94A3B8"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  segments,
  size = 140,
  thickness = 28,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const center = size / 2;
  const radius = center - thickness / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = -Math.PI / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const angle = pct * 2 * Math.PI;
        const startX = center + radius * Math.cos(cumulativeAngle);
        const startY = center + radius * Math.sin(cumulativeAngle);
        cumulativeAngle += angle;
        const endX = center + radius * Math.cos(cumulativeAngle);
        const endY = center + radius * Math.sin(cumulativeAngle);
        const largeArc = angle > Math.PI ? 1 : 0;

        const d = [
          `M ${startX} ${startY}`,
          `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
        ].join(" ");

        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
          />
        );
      })}

      {centerLabel && (
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          fontSize={10}
          fill="#94A3B8"
        >
          {centerLabel}
        </text>
      )}
      {centerValue && (
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          fontSize={16}
          fontWeight={800}
          fill="#0F172A"
        >
          {centerValue}
        </text>
      )}
    </svg>
  );
}
