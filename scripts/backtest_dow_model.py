import os
import sys
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader

# Add project root to sys.path
ROOT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from models.dow_transformer import DowTransformer
from scripts.train_dow_model import prepare_training_data, DowDataset

def run_backtest(symbol="eurusd", timeframe="h1"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running Backtest on {device}...")

    # 1. Load the same data split used for testing
    seq_length = 50
    X_train, X_test, y_train, y_test, input_dim = prepare_training_data(symbol, timeframe, seq_length)
    
    # We need the original prices for the test period to calculate PnL
    # (re-loading to match the test indices exactly)
    processed_dir = ROOT_DIR / "public" / "data" / "processed"
    all_files = sorted([f for f in processed_dir.iterdir() if symbol in f.name and timeframe in f.name and "dow_features" in f.name])
    df_full = pd.concat([pd.read_csv(f) for f in all_files])
    df_full.sort_values('datetime', inplace=True)
    
    # The test period is the last 30%
    split_idx = int(len(df_full) * 0.7)
    # Adjust for window and horizon used in prepare_training_data
    # In prepare_training_data: valid_idx = ~(np.isnan(X_data).any(axis=1) | np.isnan(targets))
    # For simplicity, we'll take the prices corresponding to X_test
    test_prices = df_full['close'].values[-(len(X_test)):]
    test_dates = df_full['datetime'].values[-(len(X_test)):]

    # 2. Load the Best Model
    model = DowTransformer(input_dim=input_dim, d_model=128, nhead=8, num_layers=4).to(device)
    model_path = ROOT_DIR / "models" / "best_dow_model.pth"
    if not model_path.exists():
        print(f"Error: Model not found at {model_path}")
        return
    
    model.load_state_dict(torch.load(model_path))
    model.eval()

    # 3. Generate Signals
    print("Generating AI signals for the test period...")
    test_loader = DataLoader(DowDataset(X_test, y_test), batch_size=128, shuffle=False)
    
    all_preds = []
    with torch.no_grad():
        for data, _ in test_loader:
            data = data.to(device)
            output = model(data)
            preds = output.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
    
    all_preds = np.array(all_preds)

    # 4. Simulation Logic
    print("Simulating trades...")
    initial_balance = 10000
    balance = initial_balance
    equity_curve = [initial_balance]
    position = 0 # 1 for Long, -1 for Short, 0 for Flat
    entry_price = 0
    trades = []
    
    # Risk Management Settings
    risk_per_trade = 0.01 # 1% of balance
    pips_precision = 0.0001
    
    for i in range(1, len(test_prices)):
        current_price = test_prices[i]
        signal = all_preds[i-1] # Use the prediction from the previous candle to trade at the open of current
        
        # Close position if signal changes or opposite
        if position == 1 and signal == 0: # Long to Short/Neutral
            pnl = (current_price - entry_price) / entry_price * balance
            balance += pnl
            trades.append(pnl)
            position = 0
        elif position == -1 and signal == 2: # Short to Long/Neutral
            pnl = (entry_price - current_price) / entry_price * balance
            balance += pnl
            trades.append(pnl)
            position = 0
            
        # Open new position if flat
        if position == 0:
            if signal == 2: # Buy
                position = 1
                entry_price = current_price
            elif signal == 0: # Sell
                position = -1
                entry_price = current_price
                
        equity_curve.append(balance)

    # 5. Performance Metrics
    trades = np.array(trades)
    total_return = (balance - initial_balance) / initial_balance * 100
    win_rate = (len(trades[trades > 0]) / len(trades) * 100) if len(trades) > 0 else 0
    profit_factor = (trades[trades > 0].sum() / abs(trades[trades < 0].sum())) if len(trades[trades < 0]) > 0 else 0
    
    print("\n" + "="*30)
    print(f"BACKTEST RESULTS: {symbol.upper()} {timeframe.upper()}")
    print("="*30)
    print(f"Initial Balance: ${initial_balance:,.2f}")
    print(f"Final Balance:   ${balance:,.2f}")
    print(f"Total Return:    {total_return:.2f}%")
    print(f"Win Rate:        {win_rate:.2f}%")
    print(f"Profit Factor:   {profit_factor:.2f}")
    print(f"Total Trades:    {len(trades)}")
    print("="*30)

    # 6. Plotting
    plt.figure(figsize=(12, 6))
    plt.plot(test_dates, equity_curve, label='AI Equity Curve', color='blue')
    plt.title(f'AI Dow Theory Strategy - {symbol.upper()} {timeframe.upper()}')
    plt.xlabel('Date')
    plt.ylabel('Balance ($)')
    plt.legend()
    plt.grid(True)
    
    # Save the plot
    output_plot = ROOT_DIR / "backtest_result.png"
    plt.savefig(output_plot)
    print(f"\nEquity curve saved to {output_plot}")
    plt.show()

if __name__ == "__main__":
    run_backtest()
