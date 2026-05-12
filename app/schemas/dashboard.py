"""
Dashboard Schemas
"""
from pydantic import BaseModel
from typing import List, Dict


class DashboardStats(BaseModel):
    today_sms: int
    week_sms: int
    month_sms: int
    today_profit: float
    week_profit: float
    month_profit: float
    total_numbers: int
    active_numbers: int
    total_users: int
    active_users: int
    pending_payments: int
    pending_payments_amount: float


class ChartData(BaseModel):
    labels: List[str]
    data: List[int]


class DashboardCharts(BaseModel):
    sms_by_service: Dict[str, int]
    sms_by_country: Dict[str, int]
    sms_by_hour: ChartData
    sms_by_day: ChartData
    profit_by_day: ChartData
