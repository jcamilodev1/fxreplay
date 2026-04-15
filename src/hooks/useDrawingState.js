import { useState } from 'react';
import { loadFiboLevels } from '../components/FiboSettings';
import { loadSessionsConfig } from '../components/SessionsSettings';

export function useDrawingState() {
  const [drawingMode, setDrawingMode] = useState(null);
  const [fiboLevels, setFiboLevels] = useState(loadFiboLevels);
  const [showFiboSettings, setShowFiboSettings] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionsConfig, setSessionsConfig] = useState(loadSessionsConfig);
  const [showSessionsSettings, setShowSessionsSettings] = useState(false);

  return {
    drawingMode,
    setDrawingMode,
    fiboLevels,
    setFiboLevels,
    showFiboSettings,
    setShowFiboSettings,
    showSessions,
    setShowSessions,
    sessionsConfig,
    setSessionsConfig,
    showSessionsSettings,
    setShowSessionsSettings,
  };
}
