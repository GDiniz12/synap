import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Search, Plus, FileText, Hash, X } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { useWorkspace } from '../context/WorkspaceContext';
import { Header } from '../components/common/Header';
import { WorkspaceSelectorModal } from '../components/common/WorkspaceSelectorModal';
import { NoteListItem } from '../components/notes/NoteListItem';
import { EmptyState } from '../components/common/EmptyState';
import { Input } from '../components/common/Input';
import { Nota } from '../types';

interface NotesScreenProps {
  navigation: any;
}

export const NotesScreen: React.FC<NotesScreenProps> = ({ navigation }) => {
  const { notas, activeWorkspace, loadWorkspaceData, createNota, isSyncing } = useWorkspace();
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notas.forEach((n) => {
      const matches = (n.conteudo || '').match(/#([a-zA-Z0-9_-]+)/g);
      if (matches) {
        matches.forEach((t) => set.add(t.replace('#', '')));
      }
    });
    return Array.from(set);
  }, [notas]);

  // Filter notes by search query and selected tag
  const filteredNotas = useMemo(() => {
    return notas.filter((n) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        n.titulo.toLowerCase().includes(query) ||
        (n.conteudo || '').toLowerCase().includes(query);

      const matchesTag =
        !selectedTag || (n.conteudo || '').includes(`#${selectedTag}`);

      return matchesQuery && matchesTag;
    });
  }, [notas, searchQuery, selectedTag]);

  const handleCreateNote = async () => {
    try {
      const newNote = await createNota('Nova Nota', '');
      navigation.navigate('NoteEditor', { notaId: newNote.id });
    } catch (err: any) {
      console.error('Failed to create note', err);
    }
  };

  const handleRefresh = async () => {
    if (activeWorkspace) {
      await loadWorkspaceData(activeWorkspace.id);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        onOpenWorkspaceSelector={() => setIsWorkspaceModalOpen(true)}
        rightAction={
          <TouchableOpacity
            style={styles.newNoteHeaderButton}
            onPress={handleCreateNote}
            activeOpacity={0.7}
          >
            <Plus size={16} color={colors.background} strokeWidth={2.5} />
            <Text style={styles.newNoteHeaderButtonText}>Nova</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchSection}>
        <Input
          placeholder="Buscar notas, links [[...]] ou #tags"
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInputContainer}
          leftIcon={<Search size={14} color={colors.foregroundMuted} strokeWidth={2} />}
          rightIcon={
            searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color={colors.foregroundMuted} strokeWidth={2} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        {allTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScroll}
          >
            <TouchableOpacity
              style={[styles.tagChip, !selectedTag && styles.tagChipActive]}
              onPress={() => setSelectedTag(null)}
            >
              <Text style={[styles.tagChipText, !selectedTag && styles.tagChipTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>

            {allTags.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, isSelected && styles.tagChipActive]}
                  onPress={() => setSelectedTag(isSelected ? null : tag)}
                >
                  <Hash
                    size={11}
                    color={isSelected ? colors.background : colors.cyan}
                    strokeWidth={2}
                  />
                  <Text style={[styles.tagChipText, isSelected && styles.tagChipTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={filteredNotas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={handleRefresh}
            tintColor={colors.foregroundSecondary}
          />
        }
        renderItem={({ item }) => (
          <NoteListItem
            nota={item}
            onPress={() => navigation.navigate('NoteEditor', { notaId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<FileText size={24} color={colors.foregroundSecondary} strokeWidth={1.8} />}
            title={searchQuery || selectedTag ? 'Nenhuma nota encontrada' : 'Nenhuma nota criada'}
            description={
              searchQuery || selectedTag
                ? 'Tente ajustar os termos de busca ou filtros.'
                : 'Crie sua primeira nota com bi-direcionais [[links]] e #tags.'
            }
            actionTitle={searchQuery || selectedTag ? undefined : 'Criar Primeira Nota'}
            onAction={searchQuery || selectedTag ? undefined : handleCreateNote}
          />
        }
      />

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
  newNoteHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.foreground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
    gap: 4,
  },
  newNoteHeaderButtonText: {
    color: colors.background,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    marginBottom: spacing.sm,
  },
  tagsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  tagChipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  tagChipText: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
  tagChipTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
});
