import os
import sys
import argparse
from pathlib import Path

# Add project root to sys.path to handle 'models' package import correctly
ROOT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler

# Import the model we just created
from models.dow_transformer import DowTransformer
DATA_DIR = ROOT_DIR / "public" / "data" / "processed"

class DowDataset(Dataset):
    def __init__(self, features, targets):
        self.features = torch.FloatTensor(features)
        self.targets = torch.LongTensor(targets)

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return self.features[idx], self.targets[idx]

def prepare_training_data(symbol="eurusd", timeframe="h1", seq_length=50, train_split=0.7):
    print(f"Loading data for {symbol} {timeframe}...")
    all_files = sorted([f for f in DATA_DIR.iterdir() if symbol in f.name and timeframe in f.name and "dow_features" in f.name])
    if not all_files:
        raise ValueError(f"No processed files found for {symbol} {timeframe}")

    df = pd.concat([pd.read_csv(f) for f in all_files])
    df.sort_values('datetime', inplace=True)
    
    # --- ADVANCED FEATURE ENGINEERING ---
    # 1. Use Log Returns instead of raw prices
    df['returns'] = np.log(df['close'] / df['close'].shift(1))
    df['range'] = (df['high'] - df['low']) / df['close']
    
    # 2. Distance to Swings (normalized by price)
    df['dist_sh'] = (df['last_swing_high'] - df['close']) / df['close']
    df['dist_sl'] = (df['last_swing_low'] - df['close']) / df['close']
    
    # 3. Features for the AI
    continuous_features = ['returns', 'range', 'dist_sh', 'dist_sl', 'relative_volume']
    categorical_features = ['dow_trend', 'volume_confirmation']
    
    # Scale continuous features
    scaler = StandardScaler()
    df[continuous_features] = scaler.fit_transform(df[continuous_features])
    
    X_data = df[continuous_features + categorical_features].values
    
    # --- REFINED TARGET LABELING ---
    horizon = 5
    future_max_ret = df['returns'].rolling(window=horizon).sum().shift(-horizon)
    
    # Quantiles for dynamic thresholds
    threshold_up = future_max_ret.quantile(0.66)
    threshold_down = future_max_ret.quantile(0.33)
    
    targets = np.ones(len(df)) # Neutral
    targets[future_max_ret > threshold_up] = 2 # Buy
    targets[future_max_ret < threshold_down] = 0 # Sell
    
    # Clean up NaNs
    valid_idx = ~(np.isnan(X_data).any(axis=1) | np.isnan(targets))
    X_data = X_data[valid_idx]
    targets = targets[valid_idx]
    
    # Sliding Windows
    sequences, labels = [], []
    for i in range(len(X_data) - seq_length):
        sequences.append(X_data[i : i + seq_length])
        labels.append(targets[i + seq_length])
        
    sequences = np.array(sequences)
    labels = np.array(labels)
    
    split_idx = int(len(sequences) * train_split)
    return sequences[:split_idx], sequences[split_idx:], labels[:split_idx], labels[split_idx:], X_data.shape[1]

def train_model(tf="h1", epochs=20):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device} | Training on {tf}")
    
    seq_length = 50
    batch_size = 128
    lr = 0.0001
    
    X_train, X_test, y_train, y_test, input_dim = prepare_training_data(timeframe=tf, seq_length=seq_length)
    
    # Calculate Class Weights
    class_sample_count = np.unique(y_train, return_counts=True)[1]
    weights = 1. / torch.tensor(class_sample_count, dtype=torch.float)
    weights = weights.to(device)
    
    train_loader = DataLoader(DowDataset(X_train, y_train), batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(DowDataset(X_test, y_test), batch_size=batch_size)
    
    model = DowTransformer(input_dim=input_dim, d_model=128, nhead=8, num_layers=4).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min', patience=3, factor=0.5)
    
    print(f"Starting Training on {len(X_train)} samples...")
    best_acc = 0
    save_name = f"best_dow_model_{tf}.pth"
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0
        for data, target in train_loader:
            data, target = data.to(device), target.to(device)
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item()
            
        # Validation
        model.eval()
        val_loss = 0
        correct = 0
        with torch.no_grad():
            for data, target in test_loader:
                data, target = data.to(device), target.to(device)
                output = model(data)
                val_loss += criterion(output, target).item()
                pred = output.argmax(dim=1)
                correct += pred.eq(target).sum().item()
        
        avg_val_loss = val_loss/len(test_loader)
        scheduler.step(avg_val_loss)
        acc = 100. * correct / len(test_loader.dataset)
        
        if acc > best_acc:
            best_acc = acc
            torch.save(model.state_dict(), ROOT_DIR / "models" / save_name)
            
        print(f"Epoch {epoch+1:02d} | Train: {train_loss/len(train_loader):.4f} | Val: {avg_val_loss:.4f} | Acc: {acc:.2f}% (Best: {best_acc:.2f}%)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tf", type=str, default="h1", help="Timeframe (h1, m15, m5)")
    parser.add_argument("--epochs", type=int, default=20)
    args = parser.parse_args()
    
    train_model(tf=args.tf, epochs=args.epochs)
