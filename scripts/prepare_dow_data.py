import pandas as pd
import numpy as np
import json
import os
import argparse
from pathlib import Path

# Paths
ROOT_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = ROOT_DIR / "public" / "data"
PROCESSED_DIR = ROOT_DIR / "public" / "data" / "processed"

def load_data(filepath):
    """Loads JSON data from MetaTrader into a Pandas DataFrame."""
    print(f"Loading {filepath}...")
    with open(filepath, 'r') as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    # Ensure time is datetime type for potential plotting/resampling later
    df['datetime'] = pd.to_datetime(df['time'], unit='s')
    df.set_index('datetime', inplace=True)
    return df

def find_swings(df, window=5):
    """
    Finds Swing Highs and Swing Lows.
    window: Number of bars before and after to check for local extrema.
    """
    print(f"Calculating Swing Highs and Lows (Window: {window})...")
    
    # Calculate rolling max and min
    # We shift negative window to look forward, and positive to look backward
    rolling_max_backward = df['high'].rolling(window=window, min_periods=1).max()
    rolling_max_forward = df['high'].rolling(window=window, min_periods=1).max().shift(-window)
    
    rolling_min_backward = df['low'].rolling(window=window, min_periods=1).min()
    rolling_min_forward = df['low'].rolling(window=window, min_periods=1).min().shift(-window)

    # A swing high is when the current high is strictly greater than the rolling max before and after
    df['is_swing_high'] = (df['high'] > rolling_max_backward.shift(1)) & (df['high'] > rolling_max_forward)
    # A swing low is when the current low is strictly less than the rolling min before and after
    df['is_swing_low'] = (df['low'] < rolling_min_backward.shift(1)) & (df['low'] < rolling_min_forward)

    # We only care about the values of the swings, forward fill them to know the "current" active swing level
    df['last_swing_high'] = np.where(df['is_swing_high'], df['high'], np.nan)
    df['last_swing_high'] = df['last_swing_high'].ffill()

    df['last_swing_low'] = np.where(df['is_swing_low'], df['low'], np.nan)
    df['last_swing_low'] = df['last_swing_low'].ffill()

    return df

def classify_dow_trend(df):
    """
    Classifies the trend based on Dow Theory (HH, HL, LH, LL).
    """
    print("Classifying Dow Theory Trends...")
    
    # We need to know the *previous* swing high/low to compare
    # To avoid comparing the same forward-filled value with itself, we track changes
    
    df['prev_swing_high'] = df['last_swing_high'].shift(1)
    df['prev_swing_low'] = df['last_swing_low'].shift(1)

    # Update previous only when a new swing occurs
    df['prev_swing_high'] = df['prev_swing_high'].mask(df['last_swing_high'] == df['prev_swing_high']).ffill()
    df['prev_swing_low'] = df['prev_swing_low'].mask(df['last_swing_low'] == df['prev_swing_low']).ffill()

    # Define Higher/Lower Highs/Lows
    df['HH'] = df['last_swing_high'] > df['prev_swing_high']
    df['LH'] = df['last_swing_high'] < df['prev_swing_high']
    df['HL'] = df['last_swing_low'] > df['prev_swing_low']
    df['LL'] = df['last_swing_low'] < df['prev_swing_low']

    # Dow Trend Logic
    # 1: Uptrend (HH + HL)
    # -1: Downtrend (LH + LL)
    # 0: Consolidation/Ranging (everything else)
    
    conditions = [
        (df['HH'] & df['HL']),
        (df['LH'] & df['LL'])
    ]
    choices = [1, -1]
    
    df['dow_trend'] = np.select(conditions, choices, default=0)
    
    # Clean up intermediate columns to keep the dataset clean for the Transformer
    cols_to_drop = ['HH', 'LH', 'HL', 'LL', 'prev_swing_high', 'prev_swing_low']
    df.drop(columns=cols_to_drop, inplace=True)
    
    return df

def analyze_volume(df, sma_period=20):
    """
    Normalizes volume and checks if it confirms the trend according to Dow Theory.
    """
    print(f"Analyzing Volume (SMA {sma_period})...")
    # Volume Moving Average
    df['volume_sma'] = df['volume'].rolling(window=sma_period, min_periods=1).mean()
    
    # Volume Relative to SMA (useful feature for Transformer)
    # E.g., 1.5 means volume is 50% above average
    df['relative_volume'] = df['volume'] / df['volume_sma']
    
    # Dow Theory Volume Confirmation
    # Uptrend confirmed if volume is high on green candles (bullish) and low on red candles (bearish)
    df['is_bull_candle'] = df['close'] > df['open']
    
    # Vol Confirmation Feature:
    # +1: High volume confirming the trend (e.g., Uptrend + Green Candle + High Vol)
    # -1: High volume against the trend (Divergence)
    # 0: Normal/Low volume
    
    conditions = [
        (df['dow_trend'] == 1) & (df['is_bull_candle']) & (df['relative_volume'] > 1.2),
        (df['dow_trend'] == -1) & (~df['is_bull_candle']) & (df['relative_volume'] > 1.2),
        (df['dow_trend'] == 1) & (~df['is_bull_candle']) & (df['relative_volume'] > 1.2), # High vol on pullback in uptrend (divergence)
        (df['dow_trend'] == -1) & (df['is_bull_candle']) & (df['relative_volume'] > 1.2)  # High vol on pullback in downtrend (divergence)
    ]
    choices = [1, 1, -1, -1]
    
    df['volume_confirmation'] = np.select(conditions, choices, default=0)
    
    return df

def prepare_features(filepath, swing_window=5, volume_sma=20):
    df = load_data(filepath)
    df = find_swings(df, window=swing_window)
    df = classify_dow_trend(df)
    df = analyze_volume(df, sma_period=volume_sma)
    
    # Drop rows with NaN values created by rolling windows at the beginning
    df.dropna(inplace=True)
    
    return df

def main():
    parser = argparse.ArgumentParser(description="Process MT5 JSON data to extract Dow Theory features for AI.")
    parser.add_argument("--file", type=str, help="Specific JSON file to process (e.g., eurusd_h1.json). If omitted, processes all in public/data/")
    parser.add_argument("--symbol", type=str, help="Specific symbol to process (e.g., 'eurusd'). Only files containing this name will be processed.")
    parser.add_argument("--window", type=int, default=5, help="Swing high/low lookback/lookforward window. Default 5.")
    args = parser.parse_args()

    os.makedirs(PROCESSED_DIR, exist_ok=True)

    files_to_process = []
    if args.file:
        files_to_process.append(DATA_DIR / args.file)
    elif args.symbol:
        # Process files that contain the symbol name in their filename
        files_to_process = [f for f in DATA_DIR.iterdir() if f.suffix == '.json' and f.is_file() and args.symbol.lower() in f.name.lower()]
    else:
        files_to_process = [f for f in DATA_DIR.iterdir() if f.suffix == '.json' and f.is_file()]

    if not files_to_process:
        print("No .json files found in public/data/")
        return

    for filepath in files_to_process:
        try:
            df = prepare_features(filepath, swing_window=args.window)
            
            output_filename = f"{filepath.stem}_dow_features.csv"
            output_path = PROCESSED_DIR / output_filename
            
            # Save to CSV for easy inspection and loading by PyTorch
            df.to_csv(output_path)
            
            print(f"Successfully processed {filepath.name}.")
            print(f"Shape: {df.shape}. Saved to {output_path.relative_to(ROOT_DIR)}")
            print("-" * 50)
            
        except Exception as e:
            print(f"Error processing {filepath.name}: {e}")

if __name__ == "__main__":
    main()
