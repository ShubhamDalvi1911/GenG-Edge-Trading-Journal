from __future__ import annotations

from datetime import datetime

from app.core.datetime_utils import ensure_utc
from typing import Any

from sqlalchemy.orm import Session

from app.models.trade import Trade


INSTRUMENT_SPECS: dict[str, dict[str, float | str]] = {
    "XAUUSD": {"contract_size": 100.0, "asset_class": "metals"},
    "XAGUSD": {"contract_size": 5000.0, "asset_class": "metals"},
    "NAS100": {"contract_size": 1.0, "asset_class": "indices"},
    "US30": {"contract_size": 1.0, "asset_class": "indices"},
    "SPX500": {"contract_size": 1.0, "asset_class": "indices"},
    "BTCUSD": {"contract_size": 1.0, "asset_class": "crypto"},
    "ETHUSD": {"contract_size": 1.0, "asset_class": "crypto"},
}


def normalize_symbol(symbol: str) -> str:
    return "".join(character for character in symbol.upper() if character.isalpha())


def get_contract_size(symbol: str, market_data: dict[str, Any]) -> float:
    configured_size = market_data.get("contract_size")
    if configured_size is not None:
        return float(configured_size)
    normalized_symbol = normalize_symbol(symbol)
    for configured_symbol, specification in INSTRUMENT_SPECS.items():
        if normalized_symbol.startswith(configured_symbol):
            return float(specification["contract_size"])
    if len(normalized_symbol) >= 6 and normalized_symbol[:6].isalpha():
        return 100000.0
    return 1.0


def get_pnl_conversion_rate(symbol: str, entry_price: float, exit_price: float, market_data: dict[str, Any]) -> float:
    account_currency = str(market_data.get("account_currency") or market_data.get("currency") or "USD").upper()
    normalized_symbol = normalize_symbol(symbol)
    quote_currency = str(market_data.get("quote_currency") or (normalized_symbol[3:6] if len(normalized_symbol) >= 6 else account_currency)).upper()
    if quote_currency == account_currency:
        return 1.0
    configured_rate = market_data.get("quote_to_account_rate")
    if configured_rate is not None:
        return float(configured_rate)
    base_currency = normalized_symbol[:3] if len(normalized_symbol) >= 6 else ""
    if base_currency == account_currency and exit_price > 0:
        return 1.0 / exit_price
    return 1.0


def calculate_trade_metrics(trade: dict[str, Any]) -> dict[str, float | str | int]:
    direction = str(trade.get("direction", "LONG")).upper()
    entry_price = float(trade.get("entry_price") or 0)
    exit_price = float(trade.get("exit_price") or 0)
    quantity = float(trade.get("quantity") or 0)
    market_data = trade.get("market_data") or {}
    contract_multiplier = get_contract_size(str(trade.get("symbol", "")), market_data)
    conversion_rate = get_pnl_conversion_rate(str(trade.get("symbol", "")), entry_price, exit_price, market_data)

    if direction == "LONG":
        gross_pnl = (exit_price - entry_price) * quantity * contract_multiplier * conversion_rate
    else:
        gross_pnl = (entry_price - exit_price) * quantity * contract_multiplier * conversion_rate

    commission = float(market_data.get("commission", 0.0) or 0.0)
    swap = float(market_data.get("swap", 0.0) or 0.0)
    net_pnl = gross_pnl - commission - swap

    risk = None
    reward = None
    if trade.get("stop_loss") is not None and trade.get("take_profit") is not None:
        if direction == "LONG":
            risk = max(entry_price - float(trade["stop_loss"]), 0.0)
            reward = max(float(trade["take_profit"]) - entry_price, 0.0)
        else:
            risk = max(float(trade["stop_loss"]) - entry_price, 0.0)
            reward = max(entry_price - float(trade["take_profit"]), 0.0)

    rr = reward / risk if risk and risk > 0 else 0.0
    win_loss = "WIN" if net_pnl > 0 else "LOSS" if net_pnl < 0 else "BREAKEVEN"

    return {
        "gross_pnl": round(gross_pnl, 2),
        "commission": round(commission, 2),
        "swap": round(swap, 2),
        "net_pnl": round(net_pnl, 2),
        "risk_reward_ratio": round(rr, 4),
        "win_loss": win_loss,
        "tlc_score": int(trade.get("tlc_score") or 0),
    }


def normalize_trade_datetimes(trade: Trade) -> None:
    trade.entry_time = ensure_utc(trade.entry_time)
    trade.exit_time = ensure_utc(trade.exit_time)


def upsert_trade_metrics(trade: Trade, db: Session) -> None:
    metrics = calculate_trade_metrics(
        {
            "direction": trade.direction,
            "entry_price": trade.entry_price,
            "exit_price": trade.exit_price,
            "quantity": trade.quantity,
            "symbol": trade.symbol,
            "stop_loss": trade.stop_loss,
            "take_profit": trade.take_profit,
            "market_data": trade.market_data,
            "tlc_score": trade.tlc_score,
        }
    )
    trade.gross_pnl = float(metrics["gross_pnl"])
    trade.commission = float(metrics["commission"])
    trade.swap = float(metrics["swap"])
    trade.net_pnl = float(metrics["net_pnl"])
    trade.risk_reward_ratio = float(metrics["risk_reward_ratio"])
    trade.win_loss = str(metrics["win_loss"])
    trade.tlc_score = int(metrics["tlc_score"])
