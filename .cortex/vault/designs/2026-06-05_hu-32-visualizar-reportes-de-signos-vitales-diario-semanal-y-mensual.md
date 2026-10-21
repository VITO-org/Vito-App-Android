---
schema_version: 1
doc_type: design
title: 'HU-32: Visualizar reportes de signos vitales diario, semanal y mensual — Design
  Document'
created_at: '2026-06-05T22:08:04.629220Z'
updated_at: '2026-06-05T22:08:04.629220Z'
tags:
- hu-hu-32
- deep-track
- custom-chart
- mock-data
status: draft
links: []
vault_scope: local
fingerprint: eeceacaf4c05341d441faab2249c110e3d2b97e1c1543e2e9acfae90b8126bc0
session_id: 2026-06-05_hu-32-visualizar-reportes-de-signos-vitales-diario-semanal-y-mensual
spec_path: /Users/cristianvera21/Documents/proyecto-final/Vito-App-Android/.cortex/vault/specs/2026-06-05_hu-32-visualizar-reportes-de-signos-vitales-diario-semanal-y-mensual.md
---

# HU-32: Visualizar reportes de signos vitales diario, semanal y mensual — Design Document

> *Design document — Pluggable Middle Phase 09.B.*
> *Session: `2026-06-05_hu-32-visualizar-reportes-de-signos-vitales-diario-semanal-y-mensual` · Spec: `/Users/cristianvera21/Documents/proyecto-final/Vito-App-Android/.cortex/vault/specs/2026-06-05_hu-32-visualizar-reportes-de-signos-vitales-diario-semanal-y-mensual.md`*

## Architecture decision

## Stack Navigator envolviendo BottomTabNavigator

Se adopta un **RootNavigator** (`@react-navigation/native-stack`) que contiene:
- `MainTabs` → BottomTabNavigator existente (5 tabs)
- `DetalleSigno` → pantalla de detalle del signo vital

**RootStackParamList:**
```typescript
type RootStackParamList = {
  MainTabs: undefined;
  DetalleSigno: {
    tipoSigno: string;
    label: string;
    unit: string;
    icon: string;
  };
};
```

**Justificación:** La alternativa (nested stack dentro del tab) requeriría duplicar el stack por cada tab o usar un modal independiente. Un stack en la raíz es el patrón recomendado por React Navigation para pantallas full-screen que no pertenecen a ningún tab en particular, y simplifica la transición desde InicioScreen.

**Archivos afectados:**
- `src/navigation/RootNavigator.tsx` → nuevo
- `App.tsx` → reemplazar BottomTabNavigator por RootNavigator
- `src/screens/InicioScreen.tsx` → usar `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` y pasar `onPress` a cada VitalSignCard
- `src/components/VitalSignCard.tsx` → agregar prop `onPress?: () => void`

## Data model changes

- ### TipoSignoVital (enum tipo literal)
- ```typescript
- export type TipoSignoVital =
-   | 'frecuencia_cardiaca'
-   | 'presion_sistolica'
-   | 'presion_diastolica'
-   | 'saturacion_oxigeno'
-   | 'temperatura';
- ```
- 
- ### VistaReporte (union tipo)
- ```typescript
- export type VistaReporte = 'daily' | 'weekly' | 'monthly';
- ```
- 
- ### MockRegistro (tipo base de datos mock)
- ```typescript
- export interface MockRegistro {
-   label: string;       // hora, fecha o semana según vista
-   value: number;
-   isAbnormal: boolean;
-   timestamp: Date;
- }
- ```
- 
- ### NormalRange (tipo auxiliar)
- ```typescript
- export interface NormalRange {
-   min: number;
-   max: number;
- }
- ```
- 
- ### Mapa de rangos normales por signo
- ```typescript
- export const NORMAL_RANGES: Record<TipoSignoVital, NormalRange> = {
-   frecuencia_cardiaca: { min: 60, max: 100 },
-   presion_sistolica:   { min: 90, max: 120 },
-   presion_diastolica:  { min: 60, max: 80 },
-   saturacion_oxigeno:  { min: 95, max: 100 },
-   temperatura:         { min: 36.0, max: 37.5 },
- };
- ```
- 
- ### Funciones generadoras (mockReportes.ts)
- ```typescript
- function generarDatosDiarios(tipoSigno: TipoSignoVital, fechaInicio: Date, cantidadHoras?: number): MockRegistro[];
- function generarDatosSemanales(tipoSigno: TipoSignoVital, fechaInicio: Date, cantidadDias?: number): MockRegistro[];
- function generarDatosMensuales(tipoSigno: TipoSignoVital, fechaInicio: Date, cantidadSemanas?: number): MockRegistro[];
- ```

## API contracts

