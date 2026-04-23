import { useState } from 'react';
import { loadFiboLevels } from '../components/FiboSettings';
import { loadSessionsConfig } from '../components/SessionsSettings';
import { loadMAConfig } from '../components/MovingAverageSettings';
import { loadRSIConfig } from '../components/RSISettings';
import { loadStochConfig } from '../components/StochasticSettings';

export function useDrawingState() {
  const [drawingMode, setDrawingMode] = useState(null);
  const [crosshairMode, setCrosshairMode] = useState(0);
  const [crosshairVisible, setCrosshairVisible] = useState(false);
  const [fiboLevels, setFiboLevels] = useState(loadFiboLevels);
  const [showFiboSettings, setShowFiboSettings] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionsConfig, setSessionsConfig] = useState(loadSessionsConfig);
  const [showSessionsSettings, setShowSessionsSettings] = useState(false);
  const [fiboVisible, setFiboVisible] = useState(true);
  const [maConfig, setMAConfig] = useState(loadMAConfig);
  const [maVisible, setMAVisible] = useState(() => (loadMAConfig()?.length ?? 0) > 0);
  const [showMASettings, setShowMASettings] = useState(false);
  const [rsiConfig, setRSIConfig] = useState(loadRSIConfig);
  const [showRSISettings, setShowRSISettings] = useState(false);
  const [rsiVisible, setRSIVisible] = useState(!!loadRSIConfig?.period);
  const [stochConfig, setStochConfig] = useState(loadStochConfig);
  const [showStochSettings, setShowStochSettings] = useState(false);
  const [stochVisible, setStochVisible] = useState(!!loadStochConfig?.kPeriod);

  return {
    drawingMode,
    setDrawingMode,
    crosshairMode,
    setCrosshairMode,
    crosshairVisible,
    setCrosshairVisible,
    fiboLevels,
    setFiboLevels,
    fiboVisible,
    setFiboVisible,
    showFiboSettings,
    setShowFiboSettings,
    showSessions,
    setShowSessions,
    sessionsConfig,
    setSessionsConfig,
    showSessionsSettings,
    setShowSessionsSettings,
    maConfig,
    setMAConfig,
    maVisible,
    setMAVisible,
    showMASettings,
    setShowMASettings,
    rsiConfig,
    setRSIConfig,
    showRSISettings,
    setShowRSISettings,
    rsiVisible,
    setRSIVisible,
    stochConfig,
    setStochConfig,
    showStochSettings,
    setShowStochSettings,
    stochVisible,
    setStochVisible,
  };
}
