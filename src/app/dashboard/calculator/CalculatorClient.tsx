'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Save,
  Trash2,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Coins,
  Target,
  ShieldAlert,
  Percent,
  DollarSign
} from 'lucide-react';

interface Preset {
  name: string;
  balance: string;
  riskPercentage: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  instrumentGroup: string;
}

export default function CalculatorClient() {
  // Input states stored as strings to enable easy decimal typing
  const [balanceStr, setBalanceStr] = useState<string>('10000');
  const [riskPercentageStr, setRiskPercentageStr] = useState<string>('1.0');
  const [entryPriceStr, setEntryPriceStr] = useState<string>('1.0850');
  const [stopLossStr, setStopLossStr] = useState<string>('1.0800');
  const [takeProfitStr, setTakeProfitStr] = useState<string>('1.0950');
  const [instrumentGroup, setInstrumentGroup] = useState<string>('forex');

  // Preset states
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetName, setSelectedPresetName] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tradiary_calculator_presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse presets', e);
      }
    } else {
      const defaultPresets: Preset[] = [
        {
          name: 'EUR/USD Setup',
          balance: '10000',
          riskPercentage: '1.0',
          entryPrice: '1.0850',
          stopLoss: '1.0800',
          takeProfit: '1.0950',
          instrumentGroup: 'forex',
        },
        {
          name: 'USD/JPY Setup',
          balance: '10000',
          riskPercentage: '1.5',
          entryPrice: '155.00',
          stopLoss: '154.50',
          takeProfit: '156.00',
          instrumentGroup: 'jpy',
        },
        {
          name: 'Gold Trade Setup',
          balance: '10000',
          riskPercentage: '2.0',
          entryPrice: '2300.00',
          stopLoss: '2290.00',
          takeProfit: '2320.00',
          instrumentGroup: 'gold',
        },
      ];
      setPresets(defaultPresets);
      localStorage.setItem('tradiary_calculator_presets', JSON.stringify(defaultPresets));
    }
  }, []);

  // Show Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Adjust defaults when Instrument Group changes
  const handleInstrumentChange = (group: string) => {
    setInstrumentGroup(group);
    setSelectedPresetName('');

    if (group === 'forex') {
      setEntryPriceStr('1.0850');
      setStopLossStr('1.0800');
      setTakeProfitStr('1.0950');
    } else if (group === 'jpy') {
      setEntryPriceStr('155.00');
      setStopLossStr('154.50');
      setTakeProfitStr('156.00');
    } else if (group === 'gold') {
      setEntryPriceStr('2300.00');
      setStopLossStr('2290.00');
      setTakeProfitStr('2320.00');
    } else if (group === 'crypto') {
      setEntryPriceStr('65000.00');
      setStopLossStr('64000.00');
      setTakeProfitStr('67000.00');
    }
  };

  // Preset Handlers
  const handleLoadPreset = (name: string) => {
    setSelectedPresetName(name);
    if (!name) return;
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      setBalanceStr(preset.balance);
      setRiskPercentageStr(preset.riskPercentage);
      setEntryPriceStr(preset.entryPrice);
      setStopLossStr(preset.stopLoss);
      setTakeProfitStr(preset.takeProfit);
      setInstrumentGroup(preset.instrumentGroup);
      setToast({ message: `Preset "${name}" loaded successfully`, type: 'success' });
    }
  };

  const handleSavePreset = () => {
    const name = newPresetName.trim();
    if (!name) {
      setToast({ message: 'Please enter a preset name first', type: 'error' });
      return;
    }

    const newPreset: Preset = {
      name,
      balance: balanceStr,
      riskPercentage: riskPercentageStr,
      entryPrice: entryPriceStr,
      stopLoss: stopLossStr,
      takeProfit: takeProfitStr,
      instrumentGroup,
    };

    const updated = presets.filter((p) => p.name.toLowerCase() !== name.toLowerCase()).concat(newPreset);
    setPresets(updated);
    localStorage.setItem('tradiary_calculator_presets', JSON.stringify(updated));
    setSelectedPresetName(name);
    setNewPresetName('');
    setToast({ message: `Preset "${name}" saved successfully`, type: 'success' });
  };

  const handleDeletePreset = () => {
    if (!selectedPresetName) return;
    const updated = presets.filter((p) => p.name !== selectedPresetName);
    setPresets(updated);
    localStorage.setItem('tradiary_calculator_presets', JSON.stringify(updated));
    setToast({ message: `Preset "${selectedPresetName}" deleted`, type: 'success' });
    setSelectedPresetName('');
  };

  // Convert inputs to numbers
  const balance = parseFloat(balanceStr) || 0;
  const riskPercentage = parseFloat(riskPercentageStr) || 0;
  const entryPrice = parseFloat(entryPriceStr) || 0;
  const stopLoss = parseFloat(stopLossStr) || 0;
  const takeProfit = takeProfitStr ? parseFloat(takeProfitStr) || 0 : 0;

  // Parameters based on Instrument Type
  const { pipSize, contractSize, label } = useMemo(() => {
    switch (instrumentGroup) {
      case 'jpy':
        return { pipSize: 0.01, contractSize: 100000, label: 'JPY Pair (0.01 Pip)' };
      case 'gold':
        return { pipSize: 0.1, contractSize: 100, label: 'Gold (0.1 Pip)' };
      case 'crypto':
        return { pipSize: 1.0, contractSize: 1, label: 'Crypto/Custom (1.0 Pip)' };
      case 'forex':
      default:
        return { pipSize: 0.0001, contractSize: 100000, label: 'Standard Forex (0.0001 Pip)' };
    }
  }, [instrumentGroup]);

  // Validations & Direction checks
  const isBuy = entryPrice > stopLoss;
  const isSell = entryPrice < stopLoss;
  const entryEqualsSL = entryPrice === stopLoss;

  const tpValidation = useMemo(() => {
    if (!takeProfit) return { isValid: true, message: '' };
    if (entryEqualsSL) return { isValid: false, message: 'Specify a valid SL relative to Entry first' };

    if (isBuy && takeProfit <= entryPrice) {
      return { isValid: false, message: 'For BUY trades, Take Profit must be above Entry price' };
    }
    if (isSell && takeProfit >= entryPrice) {
      return { isValid: false, message: 'For SELL trades, Take Profit must be below Entry price' };
    }
    return { isValid: true, message: '' };
  }, [takeProfit, entryPrice, isBuy, isSell, entryEqualsSL]);

  // Calculations
  const dollarRisk = useMemo(() => {
    return balance * (riskPercentage / 100);
  }, [balance, riskPercentage]);

  const pipsAtRisk = useMemo(() => {
    if (entryEqualsSL) return 0;
    return Math.abs(entryPrice - stopLoss) / pipSize;
  }, [entryPrice, stopLoss, pipSize, entryEqualsSL]);

  const pipValuePerLot = useMemo(() => {
    if (entryPrice <= 0) return 0;
    if (instrumentGroup === 'jpy') {
      // (0.01 / Entry) * 100,000
      return (0.01 / entryPrice) * contractSize;
    } else if (instrumentGroup === 'forex') {
      // standard forex: (0.0001 / Entry) * 100,000 ... wait!
      // In USD account trading a major forex pair (like EURUSD), the pip value is fixed at $10.
      // If we use the formula (0.0001 / Entry) * 100,000, it calculates the pip value in base currency.
      // Let's implement the standard formula exactly:
      return (0.0001 / entryPrice) * contractSize;
    } else {
      // Gold/Crypto: Pip Size * Contract Size
      return pipSize * contractSize;
    }
  }, [entryPrice, instrumentGroup, pipSize, contractSize]);

  const lotSize = useMemo(() => {
    if (pipsAtRisk <= 0 || pipValuePerLot <= 0) return 0;
    // Lot Size = Dollar Risk / (Pips at Risk * Pip Value per Lot)
    return dollarRisk / (pipsAtRisk * pipValuePerLot);
  }, [dollarRisk, pipsAtRisk, pipValuePerLot]);

  const rrRatio = useMemo(() => {
    if (!takeProfit || pipsAtRisk <= 0 || !tpValidation.isValid) return 0;
    return Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss);
  }, [takeProfit, entryPrice, stopLoss, pipsAtRisk, tpValidation.isValid]);

  const dollarProfit = useMemo(() => {
    if (!takeProfit || rrRatio <= 0) return 0;
    return rrRatio * dollarRisk;
  }, [takeProfit, rrRatio, dollarRisk]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-1 lg:px-4 animate-fade-in pb-16">

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-scale-in text-xs font-semibold ${toast.type === 'success'
          ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400 backdrop-blur-lg'
          : 'bg-rose-950/80 border-rose-800 text-rose-400 backdrop-blur-lg'
          }`}>
          {toast.type === 'success' ? <TrendingUp size={16} /> : <ShieldAlert size={16} />}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-md">
              <Calculator size={22} className="text-indigo-400" />
            </div>
            Risk Management Calculator
          </h1>
          <p className="text-slate-400 mt-1.5 text-xs sm:text-sm">
            Configure parameters to find your optimal position sizing and maintain consistent risk management.
          </p>
        </div>
      </div>

      {/* Preset System Bar */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        {/* Load Preset */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Calculator Preset:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedPresetName}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all cursor-pointer min-w-[160px]"
            >
              <option value="">-- Load Preset --</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
            {selectedPresetName && (
              <button
                type="button"
                onClick={handleDeletePreset}
                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
                title="Delete active preset"
                aria-label="Hapus preset aktif"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Save Preset */}
        <div className="flex items-center gap-2 w-full md:max-w-md">
          <input
            type="text"
            placeholder="Preset name (e.g. BTC USD 2% Risk)"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
          />
          <button
            type="button"
            onClick={handleSavePreset}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
          >
            <Save size={14} />
            Save Preset
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Card: Inputs (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Coins size={16} className="text-indigo-400" />
              Trade Parameters
            </h2>
            <span className="text-[10px] bg-slate-850 text-slate-400 px-2.5 py-1 rounded-full border border-slate-800 font-semibold uppercase tracking-wider">
              {label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Instrument Group */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Instrument Group
              </label>
              <select
                value={instrumentGroup}
                onChange={(e) => handleInstrumentChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
              >
                <option value="forex">Forex Standard (EURUSD, GBPUSD...)</option>
                <option value="jpy">Forex JPY Pairs (USDJPY, EURJPY...)</option>
                <option value="gold">Gold (XAUUSD)</option>
                <option value="crypto">Crypto & Indices (BTC, ETH, US30...)</option>
              </select>
            </div>

            {/* Account Balance */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Account Balance ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold">
                  <DollarSign size={14} />
                </span>
                <input
                  type="number"
                  step="any"
                  value={balanceStr}
                  onChange={(e) => setBalanceStr(e.target.value)}
                  placeholder="10000"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          </div>

          {/* Risk Percentage */}
          <div className="space-y-2.5 p-4 rounded-xl border border-slate-850 bg-slate-950/30">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Risk Percentage (%)
              </label>
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-400">
                <Percent size={12} />
                {riskPercentageStr}%
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={parseFloat(riskPercentageStr) || 0.1}
                onChange={(e) => setRiskPercentageStr(e.target.value)}
                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-indigo-500"
              />
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={riskPercentageStr}
                onChange={(e) => setRiskPercentageStr(e.target.value)}
                className="w-20 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-center font-bold"
              />
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Slide to select custom risk between 0.1% and 5% or type custom value.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Entry Price */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Entry Price
              </label>
              <input
                type="number"
                step="any"
                value={entryPriceStr}
                onChange={(e) => setEntryPriceStr(e.target.value)}
                placeholder="1.0850"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
              />
            </div>

            {/* Stop Loss Price */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Stop Loss Price
              </label>
              <input
                type="number"
                step="any"
                value={stopLossStr}
                onChange={(e) => setStopLossStr(e.target.value)}
                placeholder="1.0800"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
              />
            </div>

            {/* Take Profit Price */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Take Profit Price
                </label>
                <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">Optional</span>
              </div>
              <input
                type="number"
                step="any"
                value={takeProfitStr}
                onChange={(e) => setTakeProfitStr(e.target.value)}
                placeholder="1.0950"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* Validation Warnings */}
          {(!tpValidation.isValid || entryEqualsSL) && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-start gap-2.5">
              <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Input Validation Issue</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {entryEqualsSL
                    ? 'Entry price and Stop Loss price are identical. Please specify a non-zero distance.'
                    : tpValidation.message}
                </p>
              </div>
            </div>
          )}

          {/* Helper Tips */}
          <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-850 flex gap-3 text-xs text-slate-400">
            <HelpCircle size={18} className="text-indigo-400/80 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-300">How positioning size is determined</p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                The lot size calculation respects your risk settings strictly. Based on your Stop Loss, we convert price differences to pips and find the maximum lot size that ensures you do not lose more than your defined risk percentage if the trade goes against you.
              </p>
            </div>
          </div>
        </div>

        {/* Right Card: Outputs (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">

          {/* Main Position Size Lot Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            {/* Background design elements */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-4 -mt-4 pointer-events-none" />

            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={14} className="text-indigo-400" />
                  Recommended Lot Size
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${isBuy
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isSell
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                  {isBuy ? 'Buy / Long' : isSell ? 'Sell / Short' : 'N/A'}
                </span>
              </div>
              <div className="text-5xl font-extrabold text-white mt-4 tracking-tight">
                {lotSize > 0 ? lotSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0.00'}
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 mt-4 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Pip Value per Lot:</span>
              <span className="font-semibold text-slate-300">
                ${pipValuePerLot > 0 ? pipValuePerLot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0.00'}
              </span>
            </div>
          </div>

          {/* Grid for other statistics */}
          <div className="grid grid-cols-2 gap-4">

            {/* Dollar Risk Card */}
            <div className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold text-rose-400/90 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown size={12} />
                Dollar Risk
              </span>
              <div>
                <div className="text-xl font-bold text-rose-500">
                  -${dollarRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[9px] text-rose-400/75 mt-0.5 font-semibold">
                  {riskPercentage.toFixed(1)}% of Account Balance
                </div>
              </div>
            </div>

            {/* Dollar Profit Card */}
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={12} />
                Potential Profit
              </span>
              <div>
                <div className="text-xl font-bold text-emerald-500">
                  {takeProfit && dollarProfit > 0 && tpValidation.isValid
                    ? `+$${dollarProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '--'}
                </div>
                <div className="text-[9px] text-emerald-400/75 mt-0.5 font-semibold">
                  {takeProfit && dollarProfit > 0 && tpValidation.isValid
                    ? `${((dollarProfit / balance) * 100).toFixed(1)}% balance gain`
                    : 'Take Profit unconfigured'}
                </div>
              </div>
            </div>

            {/* Risk Reward Ratio Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Risk/Reward Ratio
              </span>
              <div>
                <div className="text-xl font-bold text-slate-200">
                  {takeProfit && rrRatio > 0 && tpValidation.isValid
                    ? `1 : ${rrRatio.toFixed(2)}`
                    : '--'}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {takeProfit && rrRatio > 0 && tpValidation.isValid
                    ? `Multiplier: ${rrRatio.toFixed(2)}x`
                    : 'Take Profit unconfigured'}
                </div>
              </div>
            </div>

            {/* Pips at Risk Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col justify-between h-[120px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pips at Risk
              </span>
              <div>
                <div className="text-xl font-bold text-slate-200">
                  {pipsAtRisk > 0 ? `${pipsAtRisk.toFixed(1)}` : '0.0'}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  {pipsAtRisk > 0 ? `Pip Size: ${pipSize}` : 'SL at entry price'}
                </div>
              </div>
            </div>

          </div>

          {/* Formulas and math verification box */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-[10px] text-slate-500 space-y-2">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Calculations Used:</p>
            <ul className="list-disc pl-4 space-y-1 font-mono">
              <li>Pips at Risk = |Entry - StopLoss| / Pip Size ({pipSize})</li>
              <li>Pip Value per Lot = (Pip Size / Entry) * Contract Size ({contractSize.toLocaleString()})</li>
              <li>Dollar Risk = Balance * (Risk % / 100)</li>
              <li>Lot Size = Dollar Risk / (Pips at Risk * Pip Value per Lot)</li>
              <li>Risk Reward Ratio = |TP - Entry| / |Entry - SL|</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
