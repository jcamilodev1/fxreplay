import { useEffect } from 'react';

export function useReplayControls({
  stepForward,
  stepBackward,
  isPlaying,
  pausePlaying,
  startPlaying,
  replayActive,
  exitReplay,
  selectingStart,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowRight':
          stepForward();
          break;
        case 'ArrowLeft':
          stepBackward();
          break;
        case ' ':
          e.preventDefault();
          if (replayActive) {
            if (isPlaying) pausePlaying();
            else startPlaying();
          }
          break;
        case 'Escape':
          if (replayActive) {
            exitReplay();
          } else if (selectingStart) {
            // setSelectingStart(false) se maneja desde el componente padre
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepForward, stepBackward, isPlaying, pausePlaying, startPlaying, replayActive, exitReplay, selectingStart]);
}
