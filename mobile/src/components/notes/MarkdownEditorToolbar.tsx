import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Heading1,
  Heading2,
  Bold,
  Italic,
  ListTodo,
  Code,
  Link,
  Quote,
  List,
} from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme/tokens';

interface MarkdownEditorToolbarProps {
  onInsert: (prefix: string, suffix?: string) => void;
}

export const MarkdownEditorToolbar: React.FC<MarkdownEditorToolbarProps> = ({ onInsert }) => {
  const tools = [
    { label: 'H1', action: () => onInsert('# ', '') },
    { label: 'H2', action: () => onInsert('## ', '') },
    { label: 'B', icon: <Bold size={15} color={colors.foreground} strokeWidth={2.5} />, action: () => onInsert('**', '**') },
    { label: 'I', icon: <Italic size={15} color={colors.foreground} strokeWidth={2.5} />, action: () => onInsert('*', '*') },
    { label: 'Link', icon: <Link size={15} color={colors.primary} strokeWidth={2} />, action: () => onInsert('[[', ']]') },
    { label: 'Check', icon: <ListTodo size={15} color={colors.cyan} strokeWidth={2} />, action: () => onInsert('- [ ] ', '') },
    { label: 'List', icon: <List size={15} color={colors.foreground} strokeWidth={2} />, action: () => onInsert('- ', '') },
    { label: 'Code', icon: <Code size={15} color={colors.codeText} strokeWidth={2} />, action: () => onInsert('`', '`') },
    { label: 'Quote', icon: <Quote size={15} color={colors.foregroundSecondary} strokeWidth={2} />, action: () => onInsert('> ', '') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {tools.map((t, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.toolButton}
            onPress={t.action}
            activeOpacity={0.7}
          >
            {t.icon ? t.icon : <Text style={styles.toolText}>{t.label}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 6,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  toolButton: {
    minWidth: 36,
    height: 36,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  toolText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
});
