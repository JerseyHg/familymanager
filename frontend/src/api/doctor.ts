import client from './client'
import type { DoctorScheduleList, ScraperStatus } from '../types/doctor'

export async function getSchedules(params: {
  doctor_name?: string
  date?: string
  status?: number
  skip?: number
  limit?: number
}): Promise<DoctorScheduleList> {
  const { data } = await client.get('/doctor/schedules', { params })
  return data
}

export async function runScraper(): Promise<{ message: string }> {
  const { data } = await client.post('/doctor/scraper/run')
  return data
}

export async function getScraperStatus(): Promise<ScraperStatus> {
  const { data } = await client.get('/doctor/scraper/status')
  return data
}
