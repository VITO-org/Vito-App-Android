import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Card from '../components/Card';
import VITOMascot from '../components/VITOMascot';
import {colors, spacing, fontSize} from '../theme';

interface PerfilOptionProps {
  icon: string;
  label: string;
}

const PerfilOption: React.FC<PerfilOptionProps> = ({icon, label}) => (
  <View style={styles.optionRow}>
    <View style={styles.optionLeft}>
      <View style={styles.optionIcon}>
        <Text style={styles.optionEmoji}>{icon}</Text>
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </View>
);

const OPTS: PerfilOptionProps[] = [
  {icon: '📋', label: 'Datos personales'},
  {icon: '⚙️', label: 'Configuración'},
  {icon: '📱', label: 'Dispositivos conectados'},
  {icon: '🔒', label: 'Privacidad y seguridad'},
  {icon: '❓', label: 'Ayuda y soporte'},
];

const PerfilScreen: React.FC = () => {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Avatar + nombre */}
      <View style={styles.profileHeader}>
        <VITOMascot size={72} />
        <Text style={styles.userName}>Juan Pérez</Text>
        <Text style={styles.userAge}>68 años</Text>
        <View style={styles.editBadge}>
          <Text style={styles.editText}>Editar perfil</Text>
        </View>
      </View>

      {/* Opciones */}
      <Card>
        {OPTS.map((opt, i) => (
          <React.Fragment key={opt.label}>
            <PerfilOption {...opt} />
            {i < OPTS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </Card>

      <View style={{height: 24}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: spacing.screenPaddingTop,
  },

  // ── Header ──
  profileHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  userAge: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBadge: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editText: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Opciones ──
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionLabel: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});

export default PerfilScreen;
