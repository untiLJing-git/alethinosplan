export function isDevelopmentDemoRequested(search: string, development: boolean): boolean {
  return development && new URLSearchParams(search).get('demo') === '1';
}
