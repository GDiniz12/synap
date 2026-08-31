import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Layers, Plus, Sparkles, X, HelpCircle, CheckCircle2 } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { useWorkspace } from '../context/WorkspaceContext';
import { Header } from '../components/common/Header';
import { DeckListItem } from '../components/flashcards/DeckListItem';
import { EmptyState } from '../components/common/EmptyState';
import { WorkspaceSelectorModal } from '../components/common/WorkspaceSelectorModal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

interface FlashcardsScreenProps {
  navigation: any;
}

export const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({ navigation }) => {
  const {
    decks,
    allCards,
    activeWorkspace,
    loadWorkspaceData,
    createDeck,
    createFlashcard,
    isSyncing,
  } = useWorkspace();

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isNewDeckModalOpen, setIsNewDeckModalOpen] = useState(false);
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);

  // New deck state
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckLoading, setDeckLoading] = useState(false);

  // New card state
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardLoading, setCardLoading] = useState(false);

  const handleCreateDeck = async () => {
    if (!deckName.trim()) return;
    setDeckLoading(true);
    try {
      await createDeck(deckName.trim(), deckDesc.trim());
      setDeckName('');
      setDeckDesc('');
      setIsNewDeckModalOpen(false);
    } catch (err) {
      console.error('Failed to create deck', err);
    } finally {
      setDeckLoading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !selectedDeckId) return;
    setCardLoading(true);
    try {
      await createFlashcard(selectedDeckId, cardFront.trim(), cardBack.trim());
      setCardFront('');
      setCardBack('');
      setIsNewCardModalOpen(false);
    } catch (err) {
      console.error('Failed to create card', err);
    } finally {
      setCardLoading(false);
    }
  };

  const openNewCardModal = (deckId?: string) => {
    if (deckId) {
      setSelectedDeckId(deckId);
    } else if (decks.length > 0) {
      setSelectedDeckId(decks[0].id);
    }
    setIsNewCardModalOpen(true);
  };

  return (
    <View style={styles.container}>
      <Header
        onOpenWorkspaceSelector={() => setIsWorkspaceModalOpen(true)}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButtonSecondary}
              onPress={() => setIsNewDeckModalOpen(true)}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.foreground} strokeWidth={2.5} />
              <Text style={styles.headerButtonSecondaryText}>Deck</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButtonPrimary}
              onPress={() => openNewCardModal()}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.background} strokeWidth={2.5} />
              <Text style={styles.headerButtonPrimaryText}>Card</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={() => activeWorkspace && loadWorkspaceData(activeWorkspace.id)}
            tintColor={colors.foregroundSecondary}
          />
        }
        renderItem={({ item }) => {
          const deckCards = allCards.filter((c) => c.deckId === item.id);
          const now = new Date();
          const dueCards = deckCards.filter(
            (c) => !c.proximaRevisao || new Date(c.proximaRevisao) <= now
          );

          return (
            <DeckListItem
              deck={item}
              cardCount={deckCards.length}
              dueCount={dueCards.length}
              onPress={() => openNewCardModal(item.id)}
              onStudy={() =>
                navigation.navigate('FlashcardStudy', {
                  deckId: item.id,
                  deckName: item.nome,
                })
              }
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<Layers size={24} color={colors.foregroundSecondary} strokeWidth={1.8} />}
            title="Nenhum deck de flashcards"
            description="Crie decks e cartões com repetição espaçada (SM-2) para fixar conceitos essenciais."
            actionTitle="Criar Primeiro Deck"
            onAction={() => setIsNewDeckModalOpen(true)}
          />
        }
      />

      {/* MODAL: NOVO DECK */}
      <Modal visible={isNewDeckModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsNewDeckModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBody}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Novo Deck</Text>
                  <TouchableOpacity onPress={() => setIsNewDeckModalOpen(false)}>
                    <X size={18} color={colors.foregroundSecondary} />
                  </TouchableOpacity>
                </View>
                <Input
                  label="Nome do Deck"
                  placeholder="Ex: Arquitetura de Software"
                  value={deckName}
                  onChangeText={setDeckName}
                  autoFocus
                />
                <Input
                  label="Descrição (Opcional)"
                  placeholder="Ex: Padrões, Clean Code e S.O.L.I.D."
                  value={deckDesc}
                  onChangeText={setDeckDesc}
                />
                <View style={styles.modalActions}>
                  <Button
                    title="Cancelar"
                    variant="ghost"
                    size="sm"
                    onPress={() => setIsNewDeckModalOpen(false)}
                  />
                  <Button
                    title="Criar Deck"
                    variant="primary"
                    size="sm"
                    loading={deckLoading}
                    onPress={handleCreateDeck}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL: NOVO FLASHCARD */}
      <Modal visible={isNewCardModalOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsNewCardModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBody}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Novo Flashcard</Text>
                  <TouchableOpacity onPress={() => setIsNewCardModalOpen(false)}>
                    <X size={18} color={colors.foregroundSecondary} />
                  </TouchableOpacity>
                </View>

                {decks.length > 1 && (
                  <View style={styles.deckSelectorRow}>
                    <Text style={styles.selectorLabel}>Deck:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {decks.map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={[
                            styles.deckChip,
                            selectedDeckId === d.id && styles.deckChipSelected,
                          ]}
                          onPress={() => setSelectedDeckId(d.id)}
                        >
                          <Text
                            style={[
                              styles.deckChipText,
                              selectedDeckId === d.id && styles.deckChipTextSelected,
                            ]}
                          >
                            {d.nome}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Input
                  label="Frente (Pergunta / Conceito)"
                  placeholder="O que é o princípio da Inversão de Dependência?"
                  value={cardFront}
                  onChangeText={setCardFront}
                  multiline
                />

                <Input
                  label="Verso (Resposta / Definição)"
                  placeholder="Módulos de alto nível não devem depender de módulos de baixo nível..."
                  value={cardBack}
                  onChangeText={setCardBack}
                  multiline
                />

                <View style={styles.modalActions}>
                  <Button
                    title="Cancelar"
                    variant="ghost"
                    size="sm"
                    onPress={() => setIsNewCardModalOpen(false)}
                  />
                  <Button
                    title="Salvar Card"
                    variant="primary"
                    size="sm"
                    loading={cardLoading}
                    onPress={handleCreateCard}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <WorkspaceSelectorModal
        visible={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.xs,
    gap: 4,
  },
  headerButtonSecondaryText: {
    color: colors.foreground,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  headerButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.foreground,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.xs,
    gap: 4,
  },
  headerButtonPrimaryText: {
    color: colors.background,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalBody: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  deckSelectorRow: {
    marginBottom: spacing.md,
  },
  selectorLabel: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  deckChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xs,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deckChipSelected: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  deckChipText: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
  },
  deckChipTextSelected: {
    color: colors.background,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
