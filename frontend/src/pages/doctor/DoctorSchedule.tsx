import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Button, Input, DatePicker, Select, Space, Card, Typography, message, Tooltip,
} from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getSchedules, runScraper, getScraperStatus } from '../../api/doctor'
import type { DoctorSchedule as DoctorScheduleType, ScraperStatus } from '../../types/doctor'

const { Title } = Typography

export default function DoctorSchedule() {
  const [data, setData] = useState<DoctorScheduleType[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null)

  // 过滤参数
  const [doctorName, setDoctorName] = useState('')
  const [date, setDate] = useState<string | undefined>()
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const pageSize = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSchedules({
        doctor_name: doctorName || undefined,
        date,
        status,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      setData(res.items)
      setTotal(res.total)
    } catch {
      message.error('获取排班数据失败')
    } finally {
      setLoading(false)
    }
  }, [doctorName, date, status, page])

  const fetchScraperStatus = useCallback(async () => {
    try {
      const res = await getScraperStatus()
      setScraperStatus(res)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchScraperStatus()
  }, [fetchScraperStatus])

  const handleRunScraper = async () => {
    try {
      const res = await runScraper()
      message.success(res.message)
      // 3 秒后刷新数据和状态
      setTimeout(() => {
        fetchData()
        fetchScraperStatus()
      }, 3000)
    } catch {
      message.error('触发爬虫失败')
    }
  }

  const columns: ColumnsType<DoctorScheduleType> = [
    {
      title: '日期',
      dataIndex: 'out_call_date',
      width: 120,
    },
    {
      title: '时段',
      dataIndex: 'time_interval_name',
      width: 80,
    },
    {
      title: '医生',
      dataIndex: 'doctor_name',
      width: 100,
    },
    {
      title: '职称',
      dataIndex: 'positional_titles',
      width: 120,
    },
    {
      title: '医院',
      dataIndex: 'hospital_name',
      width: 140,
    },
    {
      title: '状态',
      dataIndex: 'schedule_status',
      width: 80,
      render: (val: number) =>
        val === 1
          ? <Tag color="success">有号</Tag>
          : <Tag color="error">已满</Tag>,
    },
    {
      title: '剩余/总数',
      width: 100,
      render: (_, record) =>
        `${record.available_remain_num} / ${record.available_total_num}`,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <div>
      <Title level={4}>医生预约排班</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="医生姓名"
            prefix={<SearchOutlined />}
            value={doctorName}
            onChange={(e) => { setDoctorName(e.target.value); setPage(1) }}
            style={{ width: 160 }}
            allowClear
          />
          <DatePicker
            placeholder="选择日期"
            onChange={(_, dateStr) => { setDate(dateStr as string || undefined); setPage(1) }}
            style={{ width: 140 }}
          />
          <Select
            placeholder="号源状态"
            value={status}
            onChange={(val) => { setStatus(val); setPage(1) }}
            style={{ width: 120 }}
            allowClear
            options={[
              { value: 1, label: '有号' },
              { value: 0, label: '已满' },
            ]}
          />
          <Button onClick={() => { setPage(1); fetchData() }}>
            查询
          </Button>
          <Tooltip title={
            scraperStatus
              ? `上次运行: ${scraperStatus.last_run || '未运行'} | 状态: ${scraperStatus.last_status}`
              : '点击手动触发爬虫抓取'
          }>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRunScraper}
              loading={scraperStatus?.running}
            >
              手动抓取
            </Button>
          </Tooltip>
        </Space>
      </Card>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: false,
        }}
        size="middle"
        scroll={{ x: 900 }}
      />
    </div>
  )
}
