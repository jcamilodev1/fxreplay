import { useState, useCallback } from 'react';

export function useRiskManager(initialBalance = 10000, initialLotSize = 0.01, initialRiskPercent = 1) {
  const [lotSize, setLotSize] = useState(initialLotSize);
  const [lotInput, setLotInput] = useState(initialLotSize.toString());
  const [riskMode, setRiskMode] = useState('lots');
  const [riskPercent, setRiskPercent] = useState(initialRiskPercent);
  const [riskPercentInput, setRiskPercentInput] = useState(initialRiskPercent.toString());
  const [accountBalance, setAccountBalance] = useState(initialBalance);
  const [balanceInput, setBalanceInput] = useState(initialBalance.toString());

  const parsePrice = (val) => {
    if (!val) return null;
    const parsed = parseFloat(val.toString().replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
  };

  const calcLotFromPercent = useCallback((slDist, currentBalance, symbolInfo) => {
    if (slDist <= 0) return 0.01;
    const pipMult = symbolInfo?.pipMult || 10000;
    const pVal = symbolInfo?.pipValue || 10;
    const slPips = slDist * pipMult;
    const riskDollars = currentBalance * (riskPercent / 100);
    const calculated = riskDollars / (slPips * pVal);
    return Math.max(0.01, parseFloat(calculated.toFixed(2)));
  }, [riskPercent]);

  const handleLotInputChange = useCallback((e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setLotInput(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) setLotSize(num);
  }, []);

  const handleLotInputBlur = useCallback(() => {
    const num = parseFloat(lotInput);
    if (isNaN(num) || num <= 0) {
      setLotInput('0.01');
      setLotSize(0.01);
    } else {
      setLotInput(num.toString());
    }
  }, [lotInput]);

  const handleRiskPercentChange = useCallback((e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setRiskPercentInput(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0 && num <= 100) setRiskPercent(num);
  }, []);

  const handleRiskPercentBlur = useCallback(() => {
    const num = parseFloat(riskPercentInput);
    if (isNaN(num) || num <= 0) {
      setRiskPercentInput('1');
      setRiskPercent(1);
    } else {
      const clamped = Math.min(num, 100);
      setRiskPercentInput(clamped.toString());
      setRiskPercent(clamped);
    }
  }, [riskPercentInput]);

  const handleBalanceChange = useCallback((e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setBalanceInput(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) setAccountBalance(num);
  }, []);

  const handleBalanceBlur = useCallback(() => {
    const num = parseFloat(balanceInput);
    if (isNaN(num) || num <= 0) {
      setBalanceInput('10000');
      setAccountBalance(10000);
    } else {
      setBalanceInput(num.toString());
      setAccountBalance(num);
    }
  }, [balanceInput]);

  const handleSaveSettings = useCallback((newBalance) => {
    setAccountBalance(newBalance);
    setBalanceInput(newBalance.toString());
  }, []);

  return {
    lotSize,
    setLotSize,
    lotInput,
    setLotInput,
    riskMode,
    setRiskMode,
    riskPercent,
    setRiskPercent,
    riskPercentInput,
    setRiskPercentInput,
    accountBalance,
    setAccountBalance,
    balanceInput,
    setBalanceInput,
    parsePrice,
    calcLotFromPercent,
    handleLotInputChange,
    handleLotInputBlur,
    handleRiskPercentChange,
    handleRiskPercentBlur,
    handleBalanceChange,
    handleBalanceBlur,
    handleSaveSettings,
  };
}
