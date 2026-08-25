'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt-BR' | 'en-US';

export const translations = {
  'pt-BR': {
    // Top Bar & Tabs
    untitled: 'Sem Título',
    untitled_drawing: 'Novo Desenho',
    new_note: 'Nova Nota',
    new_drawing: 'Novo Desenho',
    graph: 'Grafo',
    drawing: 'Desenho',
    flashcards: 'Flashcards',
    saving: 'Salvando...',
    saved: 'Salvo',
    close_tab: 'Fechar aba',
    empty_workspace_select: 'Selecione uma nota na barra lateral ou crie uma nova.',
    workspace_empty: 'Workspace vazio. Crie uma nota ou pasta acima.',

    // Sidebar
    search_placeholder: 'Buscar no workspace...',
    root_folder: 'Raiz',
    empty_folder: 'Pasta vazia',
    settings: 'Configurações',
    logout: 'Sair da Conta',
    rename: 'Renomear',
    delete: 'Excluir',
    new_subfolder: 'Nova Subpasta',
    new_note_in_folder: 'Nova Nota aqui',

    // Delete Modal
    delete_modal_title: 'Excluir',
    delete_folder: 'Pasta',
    delete_note: 'Nota',
    delete_confirm_msg: 'Tem certeza de que deseja excluir',
    delete_folder_warning: 'Todas as subpastas e notas contidas nela também serão excluídas permanentemente.',
    delete_note_warning: 'Esta ação não poderá ser desfeita.',
    cancel: 'Cancelar',

    // Settings Modal
    settings_title: 'Configurações',
    tab_account: 'Conta & Perfil',
    tab_general: 'Geral & Idioma',
    tab_appearance: 'Aparência & Tema',
    tab_editor: 'Editor & Escrita',
    tab_shortcuts: 'Atalhos & Comandos',
    tab_backup: 'Dados & Backup',
    tab_danger: 'Danger Zone',

    desc_account: 'Gerencie suas credenciais e detalhes de usuário.',
    desc_general: 'Personalize o idioma e o comportamento do Synap.',
    desc_appearance: 'Customizações visuais, tema e tipografia.',
    desc_editor: 'Configure como o editor de notas se comporta.',
    desc_shortcuts: 'Lista completa de todos os atalhos rápidos disponíveis.',
    desc_backup: 'Exportação, importação e controle de dados locais.',
    desc_danger: 'Ações irreversíveis e exclusão definitiva de workspaces.',

    // Danger Zone
    delete_workspace_title: 'Excluir Workspaces',
    delete_workspace_desc: 'Excluir uma workspace apagará permanentemente todas as suas pastas, notas, flashcards e desenhos associados. Esta ação não poderá ser desfeita.',
    delete_workspace_btn: 'Excluir Workspace',
    delete_workspace_confirm: 'Tem certeza absoluta de que deseja excluir a workspace',
    workspace_deleted_success: 'Workspace excluída com sucesso!',
    no_workspaces_to_delete: 'Nenhuma workspace encontrada.',

    // General tab
    interface_language: 'Idioma da Interface',
    interface_language_desc: 'Escolha o idioma padrão exibido nos menus e controles.',
    on_open_workspace: 'Ao Abrir o Workspace',
    on_open_workspace_desc: 'Defina o que será exibido automaticamente ao entrar no workspace.',
    reopen_last_note: 'Reabrir última nota visitada',
    open_empty_screen: 'Abrir tela em branco',
    lang_pt: 'Português (Brasil) 🇧🇷',
    lang_en: 'English (United States) 🇺🇸',

    // Account tab
    full_name: 'Nome Completo',
    email: 'E-mail',
    new_password: 'Nova Senha (opcional)',
    new_password_placeholder: 'Deixe em branco para manter a atual...',
    save_changes: 'Salvar Alterações',
    saving_btn: 'Salvando...',
    profile_updated: 'Perfil atualizado com sucesso!',

    // Backup tab
    export_md_title: 'Exportação de Notas em Markdown (.md)',
    export_md_desc: 'Exporte todas as notas do seu workspace em formato Markdown puro.',
    export_btn: 'Exportar Notas (.md)',
    exporting_btn: 'Exportando notas...',
    workspace_stats: 'Estatísticas do Workspace',
    total_notes: 'Total de Notas',
    drawings_count: 'Desenhos',

    // Editor placeholders
    editor_placeholder: "Digite '/' para comandos, '[[' para notas ou '::' para cards...",
  },
  'en-US': {
    // Top Bar & Tabs
    untitled: 'Untitled',
    untitled_drawing: 'New Drawing',
    new_note: 'New Note',
    new_drawing: 'New Drawing',
    graph: 'Graph',
    drawing: 'Drawing',
    flashcards: 'Flashcards',
    saving: 'Saving...',
    saved: 'Saved',
    close_tab: 'Close tab',
    empty_workspace_select: 'Select a note from the sidebar or create a new one.',
    workspace_empty: 'Workspace is empty. Create a note or folder above.',

    // Sidebar
    search_placeholder: 'Search in workspace...',
    root_folder: 'Root',
    empty_folder: 'Empty folder',
    settings: 'Settings',
    logout: 'Log Out',
    rename: 'Rename',
    delete: 'Delete',
    new_subfolder: 'New Subfolder',
    new_note_in_folder: 'New Note here',

    // Delete Modal
    delete_modal_title: 'Delete',
    delete_folder: 'Folder',
    delete_note: 'Note',
    delete_confirm_msg: 'Are you sure you want to delete',
    delete_folder_warning: 'All subfolders and notes inside it will also be permanently deleted.',
    delete_note_warning: 'This action cannot be undone.',
    cancel: 'Cancel',

    // Settings Modal
    settings_title: 'Settings',
    tab_account: 'Account & Profile',
    tab_general: 'General & Language',
    tab_appearance: 'Appearance & Theme',
    tab_editor: 'Editor & Writing',
    tab_shortcuts: 'Shortcuts & Commands',
    tab_backup: 'Data & Backup',
    tab_danger: 'Danger Zone',

    desc_account: 'Manage your credentials and user details.',
    desc_general: 'Customize language and Synap startup behavior.',
    desc_appearance: 'Visual customization, theme, and typography.',
    desc_editor: 'Configure editor behavior and writing layout.',
    desc_shortcuts: 'Complete list of all available keyboard shortcuts.',
    desc_backup: 'Data export, import, and local storage statistics.',
    desc_danger: 'Irreversible actions and permanent workspace deletion.',

    // Danger Zone
    delete_workspace_title: 'Delete Workspaces',
    delete_workspace_desc: 'Deleting a workspace will permanently destroy all its folders, notes, flashcards, and drawings. This action cannot be undone.',
    delete_workspace_btn: 'Delete Workspace',
    delete_workspace_confirm: 'Are you absolutely sure you want to delete workspace',
    workspace_deleted_success: 'Workspace deleted successfully!',
    no_workspaces_to_delete: 'No workspaces found.',

    // General tab
    interface_language: 'Interface Language',
    interface_language_desc: 'Choose the default language for menus and UI controls.',
    on_open_workspace: 'On Workspace Startup',
    on_open_workspace_desc: 'Choose what opens automatically when loading the workspace.',
    reopen_last_note: 'Reopen last visited note',
    open_empty_screen: 'Open blank screen',
    lang_pt: 'Português (Brasil) 🇧🇷',
    lang_en: 'English (United States) 🇺🇸',

    // Account tab
    full_name: 'Full Name',
    email: 'Email',
    new_password: 'New Password (optional)',
    new_password_placeholder: 'Leave blank to keep current...',
    save_changes: 'Save Changes',
    saving_btn: 'Saving...',
    profile_updated: 'Profile updated successfully!',

    // Backup tab
    export_md_title: 'Export Notes in Markdown (.md)',
    export_md_desc: 'Export all notes in your workspace to clean Markdown files.',
    export_btn: 'Export Notes (.md)',
    exporting_btn: 'Exporting notes...',
    workspace_stats: 'Workspace Statistics',
    total_notes: 'Total Notes',
    drawings_count: 'Drawings',

    // Editor placeholders
    editor_placeholder: "Type '/' for commands, '[[' for notes or '::' for cards...",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['pt-BR']) => string;
}

export const I18nContext = createContext<I18nContextType>({
  language: 'pt-BR',
  setLanguage: () => {},
  t: (key) => translations['pt-BR'][key] || key,
});

export const useI18n = () => useContext(I18nContext);
