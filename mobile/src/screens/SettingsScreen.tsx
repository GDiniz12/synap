import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  FolderKanban,
  Server,
  Database,
  LogOut,
  ChevronRight,
  Shield,
  Trash2,
  Layers,
  FileText,
} from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { storage } from '../services/storage';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, logout, apiUrl, updateApiUrl } = useAuth();
  const { activeWorkspace, workspaces, notas, allCards, decks } = useWorkspace();

  const [customUrl, setCustomUrl] = useState(apiUrl);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  const handleSaveUrl = async () => {
    try {
      await updateApiUrl(customUrl);
      setIsEditingUrl(false);
      Alert.alert('Sucesso', 'Endereço da API atualizado com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'URL inválida');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Limpar Cache Offline',
      'Deseja limpar os dados armazenados em cache local? O app baixará os dados novamente do servidor.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await storage.clearAllCache();
            Alert.alert('Cache limpo', 'O cache local foi limpo.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Encerrar Sessão', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 30) },
      ]}
    >
      <Text style={styles.screenTitle}>Configurações</Text>

      {/* User Profile Card */}
      <Card style={styles.sectionCard}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Usuário Synap'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </Card>

      {/* Workspace Stats */}
      <Text style={styles.sectionHeader}>Workspace Ativo</Text>
      <Card style={styles.sectionCard}>
        <View style={styles.workspaceHeader}>
          <FolderKanban size={16} color={colors.foreground} strokeWidth={2} />
          <Text style={styles.workspaceName}>{activeWorkspace?.nome || 'Nenhum selecionado'}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <FileText size={14} color={colors.foregroundSecondary} />
            <Text style={styles.statNumber}>{notas.length}</Text>
            <Text style={styles.statLabel}>Notas</Text>
          </View>
          <View style={styles.statBox}>
            <Layers size={14} color={colors.foregroundSecondary} />
            <Text style={styles.statNumber}>{decks.length}</Text>
            <Text style={styles.statLabel}>Decks</Text>
          </View>
          <View style={styles.statBox}>
            <Shield size={14} color={colors.foregroundSecondary} />
            <Text style={styles.statNumber}>{allCards.length}</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>
        </View>
      </Card>

      {/* Server & API Config */}
      <Text style={styles.sectionHeader}>Servidor & Conexão</Text>
      <Card style={styles.sectionCard}>
        <View style={styles.serverRow}>
          <Server size={16} color={colors.foregroundSecondary} strokeWidth={2} />
          <View style={styles.serverInfo}>
            <Text style={styles.serverLabel}>Endpoint da API</Text>
            <Text style={styles.serverUrl} numberOfLines={1}>
              {apiUrl}
            </Text>
          </View>
        </View>

        {isEditingUrl ? (
          <View style={styles.editUrlContainer}>
            <Input
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="https://synap-mocha.vercel.app/api"
              autoCapitalize="none"
            />
            <View style={styles.editUrlActions}>
              <Button
                title="Cancelar"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setCustomUrl(apiUrl);
                  setIsEditingUrl(false);
                }}
              />
              <Button title="Salvar" variant="primary" size="sm" onPress={handleSaveUrl} />
            </View>
          </View>
        ) : (
          <Button
            title="Alterar Servidor"
            variant="secondary"
            size="sm"
            style={styles.alterButton}
            onPress={() => setIsEditingUrl(true)}
          />
        )}
      </Card>

      {/* Storage & Cache */}
      <Text style={styles.sectionHeader}>Armazenamento & Cache</Text>
      <Card style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleClearCache}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <Database size={16} color={colors.foregroundSecondary} strokeWidth={2} />
            <View>
              <Text style={styles.actionRowTitle}>Limpar Cache Offline</Text>
              <Text style={styles.actionRowDesc}>Libera memória e força nova sincronização</Text>
            </View>
          </View>
          <Trash2 size={16} color={colors.danger} strokeWidth={2} />
        </TouchableOpacity>
      </Card>

      {/* Logout */}
      <Button
        title="Encerrar Sessão"
        variant="danger"
        size="md"
        icon={<LogOut size={16} color={colors.foreground} strokeWidth={2} />}
        onPress={handleLogout}
        style={styles.logoutButton}
      />

      <View style={styles.footerVersion}>
        <Text style={styles.versionText}>Synap Mobile v1.0.0 (Geist Standard)</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  screenTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionCard: {
    marginBottom: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.background,
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  userEmail: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
    marginTop: 2,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  workspaceName: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xs,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    fontFamily: typography.fontFamily.mono,
  },
  statLabel: {
    color: colors.foregroundSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  serverInfo: {
    flex: 1,
  },
  serverLabel: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
  },
  serverUrl: {
    color: colors.foreground,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
    marginTop: 2,
  },
  alterButton: {
    marginTop: spacing.md,
  },
  editUrlContainer: {
    marginTop: spacing.md,
  },
  editUrlActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  actionRowTitle: {
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  actionRowDesc: {
    color: colors.foregroundMuted,
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  logoutButton: {
    marginTop: spacing.xxl,
  },
  footerVersion: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  versionText: {
    color: colors.foregroundMuted,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
});
