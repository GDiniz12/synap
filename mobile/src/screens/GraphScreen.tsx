import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Network, Hash, Info } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { useWorkspace } from '../context/WorkspaceContext';
import { Header } from '../components/common/Header';
import { GraphWebView } from '../components/graph/GraphWebView';
import { WorkspaceSelectorModal } from '../components/common/WorkspaceSelectorModal';
import { EmptyState } from '../components/common/EmptyState';

interface GraphScreenProps {
  navigation: any;
}

export const GraphScreen: React.FC<GraphScreenProps> = ({ navigation }) => {
  const { notas, activeWorkspace } = useWorkspace();
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [showTags, setShowTags] = useState(true);

  const handleSelectNota = (notaId: string) => {
    navigation.navigate('NoteEditor', { notaId });
  };

  return (
    <View style={styles.container}>
      <Header
        onOpenWorkspaceSelector={() => setIsWorkspaceModalOpen(true)}
        rightAction={
          <TouchableOpacity
            style={[styles.tagToggle, showTags && styles.tagToggleActive]}
            onPress={() => setShowTags(!showTags)}
            activeOpacity={0.7}
          >
            <Hash
              size={12}
              color={showTags ? colors.background : colors.cyan}
              strokeWidth={2}
            />
            <Text style={[styles.tagToggleText, showTags && styles.tagToggleTextActive]}>
              Tags
            </Text>
          </TouchableOpacity>
        }
      />

      {notas.length === 0 ? (
        <EmptyState
          icon={<Network size={24} color={colors.foregroundSecondary} strokeWidth={1.8} />}
          title="Grafo Vazio"
          description="Crie notas e use conexões [[Nome da Nota]] para visualizar a teia de conhecimento interativa."
        />
      ) : (
        <View style={styles.graphContainer}>
          <GraphWebView
            notas={notas}
            showTags={showTags}
            onSelectNota={handleSelectNota}
          />
          <View style={styles.hudOverlay}>
            <Text style={styles.hudText}>
              {notas.length} {notas.length === 1 ? 'nota' : 'notas'} conectadas
            </Text>
          </View>
        </View>
      )}

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
  tagToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    gap: 4,
  },
  tagToggleActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
  },
  tagToggleText: {
    color: colors.cyan,
    fontSize: 11,
    fontFamily: typography.fontFamily.mono,
    fontWeight: '600',
  },
  tagToggleTextActive: {
    color: colors.background,
    fontWeight: '800',
  },
  graphContainer: {
    flex: 1,
    position: 'relative',
  },
  hudOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  hudText: {
    color: colors.foregroundSecondary,
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
  },
});
