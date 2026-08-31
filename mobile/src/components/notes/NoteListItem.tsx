import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, ChevronRight, Hash, Link2 } from 'lucide-react-native';
import { Nota } from '../../types';
import { colors, typography, spacing, radius } from '../../theme/tokens';

interface NoteListItemProps {
  nota: Nota;
  onPress: () => void;
  onLongPress?: () => void;
}

export const NoteListItem: React.FC<NoteListItemProps> = ({ nota, onPress, onLongPress }) => {
  // Extract tags (#tag) and backlinks ([[link]])
  const content = nota.conteudo || '';
  const tags = Array.from(new Set(content.match(/#([a-zA-Z0-9_-]+)/g) || [])).slice(0, 3);
  const links = Array.from(new Set(content.match(/\[\[(.*?)\]\]/g) || [])).slice(0, 2);

  // Clean snippet
  const snippet = content
    .replace(/^#+\s+/gm, '') // Remove heading markers
    .replace(/\[\[(.*?)\]\]/g, '$1') // Clean links
    .replace(/#([a-zA-Z0-9_-]+)/g, '$1') // Clean tags
    .trim();

  const formattedDate = new Date(nota.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <FileText size={15} color={colors.foregroundSecondary} strokeWidth={1.8} />
          <Text style={styles.title} numberOfLines={1}>
            {nota.titulo || 'Sem título'}
          </Text>
        </View>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      {snippet ? (
        <Text style={styles.snippet} numberOfLines={2}>
          {snippet}
        </Text>
      ) : null}

      {(tags.length > 0 || links.length > 0) && (
        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Hash size={10} color={colors.cyan} strokeWidth={2} />
              <Text style={styles.tagText}>{tag.replace('#', '')}</Text>
            </View>
          ))}
          {links.map((link) => (
            <View key={link} style={styles.linkBadge}>
              <Link2 size={10} color={colors.primary} strokeWidth={2} />
              <Text style={styles.linkText}>{link.replace(/\[\[|\]\]/g, '')}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    flexShrink: 1,
  },
  date: {
    color: colors.foregroundMuted,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.mono,
  },
  snippet: {
    color: colors.foregroundSecondary,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.xs,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  tagText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '500',
    fontFamily: typography.fontFamily.mono,
  },
  linkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  linkText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '500',
  },
});
