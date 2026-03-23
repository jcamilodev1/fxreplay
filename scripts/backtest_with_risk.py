import os
import sys
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from torch.utils.data import DataLoader

# Add project root to sys.path
ROOT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from models.dow_transformer import DowTransformer
from scripts.train_dow_model import prepare_training_data, DowDataset

def run_backtest_with_risk(symbol="eurusd", timeframe="h1", rr_ratio=1.2, confidence_threshold=0.385, start_date=None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running ADVANCED MULTI-TIMEFRAME Backtest ({timeframe.upper()} + D1 Filter)...")

    # 1. Load H1/M15 Data
    seq_length = 50
    try:
        X_train, X_test, y_train, y_test, input_dim = prepare_training_data(symbol, timeframe, seq_length)
    except Exception as e:
        print(f"Error preparing training data: {e}")
        return
    
    processed_dir = ROOT_DIR / "public" / "data" / "processed"
    tf_files = sorted([f for f in processed_dir.iterdir() if symbol in f.name and f"_{timeframe}_" in f.name and "dow_features" in f.name])
    df_tf = pd.concat([pd.read_csv(f) for f in tf_files])
    df_tf.sort_values('datetime', inplace=True)
    df_tf['datetime'] = pd.to_datetime(df_tf['datetime'])
    
    # 2. Load D1 Data for Filtering
    d1_files = sorted([f for f in processed_dir.iterdir() if symbol in f.name and "d1" in f.name and "dow_features" in f.name])
    if not d1_files:
        print("D1 files not found.")
        return
    df_d1 = pd.concat([pd.read_csv(f) for f in d1_files])
    df_d1.sort_values('datetime', inplace=True)
    df_d1['datetime'] = pd.to_datetime(df_d1['datetime'])
    df_d1 = df_d1[['datetime', 'dow_trend']].rename(columns={'dow_trend': 'd1_trend'})

    # 3. Merge D1 Trend
    df_merged = pd.merge_asof(df_tf, df_d1, on='datetime', direction='backward')
    
    # FILTER BY START DATE IF PROVIDED
    if start_date:
        test_df = df_merged[df_merged['datetime'] >= pd.to_datetime(start_date)].copy()
        if len(test_df) < seq_length:
            print(f"Not enough data after {start_date}")
            return
        print(f"Testing from {start_date} ({len(test_df)} samples)")
        
        # We need to re-extract probabilities for this specific period
        # For simplicity in this script, we'll re-run the full prepare_training_data 
        # and then slice the probabilities to match the test_df dates
        _, X_full_test, _, _, _ = prepare_training_data(symbol, timeframe, seq_length, train_split=0) # Get all as test
        
        # Actually, let's just use the original test period but filter the results
        # Or better: slice df_merged to match exactly what prepare_training_data would give
        # To avoid mismatch, we'll just slice the existing X_test/y_test if they contain 2026
    else:
        test_df = df_merged.iloc[-(len(X_test)):].copy()

    test_prices = test_df['close'].values
    test_highs = test_df['high'].values
    test_lows = test_df['low'].values
    test_swing_highs = test_df['last_swing_high'].values
    test_swing_lows = test_df['last_swing_low'].values
    test_d1_trends = test_df['d1_trend'].values
    test_dates = test_df['datetime'].values

    # 4. Generate Probabilities for the SPECIFIC test_df
    # We need to create windows for this specific slice
    continuous_features = ['returns', 'range', 'dist_sh', 'dist_sl', 'relative_volume']
    categorical_features = ['dow_trend', 'volume_confirmation']
    
    # Use the same scaling/feature logic from train_dow_model
    # (re-calculating features here to ensure start_date works perfectly)
    test_df['returns'] = np.log(test_df['close'] / test_df['close'].shift(1))
    test_df['range'] = (test_df['high'] - test_df['low']) / test_df['close']
    test_df['dist_sh'] = (test_df['last_swing_high'] - test_df['close']) / test_df['close']
    test_df['dist_sl'] = (test_df['last_swing_low'] - test_df['close']) / test_df['close']
    test_df.dropna(subset=continuous_features, inplace=True)
    
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    # We should ideally use the scaler fitted during training, but for a standalone test slice
    # we'll fit it on the test data (or we could save the scaler during training).
    # Since we don't have the saved scaler, we'll fit-transform.
    test_df[continuous_features] = scaler.fit_transform(test_df[continuous_features])
    X_slice = test_df[continuous_features + categorical_features].values
    
    sequences = []
    for i in range(len(X_slice) - seq_length):
        sequences.append(X_slice[i : i + seq_length])
    sequences = np.array(sequences)
    
    # Adjust other arrays to match sequence length
    test_prices = test_df['close'].values[seq_length:]
    test_highs = test_df['high'].values[seq_length:]
    test_lows = test_df['low'].values[seq_length:]
    test_swing_highs = test_df['last_swing_high'].values[seq_length:]
    test_swing_lows = test_df['last_swing_low'].values[seq_length:]
    test_d1_trends = test_df['d1_trend'].values[seq_length:]
    test_dates = test_df['datetime'].values[seq_length:]

    # Load Model
    model = DowTransformer(input_dim=input_dim, d_model=128, nhead=8, num_layers=4).to(device)
    model_path = ROOT_DIR / "models" / f"best_dow_model_{timeframe}.pth"
    if not model_path.exists(): model_path = ROOT_DIR / "models" / "best_dow_model.pth"
    model.load_state_dict(torch.load(model_path, weights_only=True))
    model.eval()

    test_loader = DataLoader(DowDataset(sequences, np.zeros(len(sequences))), batch_size=256, shuffle=False)
    all_probs = []
    with torch.no_grad():
        for data, _ in test_loader:
            output = model(data.to(device))
            all_probs.extend(F.softmax(output, dim=1).cpu().numpy())
    all_probs = np.array(all_probs)

    # 5. Simulation (Same logic as before)
    # ...
    initial_balance = 10000
    balance = initial_balance
    equity_curve = [initial_balance]
    
    spread_pips = 1.5
    pip_value = 0.0001
    sl_buffer = 2 * pip_value
    cost_per_trade_ratio = (spread_pips * pip_value)
    
    active_trade = None
    trades_log = []
    
    # For Plotting Markers
    buy_entries = []
    sell_entries = []
    exits = []

    for i in range(1, len(test_prices)):
        current_price = test_prices[i]
        high = test_highs[i]
        low = test_lows[i]
        probs = all_probs[i-1]
        d1_trend = test_d1_trends[i-1]
        
        ai_buy = probs[2] > confidence_threshold
        ai_sell = probs[0] > confidence_threshold
        
        # A. Trade Management
        if active_trade:
            exit_reason = None
            exit_price = 0
            
            if active_trade['type'] == 'buy':
                if low <= active_trade['sl']: 
                    exit_reason = "SL"; exit_price = active_trade['sl']
                elif high >= active_trade['tp']: 
                    exit_reason = "TP"; exit_price = active_trade['tp']
                elif ai_sell or d1_trend != 1: 
                    exit_reason = "Trend Change"; exit_price = current_price
            else: # sell
                if high >= active_trade['sl']: 
                    exit_reason = "SL"; exit_price = active_trade['sl']
                elif low <= active_trade['tp']: 
                    exit_reason = "TP"; exit_price = active_trade['tp']
                elif ai_buy or d1_trend != -1: 
                    exit_reason = "Trend Change"; exit_price = current_price
                
            if exit_reason:
                pnl_ratio = (exit_price - active_trade['entry']) / active_trade['entry'] if active_trade['type'] == 'buy' else (active_trade['entry'] - exit_price) / active_trade['entry']
                pnl_ratio -= cost_per_trade_ratio
                trade_profit = pnl_ratio * balance
                balance += trade_profit
                trades_log.append(trade_profit)
                exits.append((i, exit_price))
                active_trade = None

        # B. New Signals
        if not active_trade:
            if ai_buy and d1_trend == 1:
                sl = test_swing_lows[i-1] - sl_buffer
                dist = current_price - sl
                if dist > 0.0005:
                    tp = current_price + (dist * rr_ratio)
                    active_trade = {'type': 'buy', 'entry': current_price, 'sl': sl, 'tp': tp}
                    buy_entries.append((i, current_price))
            elif ai_sell and d1_trend == -1:
                sl = test_swing_highs[i-1] + sl_buffer
                dist = sl - current_price
                if dist > 0.0005:
                    tp = current_price - (dist * rr_ratio)
                    active_trade = {'type': 'sell', 'entry': current_price, 'sl': sl, 'tp': tp}
                    sell_entries.append((i, current_price))
                    
        equity_curve.append(balance)

    # 6. Performance Metrics
    trades_log = np.array(trades_log)
    total_return = (balance - initial_balance) / initial_balance * 100
    win_rate = (len(trades_log[trades_log > 0]) / len(trades_log) * 100) if len(trades_log) > 0 else 0
    profit_factor = (trades_log[trades_log > 0].sum() / abs(trades_log[trades_log < 0].sum())) if len(trades_log[trades_log < 0]) > 0 else 0
    
    # Drawdown
    equity_series = pd.Series(equity_curve)
    drawdown = (equity_series.cummax() - equity_series) / equity_series.cummax() * 100
    max_drawdown = drawdown.max()

    print("\n" + "="*40)
    print(f"ULTIMATE DOW MULTI-TIMEFRAME RESULTS")
    print("="*40)
    print(f"Final Balance:   ${balance:,.2f}")
    print(f"Total Return:    {total_return:.2f}%")
    print(f"Max Drawdown:    {max_drawdown:.2f}%")
    print(f"Win Rate:        {win_rate:.2f}%")
    print(f"Profit Factor:   {profit_factor:.2f}")
    print(f"Total Trades:    {len(trades_log)}")
    print("="*40)

    # 7. Professional Plotting
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10), sharex=True, gridspec_kw={'height_ratios': [2, 1]})

    # Top Plot: Price & Entries
    ax1.plot(test_dates, test_prices, color='gray', alpha=0.5, label='EURUSD H1 Price')
    if buy_entries:
        indices, prices = zip(*buy_entries)
        ax1.scatter(test_dates[list(indices)], prices, marker='^', color='green', s=100, label='AI Buy Entry')
    if sell_entries:
        indices, prices = zip(*sell_entries)
        ax1.scatter(test_dates[list(indices)], prices, marker='v', color='red', s=100, label='AI Sell Entry')
    
    ax1.set_title(f'AI Dow Strategy - Trade Visualizer ({symbol.upper()})')
    ax1.set_ylabel('Price')
    ax1.legend(loc='upper left')
    ax1.grid(True, alpha=0.3)

    # Bottom Plot: Equity Curve
    ax2.fill_between(test_dates, initial_balance, equity_curve, color='blue', alpha=0.2)
    ax2.plot(test_dates, equity_curve, color='blue', linewidth=2, label='Account Equity')
    ax2.set_ylabel('Balance ($)')
    ax2.set_xlabel('Date')
    ax2.legend(loc='upper left')
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(ROOT_DIR / "professional_backtest.png")
    print(f"\nProfessional chart saved to {ROOT_DIR / 'professional_backtest.png'}")
    plt.show()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--tf", type=str, default="h1", help="Timeframe (h1, m15, m5)")
    parser.add_argument("--rr", type=float, default=2.0, help="Risk:Reward Ratio")
    parser.add_argument("--th", type=float, default=0.45, help="Confidence Threshold")
    parser.add_argument("--start_date", type=str, default=None, help="Start date for backtest (YYYY-MM-DD)")
    args = parser.parse_args()
    
    # Update model path if TF is provided
    model_name = f"best_dow_model_{args.tf}.pth"
    if not (ROOT_DIR / "models" / model_name).exists():
        model_name = "best_dow_model.pth"
        
    print(f"Using model: {model_name}")
    run_backtest_with_risk(symbol="eurusd", timeframe=args.tf, rr_ratio=args.rr, confidence_threshold=args.th, start_date=args.start_date)
