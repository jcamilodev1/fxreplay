import { useState } from 'react';
import { loadFiboLevels } from '../components/FiboSettings';
import { loadSessionsConfig } from '../components/SessionsSettings';

export function useDrawingState() {
  const [drawingMode, setDrawingMode] = useState(null);
  const [crosshairMode, setCrosshairMode] = useState(0); // 0: libre, 1: magnético
  const [crosshairVisible, setCrosshairVisible] = useState(false); // false: puntero, true: cruz
  const [fiboLevels, setFiboLevels] = useState(loadFiboLevels);
  const [showFiboSettings, setShowFiboSettings] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionsConfig, setSessionsConfig] = useState(loadSessionsConfig);
  const [showSessionsSettings, setShowSessionsSettings] = useState(false);

  return {
    drawingMode,
    setDrawingMode,
    crosshairMode,
    setCrosshairMode,
    crosshairVisible,
    setCrosshairVisible,
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
