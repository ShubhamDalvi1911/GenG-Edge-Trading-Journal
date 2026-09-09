from __future__ import annotations

from collections import defaultdict
from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from app.models.account import Account
from app.models.trade import Trade


MONEY = Decimal("0.01")


def money(value: Decimal | float | int) -> float:
    return float(Decimal(str(value)).quantize(MONEY, rounding=ROUND_HALF_UP))


def normalized_limit(value: float | None, limit_type: str | None, starting_balance: Decimal) -> Decimal | None:
    if value is None:
        return None
    amount = Decimal(str(value))
    return (starting_balance * amount / Decimal("100")) if limit_type == "percentage" else amount


def account_rules(account: Account) -> dict:
    starting = Decimal(str(account.initial_balance or 0))
    target = normalized_limit(account.profit_target, account.profit_target_type, starting)
    daily_loss = normalized_limit(account.daily_loss_limit, account.daily_loss_limit_type, starting)
    max_drawdown = normalized_limit(account.max_drawdown, account.max_drawdown_type, starting)
    return {
        "profit_target_amount": money(target or 0) if target is not None else None,
        "daily_loss_limit_amount": money(daily_loss or 0) if daily_loss is not None else None,
        "maximum_drawdown_amount": money(max_drawdown or 0) if max_drawdown is not None else None,
        "minimum_trading_days": account.minimum_trading_days or 0,
        "maximum_trading_days": account.maximum_trading_days,
        "daily_loss_calculation_method": account.daily_loss_calculation_method or "closed_trades_only",
        "drawdown_type": account.drawdown_type or "static",
        "trailing_drawdown_type": account.trailing_drawdown_type,
        "trailing_drawdown_value": account.trailing_drawdown_value,
        "consistency_enabled": bool(account.consistency_rule_enabled),
        "consistency_max_best_day_percent": account.consistency_max_best_day_percent,
    }


def local_day(trade: Trade, timezone: ZoneInfo) -> str:
    timestamp = trade.exit_time or trade.entry_time
    return timestamp.replace(tzinfo=ZoneInfo("UTC")).astimezone(timezone).date().isoformat()


def status_for_usage(usage: Decimal | None) -> str:
    if usage is None:
        return "DATA_UNAVAILABLE"
    if usage > 1:
        return "BREACHED"
    if usage >= Decimal("0.9"):
        return "CRITICAL"
    if usage >= Decimal("0.7"):
        return "WARNING"
    return "SAFE"


