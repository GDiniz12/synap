import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  Eye,
  Edit3,
  Check,
  RotateCw,
} from 'lucide-react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { useWorkspace } from '../context/WorkspaceContext';
import { MarkdownEditorToolbar } from '../components/notes/MarkdownEditorToolbar';

interface NoteEditorScreenProps {
  route: any;
  navigation: any;
}

export const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { notaId } = route.params;
  const { notas, updateNota, deleteNota } = useWorkspace();

  const currentNota = notas.find((n) => n.id === notaId);

  const [titulo, setTitulo] = useState(currentNota?.titulo || '');
  const [conteudo, setConteudo] = useState(currentNota?.conteudo || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const contentInputRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if external update
  useEffect(() => {
    if (currentNota) {
      setTitulo(currentNota.titulo);
      setConteudo(currentNota.conteudo || '');
    }
  }, [notaId]);

  // Debounced auto-save
  const triggerAutoSave = useCallback(
    (newTitulo: string, newConteudo: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await updateNota(notaId, {
            titulo: newTitulo.trim() || 'Sem título',
            conteudo: newConteudo,
          });
          setLastSaved(new Date());
        } catch (err) {
          console.error('Failed to auto-save note:', err);
        } finally {
          setIsSaving(false);
        }
      }, 700);
    },
    [notaId, updateNota]
  );

  const handleTitleChange = (text: string) => {
    setTitulo(text);
    triggerAutoSave(text, conteudo);
  };

  const handleContentChange = (text: string) => {
    setConteudo(text);
    triggerAutoSave(titulo, text);
  };

  const handleInsertMarkdown = (prefix: string, suffix: string = '') => {
    const updated = `${conteudo}${prefix}${suffix}`;
    setConteudo(updated);
    triggerAutoSave(titulo, updated);
  };

  const handleDelete = () => {
    Alert.alert('Excluir Nota', 'Tem certeza que deseja excluir esta nota permanentemente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteNota(notaId);
          navigation.goBack();
        },
      },
    ]);
  };

  const wordCount = conteudo.trim() ? conteudo.trim().split(/\s+/).length : 0;
  const charCount = conteudo.length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerStatus}>
          {isSaving ? (
            <View style={styles.statusBadge}>
              <RotateCw size={12} color={colors.foregroundSecondary} strokeWidth={2} />
              <Text style={styles.statusText}>Salvando...</Text>
            </View>
          ) : lastSaved ? (
            <View style={styles.statusBadge}>
              <Check size={12} color={colors.success} strokeWidth={2.5} />
              <Text style={[styles.statusText, { color: colors.success }]}>Salvo</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setIsPreviewMode(!isPreviewMode)}
            activeOpacity={0.7}
          >
            {isPreviewMode ? (
              <Edit3 size={18} color={colors.foreground} strokeWidth={2} />
            ) : (
              <Eye size={18} color={colors.foregroundSecondary} strokeWidth={2} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={colors.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor Body */}
      <ScrollView
        style={styles.editorScroll}
        contentContainerStyle={styles.editorContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.titleInput}
          placeholder="Título da nota"
          placeholderTextColor={colors.foregroundMuted}
          value={titulo}
          onChangeText={handleTitleChange}
          editable={!isPreviewMode}
        />

        <View style={styles.divider} />

        {isPreviewMode ? (
          <View style={styles.previewContainer}>
            {conteudo ? (
              conteudo.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return (
                    <Text key={i} style={styles.previewH1}>
                      {line.replace('# ', '')}
                    </Text>
                  );
                }
                if (line.startsWith('## ')) {
                  return (
                    <Text key={i} style={styles.previewH2}>
                      {line.replace('## ', '')}
                    </Text>
                  );
                }
                if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
                  const checked = line.startsWith('- [x] ');
                  return (
                    <View key={i} style={styles.previewChecklistItem}>
                      <View style={[styles.checkCircle, checked && styles.checkCircleChecked]} />
                      <Text style={[styles.previewText, checked && styles.previewTextStriked]}>
                        {line.replace(/- \[[ x]\] /, '')}
                      </Text>
                    </View>
                  );
                }
                if (line.startsWith('> ')) {
                  return (
                    <View key={i} style={styles.previewQuote}>
                      <Text style={styles.previewQuoteText}>{line.replace('> ', '')}</Text>
                    </View>
                  );
                }
                return (
                  <Text key={i} style={styles.previewText}>
                    {line || ' '}
                  </Text>
                );
              })
            ) : (
              <Text style={styles.previewEmptyText}>Nota vazia</Text>
            )}
          </View>
        ) : (
          <TextInput
            ref={contentInputRef}
            style={styles.bodyInput}
            placeholder="Escreva seus pensamentos em Markdown... Use [[Nome da Nota]] para conectar e #tag para categorizar."
            placeholderTextColor={colors.foregroundMuted}
            value={conteudo}
            onChangeText={handleContentChange}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        )}
      </ScrollView>

      {/* Word / Char footer metrics */}
      <View style={styles.metricsBar}>
        <Text style={styles.metricsText}>
          {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'} • {charCount} caracteres
        </Text>
      </View>

      {/* Markdown Quick Toolbar */}
      {!isPreviewMode && <MarkdownEditorToolbar onInsert={handleInsertMarkdown} />}
    </KeyboardAvoidingView>
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
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerStatus: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  statusText: {
    color: colors.foregroundSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: typography.fontFamily.mono,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: 6,
    borderRadius: radius.xs,
  },
  editorScroll: {
    flex: 1,
  },
  editorContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  titleInput: {
    color: colors.foreground,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.sans,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  bodyInput: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
    fontFamily: typography.fontFamily.sans,
    minHeight: 300,
    flex: 1,
  },
  previewContainer: {
    gap: 8,
    paddingVertical: spacing.sm,
  },
  previewH1: {
    color: colors.foreground,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  previewH2: {
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  previewText: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.base,
  },
  previewTextStriked: {
    textDecorationLine: 'line-through',
    color: colors.foregroundMuted,
  },
  previewChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.cyan,
  },
  checkCircleChecked: {
    backgroundColor: colors.cyan,
  },
  previewQuote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.borderLight,
    paddingLeft: spacing.md,
    marginVertical: 4,
  },
  previewQuoteText: {
    color: colors.foregroundSecondary,
    fontStyle: 'italic',
  },
  previewEmptyText: {
    color: colors.foregroundMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
  metricsBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  metricsText: {
    color: colors.foregroundMuted,
    fontSize: 10,
    fontFamily: typography.fontFamily.mono,
  },
});
