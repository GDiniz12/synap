import styles from '@/app/landing.module.css';

// A deterministic point field keeps the illustration crisp at any viewport size.
const points = Array.from({ length: 3100 }, (_, index) => {
  const row = Math.floor(index / 100);
  const column = index % 100;
  const x = column * 12;
  const wave = Math.sin(column * 0.073 + row * 0.075);
  const y = 100 + row * 5 + wave * (50 + row * 1.8) + Math.cos(column * 0.15) * 16;
  const radius = 0.45 + (Math.sin(column * 0.19 + row * 0.2) + 1) * 0.4;
  return `M${x.toFixed(1)},${y.toFixed(1)}h${radius.toFixed(1)}v${radius.toFixed(1)}h-${radius.toFixed(1)}z`;
}).join('');

export default function LandingField({ emblem = false }: { emblem?: boolean }) {
  return <svg className={styles.field} viewBox="0 0 1200 430" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <path d={points} fill="currentColor" />
    {emblem && <g stroke="currentColor" strokeWidth="1" transform="translate(600 155)">
      <path d="M0-104 90-52 90 52 0 104-90 52-90-52Z M0 0 90-52 M0 0-90-52 M0 0V104 M0-104V-44 M90-52 38-22 M90 52 38 22 M0 104V44 M-90 52-38 22 M-90-52-38-22 M0-44 38-22 38 22 0 44-38 22-38-22Z M0 0 38-22 M0 0-38-22 M0 0V44" />
      <circle r="137" strokeDasharray="1 7" opacity=".5" />
    </g>}
  </svg>;
}
