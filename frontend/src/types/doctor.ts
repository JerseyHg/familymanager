export interface DoctorSchedule {
  id: number
  doctor_name: string
  positional_titles: string | null
  dept_code: string
  dept_name: string | null
  hospital_name: string
  out_call_date: string
  time_interval_name: string | null
  available_remain_num: number
  available_total_num: number
  schedule_status: number
  created_at: string
  updated_at: string
}

export interface DoctorScheduleList {
  total: number
  items: DoctorSchedule[]
}

export interface ScraperStatus {
  last_run: string | null
  last_status: string
  last_count: number
  running: boolean
}
