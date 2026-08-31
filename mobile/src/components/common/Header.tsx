import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Plus, RefreshCw } from 'lucide-react-native';
import { colors, typography, spacing } from '../../theme/tokens';
import { useWorkspace } from '../../context/WorkspaceContext';

interface HeaderProps {
  title?: string;
  showWorkspaceSelector?: boolean;
  onOpenWorkspaceSelector?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showWorkspaceSelector = true,
  onOpenWorkspaceSelector,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();
  const { activeWorkspace, isSyncing, loadWorkspaces } = useWorkspace();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.content}>
        {showWorkspaceSelector ? (
          <TouchableOpacity
            style={styles.workspaceButton}
            activeOpacity={0.7}
            onPress={onOpenWorkspaceSelector}
          >
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>S</Text>
            </View>
            <View style={styles.workspaceTextContainer}>
              <Text style={styles.workspaceName} numberOfLines={1}>
                {activeWorkspace ? activeWorkspace.nome : 'Selecionar Workspace'}
              </Text>
            </View>
            <ChevronDown size={14} color={colors.foregroundSecondary} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}

        <View style={styles.rightContainer}>
          {isSyncing && (
            <View style={styles.syncingBadge}>
              <ActivityIndicator size="small" color={colors.foregroundSecondary} />
            </View>
          )}
          {rightAction}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  workspaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '70%',
    gap: 8,
  },
  logoBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.fontFamily.sans,
  },
  workspaceTextContainer: {
    flexShrink: 1,
  },
  workspaceName: {
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  title: {
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncingBadge: {
    marginRight: 4,
  },
});
