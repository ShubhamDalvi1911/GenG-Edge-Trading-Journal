from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.models.trade import Trade


def _money(value: Decimal | float | int | None) -> float:
    return round(float(value or 0), 2)


def _stats(trades: list[Trade]) -> dict:
    profits = [Decimal(str(trade.net_pnl or 0)) for trade in trades if (trade.net_pnl or 0) > 0]
    losses = [Decimal(str(trade.net_pnl or 0)) for trade in trades if (trade.net_pnl or 0) < 0]
    gross_profit = sum(profits, Decimal("0"))
    gross_loss = abs(sum(losses, Decimal("0")))
    total = sum((Decimal(str(trade.net_pnl or 0)) for trade in trades), Decimal("0"))
    return {
        "total_trades": len(trades),
        "winning_trades": len(profits),
        "losing_trades": len(losses),
        "breakeven_trades": len(trades) - len(profits) - len(losses),
        "win_rate": _money(Decimal(len(profits)) / len(trades) * 100) if trades else 0,
        "loss_rate": _money(Decimal(len(losses)) / len(trades) * 100) if trades else 0,
        "gross_profit": _money(gross_profit),
        "gross_loss": _money(gross_loss),
        "net_profit": _money(total),
        "average_win": _money(gross_profit / len(profits)) if profits else None,
        "average_loss": _money(sum(losses, Decimal("0")) / len(losses)) if losses else None,
        "best_trade": _money(max((Decimal(str(trade.net_pnl or 0)) for trade in trades), default=Decimal("0"))),
        "worst_trade": _money(min((Decimal(str(trade.net_pnl or 0)) for trade in trades), default=Decimal("0"))),
        "profit_factor": _money(gross_profit / gross_loss) if gross_loss else None,
        "average_trade": _money(total / len(trades)) if trades else None,
        "trading_days": len({(trade.exit_time or trade.entry_time).date() for trade in trades}),
    }


def _best_worst(trades: list[Trade], field: str) -> dict:
    groups: dict[str, list[Trade]] = defaultdict(list)
    for trade in trades:
        groups[str(getattr(trade, field) or "Unassigned")].append(trade)
    rows = [{"name": name, **_stats(items)} for name, items in groups.items()]
    return {
        "best": max(rows, key=lambda row: row["net_profit"], default=None),
        "worst": min(rows, key=lambda row: row["net_profit"], default=None),
        "items": sorted(rows, key=lambda row: row["net_profit"], reverse=True),
    }


def last_30_days(trades: list[Trade], today: date | None = None) -> dict:
    end = today or datetime.now(timezone.utc).date()
    start = end - timedelta(days=29)
    filtered = [trade for trade in trades if start <= (trade.exit_time or trade.entry_time).date() <= end]
    stats = _stats(filtered)
    stats["start_date"] = start.isoformat()
    stats["end_date"] = end.isoformat()
    stats["best_symbol"] = _best_worst(filtered, "symbol")["best"]
    stats["worst_symbol"] = _best_worst(filtered, "symbol")["worst"]
    stats["best_strategy"] = _best_worst(filtered, "strategy")["best"]
    stats["best_session"] = _best_worst(filtered, "session")["best"]
    return stats


def monthly_calendar(trades: list[Trade], year: int, month: int) -> dict:
    daily: dict[str, list[Trade]] = defaultdict(list)
    for trade in trades:
        timestamp = trade.exit_time or trade.entry_time
        if timestamp.year == year and timestamp.month == month:
            daily[timestamp.date().isoformat()].append(trade)
    daily_rows = []
    for day, items in sorted(daily.items()):
        values = [Decimal(str(item.net_pnl or 0)) for item in items]
        daily_rows.append({"date": day, "pnl": _money(sum(values, Decimal("0"))), "trades": len(items), "wins": sum(1 for value in values if value > 0), "losses": sum(1 for value in values if value < 0)})
    weeks: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for row in daily_rows:
        weeks[date.fromisoformat(row["date"]).isocalendar().week] += Decimal(str(row["pnl"]))
    return {"year": year, "month": month, "monthly_pnl": _money(sum((Decimal(str(row["pnl"])) for row in daily_rows), Decimal("0"))), "trading_days": len(daily_rows), "daily": daily_rows, "weekly": [{"week": week, "pnl": _money(pnl)} for week, pnl in sorted(weeks.items())]}


