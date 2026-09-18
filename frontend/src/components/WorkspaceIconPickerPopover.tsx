'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';

export interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
  category: string;
}

export const EMOJI_CATALOG: EmojiItem[] = [
  // Destaques & Mais Usados
  { emoji: '🚀', name: 'Foguete', keywords: ['foguete', 'rocket', 'start', 'lancamento', 'startup'], category: 'Destaques' },
  { emoji: '💡', name: 'Lâmpada', keywords: ['lampada', 'light', 'ideia', 'idea', 'pensamento'], category: 'Destaques' },
  { emoji: '🧠', name: 'Cérebro', keywords: ['cerebro', 'brain', 'mente', 'pensar', 'synap', 'inteligencia'], category: 'Destaques' },
  { emoji: '⚡', name: 'Raio', keywords: ['raio', 'lightning', 'energia', 'rapido', 'fast'], category: 'Destaques' },
  { emoji: '🎯', name: 'Alvo', keywords: ['alvo', 'target', 'foco', 'meta', 'goal', 'objetivo'], category: 'Destaques' },
  { emoji: '🔥', name: 'Fogo', keywords: ['fogo', 'fire', 'tendencia', 'quente', 'hot'], category: 'Destaques' },
  { emoji: '✨', name: 'Brilho', keywords: ['brilho', 'sparkles', 'magia', 'novo', 'clean'], category: 'Destaques' },
  { emoji: '🌟', name: 'Estrela', keywords: ['estrela', 'star', 'favorito', 'destaque'], category: 'Destaques' },
  { emoji: '📌', name: 'Pin', keywords: ['pin', 'fixar', 'tachinha', 'importante'], category: 'Destaques' },
  { emoji: '🏆', name: 'Troféu', keywords: ['trofeu', 'trophy', 'premio', 'vitoria', 'conquista'], category: 'Destaques' },
  { emoji: '💎', name: 'Diamante', keywords: ['diamante', 'diamond', 'joia', 'precioso', 'gem'], category: 'Destaques' },
  { emoji: '🔮', name: 'Bola de Cristal', keywords: ['cristal', 'magic', 'magia', 'futuro'], category: 'Destaques' },

  // Estudo & Ideias
  { emoji: '📚', name: 'Livros', keywords: ['livros', 'books', 'estudo', 'leitura', 'pesquisa'], category: 'Estudo' },
  { emoji: '📖', name: 'Livro Aberto', keywords: ['livro', 'book', 'ler', 'estudar', 'notas'], category: 'Estudo' },
  { emoji: '📝', name: 'Anotações', keywords: ['anotacoes', 'notes', 'bloco', 'escrever', 'memo'], category: 'Estudo' },
  { emoji: '🎓', name: 'Formatura', keywords: ['formatura', 'chapeu', 'faculdade', 'universidade', 'academico'], category: 'Estudo' },
  { emoji: '🔬', name: 'Microscópio', keywords: ['microscopio', 'ciencia', 'science', 'laboratorio', 'pesquisa'], category: 'Estudo' },
  { emoji: '🧪', name: 'Tubo de Ensaio', keywords: ['quimica', 'quimico', 'experimento', 'teste'], category: 'Estudo' },
  { emoji: '📐', name: 'Esquadro', keywords: ['esquadro', 'regua', 'geometria', 'matematica', 'calculo'], category: 'Estudo' },
  { emoji: '🔭', name: 'Telescópio', keywords: ['telescopio', 'astronomia', 'explorar', 'olhar'], category: 'Estudo' },
  { emoji: '🎨', name: 'Paleta de Arte', keywords: ['arte', 'desenho', 'pintura', 'design', 'cores'], category: 'Estudo' },
  { emoji: '🏛️', name: 'Museu / Academia', keywords: ['museu', 'coluna', 'historia', 'direito', 'instituto'], category: 'Estudo' },
  { emoji: '🧩', name: 'Quebra-cabeça', keywords: ['puzzle', 'peca', 'solucao', 'problema', 'logica'], category: 'Estudo' },
  { emoji: '📊', name: 'Gráfico', keywords: ['grafico', 'chart', 'estatistica', 'dados', 'analytics'], category: 'Estudo' },
  { emoji: '🖋️', name: 'Caneta Tinteiro', keywords: ['caneta', 'pen', 'escrita', 'redacao', 'autor'], category: 'Estudo' },
  { emoji: '📜', name: 'Pergaminho', keywords: ['pergaminho', 'scroll', 'documento', 'antigo', 'historia'], category: 'Estudo' },
  { emoji: '🎒', name: 'Mochila', keywords: ['mochila', 'backpack', 'escola', 'estudante', 'viagem'], category: 'Estudo' },

  // Tech & Código
  { emoji: '💻', name: 'Notebook', keywords: ['computador', 'laptop', 'codigo', 'programacao', 'dev'], category: 'Tecnologia' },
  { emoji: '🖥️', name: 'Desktop', keywords: ['desktop', 'monitor', 'pc', 'computacao'], category: 'Tecnologia' },
  { emoji: '⚙️', name: 'Engrenagem', keywords: ['engrenagem', 'configuracao', 'settings', 'sistema', 'mecanismo'], category: 'Tecnologia' },
  { emoji: '🛠️', name: 'Ferramentas', keywords: ['ferramentas', 'tools', 'conserto', 'construcao', 'build'], category: 'Tecnologia' },
  { emoji: '💾', name: 'Disquete', keywords: ['disquete', 'salvar', 'save', 'storage', 'retro'], category: 'Tecnologia' },
  { emoji: '📱', name: 'Smartphone', keywords: ['celular', 'mobile', 'app', 'telefone'], category: 'Tecnologia' },
  { emoji: '🌐', name: 'Globo Web', keywords: ['web', 'internet', 'globo', 'rede', 'online'], category: 'Tecnologia' },
  { emoji: '🔒', name: 'Cadeado', keywords: ['cadeado', 'seguranca', 'privacidade', 'lock', 'crypto'], category: 'Tecnologia' },
  { emoji: '🤖', name: 'Robô', keywords: ['robo', 'robot', 'ia', 'ai', 'automacao', 'bot'], category: 'Tecnologia' },
  { emoji: '📡', name: 'Antena', keywords: ['antena', 'sinal', 'comunicacao', 'radar', 'satelite'], category: 'Tecnologia' },
  { emoji: '🔋', name: 'Bateria', keywords: ['bateria', 'power', 'energia', 'carga'], category: 'Tecnologia' },
  { emoji: '⌨️', name: 'Teclado', keywords: ['teclado', 'keyboard', 'digitar', 'escrever'], category: 'Tecnologia' },
  { emoji: '🕹️', name: 'Joystick', keywords: ['joystick', 'game', 'jogo', 'games', 'play'], category: 'Tecnologia' },
  { emoji: '🔌', name: 'Plugue', keywords: ['plug', 'tomada', 'conexao', 'connect'], category: 'Tecnologia' },
  { emoji: '📦', name: 'Pacote', keywords: ['pacote', 'package', 'box', 'modulo', 'entrega'], category: 'Tecnologia' },

  // Símbolos & Cores
  { emoji: '🟢', name: 'Círculo Verde', keywords: ['verde', 'green', 'status', 'ativo', 'online'], category: 'Símbolos' },
  { emoji: '🔵', name: 'Círculo Azul', keywords: ['azul', 'blue', 'circulo', 'cor'], category: 'Símbolos' },
  { emoji: '🟣', name: 'Círculo Roxo', keywords: ['roxo', 'purple', 'violeta'], category: 'Símbolos' },
  { emoji: '🔴', name: 'Círculo Vermelho', keywords: ['vermelho', 'red', 'alerta', 'urgente'], category: 'Símbolos' },
  { emoji: '🟡', name: 'Círculo Amarelo', keywords: ['amarelo', 'yellow', 'atencao'], category: 'Símbolos' },
  { emoji: '⚪', name: 'Círculo Branco', keywords: ['branco', 'white', 'neutro'], category: 'Símbolos' },
  { emoji: '⚫', name: 'Círculo Preto', keywords: ['preto', 'black', 'escuro', 'dark'], category: 'Símbolos' },
  { emoji: '🔶', name: 'Losango Laranja', keywords: ['losango', 'laranja', 'diamante', 'cor'], category: 'Símbolos' },
  { emoji: '🔷', name: 'Losango Azul', keywords: ['losango', 'azul', 'geometria'], category: 'Símbolos' },
  { emoji: '🧭', name: 'Bússola', keywords: ['bussola', 'compass', 'direcao', 'norte', 'orientacao'], category: 'Símbolos' },
  { emoji: '🏷️', name: 'Etiqueta', keywords: ['etiqueta', 'tag', 'categoria', 'label'], category: 'Símbolos' },
  { emoji: '⚓', name: 'Âncora', keywords: ['ancora', 'anchor', 'porto', 'firme'], category: 'Símbolos' },
  { emoji: '⏳', name: 'Ampulheta', keywords: ['ampulheta', 'tempo', 'time', 'espera', 'relogio'], category: 'Símbolos' },
  { emoji: '🛡️', name: 'Escudo', keywords: ['escudo', 'shield', 'protecao', 'defesa'], category: 'Símbolos' },
  { emoji: '🔑', name: 'Chave', keywords: ['chave', 'key', 'acesso', 'segredo', 'abrir'], category: 'Símbolos' },

  // Natureza & Cosmos
  { emoji: '🌿', name: 'Ramo', keywords: ['planta', 'folha', 'natureza', 'verde', 'herb'], category: 'Natureza' },
  { emoji: '🌱', name: 'Broto', keywords: ['broto', 'muda', 'crescimento', 'inicio', 'seedling'], category: 'Natureza' },
  { emoji: '🌲', name: 'Árvore', keywords: ['arvore', 'tree', 'pinheiro', 'floresta'], category: 'Natureza' },
  { emoji: '☀️', name: 'Sol', keywords: ['sol', 'sun', 'dia', 'manha', 'luz'], category: 'Natureza' },
  { emoji: '🌙', name: 'Lua', keywords: ['lua', 'moon', 'noite', 'dark', 'crescente'], category: 'Natureza' },
  { emoji: '🪐', name: 'Planeta', keywords: ['planeta', 'saturno', 'espaco', 'universo', 'cosmos'], category: 'Natureza' },
  { emoji: '🌌', name: 'Via Láctea', keywords: ['galaxia', 'cosmos', 'espaco', 'estrelas'], category: 'Natureza' },
  { emoji: '🌊', name: 'Onda', keywords: ['onda', 'mar', 'oceano', 'agua', 'wave'], category: 'Natureza' },
  { emoji: '⛰️', name: 'Montanha', keywords: ['montanha', 'pico', 'escalar', 'rocha'], category: 'Natureza' },
  { emoji: '🌋', name: 'Vulcão', keywords: ['vulcao', 'lava', 'erupcao', 'fogo'], category: 'Natureza' },
  { emoji: '🍀', name: 'Trevo', keywords: ['trevo', 'sorte', 'clover', 'quatro folhas'], category: 'Natureza' },
  { emoji: '🌈', name: 'Arco-íris', keywords: ['arco-iris', 'rainbow', 'cores', 'colorido'], category: 'Natureza' },
  { emoji: '🌸', name: 'Flor de Cerejeira', keywords: ['flor', 'sakura', 'rosa', 'primavera'], category: 'Natureza' },

  // Rostos & Criatividade
  { emoji: '🙂', name: 'Sorriso Leve', keywords: ['sorriso', 'smile', 'feliz', 'amigavel'], category: 'Rostos' },
  { emoji: '😎', name: 'Óculos Escuros', keywords: ['oculos', 'cool', 'estilo', 'legal'], category: 'Rostos' },
  { emoji: '🤔', name: 'Pensativo', keywords: ['pensando', 'duvida', 'ideia', 'reflexao'], category: 'Rostos' },
  { emoji: '🧐', name: 'Monóculo', keywords: ['monoculo', 'analise', 'examinar', 'curioso'], category: 'Rostos' },
  { emoji: '🤓', name: 'Nerd', keywords: ['nerd', 'geek', 'inteligente', 'estudo'], category: 'Rostos' },
  { emoji: '👾', name: 'Monstro Alien', keywords: ['alien', 'pixel', 'retro', 'game', 'arcade'], category: 'Rostos' },
  { emoji: '👻', name: 'Fantasma', keywords: ['fantasma', 'ghost', 'espirito', 'misterio'], category: 'Rostos' },
  { emoji: '🧑‍💻', name: 'Desenvolvedor', keywords: ['programador', 'dev', 'coder', 'developer', 'ti'], category: 'Rostos' },
  { emoji: '🧙', name: 'Mago', keywords: ['mago', 'wizard', 'magia', 'feiticeiro'], category: 'Rostos' },
  { emoji: '🦸', name: 'Herói', keywords: ['heroi', 'superheroi', 'hero', 'poder'], category: 'Rostos' },
  { emoji: '🤝', name: 'Aperto de Mãos', keywords: ['aperto', 'maos', 'parceria', 'acordo', 'colaboracao'], category: 'Rostos' },
];

