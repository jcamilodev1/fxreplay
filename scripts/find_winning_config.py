import os
import sys
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
from pathlib import Path
from torch.utils.data import DataLoader

# Add project root to sys.path
ROOT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from models.dow_transformer import DowTransformer
from scripts.train_dow_model import prepare_training_data, DowDataset

def optimize_strategy(tf="h1"):
    symbol = "eurusd"
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Starting Hyperparameter Optimization for {tf.upper()} on {device}...")

    # 1. Load Data
    seq_length = 50
    X_train, X_test, y_train, y_test, input_dim = prepare_training_data(symbol, tf, seq_length)
    
    processed_dir = ROOT_DIR / "public" / "data" / "processed"
    tf_files = sorted([f for f in processed_dir.iterdir() if symbol in f.name and f"_{tf}_" in f.name and "dow_features" in f.name])
    df_tf = pd.concat([pd.read_csv(f) for f in tf_files])
    df_tf.sort_values('datetime', inplace=True)
    df_tf['datetime'] = pd.to_datetime(df_tf['datetime'])
    
    d1_files = sorted([f for f in processed_dir.iterdir() if symbol in f.name and "d1" in f.name and "dow_features" in f.name])
    df_d1 = pd.concat([pd.read_csv(f) for f in d1_files])
    df_d1.sort_values('datetime', inplace=True)
    df_d1['datetime'] = pd.to_datetime(df_d1['datetime'])
    df_d1 = df_d1[['datetime', 'dow_trend']].rename(columns={'dow_trend': 'd1_trend'})

    df_merged = pd.merge_asof(df_tf, df_d1, on='datetime', direction='backward')
    test_df = df_merged.iloc[-(len(X_test)):].copy()
    
    test_prices = test_df['close'].values
    test_highs = test_df['high'].values
    test_lows = test_df['low'].values
    test_swing_highs = test_df['last_swing_high'].values
    test_swing_lows = test_df['last_swing_low'].values
    test_d1_trends = test_df['d1_trend'].values

    # 2. Load Model & Get Probabilities
    model_name = f"best_dow_model_{tf}.pth"
    # Fallback to generic name if TF-specific doesn't exist
    if not (ROOT_DIR / "models" / model_name).exists():
        model_name = "best_dow_model.pth"
        
    model = DowTransformer(input_dim=input_dim, d_model=128, nhead=8, num_layers=4).to(device)
    model.load_state_dict(torch.load(ROOT_DIR / "models" / model_name, weights_only=True))
    model.eval()

    test_loader = DataLoader(DowDataset(X_test, y_test), batch_size=512, shuffle=False)
    all_probs = []
    with torch.no_grad():
        for data, _ in test_loader:
            data = data.to(device)
            output = model(data)
            probs = F.softmax(output, dim=1).cpu().numpy()
            all_probs.extend(probs)
    all_probs = np.array(all_probs)

    # 3. Search Space
    thresholds = [0.38, 0.42, 0.45, 0.48, 0.52]
    rr_ratios = [1.2, 1.5, 2.0, 2.5, 3.0]
    
    initial_balance = 10000
    spread_pips = 1.5
    pip_value = 0.0001
    sl_buffer = 2 * pip_value
    cost_per_trade_ratio = (spread_pips * pip_value)
    
    results = []

    print(f"Testing {len(thresholds) * len(rr_ratios)} combinations...")
    for threshold in thresholds:
        for rr in rr_ratios:
            balance = initial_balance
            active_trade = None
            num_trades = 0
            equity = [initial_balance]
            
            for i in range(1, len(test_prices)):
                current_price = test_prices[i]
                probs = all_probs[i-1]
                d1_trend = test_d1_trends[i-1]
                
                ai_buy = probs[2] > threshold
                ai_sell = probs[0] > threshold
                
                if active_trade:
                    exit_price = 0
                    if active_trade['type'] == 'buy':
                        if test_lows[i] <= active_trade['sl']: exit_price = active_trade['sl']
                        elif test_highs[i] >= active_trade['tp']: exit_price = active_trade['tp']
                        elif ai_sell or d1_trend != 1: exit_price = current_price
                    else:
                        if test_highs[i] >= active_trade['sl']: exit_price = active_trade['sl']
                        elif test_lows[i] <= active_trade['tp']: exit_price = active_trade['tp']
                        elif ai_buy or d1_trend != -1: exit_price = current_price
                        
                    if exit_price > 0:
                        pnl = (exit_price - active_trade['entry']) / active_trade['entry'] if active_trade['type'] == 'buy' else (active_trade['entry'] - exit_price) / active_trade['entry']
                        balance += (pnl - cost_per_trade_ratio) * balance
                        num_trades += 1
                        active_trade = None
                
                if not active_trade:
                    if ai_buy and d1_trend == 1:
                        sl = test_swing_lows[i-1] - sl_buffer
                        if current_price - sl > 0.0005:
                            active_trade = {'type': 'buy', 'entry': current_price, 'sl': sl, 'tp': current_price + (current_price - sl) * rr}
                    elif ai_sell and d1_trend == -1:
                        sl = test_swing_highs[i-1] + sl_buffer
                        if sl - current_price > 0.0005:
                            active_trade = {'type': 'sell', 'entry': current_price, 'sl': sl, 'tp': current_price - (sl - current_price) * rr}
                
                equity.append(balance)
            
            total_return = (balance - initial_balance) / initial_balance * 100
            equity_series = pd.Series(equity)
            drawdown = (equity_series.cummax() - equity_series) / equity_series.cummax() * 100
            max_dd = drawdown.max()
            
            results.append({
                'threshold': threshold,
                'rr': rr,
                'return': total_return,
                'max_dd': max_dd,
                'trades': num_trades,
                'score': total_return / (max_dd + 0.1)
            })
            print(f"T: {threshold:.2f} | RR: {rr:.1f} | Ret: {total_return:6.2f}% | Trades: {num_trades}")

    res_df = pd.DataFrame(results)
    best = res_df.sort_values('score', ascending=False).iloc[0]
    
    print("\n" + "="*50)
    print(f"OPTIMIZATION COMPLETE FOR {tf.upper()}")
    print("="*50)
    print(f"BEST CONFIGURATION:")
    print(f"Confidence Threshold: {best['threshold']:.3f}")
    print(f"Risk:Reward Ratio:   {best['rr']:.1f}")
    print(f"Expected Return:     {best['return']:.2f}%")
    print(f"Max Drawdown:        {best['max_dd']:.2f}%")
    print(f"Total Trades:        {int(best['trades'])}")
    print("="*50)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--tf", type=str, default="h1", help="Timeframe (h1, m15, m5)")
    args = parser.parse_args()
    optimize_strategy(tf=args.tf)
