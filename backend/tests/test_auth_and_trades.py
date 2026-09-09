from fastapi.testclient import TestClient
from datetime import date, datetime
from uuid import uuid4

from app.main import app
from app.services.trade_service import calculate_trade_metrics
from app.models.account import Account
from app.models.account_token import AccountToken
from app.models.trade import Trade
from app.models.user import User
from app.database.database import SessionLocal
from app.services.funded_account_service import account_rules, evaluate_account
from app.services.journal_analytics_service import ai_report, last_30_days, monthly_calendar


client = TestClient(app)


def test_journal_analytics_uses_stored_net_pnl():
    trades = [
        Trade(id=1, symbol="EURUSD", strategy="Trend", session="London", entry_time=datetime(2026, 9, 1, 9), exit_time=datetime(2026, 9, 1, 10), net_pnl=100),
        Trade(id=2, symbol="XAUUSD", strategy="Breakout", session="New York", entry_time=datetime(2026, 9, 2, 9), exit_time=datetime(2026, 9, 2, 10), net_pnl=-40),
        Trade(id=3, symbol="EURUSD", strategy="Trend", session="London", entry_time=datetime(2026, 8, 1, 9), exit_time=datetime(2026, 8, 1, 10), net_pnl=999),
    ]
    stats = last_30_days(trades, today=date(2026, 9, 8))
    assert stats["start_date"] == "2026-08-10"
    assert stats["net_profit"] == 60.0
    assert stats["average_win"] == 100.0
    assert stats["average_loss"] == -40.0
    assert stats["best_trade"] == 100.0
    assert stats["worst_trade"] == -40.0
    assert stats["profit_factor"] == 2.5

    calendar = monthly_calendar(trades, 2026, 9)
    assert calendar["monthly_pnl"] == 60.0
    assert calendar["trading_days"] == 2
    assert calendar["weekly"][0]["pnl"] == 60.0

    report = ai_report(trades[:2])
    assert report["data_available"] is True
    assert report["summary"]["net_profit"] == 60.0
    assert report["best_symbol"]["name"] == "EURUSD"


def test_instrument_aware_pnl_uses_symbol_contract_size():
    forex = calculate_trade_metrics({
        "symbol": "EURUSD",
        "direction": "LONG",
        "entry_price": 1.1000,
        "exit_price": 1.1010,
        "quantity": 1,
        "market_data": {},
    })
    gold = calculate_trade_metrics({
        "symbol": "XAUUSD",
        "direction": "LONG",
        "entry_price": 2300,
        "exit_price": 2301,
        "quantity": 1,
        "market_data": {},
    })
    assert forex["gross_pnl"] == 100.0
    assert gold["gross_pnl"] == 100.0

    jpy_short = calculate_trade_metrics({
        "symbol": "USDJPY",
        "direction": "SHORT",
        "entry_price": 150.00,
        "exit_price": 149.00,
        "quantity": 1,
        "market_data": {"account_currency": "USD"},
    })
    assert round(jpy_short["gross_pnl"], 2) == round(100000 / 149, 2)


def test_funded_account_rules_and_performance_reconstruct_from_net_pnl():
    account = Account(
        initial_balance=10000,
        current_balance=10600,
        profit_target=10,
        profit_target_type="percentage",
        daily_loss_limit=5,
        daily_loss_limit_type="percentage",
        max_drawdown=10,
        max_drawdown_type="percentage",
        minimum_trading_days=3,
        daily_reset_timezone="UTC",
    )
    rules = account_rules(account)
    assert rules["profit_target_amount"] == 1000.0
    assert rules["daily_loss_limit_amount"] == 500.0
    assert rules["maximum_drawdown_amount"] == 1000.0

    trades = []
    for trade_id, day, pnl in [(1, 1, 200), (2, 2, -100), (3, 3, 300), (4, 3, -50)]:
        trade = Trade(id=trade_id, entry_time=datetime(2026, 9, day, 9), exit_time=datetime(2026, 9, day, 10), net_pnl=pnl)
        trades.append(trade)
    result = evaluate_account(account, trades)
    assert result["performance"]["net_profit"] == 350.0
    assert result["performance"]["winning_trades"] == 2
    assert result["performance"]["losing_trades"] == 2
    assert result["trading_days"]["count"] == 3
    assert result["account"]["calculated_balance"] == 10350.0
    assert result["account"]["profit_progress_percent"] == 35.0


def test_funded_account_daily_loss_breach_and_mixed_metrics():
    account = Account(initial_balance=10000, current_balance=9450, daily_loss_limit=500, daily_loss_limit_type="fixed", max_drawdown=1000, max_drawdown_type="fixed", daily_reset_timezone="UTC")
    trades = [
        Trade(id=1, entry_time=datetime(2026, 9, 8, 9), exit_time=datetime(2026, 9, 8, 10), net_pnl=-300),
        Trade(id=2, entry_time=datetime(2026, 9, 8, 11), exit_time=datetime(2026, 9, 8, 12), net_pnl=-250),
    ]
    result = evaluate_account(account, trades)
    assert result["risk"]["daily_loss_used"] == 550.0
    assert result["risk"]["daily_status"] == "BREACHED"
    assert result["risk"]["overall_status"] == "BREACHED"


