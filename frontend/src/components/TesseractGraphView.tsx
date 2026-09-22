'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Edges, Html, Line, OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { marked } from 'marked';
import { extractGraphLinks } from '@/lib/graphLinks';
import { cubeSize, frameExtent, layoutCubes, readPositions, CubePositions, Point3 } from '@/lib/tesseractLayout';
import { GraphGroup, matchNoteToGroup } from './GraphView';
import GraphDrawingPreview from './GraphDrawingPreview';
import { useTheme } from './ThemeProvider';

interface NoteItem {
  id: string;
  titulo?: string;
  conteudo?: string;
  pastaId?: string | null;
  tipo?: string;
}
interface Folder { id: string; nome: string; color?: string; cor?: string }
const EMPTY_FOLDERS: Folder[] = [];
interface Workspace { id: string; graphConfig?: { groups?: GraphGroup[] } | null }
interface Props {
  notas: NoteItem[];
  pastas?: Folder[];
  activeWorkspace?: Workspace;
  onOpenNota: (nota: NoteItem) => void;
}
interface GraphNode { note: NoteItem; id: string; size: number; text: string; color: string }

function visibleText(note: NoteItem): string {
  if (note.tipo === 'desenho' || !note.conteudo || typeof DOMParser === 'undefined') return '';
  const html = marked.parse(note.conteudo, { async: false });
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, img, svg, canvas, video, audio, iframe, template, [hidden], [aria-hidden="true"]').forEach(el => el.remove());
  doc.querySelectorAll('br, p, div, li, h1, h2, h3, h4, h5, h6, tr').forEach(el => el.append(' '));
  return (doc.body.textContent || '').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\s+/g, ' ').trim();
}

function TesseractFrame({ extent, color }: { extent: number; color: string }) {
  const segments = useMemo(() => {
    const vertices: Point3[] = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) vertices.push([x * extent, y * extent, z * extent]);
    const points: Point3[] = [];
    for (const scale of [1, 0.48]) {
      vertices.forEach((a, i) => vertices.forEach((b, j) => {
        if (j > i && a.filter((v, axis) => v !== b[axis]).length === 1) {
          points.push([a[0] * scale, a[1] * scale, a[2] * scale], [b[0] * scale, b[1] * scale, b[2] * scale]);
        }
      }));
    }
    vertices.forEach(p => points.push(p, [p[0] * 0.48, p[1] * 0.48, p[2] * 0.48]));
    return points;
  }, [extent]);
  return <Line points={segments} segments color={color} lineWidth={1} transparent opacity={0.28} raycast={() => null} />;
}

function Synapse({ start, end, color, highlighted, dimmed, phase, reducedMotion }: {
  start: Point3; end: Point3; color: string; highlighted: boolean; dimmed: boolean; phase: number; reducedMotion: boolean;
}) {
  const forward = useRef<THREE.Mesh>(null);
  const backward = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = (clock.elapsedTime / (5 + phase * 3) + phase) % 1;
    const move = (mesh: THREE.Mesh | null, progress: number) => mesh?.position.set(
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
      start[2] + (end[2] - start[2]) * progress,
    );
    move(forward.current, t);
    move(backward.current, 1 - t);
  });
  return <group>
    <Line points={[start, end]} color={color} lineWidth={highlighted ? 1.7 : 0.8} transparent opacity={dimmed ? 0.06 : highlighted ? 0.85 : 0.24} raycast={() => null} />
    {!reducedMotion && <mesh ref={forward} position={start} raycast={() => null}>
      <sphereGeometry args={[highlighted ? 0.55 : 0.35, 8, 6]} />
      <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.08 : highlighted ? 1 : 0.65} depthWrite={false} />
    </mesh>}
    {!reducedMotion && <mesh ref={backward} position={end} raycast={() => null}>
      <sphereGeometry args={[highlighted ? 0.55 : 0.35, 8, 6]} />
      <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.08 : highlighted ? 1 : 0.65} depthWrite={false} />
    </mesh>}
  </group>;
}

