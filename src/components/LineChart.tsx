import React, {useState, useRef, useMemo, useCallback} from 'react';
import {View, StyleSheet, PanResponder, LayoutChangeEvent} from 'react-native';
import Svg, {Path, Line, Circle, G, Text as SvgText} from 'react-native-svg';
import {MockRegistro, NormalRange, VistaReporte} from '../data/mockReportes';

interface LineChartProps {
  data: MockRegistro[];
  normalRange: NormalRange;
  width: number;
  height: number;
  viewMode: VistaReporte;
}

const PADDING = {left: 50, right: 20, top: 30, bottom: 40};

interface Point {
  x: number;
  y: number;
  value: number;
  isAbnormal: boolean;
  label: string;
}

export default function LineChart({data, normalRange, width, height, viewMode}: LineChartProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [scale, setScale] = useState(1);
  const offsetXRef = useRef(0);
  const scaleRef = useRef(1);
  const lastOffsetXRef = useRef(0);
  const initialDistanceRef = useRef(0);
  const initialScaleRef = useRef(1);

  offsetXRef.current = offsetX;
  scaleRef.current = scale;

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const {yMin, yMax} = useMemo(() => {
    if (data.length === 0) return {yMin: 0, yMax: 100};
    const vals = data.map(d => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const margin = (max - min) * 0.1 || 5;
    return {yMin: min - margin, yMax: max + margin};
  }, [data]);

  const refLineY = useMemo(() => {
    return (normalRange.min + normalRange.max) / 2;
  }, [normalRange]);

  const points: Point[] = useMemo(() => {
    if (data.length === 0 || chartWidth <= 0 || chartHeight <= 0) return [];
    return data.map((d, i) => {
      const x = PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
      const y = PADDING.top + (1 - (d.value - yMin) / (yMax - yMin)) * chartHeight;
      return {x, y, value: d.value, isAbnormal: d.isAbnormal, label: d.label};
    });
  }, [data, chartWidth, chartHeight, yMin, yMax]);

  const dataPathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }, [points]);

  const yAxisLabels = useMemo(() => {
    const steps = 5;
    const labels: {value: number; y: number}[] = [];
    for (let i = 0; i <= steps; i++) {
      const value = yMin + (i / steps) * (yMax - yMin);
      const y = PADDING.top + (1 - i / steps) * chartHeight;
      labels.push({value, y});
    }
    return labels;
  }, [yMin, yMax, chartHeight]);

  const refY = useMemo(() => {
    if (chartHeight <= 0) return 0;
    return PADDING.top + (1 - (refLineY - yMin) / (yMax - yMin)) * chartHeight;
  }, [refLineY, yMin, yMax, chartHeight]);

  const formatValue = useCallback((v: number) => {
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: evt => {
        lastOffsetXRef.current = offsetXRef.current;
        initialScaleRef.current = scaleRef.current;
        initialDistanceRef.current = 0;
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          initialDistanceRef.current = Math.sqrt(
            Math.pow(t2.pageX - t1.pageX, 2) + Math.pow(t2.pageY - t1.pageY, 2),
          );
        }
      },
      onPanResponderMove: (evt, g) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          const dist = Math.sqrt(
            Math.pow(t2.pageX - t1.pageX, 2) + Math.pow(t2.pageY - t1.pageY, 2),
          );
          if (initialDistanceRef.current === 0) {
            initialDistanceRef.current = dist;
            initialScaleRef.current = scaleRef.current;
          } else {
            const ratio = dist / initialDistanceRef.current;
            setScale(Math.min(5, Math.max(1, initialScaleRef.current * ratio)));
          }
        } else {
          if (initialDistanceRef.current !== 0) {
            lastOffsetXRef.current = offsetXRef.current;
            initialDistanceRef.current = 0;
          }
          setOffsetX(lastOffsetXRef.current + g.dx);
        }
      },
      onPanResponderRelease: () => {
        lastOffsetXRef.current = offsetXRef.current;
        initialDistanceRef.current = 0;
      },
    }),
  ).current;

  if (width === 0 || data.length === 0) {
    return <View style={[styles.container, {height}]} />;
  }

  return (
    <View style={[styles.container, {height}]} {...panResponder.panHandlers}>
      <Svg width={width} height={height}>
        <G transform={`translate(${offsetX}, 0) scale(${scale}, 1)`}>
          {yAxisLabels.map(({value, y}) => (
            <Line
              key={`grid-${value}`}
              x1={PADDING.left}
              y1={y}
              x2={width - PADDING.right}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          ))}
          {yAxisLabels.map(({value, y}) => (
            <SvgText
              key={`yl-${value}`}
              x={PADDING.left - 8}
              y={y + 4}
              fill="#6B7280"
              fontSize={10}
              textAnchor="end">
              {formatValue(value)}
            </SvgText>
          ))}
          {points.map((p, i) => (
            <SvgText
              key={`xl-${i}`}
              x={p.x}
              y={height - PADDING.bottom + 18}
              fill="#6B7280"
              fontSize={10}
              textAnchor="middle">
              {p.label}
            </SvgText>
          ))}
          <Line
            x1={PADDING.left}
            y1={refY}
            x2={width - PADDING.right}
            y2={refY}
            stroke="#7BC99A"
            strokeWidth={1.5}
            strokeDasharray="5,5"
          />
          {dataPathD ? (
            <Path d={dataPathD} stroke="#2FAF7A" strokeWidth={2.5} fill="none" />
          ) : null}
          {points.map((p, i) => (
            <Circle
              key={`pt-${i}`}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={p.isAbnormal ? '#EF4444' : '#2FAF7A'}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
});
