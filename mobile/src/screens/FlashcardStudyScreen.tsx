import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, RotateCcw, Sparkles } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { useWorkspace } from '../context/WorkspaceContext';
import { FlashcardCard } from '../components/flashcards/FlashcardCard';
import { Button } from '../components/common/Button';
import { Flashcard, ReviewGrade } from '../types';

interface FlashcardStudyScreenProps {
  route: any;
  navigation: any;
}

export const FlashcardStudyScreen: React.FC<FlashcardStudyScreenProps> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { deckId, deckName } = route.params;
  const { allCards, reviewFlashcard } = useWorkspace();

  // Get due or all cards in deck
  const deckCards = useMemo(() => {
    return allCards.filter((c) => c.deckId === deckId);
  }, [allCards, deckId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);

  const currentCard = deckCards[currentIndex];
  const isFinished = currentIndex >= deckCards.length || deckCards.length === 0;

  const handleGrade = async (grade: ReviewGrade) => {
    if (!currentCard) return;
    setIsReviewing(true);
    try {
      await reviewFlashcard(currentCard.id, grade);
      setIsFlipped(false);
      setReviewedCount((prev) => prev + 1);
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to review flashcard', err);
    } finally {
      setIsReviewing(false);
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setReviewedCount(0);
    setIsFlipped(false);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.deckTitle} numberOfLines={1}>
          {deckName || 'Estudo de Flashcards'}
        </Text>

        {!isFinished && deckCards.length > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {deckCards.length}
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {!isFinished && deckCards.length > 0 && (
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIndex + 1) / deckCards.length) * 100}%` },
            ]}
          />
        </View>
      )}

      {/* Content Body */}
      <View style={styles.body}>
        {isFinished ? (
          <View style={styles.finishedContainer}>
            <View style={styles.finishedIcon}>
              <Sparkles size={32} color={colors.success} strokeWidth={2} />
            </View>
            <Text style={styles.finishedTitle}>Sessão Concluída!</Text>
            <Text style={styles.finishedSubtitle}>
              Você revisou {reviewedCount} {reviewedCount === 1 ? 'card' : 'cards'}. Todos os intervalos foram recalculados com repetição espaçada.
            </Text>
            <View style={styles.finishedActions}>
              <Button
                title="Revisar Novamente"
                variant="secondary"
                size="md"
                icon={<RotateCcw size={14} color={colors.foreground} />}
                onPress={restartSession}
              />
              <Button
                title="Voltar aos Decks"
                variant="primary"
                size="md"
                onPress={() => navigation.goBack()}
              />
            </View>
          </View>
        ) : (
          <>
            <FlashcardCard
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
            />

            {/* Grading Controls */}
            {isFlipped ? (
              <View style={styles.gradingContainer}>
                <Text style={styles.gradingPrompt}>Como foi a recuperação da memória?</Text>
                <View style={styles.gradingButtonsRow}>
                  <TouchableOpacity
                    style={[styles.gradeButton, styles.gradeAgain]}
                    onPress={() => handleGrade('again')}
                    disabled={isReviewing}
                  >
                    <Text style={styles.gradeButtonTitle}>Errei</Text>
                    <Text style={styles.gradeButtonSub}>1 min</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.gradeButton, styles.gradeHard]}
                    onPress={() => handleGrade('hard')}
                    disabled={isReviewing}
                  >
                    <Text style={styles.gradeButtonTitle}>Difícil</Text>
                    <Text style={styles.gradeButtonSub}>1 dia</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.gradeButton, styles.gradeGood]}
                    onPress={() => handleGrade('good')}
                    disabled={isReviewing}
                  >
                    <Text style={styles.gradeButtonTitle}>Bom</Text>
                    <Text style={styles.gradeButtonSub}>3 dias</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.gradeButton, styles.gradeEasy]}
                    onPress={() => handleGrade('easy')}
                    disabled={isReviewing}
                  >
                    <Text style={styles.gradeButtonTitle}>Fácil</Text>
                    <Text style={styles.gradeButtonSub}>5 dias</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.revealPromptContainer}>
                <Button
                  title="Revelar Resposta"
                  variant="secondary"
                  size="lg"
                  onPress={() => setIsFlipped(true)}
                  style={styles.revealButton}
                />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    padding: 6,
  },
  deckTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  progressBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressText: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: colors.surfaceElevated,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.foreground,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  gradingContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  gradingPrompt: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily.mono,
  },
  gradingButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  gradeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeAgain: {
    backgroundColor: 'rgba(238, 0, 0, 0.08)',
    borderColor: 'rgba(238, 0, 0, 0.4)',
  },
  gradeHard: {
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
    borderColor: 'rgba(245, 166, 35, 0.4)',
  },
  gradeGood: {
    backgroundColor: 'rgba(0, 112, 243, 0.08)',
    borderColor: 'rgba(0, 112, 243, 0.4)',
  },
  gradeEasy: {
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    borderColor: 'rgba(0, 230, 153, 0.4)',
  },
  gradeButtonTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  gradeButtonSub: {
    color: colors.foregroundSecondary,
    fontSize: 10,
    marginTop: 2,
    fontFamily: typography.fontFamily.mono,
  },
  revealPromptContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  revealButton: {
    width: '100%',
  },
  finishedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  finishedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  finishedTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  finishedSubtitle: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.lineHeight.base,
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  finishedActions: {
    width: '100%',
    gap: spacing.sm,
  },
});