export const CATEGORIES = ['Todos', 'Destaques', 'Estudo', 'Tecnologia', 'Símbolos', 'Natureza', 'Rostos'] as const;

interface WorkspaceIconPickerPopoverProps {
  currentIcon?: string | null;
  onSelectEmoji: (emoji: string) => void;
  onSelectImageUrl?: (url: string) => void;
  onTriggerFileUpload?: () => void;
  onRemoveIcon?: () => void;
  onClose: () => void;
  anchorPosition?: 'bottom' | 'right';
}

export default function WorkspaceIconPickerPopover({
  currentIcon,
  onSelectEmoji,
  onSelectImageUrl,
  onTriggerFileUpload,
  onRemoveIcon,
  onClose,
  anchorPosition = 'bottom',
}: WorkspaceIconPickerPopoverProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'foto'>('emoji');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [customUrl, setCustomUrl] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape or Outside Click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Filter emojis based on search and category
  const filteredEmojis = useMemo(() => {
    const s = search.trim().toLowerCase();
    return EMOJI_CATALOG.filter((item) => {
      const matchesCategory =
        selectedCategory === 'Todos' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!s) return true;
      return (
        item.name.toLowerCase().includes(s) ||
        item.emoji === s ||
        item.keywords.some((kw) => kw.toLowerCase().includes(s))
      );
    });
  }, [search, selectedCategory]);

  const handlePickRandom = () => {
    const randomIndex = Math.floor(Math.random() * EMOJI_CATALOG.length);
    const chosen = EMOJI_CATALOG[randomIndex].emoji;
    onSelectEmoji(chosen);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim() && onSelectImageUrl) {
      onSelectImageUrl(customUrl.trim());
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className={`absolute z-[1100] w-[340px] bg-[#181818] border border-white/10 rounded-none shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 select-none font-sansation ${
        anchorPosition === 'bottom'
          ? 'top-full mt-2 left-1/2 -translate-x-1/2'
          : 'left-full ml-3 top-0'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Tabs: Emoji | Foto */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1 border-b border-white/10 bg-[#141414]">
        <div className="flex items-center gap-1">
          {/* Emoji Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('emoji')}
            className={`px-3 py-1.5 rounded-none text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-none ${
              activeTab === 'emoji'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <span>Emoji</span>
          </button>

          {/* Foto Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('foto')}
            className={`px-3 py-1.5 rounded-none text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-none ${
              activeTab === 'foto'
                ? 'bg-white text-black font-bold'
                : 'text-zinc-400 hover:text-white bg-transparent'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="0" ry="0" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Foto / Upload</span>
          </button>
        </div>

        {/* Random Emoji Button (shown on Emoji tab) */}
        {activeTab === 'emoji' && (
          <button
            type="button"
            onClick={handlePickRandom}
            title="Sortear um emoji aleatório"
            className="px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-none transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Aleatório</span>
          </button>
        )}
      </div>

      {/* CONTENT: TAB EMOJI */}
      {activeTab === 'emoji' && (
        <div className="flex flex-col p-3 gap-2.5">
          {/* Search bar */}
          <div className="relative flex items-center">
            <svg
              className="absolute left-2.5 text-zinc-500 pointer-events-none"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar emoji (ex: foguete, livro, código)..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-none outline-none transition-colors"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 text-zinc-500 hover:text-white text-xs cursor-pointer border-none bg-transparent p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips (horizontal scroll) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 text-[11px] rounded-none shrink-0 transition-colors cursor-pointer border-none ${
                  selectedCategory === cat
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="h-[210px] overflow-y-auto pr-1 grid grid-cols-6 gap-1 auto-rows-max custom-scrollbar">
            {filteredEmojis.length > 0 ? (
              filteredEmojis.map((item) => {
                const isSelected = currentIcon === item.emoji;
                return (
                  <button
                    key={`${item.emoji}-${item.name}`}
                    type="button"
                    onClick={() => {
                      onSelectEmoji(item.emoji);
                      onClose();
                    }}
                    title={item.name}
                    className={`h-11 flex items-center justify-center text-xl rounded-none transition-all cursor-pointer border-none ${
                      isSelected
                        ? 'bg-white/15 ring-1 ring-white scale-105'
                        : 'hover:bg-white/10 hover:scale-110 active:scale-95 bg-transparent'
                    }`}
                  >
                    <span>{item.emoji}</span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-6 flex flex-col items-center justify-center py-8 text-zinc-500 text-xs">
                <span>Nenhum emoji encontrado</span>
                <span className="text-[10px] mt-1 text-zinc-600">Tente outro termo de busca</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENT: TAB FOTO */}
      {activeTab === 'foto' && (
        <div className="flex flex-col p-4 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-white">Arquivo do Computador</span>
            <button
              type="button"
              onClick={() => {
                if (onTriggerFileUpload) {
                  onTriggerFileUpload();
                }
              }}
              className="w-full h-8 px-3 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Escolher arquivo de imagem</span>
            </button>
            <span className="text-[10px] text-zinc-500 text-center">
              Formatos suportados: PNG, JPG, WEBP, GIF
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[10px] text-zinc-500 uppercase font-mono">OU</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          <form onSubmit={handleApplyUrl} className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-white">URL da Imagem</span>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://exemplo.com/icone.png"
                className="flex-1 h-8 px-2.5 text-xs bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-none outline-none"
              />
              <button
                type="submit"
                disabled={!customUrl.trim()}
                className="h-8 px-3 text-xs font-bold bg-white text-black hover:bg-zinc-200 rounded-none disabled:opacity-50 transition-colors cursor-pointer border-none shrink-0"
              >
                Aplicar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Footer: Remover Ícone */}
      {currentIcon && (
        <div className="p-2 border-t border-white/10 bg-[#141414] flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (onRemoveIcon) {
                onRemoveIcon();
              }
              onClose();
            }}
            className="px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-none transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Remover ícone</span>
          </button>
        </div>
      )}
    </div>
  );
}
