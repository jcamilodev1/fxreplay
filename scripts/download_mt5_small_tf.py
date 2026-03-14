import MetaTrader5 as mt5
import pandas as pd
import json
import os
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")

SYMBOLS = {
    "EURUSD": 5,
    "USDJPY": 3,
    "US100": 2,
}

TIMEFRAMES = {
    "M5":  (mt5.TIMEFRAME_M5, 90_000),
    "M15": (mt5.TIMEFRAME_M15, 90_000),
}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if not mt5.initialize():
        print(f"MT5 init failed: {mt5.last_error()}")
        return

    print(f"Connected. Downloading M5 and M15 with copy_rates_from_pos...")

    for symbol, decimals in SYMBOLS.items():
        info = mt5.symbol_info(symbol)
        if info is None:
            print(f"  [SKIP] {symbol} not found")
            continue
        if not info.visible:
            mt5.symbol_select(symbol, True)

        for tf_name, (tf_value, count) in TIMEFRAMES.items():
            print(f"  {symbol} {tf_name} (last {count} bars)...", end=" ")

            rates = mt5.copy_rates_from_pos(symbol, tf_value, 0, count)

            if rates is None or len(rates) == 0:
                print(f"FAILED - {mt5.last_error()}")
                continue

            df = pd.DataFrame(rates)
            df["time"] = df["time"].astype(int)
            df = df[["time", "open", "high", "low", "close", "tick_volume"]].copy()
            df.rename(columns={"tick_volume": "volume"}, inplace=True)

            for col in ["open", "high", "low", "close"]:
                df[col] = df[col].round(decimals)

            records = df.to_dict(orient="records")
            safe_name = symbol.lower()
            filename = f"{safe_name}_{tf_name.lower()}.json"
            filepath = os.path.join(OUTPUT_DIR, filename)

            with open(filepath, "w") as f:
                json.dump(records, f, separators=(",", ":"))

            size_mb = os.path.getsize(filepath) / (1024 * 1024)
            print(f"OK - {len(records)} candles ({size_mb:.1f} MB)")

    mt5.shutdown()
    print("\nDone!")


if __name__ == "__main__":
    main()
