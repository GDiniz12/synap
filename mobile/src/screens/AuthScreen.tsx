import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Server, Lock, Mail, User as UserIcon, Globe } from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

export const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { login, registerUser, apiUrl, updateApiUrl } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Server URL Config
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(apiUrl);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha o e-mail e a senha');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await registerUser(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação. Verifique os dados ou a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = async () => {
    try {
      await updateApiUrl(serverUrlInput);
      setShowServerConfig(false);
      Alert.alert('Servidor atualizado', `Conectando em:\n${serverUrlInput}`);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'URL inválida');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>SYNAP</Text>
          </View>
          <Text style={styles.subtitle}>Second Brain & Knowledge Management</Text>
        </View>

        <View style={styles.card}>
          {/* Tab switch */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => {
                setMode('login');
                setError('');
              }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Entrar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => {
                setMode('register');
                setError('');
              }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                Criar Conta
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

          {mode === 'register' && (
            <Input
              label="Nome"
              placeholder="Seu nome"
              value={name}
              onChangeText={setName}
              leftIcon={<UserIcon size={16} color={colors.foregroundSecondary} strokeWidth={2} />}
            />
          )}

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Mail size={16} color={colors.foregroundSecondary} strokeWidth={2} />}
          />

          <Input
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={16} color={colors.foregroundSecondary} strokeWidth={2} />}
          />

          <Button
            title={mode === 'login' ? 'Acessar Conta' : 'Criar Conta'}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleSubmit}
            style={styles.submitButton}
          />
        </View>

        {/* Server Config Toggle */}
        <View style={styles.serverSection}>
          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Globe size={14} color={colors.foregroundMuted} strokeWidth={2} />
            <Text style={styles.serverToggleText}>
              {showServerConfig ? 'Ocultar configurações de servidor' : 'Configurar servidor backend'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverCard}>
              <Input
                label="URL da API Backend"
                placeholder="https://synap-mocha.vercel.app/api"
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                autoCapitalize="none"
              />
              <Button
                title="Salvar Servidor"
                variant="secondary"
                size="sm"
                onPress={handleSaveServerUrl}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.foreground,
    borderRadius: radius.xs,
    marginBottom: spacing.sm,
  },
  logoText: {
    color: colors.background,
    fontSize: typography.fontSize.xl,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: typography.fontFamily.sans,
  },
  subtitle: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.xs,
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.foreground,
    fontWeight: typography.fontWeight.semibold,
  },
  errorMessage: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
    backgroundColor: 'rgba(238, 0, 0, 0.1)',
    padding: 8,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: 'rgba(238, 0, 0, 0.2)',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  serverSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  serverToggleText: {
    color: colors.foregroundMuted,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
  serverCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
});
