// Apply the stored preference before the first paint; never require storage access.
(() => {
  let preference = 'system';
  try {
    const saved = localStorage.getItem('alethinosplan.theme.v1');
    if (saved === 'light' || saved === 'dark' || saved === 'system') preference = saved;
  } catch { /* Storage may be unavailable in private or restricted contexts. */ }
  const theme = preference === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
})();
