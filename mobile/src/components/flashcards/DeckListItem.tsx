import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Layers, Play, Clock, Sparkles } from 'lucide-react-native';
import { Deck } from '../../types';
import { colors, typography, spacing, radius } from '../../theme/tokens';

interface DeckListItemProps {
  deck: Deck;
  cardCount: number;
  dueCount: number;
  onPress: () => void;
  onStudy: () => void;
}

export const DeckListItem: React.FC<DeckListItemProps> = ({
  deck,
  cardCount,
  dueCount,
  onPress,
  onStudy,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <View style={styles.iconContainer}>
            <Layers size={16} color={colors.foreground} strokeWidth={2} />
          </View>
          <View style={styles.texts}>
            <Text style={styles.title} numberOfLines={1}>
              {deck.nome}
            </Text>
            {deck.descricao ? (
              <Text style={styles.description} numberOfLines={1}>
                {deck.descricao}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.stats}>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>{cardCount} {cardCount === 1 ? 'card' : 'cards'}</Text>
          </View>
          {dueCount > 0 ? (
            <View style={styles.dueBadge}>
              <Clock size={11} color={colors.warning} strokeWidth={2} />
              <Text style={styles.dueText}>{dueCount} para hoje</Text>
            </View>
          ) : (
            <View style={styles.completedBadge}>
              <Sparkles size={11} color={colors.success} strokeWidth={2} />
              <Text style={styles.completedText}>Revisado</Text>
            </View>
          )}
        </View>

        {cardCount > 0 && (
          <TouchableOpacity
            style={styles.studyButton}
            onPress={onStudy}
            activeOpacity={0.75}
          >
            <Play size={12} color={colors.background} fill={colors.background} />
            <Text style={styles.studyButtonText}>Estudar</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  title: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  description: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  statLabel: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    gap: 4,
  },
  dueText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.fontFamily.mono,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    gap: 4,
  },
  completedText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xs,
    gap: 6,
  },
  studyButtonText: {
    color: colors.background,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
});
