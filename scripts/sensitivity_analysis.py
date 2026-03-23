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

def run_sensitivity_analysis(symbol="eurusd", timeframe="h1"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Starting Sensitivity Analysis on {device}...")

    # 1. Load Data
    seq_length = 50
    X_train, X_test, y_train, y_test, input_dim = prepare_training_data(symbol, timeframe, seq_length)
    
    processed_dir = ROOT_DIR / "public" / "data" / "processed"
    all_files = sorted([f for f in processed_dir.iterdir() if symbol in f.name and timeframe in f.name and "dow_features" in f.name])
    df_full = pd.concat([pd.read_csv(f) for f in all_files])
    df_full.sort_values('datetime', inplace=True)
    
    test_prices = df_full['close'].values[-(len(X_test)):]

    # 2. Load Model
    model = DowTransformer(input_dim=input_dim, d_model=128, nhead=8, num_layers=4).to(device)
    model.load_state_dict(torch.load(ROOT_DIR / "models" / "best_dow_model.pth"))
    model.eval()

    # 3. Get Model Probabilities (Softmax)
    print("Extracting AI probabilities...")
    test_loader = DataLoader(DowDataset(X_test, y_test), batch_size=256, shuffle=False)
    all_probs = []
    with torch.no_grad():
        for data, _ in test_loader:
            data = data.to(device)
            output = model(data)
            probs = F.softmax(output, dim=1).cpu().numpy()
            all_probs.extend(probs)
    all_probs = np.array(all_probs)

    # 4. Sensitivity Loop
    thresholds = np.linspace(0.34, 0.70, 25) # From 34% (random) to 70% (very sure)
    results = []
    
    # Real-world settings
    initial_balance = 10000
    spread_pips = 1.5 
    pip_value = 0.0001
    cost_per_trade = spread_pips * pip_value

    print(f"Simulating {len(thresholds)} confidence levels...")
    for threshold in thresholds:
        balance = initial_balance
        position = 0
        entry_price = 0
        num_trades = 0
        
        for i in range(1, len(test_prices)):
            current_price = test_prices[i]
            # Probabilities for this candle: [Sell_prob, Neutral_prob, Buy_prob]
            probs = all_probs[i-1]
            
            # SIGNAL LOGIC WITH THRESHOLD
            buy_signal = probs[2] > threshold
            sell_signal = probs[0] > threshold
            
            # Close Logic
            if position == 1 and not buy_signal: # Close Long
                pnl = (current_price - entry_price) - cost_per_trade
                balance += (pnl / entry_price) * balance
                num_trades += 1
                position = 0
            elif position == -1 and not sell_signal: # Close Short
                pnl = (entry_price - current_price) - cost_per_trade
                balance += (pnl / entry_price) * balance
                num_trades += 1
                position = 0
                
            # Open Logic
            if position == 0:
                if buy_signal:
                    position = 1
                    entry_price = current_price
                elif sell_signal:
                    position = -1
                    entry_price = current_price
        
        total_return = (balance - initial_balance) / initial_balance * 100
        results.append({
            'threshold': threshold,
            'num_trades': num_trades,
            'return': total_return
        })

    # 5. Plotting
    res_df = pd.DataFrame(results)
    
    plt.figure(figsize=(12, 7))
    # Scatter plot: X = Num Trades, Y = Return
    scatter = plt.scatter(res_df['num_trades'], res_df['return'], 
                         c=res_df['threshold'], cmap='viridis', s=100, alpha=0.8)
    
    # Add annotations for key points
    for i, txt in enumerate(res_df['threshold']):
        if i % 3 == 0: # Annotate every few points to avoid clutter
            plt.annotate(f"{txt:.2f}", (res_df['num_trades'][i], res_df['return'][i]), 
                        textcoords="offset points", xytext=(0,10), ha='center')

    plt.colorbar(scatter, label='Confidence Threshold')
    plt.title('Sensitivity Analysis: Trades vs Profit (with 1.5 pip spread)')
    plt.xlabel('Number of Trades')
    plt.ylabel('Total Return (%)')
    plt.grid(True, linestyle='--', alpha=0.6)
    
    output_path = ROOT_DIR / "sensitivity_analysis.png"
    plt.savefig(output_path)
    print(f"\nAnalysis complete. Plot saved to {output_path}")
    print("\nSummary Table:")
    print(res_df.sort_values('return', ascending=False).head(10))
    plt.show()

if __name__ == "__main__":
    run_sensitivity_analysis()
