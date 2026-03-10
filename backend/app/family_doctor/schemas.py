from datetime import datetime

from pydantic import BaseModel


class DoctorScheduleOut(BaseModel):
    id: int
    doctor_name: str
    positional_titles: str | None
    dept_code: str
    dept_name: str | None
    hospital_name: str
    out_call_date: str
    time_interval_name: str | None
    available_remain_num: int
    available_total_num: int
    schedule_status: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DoctorScheduleListOut(BaseModel):
    total: int
    items: list[DoctorScheduleOut]


class ScraperStatusOut(BaseModel):
    last_run: str | None
    last_status: str
    last_count: int
    running: bool
