export interface User {
  id: string;
  email: string;
  name?: string | null;
  preferences?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  nome: string;
  userId: string;
  isCollaborative: boolean;
  graphConfig?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Pasta {
  id: string;
  nome: string;
  workspaceId: string;
  parentId?: string | null;
  subpastas?: Pasta[];
  notas?: Nota[];
  createdAt: string;
  updatedAt: string;
}

export interface Nota {
  id: string;
  titulo: string;
  conteudo: string | null;
  tipo: string; // 'texto' | 'desenho' | 'audio'
  workspaceId: string;
  pastaId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  nome: string;
  descricao?: string | null;
  workspaceId: string;
  flashcards?: Flashcard[];
  _count?: {
    flashcards: number;
  };
  dueCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  frente: string;
  verso: string;
  tipo: string; // 'card' | 'nota'
  deckId: string;
  notaId?: string | null;
  reps: number;
  interval: number;
  easeFactor: number;
  proximaRevisao: string;
  ultimaRevisao?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface GraphNode {
  id: string;
  label: string;
  type: 'nota' | 'tag' | 'card';
  notaId?: string;
  connectionsCount: number;
  color?: string;
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
