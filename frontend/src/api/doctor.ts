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

export async function setCookie(jsessionid: string): Promise<{ message: string }> {
  const { data } = await client.post('/doctor/cookie', { jsessionid })
  return data
}

export async function getCookieStatus(): Promise<{ has_cookie: boolean; updated_at: string | null }> {
  const { data } = await client.get('/doctor/cookie/status')
  return data
}