def test_register_and_login_flow():
    email = f"trader-{uuid4().hex}@example.com"
    user_payload = {
        "email": email,
        "password": "StrongPass123!",
        "full_name": "Test Trader",
    }

    register_response = client.post("/api/auth/register", json=user_payload)
    assert register_response.status_code == 201, register_response.text
    data = register_response.json()
    assert data["user"]["email"] == user_payload["email"]
    assert "access_token" in data

    login_response = client.post(
        "/api/auth/login",
        json={"email": user_payload["email"], "password": user_payload["password"]},
    )
    assert login_response.status_code == 200, login_response.text
    assert "access_token" in login_response.json()


def test_create_account_and_trade_requires_auth():
    email = f"trader-{uuid4().hex}@example.com"
    register_response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "StrongPass123!",
            "full_name": "Trader Two",
        },
    )
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    account_response = client.post(
        "/api/accounts",
        json={
            "name": "FTMO Challenge",
            "broker": "Broker Name",
            "account_type": "Funded",
            "currency": "USD",
            "initial_balance": 10000,
            "current_balance": 9785,
            "status": "Active",
        },
        headers=headers,
    )
    assert account_response.status_code == 201, account_response.text
    account_id = account_response.json()["id"]

    account_update = {**account_response.json(), "profit_target": 10, "profit_target_type": "percentage", "daily_loss_limit": 5, "daily_loss_limit_type": "percentage", "max_drawdown": 10, "max_drawdown_type": "percentage", "minimum_trading_days": 4}
    account_update_response = client.put(f"/api/accounts/{account_id}", json=account_update, headers=headers)
    assert account_update_response.status_code == 200, account_update_response.text
    assert account_update_response.json()["minimum_trading_days"] == 4

    trade_response = client.post(
        "/api/trades",
        json={
            "account_id": account_id,
            "symbol": "EURUSD",
            "direction": "LONG",
            "quantity": 1.0,
            "entry_price": 1.0850,
            "exit_price": 1.0900,
            "entry_time": "2024-01-02T08:00:00Z",
            "exit_time": "2024-01-02T09:00:00Z",
            "strategy": "EMA + Price Action",
            "timeframe": "15m",
            "session": "London",
            "market_condition": "Trending",
            "risk_amount": 50,
            "take_profit": 1.0950,
            "stop_loss": 1.0800,
            "confidence": 7,
            "discipline": 8,
            "emotion": "Calm",
            "market_data": {"contract_size": 100000, "currency": "USD"},
        },
        headers=headers,
    )
    assert trade_response.status_code == 201, trade_response.text
    trade = trade_response.json()
    assert trade["symbol"] == "EURUSD"
    assert trade["gross_pnl"] > 0
    assert trade["risk_reward_ratio"] > 0

    overview = client.get("/api/analytics/overview", headers=headers)
    assert overview.status_code == 200, overview.text
    assert overview.json()["total_trades"] >= 1
    funded_response = client.get(f"/api/analytics/funded-account/{account_id}", headers=headers)
    assert funded_response.status_code == 200, funded_response.text
    assert funded_response.json()["rules"]["profit_target_amount"] == 1000.0

    updated_payload = {
        "account_id": account_id,
        "symbol": "EURUSD",
        "direction": "LONG",
        "quantity": 1.0,
        "entry_price": 1.0850,
        "exit_price": 1.0870,
        "entry_time": "2024-01-02T08:00:00Z",
        "exit_time": "2024-01-02T09:00:00Z",
        "strategy": "EMA + Price Action",
        "session": "London",
        "market_data": {"contract_size": 100000, "currency": "USD"},
    }
    update_response = client.put(f"/api/trades/{trade['id']}", json=updated_payload, headers=headers)
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()["gross_pnl"] == 200.0

    delete_response = client.delete(f"/api/trades/{trade['id']}", headers=headers)
    assert delete_response.status_code == 204, delete_response.text
    assert client.get(f"/api/trades/{trade['id']}", headers=headers).status_code == 404


def test_password_reset_token_is_generic_and_one_time():
    email = f"reset-{uuid4().hex}@example.com"
    password = "StrongPass123!"
    response = client.post("/api/auth/register", json={"email": email, "password": password, "full_name": "Reset User"})
    assert response.status_code == 201
    missing_response = client.post("/api/auth/forgot-password", json={"email": "missing@example.com"}).json()
    reset_response = client.post("/api/auth/forgot-password", json={"email": email}).json()
    assert missing_response["message"] == reset_response["message"]
    assert reset_response["development_reset_url"].startswith("http://localhost:5173/reset-password?token=")
    with SessionLocal() as db:
        token_record = db.query(AccountToken).filter(AccountToken.purpose == "password_reset").order_by(AccountToken.id.desc()).first()
        assert token_record is not None
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        raw_token = "invalid-token-value-long-enough"
    assert client.post("/api/auth/reset-password", json={"token": raw_token, "password": "NewStrongPass123!"}).status_code == 400
    assert token_record.used_at is None


def test_change_password_and_delete_account_remove_private_data():
    email = f"delete-{uuid4().hex}@example.com"
    registration = client.post("/api/auth/register", json={"email": email, "password": "StrongPass123!", "full_name": "Delete User"})
    token = registration.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/api/users/me/change-password", json={"current_password": "StrongPass123!", "new_password": "NewStrongPass123!"}, headers=headers).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "NewStrongPass123!"}).status_code == 200
    assert client.delete("/api/users/me", headers=headers).status_code == 204
    assert client.get("/api/auth/me", headers=headers).status_code == 404
