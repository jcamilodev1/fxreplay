# FXReplay - Agent Instructions

## Commands
- `npm run dev` - Start dev server (Vite)
- `npm run build` - Production build
- `npm run lint` - ESLint check
- `npm run preview` - Preview production build

## Tech Stack
- React 19 + Vite
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- lightweight-charts (TradingView charts)
- Supabase (auth + data)
- React Router 7
- Lucide React (icons)
- **Plain JavaScript** (no TypeScript)

## Project Structure
- `src/pages/` - Route pages (Auth, Dashboard)
- `src/components/` - UI components (TradingChart, Sidebar, etc.)
- `src/hooks/` - Custom hooks (useBacktest, useChunkedData, useRiskManager)
- `src/contexts/` - React contexts (Auth, Chart, Trade)
- `src/utils/` - Utilities (backtestEngine, indexedDB)
- `src/lib/` - Third-party lib config (Supabase client)

## Notes
- No test framework configured
- No TypeScript - use `.jsx` files
- Lint rule: unused vars allowed if starting with uppercase (`^[A-Z_]`)
- Vercel SPA rewrite config in `vercel.json`
- Local caching via IndexedDB (`src/utils/indexedDB.js`)
- `.env.development` and `.env.production` contain Supabase URL/key
- CLI custom commands in `.claude/commands/` (brainstorming, frontend-design, interface-design, react-best-practices)

## Moving Averages
- Component: `src/components/MovingAverageSettings.jsx`
- Config loaded/saved to localStorage (`fxreplay_ma_config`)
- Supports SMA and EMA, multiple periods (default: 20, 50)
- Click button to toggle, double-click to open config modal
- Props: `maConfig={maConfig}` passed to `TradingChart`

## RSI
- Component: `src/components/RSISettings.jsx`
- Config loaded/saved to localStorage (`fxreplay_rsi_config`)
- Default: period 14, overbought 70, oversold 30
- Props: `rsiConfig={rsiConfig}` and `rsiVisible={rsiVisible}` passed to `TradingChart`
- Button uses `TrendingDown` icon, click to toggle, double-click to configure
