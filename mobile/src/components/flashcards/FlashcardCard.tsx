import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { RotateCw, HelpCircle, CheckCircle2 } from 'lucide-react-native';
import { Flashcard } from '../../types';
import { colors, typography, spacing, radius, shadows } from '../../theme/tokens';

interface FlashcardCardProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

export const FlashcardCard: React.FC<FlashcardCardProps> = ({ card, isFlipped, onFlip }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFlipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped]);

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onFlip}
      style={styles.container}
    >
      {/* FRONT SIDE */}
      <Animated.View
        style={[
          styles.card,
          styles.cardFront,
          {
            transform: [{ rotateY: frontInterpolate }],
            opacity: frontOpacity,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <HelpCircle size={12} color={colors.foregroundSecondary} strokeWidth={2} />
            <Text style={styles.badgeText}>FRENTE / PERGUNTA</Text>
          </View>
          <RotateCw size={14} color={colors.foregroundMuted} strokeWidth={1.8} />
        </View>

        <View style={styles.body}>
          <Text style={styles.cardText}>{card.frente}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>Toque para revelar a resposta</Text>
        </View>
      </Animated.View>

      {/* BACK SIDE */}
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          {
            transform: [{ rotateY: backInterpolate }],
            opacity: backOpacity,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, styles.badgeBack]}>
            <CheckCircle2 size={12} color={colors.success} strokeWidth={2} />
            <Text style={[styles.badgeText, { color: colors.success }]}>VERSO / RESPOSTA</Text>
          </View>
          <RotateCw size={14} color={colors.foregroundMuted} strokeWidth={1.8} />
        </View>

        <View style={styles.body}>
          <Text style={[styles.cardText, styles.cardTextAnswer]}>{card.verso}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>Avalie seu nível de retenção abaixo</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden',
    ...shadows.card,
  },
  cardFront: {
    backgroundColor: colors.surface,
  },
  cardBack: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeBack: {
    borderColor: 'rgba(0, 230, 153, 0.3)',
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
  },
  badgeText: {
    color: colors.foregroundSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily.mono,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  cardText: {
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    lineHeight: typography.lineHeight.lg,
  },
  cardTextAnswer: {
    color: colors.foreground,
    fontWeight: typography.fontWeight.semibold,
  },
  cardFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tapHint: {
    color: colors.foregroundMuted,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
});
