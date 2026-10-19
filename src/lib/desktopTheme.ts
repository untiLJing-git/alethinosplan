import { TONES } from './types';

// PiP can report a different color preference; mirror the opener's resolved palette.
export function mirrorDesktopTheme(target: Document): () => void {
  const palette = target.createElement('style');
  palette.dataset.desktopTheme = 'true';
  target.head.append(palette);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const copied = new Set<string>();
  function sync() {
    if (target.defaultView?.closed) return;
    const source = getComputedStyle(document.documentElement);
    const destination = target.documentElement.style;
    for (const name of copied) destination.removeProperty(name);
    copied.clear();
    for (let index = 0; index < source.length; index += 1) {
      const name = source.item(index);
      if (name.startsWith('--')) { destination.setProperty(name, source.getPropertyValue(name)); copied.add(name); }
    }
    destination.colorScheme = source.colorScheme === 'normal' ? 'light' : source.colorScheme;
    destination.color = source.color;
    target.documentElement.dataset.theme = document.documentElement.dataset.theme || 'light';
    target.documentElement.dataset.themePreference = document.documentElement.dataset.themePreference || 'system';
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.append(probe);
    try {
      palette.textContent = TONES.map(tone => {
        probe.className = 'tone-' + tone;
        const style = getComputedStyle(probe);
        const tokens = ['--note-bg', '--note-ink', '--note-fold', '--note-dim'];
        return '.desktop-window-body .tone-' + tone + '{' + tokens.map(name => name + ':' + style.getPropertyValue(name) + ';').join('') + '}';
      }).join('');
    } finally { probe.remove(); }
  }
  sync();
  const observer = new MutationObserver(sync);
  const options = { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-theme-preference'] };
  observer.observe(document.documentElement, options);
  observer.observe(document.body, options);
  media.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  };
}
