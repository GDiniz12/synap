'use client';

import { useState } from 'react';
import LandingField from './LandingField';
import styles from '@/app/landing.module.css';

type View = 'graph' | 'editor' | 'canvas' | 'flashcards' | 'ai';
const views: { id: View; label: string; file: string }[] = [
  { id: 'graph', label: 'Conectar', file: 'conexoes.graph' },
  { id: 'editor', label: 'Escrever', file: 'uma-ideia.md' },
  { id: 'canvas', label: 'Desenhar', file: 'pensamento.canvas' },
  { id: 'flashcards', label: 'Lembrar', file: 'memoria.cards' },
  { id: 'ai', label: 'Explorar', file: 'tesseract.ai' },
];

export default function LandingPreview() {
  const [activeTab, setActiveTab] = useState<View>('graph');
  // Spaced repetition flashcard preview state
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const current = views.find(view => view.id === activeTab) ?? views[0];

  return <>
    {/* Interactive App Mockup Preview */}
    <div className={styles.desktopScene}>
      <LandingField />
      <span className={styles.sceneCode}>TESSERACT / MIND SYSTEM<br />NOTAS ↔ IDEIAS ↔ CONEXÕES</span>
      {/* File Tree Sidebar */}
      <div className={`${styles.smallWindow} ${styles.filesWindow}`} aria-hidden="true">
        <div className={styles.windowTitle}>meu-universo / arquivos <span>−</span></div>
        <div className={styles.fileList}><span>↳ leituras</span><span>↳ projetos pessoais</span><span>↳ ideias soltas</span><b>↳ tudo se conecta</b><span>↳ o que vem depois?</span></div>
      </div>
      {/* 3. Tab: Canvas */}
      <div className={`${styles.smallWindow} ${styles.canvasWindow}`} aria-hidden="true"><div className={styles.windowTitle}>um-pensamento.canvas <span>×</span></div><div className={styles.miniCanvas}><span>e se…</span><svg viewBox="0 0 200 80" fill="none"><path d="M15 40C70 40 50 10 100 10M15 40C70 40 50 70 100 70M100 10H180M100 70H180" stroke="currentColor" /><circle cx="15" cy="40" r="5" fill="currentColor" /></svg></div></div>
      {/* Window Header / Tab Switcher */}
      <div className={styles.focusWindow}>
        <div className={styles.windowTitle}><span>{current.file}</span>{/* Window Controls */}<span aria-hidden="true">− &nbsp; □ &nbsp; ×</span></div>
        {/* Interactive Screen Preview Container */}
        <div className={styles.windowBody} aria-live="polite">
          {/* 1. Tab: Grafo Neural */}
          {activeTab === 'graph' && <>
            <div className={styles.windowMeta}>UMA IDEIA LEVA A OUTRA <span>6 CONEXÕES</span></div>
            {/* Visual Nodes Simulation with SVGs */}
            <svg className={styles.graph} viewBox="0 0 600 300" fill="none" role="img" aria-label="Grafo conectando notas, projetos, desenhos, leituras e flashcards">
              {/* Edges */}<g stroke="currentColor" opacity=".35"><path d="M300 150 140 65 85 205 300 150 440 60 520 205 300 150 370 265M140 65 440 60M85 205 370 265M440 60 370 265" /></g>
              {/* Nodes */}<g fill="currentColor">{[[140,65],[85,205],[440,60],[520,205],[370,265]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="4" />)}<circle cx="300" cy="150" r="8" /></g><circle cx="300" cy="150" r="35" fill="none" stroke="currentColor" strokeDasharray="2 5" opacity=".4" />
              <g fill="currentColor" fontSize="13" textAnchor="middle"><text x="300" y="205">uma ideia</text><text x="140" y="47">leituras</text><text x="85" y="230">notas</text><text x="440" y="42">projetos</text><text x="520" y="230">desenhos</text><text x="370" y="291">flashcards</text></g>
            </svg>
            {/* Floating Info Pill */}<div className={styles.windowStatus}><span>● CONHECIMENTO EM EXPANSÃO</span><span>[[ conecte as pontas ]]</span></div>
          </>}
          {/* 2. Tab: Editor Markdown */}
          {activeTab === 'editor' && <div className={styles.editorDemo}>
            <div className={styles.windowMeta}>MEU UNIVERSO / IDEIAS / 001</div>
            {/* Editor Surface */}<h3>Uma ideia que vale guardar.</h3><p>As melhores descobertas acontecem quando conectamos coisas que pareciam distantes.</p><p>Uma conversa vira uma <mark>[[ ideia ]]</mark>. Uma leitura encontra um <mark>[[ projeto ]]</mark>. E, aos poucos, tudo começa a fazer sentido.</p><div className={styles.windowStatus}>2 LINKS / INFINITAS POSSIBILIDADES</div>
          </div>}
          {activeTab === 'canvas' && <div className={styles.canvasDemo}><div className={styles.windowMeta}>PENSAMENTO LIVRE / CANVAS</div><svg viewBox="0 0 600 290" fill="none" role="img" aria-label="Desenho de uma ideia conectada a uma nota e um flashcard"><path d="M215 135C260 135 280 65 345 65M215 135C260 135 280 225 345 225" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="135" cy="135" rx="80" ry="48" stroke="currentColor" strokeWidth="1.5"/><rect x="345" y="35" width="175" height="60" stroke="currentColor"/><rect x="345" y="195" width="175" height="60" stroke="currentColor"/><g fill="currentColor" fontSize="18" textAnchor="middle"><text x="135" y="141">e se…</text><text x="432" y="72">uma nota</text><text x="432" y="232">um flashcard</text></g><path d="m330 57 15 8-13 9m-2 142 15 8-13 9" stroke="currentColor"/></svg><span className={styles.windowStatus}>DESENHE O QUE AS PALAVRAS NÃO ALCANÇAM.</span></div>}
          {/* 4. Tab: Flashcards SM-2 */}
          {activeTab === 'flashcards' && <div className={styles.flashDemo}>
            <div className={styles.windowMeta}>REPETIÇÃO ESPAÇADA / EXEMPLO</div>
            <button className={styles.flipCard} onClick={() => { setFlashcardFlipped(!flashcardFlipped); setReviewed(false); }} aria-label={flashcardFlipped ? 'Ocultar resposta' : 'Revelar resposta'}><span>{flashcardFlipped ? 'RESPOSTA / 001' : 'PERGUNTA / 001'}</span><strong>{flashcardFlipped ? 'Revisitar uma ideia em intervalos ajuda a mantê-la na memória.' : 'Como fazer uma ideia ficar?'}</strong><small>{flashcardFlipped ? 'Clique para voltar à pergunta ↩' : 'Clique para descobrir ↗'}</small></button>
            {/* SM-2 Rating Buttons Preview */}{flashcardFlipped && <div className={styles.reviewButtons}>{['Repetir', 'Difícil', 'Bom', 'Fácil'].map(label => <button key={label} onClick={() => { setReviewed(true); setFlashcardFlipped(false); }}>{label}</button>)}</div>}
            {reviewed && <p className={styles.reviewFeedback}>Revisão de exemplo concluída. Sua memória agradece.</p>}
          </div>}
          {/* 5. Tab: Tesseract AI */}
          {activeTab === 'ai' && <div className={styles.aiDemo}><div className={styles.windowMeta}>TESSERACT AI / CONVERSA DE EXEMPLO</div>
            {/* Chat Messages Mockup */}{/* User message */}<p className={styles.aiQuestion}>Como essas ideias se conectam?</p>
            {/* AI message */}<div className={styles.aiAnswer}><span>↳ TESSERACT AI</span><p>Você anotou que aprender é criar conexões. Seus flashcards ajudam a revisitar essas conexões, enquanto o canvas permite enxergá-las de outra forma.</p><p>Que tal transformar essa descoberta em uma nova nota?</p></div>
            {/* Input Bar Mockup */}<div className={styles.windowStatus}>SUAS NOTAS COMO PONTO DE PARTIDA.</div>
          </div>}
        </div>
      </div>
      <div className={`${styles.smallWindow} ${styles.memoryWindow}`} aria-hidden="true"><div className={styles.windowTitle}>lembrete.txt <span>×</span></div><p>Não deixe uma<br />boa ideia<br /><em>escapar.</em></p><span>CAPTURE AGORA. CONECTE DEPOIS.</span></div>
      <div className={styles.sceneFooter}><span>FIG. 01 / UM SEGUNDO CÉREBRO EM MOVIMENTO</span><span>CLIQUE PARA EXPLORAR ↓</span></div>
    </div>
    {/* View Switcher Tabs */}
    <div className={styles.viewSwitcher} aria-label="Visões da demonstração">{views.map((view, index) => <button key={view.id} onClick={() => setActiveTab(view.id)} aria-pressed={activeTab === view.id}><span>0{index + 1}</span>{view.label}<span aria-hidden="true">{activeTab === view.id ? '↗' : '+'}</span></button>)}</div>
  </>;
}