- ### LineChartProps
- ```typescript
- interface LineChartProps {
-   data: MockRegistro[];
-   normalRange: NormalRange;
-   width: number;
-   height: number;
-   viewMode: VistaReporte;
- }
- ```
- - Renderiza líneas SVG (react-native-svg) con Path
- - Línea de referencia horizontal en y = normalRange.max y min
- - Puntos anormales renderizados como círculo rojo (#EF4444)
- - PanResponder para gestos: desplazamiento horizontal (pan) y zoom (pinch)
- - Eje X con labels según viewMode (horas, días, semanas)
- - Eje Y con escala automática según el rango de valores
- 
- ### ResumenEstadisticoProps
- ```typescript
- interface ResumenEstadisticoProps {
-   values: number[];
-   unit: string;
-   normalRange: NormalRange;
- }
- ```
- - Renderiza 4 métricas en cards internas: promedio, máximo, mínimo, cantidad de registros
- - Si el promedio está fuera del rango normal, se resalta con color de alerta
- - Diseño consistente con Card.tsx existente (border-radius 18px, sombra #B0C4B1)
- 
- ### DetalleSignoScreen route params
- ```typescript
- type DetalleSignoScreenProps = NativeStackScreenProps<RootStackParamList, 'DetalleSigno'>;
- ```
- - Lee `tipoSigno`, `label`, `unit`, `icon` de route.params
- - Estado local: `vista` (VistaReporte), `data` (MockRegistro[]), `zoomScale`, `offsetX`
- - useEffect que regenera datos al cambiar `tipoSigno` o `vista`

## Test plan

- **CA-01 (Navegación):**
- - Unit: mockear VitalSignCard onPress → verificar que llama a navigation.navigate con params correctos
- - Manual: tocar cada indicador en InicioScreen → confirmar que abre DetalleSignoScreen con el título y unidad correctos
- 
- **CA-02 (Gráfico de línea con referencia):**
- - Snapshot: renderizar LineChart con datos mock de todos los signos
- - Assert: verificar que existe un <Line> o <Path> para los datos y una <Line> para la referencia
- 
- **CA-03 (3 vistas sin recargar pantalla):**
- - Unit: cambiar vista de 'daily' a 'weekly' → verificar que data se actualiza (no se recrea el screen)
- - Manual: tocar tabs Diario/Semanal/Mensual → el gráfico se transforma sin flicker
- 
- **CA-04 (Resumen estadístico):**
- - Unit: pasar valores [70, 80, 90] → verificar promedio: 80, max: 90, min: 70, count: 3
- - Snapshot: ResumenEstadistico con datos normales y con datos anormales
- 
- **CA-05 (Valores anormales destacados):**
- - Unit: mock datos con isAbnormal=true → verificar que se renderiza Circle rojo en SVG
- - Manual: observar puntos rojos en el gráfico para valores fuera de rango
- 
- **CA-06 (Zoom y desplazamiento):**
- - Unit: simular PanResponder gesture → verificar que escala/offset del SVG container cambian
- - Manual: hacer pinch-to-zoom y swipe horizontal → el gráfico escala y se desplaza suavemente
- 
- **Integración:**
- - Renderizar DetalleSignoScreen con todos los signos → verificar que no hay crashes
- - Verificar consumo de memoria en Android (API 33) con múltiples cambios de vista

## Risks

- **R1 — Gestos conflictivos (ScrollView padre + PanResponder hijo):** DetalleSignoScreen podría tener un ScrollView envolvente. El PanResponder del gráfico puede competir con el scroll padre.
- → Mitigación: usar `onMoveShouldSetPanResponder` condicional (solo cuando el toque está dentro del área del chart) y deshabilitar scroll del padre mientras se hace zoom/pan sobre el gráfico.
- 
- **R2 — Rendimiento SVG con PanResponder en Android:** Renderizar paths SVG con animaciones de zoom/pan podría causar jank en dispositivos de gama media (S20 FE).
- → Mitigación: limitar puntos visibles (< 100), usar `react-native-svg` con `opacity` transitions en vez de animaciones JS-driven, considerar `useNativeDriver` para gestures si PanResponder se vuelve lento.
- 
- **R3 — Bundle size sin librerías externas:** react-native-svg ya está en el proyecto (por iconos). No agregar deps extra. El riesgo es que el SVG + PanResponder + lógica matemática ocupe > 50KB.
- → Mitigación: monitorear con `npx react-native bundle --platform android --dev false` antes de mergear.
- 
- **R4 — Precisión del pinch-to-zoom custom:** Implementar detección de escala a partir de dos toques simultáneos con PanResponder es frágil.
- → Mitigación: usar `distanceBetweenTouches` y factor de escala mínimo 1x, máximo 5x. Si la implementación custom resulta inestable, considerar `react-native-gesture-handler` (ya presente en el proyecto por navegación).
- 
- **R5 — Datos mock no representativos:** Si los generadores producen valores siempre normales o con patrones poco realistas, las pruebas visuales serán engañosas.
- → Mitigación: incluir un 15-20% de valores fuera de rango aleatorio en los generadores, y validar con el equipo de producto antes del release.

---

*Generated by `cortex-code-designer` (Pluggable Middle Phase 09.B). The
implementer reads this document and follows it; deviations require a
new checkpoint with the `unverified_claims` justifying the diff.*
