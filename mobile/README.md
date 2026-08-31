# Synap Mobile 📱⚡

Aplicativo móvel oficial do **Synap** construído em **React Native + Expo**, seguindo rigorosamente a identidade visual e os princípios de design do ecossistema Geist / Vercel (modo escuro de alto contraste, tipografia técnica, sem emojis coloridos, ícones vetoriais monocromáticos Lucide).

---

## ✨ Funcionalidades Principais

- **📝 Notas & Quick Capture**:
  - Criação instantânea de notas e pensamentos.
  - Busca ágil em tempo real por título, conteúdo, `[[backlinks]]` e `#tags`.
  - Filtro interativo por tags.
- **✍️ Editor Markdown Otimizado para Mobile**:
  - Barra de acessórios de formatação rápida sobre o teclado (`#`, `##`, `**negrito**`, `*itálico*`, `[[link]]`, `- [ ] checklist`, `código`, `citação`).
  - Auto-salvamento com debounce (700ms) e indicador visual de estado.
  - Modo de visualização/leitura Markdown com marcação de checkboxes.
  - Métricas de palavras e caracteres em tempo real.
- **🧠 Flashcards & Repetição Espaçada (SM-2)**:
  - Organização em Decks por área de conhecimento.
  - Cartões com animação 3D de flip tátil.
  - Algoritmo de repetição espaçada SM-2 com botões de avaliação (*Errei*, *Difícil*, *Bom*, *Fácil*) recalculando o intervalo ideal.
  - Contagem de cartões pendentes de revisão hoje.
- **🕸️ Grafo Interativo de Conexões**:
  - Visualização gráfica das notas e tags conectadas via simulação de física D3.js acelerada por hardware.
  - Suporte a pinch-to-zoom, arrasto e toque em nós para abrir diretamente a nota.
- **🏢 Workspaces & Sincronização**:
  - Seletor rápido de workspaces (pessoal e colaborativo).
  - Cache local inteligente (`AsyncStorage` + `SecureStore`) para inicialização instantânea e tolerância a falhas de rede.
  - Configuração dinâmica de URL da API backend (ambiente local ou produção).

---

## 🚀 Como Executar

### 1. Iniciar o Servidor Expo

A partir da raiz do repositório:
```bash
npm run dev:mobile
```
Ou dentro da pasta `mobile/`:
```bash
npm start
```

### 2. Rodar no Celular (Dispositivo Físico)
1. Instale o app **Expo Go** no seu celular ([Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [App Store](https://apps.apple.com/app/expo-go/id982107779)).
2. Escaneie o QR Code exibido no terminal.
3. Certifique-se de que o celular e o computador estão na mesma rede Wi-Fi.

### 3. Rodar em Emuladores
- **Android**: Pressione `a` no terminal ou rode `npm run android:mobile`
- **iOS Simulator (macOS)**: Pressione `i` no terminal ou rode `npm run ios:mobile`

---

## 🔧 Configuração da API Backend

Por padrão, o app conecta na URL de produção do Synap. Para apontar para o seu backend local durante o desenvolvimento:
1. Abra a tela de login ou a aba **Ajustes**.
2. Clique em **Configurar servidor backend** / **Alterar Servidor**.
3. Insira o IP da sua máquina na rede local, por exemplo:
   - Emulador Android: `http://10.0.2.2:3000/api`
   - Dispositivo físico / iOS Simulator: `http://192.168.x.x:3000/api`

---

## 🏗️ Estrutura do Projeto

```
mobile/
├── assets/                  # Ícones e splash screen
├── src/
│   ├── components/
│   │   ├── common/          # Header, Button, Input, Card, EmptyState, WorkspaceSelector
│   │   ├── flashcards/      # FlashcardCard (3D flip), DeckListItem
│   │   ├── graph/           # GraphWebView (Canvas / D3 mobile)
│   │   └── notes/           # NoteListItem, MarkdownEditorToolbar
│   ├── context/
│   │   ├── AuthContext.tsx  # Sessão JWT e usuário
│   │   └── WorkspaceContext.tsx # Notas, decks, flashcards e sincronização
│   ├── navigation/
│   │   └── AppNavigator.tsx # Bottom Tabs + Stack Navigator
│   ├── screens/
│   │   ├── AuthScreen.tsx
│   │   ├── FlashcardsScreen.tsx
│   │   ├── FlashcardStudyScreen.tsx
│   │   ├── GraphScreen.tsx
│   │   ├── NoteEditorScreen.tsx
│   │   ├── NotesScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/
│   │   ├── api.ts           # Cliente HTTP com auto-retry
│   │   └── storage.ts       # SecureStore + AsyncStorage cache
│   ├── theme/
│   │   └── tokens.ts        # Design tokens Geist (Cores, Tipografia, Espaçamento)
│   ├── types/
│   │   └── index.ts         # Tipos TypeScript
│   └── App.tsx              # Root Provider
├── app.json                 # Configuração do Expo
├── package.json
└── tsconfig.json
```
