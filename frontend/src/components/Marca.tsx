import { Link } from 'react-router-dom';

export function Marca({ para = '/' }: { para?: string }) {
  return (
    <Link to={para} className="inline-flex items-center gap-2 text-tinta" aria-label="Vera, página inicial">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#16233A" />
        <rect x="6" y="17" width="20" height="7" rx="2" fill="#FFE45C" transform="rotate(-4 16 20)" />
        <path d="M9 8l7 15 7-15" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-xl font-bold tracking-tight">vera</span>
    </Link>
  );
}
