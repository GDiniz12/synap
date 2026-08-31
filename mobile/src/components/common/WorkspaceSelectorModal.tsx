import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Check, Plus, X, FolderKanban } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Input } from './Input';
import { Button } from './Button';

interface WorkspaceSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WorkspaceSelectorModal: React.FC<WorkspaceSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (ws: any) => {
    await setActiveWorkspace(ws);
    onClose();
  };

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) {
      setError('Informe um nome para o workspace');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreating(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao criar workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <FolderKanban size={18} color={colors.foreground} strokeWidth={2} />
                  <Text style={styles.headerTitle}>Workspaces</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={18} color={colors.foregroundSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {!isCreating ? (
                <>
                  <FlatList
                    data={workspaces}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                      const isSelected = activeWorkspace?.id === item.id;
                      return (
                        <TouchableOpacity
                          style={[styles.item, isSelected && styles.itemSelected]}
                          onPress={() => handleSelect(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.itemInfo}>
                            <Text
                              style={[styles.itemName, isSelected && styles.itemNameSelected]}
                              numberOfLines={1}
                            >
                              {item.nome}
                            </Text>
                            {item.isCollaborative && (
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>Compartilhado</Text>
                              </View>
                            )}
                          </View>
                          {isSelected && (
                            <Check size={16} color={colors.foreground} strokeWidth={2.5} />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />

                  <View style={styles.footer}>
                    <Button
                      title="Novo Workspace"
                      onPress={() => setIsCreating(true)}
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={14} color={colors.foreground} strokeWidth={2} />}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.createContainer}>
                  <Input
                    label="Nome do Workspace"
                    placeholder="Ex: Pessoal, Estudos, Trabalho"
                    value={newWorkspaceName}
                    onChangeText={setNewWorkspaceName}
                    error={error}
                    autoFocus
                  />
                  <View style={styles.createActions}>
                    <Button
                      title="Cancelar"
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setIsCreating(false);
                        setError('');
                        setNewWorkspaceName('');
                      }}
                    />
                    <Button
                      title="Criar Workspace"
                      variant="primary"
                      size="sm"
                      loading={loading}
                      onPress={handleCreate}
                    />
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  closeButton: {
    padding: 4,
  },
  list: {
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  itemName: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  itemNameSelected: {
    color: colors.foreground,
    fontWeight: typography.fontWeight.semibold,
  },
  badge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.foregroundSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createContainer: {
    paddingVertical: spacing.sm,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