function CameraController({ extent, reset }: { extent: number; reset: number }) {
  const get = useThree(state => state.get);
  const size = useThree(state => state.size);
  const controls = useRef<OrbitControlsImpl>(null);
  const latestExtent = useRef(extent);
  useEffect(() => { latestExtent.current = extent; }, [extent]);
  useEffect(() => {
    const { camera } = get();
    const radius = latestExtent.current;
    camera.position.set(radius * 4, radius * 4, radius * 4);
    camera.lookAt(0, 0, 0);
    camera.zoom = Math.max(0.1, Math.min(size.width, size.height) / (radius * 4.1));
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [get, reset, size.width, size.height]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minZoom={0.03} maxZoom={25} />;
}

export default function TesseractGraphView(props: Props) {
  // Workspace boundaries also reset hover, camera, and the in-memory layout cache.
  return <WorkspaceGraph key={props.activeWorkspace?.id || 'default'} {...props} />;
}

function WorkspaceGraph({ notas, pastas = EMPTY_FOLDERS, activeWorkspace, onOpenNota }: Props) {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === 'light';
  const neutral = light ? '#52525b' : '#a1a1aa';
  const [ready, setReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [positions, setPositions] = useState<CubePositions>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [bounds, setBounds] = useState({ width: 400, height: 500 });
  const [labels, setLabels] = useState(true);
  const [reset, setReset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<CubePositions>({});
  const storageKey = `tesseract:graph-layout:v1:${activeWorkspace?.id || 'default'}`;

  useEffect(() => {
    try { cache.current = readPositions(localStorage.getItem(storageKey)); } catch { cache.current = {}; }
    const frame = requestAnimationFrame(() => setReady(true));
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setBounds({ width: rect.width, height: rect.height });
    });
    if (container.current) observer.observe(container.current);
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); query.removeEventListener('change', update); if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, [storageKey]);

  const nodes = useMemo<GraphNode[]>(() => {
    if (!ready) return [];
    const groups = activeWorkspace?.graphConfig?.groups || [];
    return notas.map(note => {
      const text = visibleText(note);
      const folder = pastas.find(p => p.id === note.pastaId);
      const group = groups.find(g => matchNoteToGroup({ ...note, folderName: folder?.nome }, g));
      return { id: note.id, note, text, size: cubeSize(text.length), color: group?.color || folder?.color || folder?.cor || neutral };
    });
  }, [ready, notas, pastas, activeWorkspace, neutral]);
  const links = useMemo(() => extractGraphLinks(notas), [notas]);
  useEffect(() => {
    if (!ready) return;
    const next = layoutCubes(nodes, links, cache.current);
    cache.current = next;
    setPositions(next);
    setLayoutReady(true);
  }, [ready, nodes, links]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(cache.current)); } catch { /* Layout still works when storage is full or disabled. */ }
    }, 600);
    return () => clearTimeout(timer);
  }, [ready, positions, storageKey]);

  const extent = frameExtent(nodes, positions);
  const connected = useMemo(() => new Set(links.flatMap(link => link.source === hovered ? [link.target] : link.target === hovered ? [link.source] : [])), [hovered, links]);
  const preview = nodes.find(node => node.id === hovered);
  const keepPreview = useCallback(() => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  const closePreview = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(null), 350);
  }, []);
  const hover = (node: GraphNode, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    keepPreview();
    const rect = container.current?.getBoundingClientRect();
    if (rect) setAnchor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    setHovered(node.id);
  };
  const reorganize = () => {
    const next = layoutCubes(nodes, links);
    cache.current = next;
    setPositions(next);
    setHovered(null);
    setReset(value => value + 1);
  };
  const previewWidth = Math.min(360, Math.max(0, (bounds?.width || 400) - 24));
  const previewHeight = Math.min(380, Math.max(100, (bounds?.height || 500) - 100));
  const previewLeft = Math.max(12, Math.min((bounds?.width || 400) - previewWidth - 12, anchor.x > (bounds?.width || 400) / 2 ? anchor.x - previewWidth - 18 : anchor.x + 18));
  const previewTop = Math.max(64, Math.min((bounds?.height || 500) - previewHeight - 16, anchor.y - 40));

  return <div ref={container} className="relative h-full w-full flex-1 overflow-hidden bg-[var(--background)] text-[var(--foreground)]" style={{ fontFamily: 'var(--font-sans)' }}>
    {layoutReady && <Canvas aria-label="Grafo Tesseract em três dimensões" className="cursor-grab active:cursor-grabbing" dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} onPointerMissed={() => setHovered(null)}>
      <OrthographicCamera makeDefault position={[400, 400, 400]} near={0.1} far={1000000} />
      <CameraController extent={extent} reset={reset} />
      <ambientLight intensity={light ? 1.5 : 0.8} />
      <directionalLight position={[100, 200, 150]} intensity={2} />
      <directionalLight position={[-100, -50, -100]} intensity={0.5} />
      <TesseractFrame extent={extent} color={neutral} />
      {links.map((link, index) => {
        const start = positions[link.source];
        const end = positions[link.target];
        if (!start || !end) return null;
        const highlighted = link.source === hovered || link.target === hovered;
        return <Synapse key={`${link.source}:${link.target}`} start={start} end={end} color={neutral} highlighted={highlighted} dimmed={hovered !== null && !highlighted} phase={(index * 0.61803398875) % 1} reducedMotion={reducedMotion} />;
      })}
      {nodes.map(node => {
        const position = positions[node.id];
        if (!position) return null;
        const highlighted = hovered === node.id;
        const related = connected.has(node.id);
        const dimmed = hovered !== null && !highlighted && !related;
        return <mesh key={node.id} position={position} onPointerOver={event => hover(node, event)} onPointerOut={closePreview} onClick={event => {
          event.stopPropagation();
          if (event.delta <= 5) { setHovered(null); onOpenNota(node.note); }
        }}>
          <boxGeometry args={[node.size, node.size, node.size]} />
          <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={highlighted ? 0.4 : related ? 0.18 : 0.04} roughness={0.48} metalness={0.12} transparent={dimmed} opacity={dimmed ? 0.18 : 1} />
          <Edges color={highlighted ? (light ? '#000000' : '#ffffff') : node.color} transparent opacity={dimmed ? 0.15 : 0.65} raycast={() => null} />
          {(labels || highlighted) && !dimmed && <Html position={[0, node.size / 2 + 2.5, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <span className="block max-w-36 truncate rounded-[var(--radius)] border border-[var(--accents-2)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--foreground)]" style={{ opacity: highlighted || related ? 1 : 0.8 }}>{node.note.titulo || 'Sem título'}</span>
          </Html>}
        </mesh>;
      })}
    </Canvas>}
    {ready && nodes.length === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className="geist-card px-5 py-3 text-sm text-[var(--accents-5)]">Suas notas aparecerão dentro do Tesseract.</p></div>}
    <div className="pointer-events-none absolute bottom-16 left-4 text-[11px] text-[var(--accents-5)] sm:bottom-5">
      <span style={{ fontFamily: 'var(--font-mono)' }}>{nodes.length} notas · {links.length} conexões</span>
      <p className="mt-1 hidden sm:block">Arraste para girar · Role para ampliar · Clique para abrir</p>
    </div>
    <div className="absolute bottom-4 right-4 z-30 flex flex-wrap justify-end gap-2">
      <button type="button" className="geist-button-secondary inline-flex items-center gap-1.5 cursor-pointer !px-2.5 !py-1.5 text-xs" aria-pressed={labels} onClick={() => setLabels(value => !value)}><ControlIcon kind="labels" />Títulos</button>
      <button type="button" className="geist-button-secondary inline-flex items-center gap-1.5 cursor-pointer !px-2.5 !py-1.5 text-xs" onClick={reorganize} disabled={!nodes.length}><ControlIcon kind="layout" />Reorganizar</button>
      <button type="button" className="geist-button-secondary inline-flex items-center gap-1.5 cursor-pointer !px-2.5 !py-1.5 text-xs" onClick={() => setReset(value => value + 1)}><ControlIcon kind="reset" />Restaurar vista</button>
    </div>
    {preview && <aside aria-label="Prévia da nota" onPointerEnter={keepPreview} onPointerLeave={closePreview} onFocus={keepPreview} onBlur={closePreview} onKeyDown={event => { if (event.key === 'Escape') setHovered(null); }} className="geist-card absolute z-50 flex flex-col gap-3 overflow-auto p-4 text-left shadow-xl select-text" style={{ left: previewLeft, top: previewTop, width: previewWidth, maxHeight: previewHeight, background: 'var(--background)' }}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--accents-2)] pb-2 text-[10px] text-[var(--accents-5)]" style={{ fontFamily: 'var(--font-mono)' }}>
        <span className="truncate">{pastas.find(folder => folder.id === preview.note.pastaId)?.nome || (preview.note.tipo === 'desenho' ? 'Desenho' : 'Nota')}</span><span className="shrink-0">{connected.size} conexões</span>
      </div>
      <h3 className="text-base font-semibold" style={{ borderLeft: `2px solid ${preview.color}`, paddingLeft: 10 }}>{preview.note.titulo || 'Sem título'}</h3>
      {preview.note.tipo === 'desenho' ? <GraphDrawingPreview conteudoJson={preview.note.conteudo} height={200} /> : <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--accents-6)]">{preview.text || 'Nota sem conteúdo textual.'}</p>}
      <button className="geist-button-secondary shrink-0 text-xs" type="button" onClick={() => onOpenNota(preview.note)}>Abrir nota</button>
    </aside>}
  </div>;
}

function ControlIcon({ kind }: { kind: 'labels' | 'layout' | 'reset' }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'labels' ? <path d="M4 7V4h16v3M12 4v16M9 20h6" /> : kind === 'layout' ? <><rect x="3" y="3" width="6" height="6" /><rect x="15" y="15" width="6" height="6" /><path d="M15 3h6v6M3 15v6h6" /></> : <path d="M3 3v5h5M3 8a9 9 0 1 1 0 8" />}
  </svg>;
}
