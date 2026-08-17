import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSupabase} from '../context/SupabaseProvider';
import {exportPatientData, type ExportFormat} from '../services/exportPatientData';
import PrimaryButton from '../components/PrimaryButton';
import AppIcon from '../components/AppIcon';
import {colors, spacing, fontSize} from '../theme';

const FORMAT_OPTIONS: {value: ExportFormat; label: string; description: string}[] = [
  {value: 'csv', label: 'CSV', description: 'Compatible con Excel, pandas y herramientas de análisis'},
  {value: 'json', label: 'JSON', description: 'Formato estructado para modelos ML y APIs'},
];

/**
 * HU-95 — Pantalla de exportación de históricos de datos del paciente.
 * Permite elegir formato y exportar los datos para análisis ML.
 */
const ExportHistorialScreen: React.FC = () => {
  const navigation = useNavigation();
  const {session} = useSupabase();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'No hay sesión activa.');
      return;
    }

    setExporting(true);
    try {
      const result = await exportPatientData(session.user.id, {
        format: selectedFormat,
      });

      const sizeKB = (result.sizeBytes / 1024).toFixed(1);
      const sizeLabel = result.sizeBytes > 1024 * 1024
        ? `${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB`
        : `${sizeKB} KB`;

      Alert.alert(
        'Exportación completada',
        `Formato: ${result.format.toUpperCase()}\n` +
        `Registros: ${result.rowCount}\n` +
        `Tamaño: ${sizeLabel}\n\n` +
        `Los datos están listos para descargar.`,
        [
          {text: 'OK'},
        ],
      );
    } catch (error: any) {
      Alert.alert('Error al exportar', error.message ?? 'Ocurrió un error inesperado.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AppIcon name="flecha-izquierda" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exportar Histórico</Text>
        <View style={{width: 44}} />
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>📊</Text>
        <Text style={styles.infoTitle}>Datos para análisis ML</Text>
        <Text style={styles.infoText}>
          Exportá tu histórico completo de signos vitales, síntomas y baseline clínico
          en un formato compatible con herramientas de Machine Learning.
        </Text>
      </View>

      {/* Formato */}
      <Text style={styles.sectionLabel}>Formato de exportación</Text>
      {FORMAT_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.formatOption,
            selectedFormat === opt.value && styles.formatOptionSelected,
          ]}
          onPress={() => setSelectedFormat(opt.value)}
          activeOpacity={0.7}>
          <View style={styles.formatRadio}>
            <View style={[
              styles.radioOuter,
              selectedFormat === opt.value && styles.radioOuterSelected,
            ]}>
              {selectedFormat === opt.value && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.formatInfo}>
            <Text style={styles.formatLabel}>{opt.label}</Text>
            <Text style={styles.formatDesc}>{opt.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Features incluidas */}
      <Text style={styles.sectionLabel}>Datos incluidos</Text>
      <View style={styles.featuresCard}>
        {[
          {icon: '❤️', text: 'Signos vitales (frecuencia cardíaca, presión, SpO2, temperatura)'},
          {icon: '🩺', text: 'Síntomas registrados (físicos y emocionales)'},
          {icon: '📋', text: 'Baseline clínico (rangos de referencia)'},
          {icon: '⚠️', text: 'Factores de riesgo cardíaco'},
          {icon: '📈', text: 'Promedios semanales ML'},
        ].map((item, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{item.icon}</Text>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Botón exportar */}
      <PrimaryButton
        title={exporting ? 'Exportando...' : `Exportar ${selectedFormat.toUpperCase()}`}
        onPress={handleExport}
        loading={exporting}
        style={styles.exportBtn}
      />

      <Text style={styles.footerNote}>
        Los datos se ordenan cronológicamente y se eliminan duplicados automáticamente.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.primarySoft + '30',
    borderRadius: spacing.cardBorderRadius,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  infoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  infoText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Section label
  sectionLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },

  // Format options
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  formatOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft + '10',
  },
  formatRadio: {
    marginRight: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  formatDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Features
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.cardBorderRadius,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Export button
  exportBtn: {
    marginBottom: 16,
  },

  // Footer
  footerNote: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ExportHistorialScreen;