def ai_report(trades: list[Trade]) -> dict:
    stats = _stats(trades)
    symbols = _best_worst(trades, "symbol")
    strategies = _best_worst(trades, "strategy")
    sessions = _best_worst(trades, "session")
    observations = []
    risk_flags = []
    ordered = sorted(trades, key=lambda trade: (trade.exit_time or trade.entry_time, trade.id))
    daily: dict[str, list[Trade]] = defaultdict(list)
    directions = _best_worst(trades, "direction")
    for trade in ordered:
        daily[(trade.exit_time or trade.entry_time).date().isoformat()].append(trade)
    if stats["average_loss"] is not None and stats["average_win"] is not None and abs(stats["average_loss"]) > stats["average_win"]:
        observations.append("Average loss is larger than average win; review position sizing and stop discipline.")
    if sessions["worst"]:
        observations.append(f"{sessions['worst']['name']} is the weakest session by net P&L.")
    if symbols["worst"]:
        observations.append(f"{symbols['worst']['name']} is the weakest symbol by net P&L.")
    missing_stops = sum(1 for trade in trades if trade.stop_loss is None)
    missing_targets = sum(1 for trade in trades if trade.take_profit is None)
    average_confidence = _money(sum(trade.confidence or 0 for trade in trades) / len(trades)) if trades and any(trade.confidence is not None for trade in trades) else None
    average_discipline = _money(sum(trade.discipline or 0 for trade in trades) / len(trades)) if trades and any(trade.discipline is not None for trade in trades) else None
    average_tlc = _money(sum(trade.tlc_score or 0 for trade in trades) / len(trades)) if trades else 0
    max_win_streak = max_loss_streak = current_streak = 0
    current_type = None
    for trade in ordered:
        trade_type = "win" if trade.net_pnl > 0 else "loss" if trade.net_pnl < 0 else "flat"
        if trade_type == current_type and trade_type in {"win", "loss"}:
            current_streak += 1
        else:
            current_type = trade_type
            current_streak = 1 if trade_type in {"win", "loss"} else 0
        max_win_streak = max(max_win_streak, current_streak if trade_type == "win" else 0)
        max_loss_streak = max(max_loss_streak, current_streak if trade_type == "loss" else 0)
    daily_breakdown = [{"date": day, **_stats(items)} for day, items in sorted(daily.items())]
    best_day = max(daily_breakdown, key=lambda item: item["net_profit"], default=None)
    worst_day = min(daily_breakdown, key=lambda item: item["net_profit"], default=None)
    if trades and missing_stops / len(trades) >= 0.25:
        risk_flags.append(f"{missing_stops} of {len(trades)} trades have no recorded stop loss.")
    if trades and missing_targets / len(trades) >= 0.25:
        risk_flags.append(f"{missing_targets} of {len(trades)} trades have no recorded take-profit.")
    if average_discipline is not None and average_discipline < 60:
        risk_flags.append(f"Average self-rated discipline is {average_discipline}/100.")
    recommendations = []
    if not trades:
        recommendations.append("Add journal trades to generate an evidence-based report.")
    elif len(trades) < 20:
        recommendations.append(f"Collect at least {20 - len(trades)} more trades before making large process changes.")
    if risk_flags:
        recommendations.append("Complete stop, target, and process fields consistently so risk and execution patterns remain measurable.")
    if sessions["worst"]:
        recommendations.append(f"Review {sessions['worst']['name']} trades separately and compare them with your written setup rules.")
    if max_loss_streak >= 3:
        recommendations.append(f"Define a pause rule after a {max_loss_streak}-trade losing streak and review the next setup before entering.")
    if not recommendations:
        recommendations.append("Keep the current process stable and review this report after the next 10 trades.")
    return {
        "summary": stats,
        "best_symbol": symbols["best"], "worst_symbol": symbols["worst"],
        "best_strategy": strategies["best"], "worst_strategy": strategies["worst"],
        "best_session": sessions["best"], "weakest_session": sessions["worst"],
        "best_direction": directions["best"], "worst_direction": directions["worst"],
        "observations": observations, "recommendations": recommendations,
        "risk_flags": risk_flags,
        "quality": {"average_confidence": average_confidence, "average_discipline": average_discipline, "average_tlc": average_tlc, "trades_without_stop": missing_stops, "trades_without_target": missing_targets},
        "streaks": {"max_win_streak": max_win_streak, "max_loss_streak": max_loss_streak},
        "daily_breakdown": daily_breakdown[-14:], "best_day": best_day, "worst_day": worst_day,
        "analysis_method": "Local deterministic analysis of stored journal trades. No external LLM or cloud data used.",
        "data_available": bool(trades),
    }