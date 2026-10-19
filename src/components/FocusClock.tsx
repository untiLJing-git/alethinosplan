export function FocusClock({ elapsed }: { elapsed: number }) {
  const seconds = Math.floor(elapsed / 1000);
  return <div className="focus-clock" role="timer" aria-live="off" aria-label={'已专注 ' + Math.floor(seconds / 60) + ' 分 ' + seconds % 60 + ' 秒'}><span>{String(Math.floor(seconds / 60)).padStart(2, '0')}</span><i>:</i><span>{String(seconds % 60).padStart(2, '0')}</span></div>;
}