def evaluate_account(account: Account, trades: list[Trade]) -> dict:
    rules = account_rules(account)
    starting = Decimal(str(account.initial_balance or 0))
    ordered = sorted(trades, key=lambda trade: (trade.exit_time or trade.entry_time, trade.id))
    timezone = ZoneInfo(account.daily_reset_timezone or "UTC")
    total_net = sum((Decimal(str(trade.net_pnl or 0)) for trade in ordered), Decimal("0"))
    calculated_balance = starting + total_net
    recorded_balance = Decimal(str(account.current_balance or 0))
    reconciliation_difference = recorded_balance - calculated_balance

    equity = starting
    peak = starting
    high_water_mark = starting
    equity_points = []
    daily_groups: dict[str, list[Trade]] = defaultdict(list)
    for trade in ordered:
        day = local_day(trade, timezone)
        daily_groups[day].append(trade)
        equity += Decimal(str(trade.net_pnl or 0))
        peak = max(peak, equity)
        high_water_mark = max(high_water_mark, equity)
        equity_points.append({"timestamp": (trade.exit_time or trade.entry_time).isoformat(), "equity": money(equity), "drawdown": money(equity - peak)})

    if rules["drawdown_type"] == "trailing" and rules["maximum_drawdown_amount"] is not None:
        floor = high_water_mark - Decimal(str(rules["maximum_drawdown_amount"]))
    elif rules["drawdown_type"] == "trailing" and rules["trailing_drawdown_value"] is not None:
        trailing = Decimal(str(rules["trailing_drawdown_value"]))
        floor = high_water_mark * (Decimal("1") - trailing / Decimal("100")) if rules["trailing_drawdown_type"] == "percentage" else high_water_mark - trailing
    else:
        floor = starting - Decimal(str(rules["maximum_drawdown_amount"] or 0)) if rules["maximum_drawdown_amount"] is not None else None

    daily_rows = []
    daily_loss_limit = Decimal(str(rules["daily_loss_limit_amount"])) if rules["daily_loss_limit_amount"] is not None else None
    for day, day_trades in sorted(daily_groups.items()):
        day_pnl = sum((Decimal(str(trade.net_pnl or 0)) for trade in day_trades), Decimal("0"))
        day_start = starting + sum((Decimal(str(trade.net_pnl or 0)) for trade in ordered if local_day(trade, timezone) < day), Decimal("0"))
        day_end = day_start + day_pnl
        loss_used = max(Decimal("0"), -day_pnl)
        usage = loss_used / daily_loss_limit if daily_loss_limit and daily_loss_limit > 0 else None
        daily_rows.append({"date": day, "starting_balance": money(day_start), "net_pnl": money(day_pnl), "ending_balance": money(day_end), "daily_return_percent": money(day_pnl / day_start * 100) if day_start else None, "daily_loss_used": money(loss_used), "daily_loss_used_percent": money(usage * 100) if usage is not None else None, "trades": len(day_trades), "wins": sum(1 for trade in day_trades if (trade.net_pnl or 0) > 0), "losses": sum(1 for trade in day_trades if (trade.net_pnl or 0) < 0), "status": status_for_usage(usage)})

    daily_loss_used = Decimal(str(daily_rows[-1]["daily_loss_used"])) if daily_rows else Decimal("0")
    daily_usage = daily_loss_used / daily_loss_limit if daily_loss_limit and daily_loss_limit > 0 else None
    current_drawdown = max(Decimal("0"), starting - equity) if rules["drawdown_type"] == "static" else max(Decimal("0"), high_water_mark - equity)
    drawdown_limit = Decimal(str(rules["maximum_drawdown_amount"])) if rules["maximum_drawdown_amount"] is not None else None
    drawdown_usage = current_drawdown / drawdown_limit if drawdown_limit and drawdown_limit > 0 else None
    winners = [Decimal(str(trade.net_pnl or 0)) for trade in ordered if (trade.net_pnl or 0) > 0]
    losers = [Decimal(str(trade.net_pnl or 0)) for trade in ordered if (trade.net_pnl or 0) < 0]
    gross_profit = sum(winners, Decimal("0"))
    gross_loss = abs(sum(losers, Decimal("0")))
    target = Decimal(str(rules["profit_target_amount"])) if rules["profit_target_amount"] is not None else None
    progress = total_net / target if target and target > 0 else None
    best_day = max((Decimal(str(row["net_pnl"])) for row in daily_rows), default=Decimal("0"))
    consistency = best_day / total_net if total_net > 0 else None
    statuses = [status_for_usage(daily_usage), status_for_usage(drawdown_usage)]
    if rules["consistency_enabled"] and rules["consistency_max_best_day_percent"] is not None and consistency is not None and consistency * 100 > Decimal(str(rules["consistency_max_best_day_percent"])):
        statuses.append("WARNING")
    overall = "BREACHED" if "BREACHED" in statuses else "CRITICAL" if "CRITICAL" in statuses else "WARNING" if "WARNING" in statuses else "TARGET_REACHED" if target and total_net >= target else "SAFE"
    return {
        "rules": rules,
        "performance": {"total_trades": len(ordered), "winning_trades": len(winners), "losing_trades": len(losers), "breakeven_trades": len(ordered) - len(winners) - len(losers), "gross_profit": money(gross_profit), "gross_loss": money(gross_loss), "net_profit": money(total_net), "win_rate": money(Decimal(len(winners)) / len(ordered) * 100) if ordered else 0, "loss_rate": money(Decimal(len(losers)) / len(ordered) * 100) if ordered else 0, "average_win": money(gross_profit / len(winners)) if winners else None, "average_loss": money(gross_loss / len(losers)) if losers else None, "largest_win": money(max(winners)) if winners else None, "largest_loss": money(min(losers)) if losers else None, "profit_factor": money(gross_profit / gross_loss) if gross_loss else None, "expectancy": money((Decimal(len(winners)) / len(ordered) * (gross_profit / len(winners)) - Decimal(len(losers)) / len(ordered) * (gross_loss / len(losers)))) if ordered and winners and losers else None, "average_pnl": money(total_net / len(ordered)) if ordered else None},
        "account": {"starting_balance": money(starting), "calculated_balance": money(calculated_balance), "recorded_balance": money(recorded_balance), "reconciliation_difference": money(reconciliation_difference), "equity": money(equity), "return_percent": money(total_net / starting * 100) if starting else None, "profit_target": rules["profit_target_amount"], "profit_progress_percent": money(progress * 100) if progress is not None else None, "high_water_mark": money(high_water_mark), "drawdown_floor": money(floor) if floor is not None else None, "current_drawdown": money(current_drawdown), "drawdown_remaining": money(drawdown_limit - current_drawdown) if drawdown_limit is not None else None},
        "risk": {"daily_loss_limit": rules["daily_loss_limit_amount"], "daily_loss_used": money(daily_loss_used), "daily_loss_remaining": money(daily_loss_limit - daily_loss_used) if daily_loss_limit is not None else None, "daily_loss_usage_percent": money(daily_usage * 100) if daily_usage is not None else None, "daily_status": status_for_usage(daily_usage), "drawdown_status": status_for_usage(drawdown_usage), "overall_status": overall},
        "trading_days": {"count": len(daily_groups), "minimum": rules["minimum_trading_days"], "status": "MET" if len(daily_groups) >= rules["minimum_trading_days"] else "IN_PROGRESS"},
        "daily_performance": daily_rows,
        "equity_curve": equity_points,
        "consistency": {"enabled": rules["consistency_enabled"], "best_day_contribution_percent": money(consistency * 100) if consistency is not None else None, "status": "NOT_CONFIGURED" if not rules["consistency_enabled"] else "NOT_COMPLIANT" if consistency is not None and consistency * 100 > Decimal(str(rules["consistency_max_best_day_percent"])) else "COMPLIANT"},
    }