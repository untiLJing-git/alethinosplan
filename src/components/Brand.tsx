export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`} aria-label="alēthinósplan">
    <span className="brand-symbol" aria-hidden="true"><i /><i /></span>
    <span>alēthinós<span className="brand-plan">plan</span></span>
  </div>;
}
