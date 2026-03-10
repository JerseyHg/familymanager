import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Button, Input, DatePicker, Select, Space, Card, Typography,
  message, Tooltip, Modal, Alert,
} from 'antd'
import { ReloadOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { getSchedules, runScraper, getScraperStatus, setCookie, getCookieStatus } from '../../api/doctor'
import type { DoctorSchedule as DoctorScheduleType, ScraperStatus } from '../../types/doctor'

const { Title, Text, Paragraph } = Typography

export default function DoctorSchedule() {
  const [data, setData] = useState<DoctorScheduleType[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scraperStatus, setScraperStatus] = useState<ScraperStatus | null>(null)
  const [hasCookie, setHasCookie] = useState(false)
  const [cookieUpdatedAt, setCookieUpdatedAt] = useState<string | null>(null)

  // Cookie 弹窗
  const [cookieModalOpen, setCookieModalOpen] = useState(false)
  const [cookieInput, setCookieInput] = useState('')

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

  const fetchCookieStatus = useCallback(async () => {
    try {
      const res = await getCookieStatus()
      setHasCookie(res.has_cookie)
      setCookieUpdatedAt(res.updated_at)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchScraperStatus(); fetchCookieStatus() }, [fetchScraperStatus, fetchCookieStatus])

  const handleRunScraper = async () => {
    try {
      const res = await runScraper()
      message.success(res.message)
      setTimeout(() => { fetchData(); fetchScraperStatus() }, 5000)
    } catch {
      message.error('触发爬虫失败')
    }
  }

  const handleSetCookie = async () => {
    const value = cookieInput.trim()
    if (!value) { message.warning('请输入 Cookie'); return }
    // 支持粘贴完整 cookie 字符串，自动提取 JSESSIONID
    let jsessionid = value
    const match = value.match(/JSESSIONID=([^;]+)/)
    if (match) jsessionid = match[1]
    try {
      await setCookie(jsessionid)
      message.success('Cookie 已更新')
      setCookieModalOpen(false)
      setCookieInput('')
      fetchCookieStatus()
    } catch {
      message.error('设置 Cookie 失败')
    }
  }

  const columns: ColumnsType<DoctorScheduleType> = [
    { title: '日期', dataIndex: 'out_call_date', width: 120 },
    { title: '时段', dataIndex: 'time_interval_name', width: 80 },
    { title: '医生', dataIndex: 'doctor_name', width: 100 },
    { title: '职称', dataIndex: 'positional_titles', width: 120 },
    { title: '医院', dataIndex: 'hospital_name', width: 140 },
    {
      title: '状态', dataIndex: 'schedule_status', width: 80,
      render: (val: number) => val === 1
        ? <Tag color="success">有号</Tag>
        : <Tag color="error">已满</Tag>,
    },
    {
      title: '剩余/总数', width: 100,
      render: (_, record) => `${record.available_remain_num} / ${record.available_total_num}`,
    },
    {
      title: '更新时间', dataIndex: 'updated_at', width: 170,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <div>
      <Title level={4}>医生预约排班</Title>

      {!hasCookie && (
        <Alert
          message="未设置登录 Cookie"
          description="请先登录协和医院网站，然后在此设置 Cookie 才能抓取排班数据。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => setCookieModalOpen(true)}>
              设置 Cookie
            </Button>
          }
        />
      )}

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
          <Button onClick={() => { setPage(1); fetchData() }}>查询</Button>
          <Tooltip title={
            scraperStatus
              ? `上次运行: ${scraperStatus.last_run || '未运行'} | 状态: ${scraperStatus.last_status}`
              : '点击手动触发爬虫抓取'
          }>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRunScraper}
              loading={scraperStatus?.running}
              disabled={!hasCookie}
            >
              手动抓取
            </Button>
          </Tooltip>
          <Tooltip title={
            hasCookie
              ? `Cookie 设置于: ${cookieUpdatedAt ? dayjs(cookieUpdatedAt).format('MM-DD HH:mm') : '未知'}`
              : '未设置 Cookie'
          }>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setCookieModalOpen(true)}
              type={hasCookie ? 'default' : 'primary'}
            >
              {hasCookie ? '更新 Cookie' : '设置 Cookie'}
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

      <Modal
        title="设置医院登录 Cookie"
        open={cookieModalOpen}
        onOk={handleSetCookie}
        onCancel={() => setCookieModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Paragraph>
          <Text strong>操作步骤：</Text>
        </Paragraph>
        <Paragraph>
          1. 打开 <a href="https://www.whuh.com/yygh/yhdl.jsp?urltype=tree.TreeTempUrl&wbtreeid=1641" target="_blank" rel="noreferrer">协和医院登录页面</a> 并登录
        </Paragraph>
        <Paragraph>
          2. 登录成功后，按 F12 打开开发者工具 → Application → Cookies
        </Paragraph>
        <Paragraph>
          3. 找到 <Text code>JSESSIONID</Text> 的值，复制粘贴到下方
        </Paragraph>
        <Input.TextArea
          rows={2}
          placeholder="粘贴 JSESSIONID 值，如: ABC123DEF456..."
          value={cookieInput}
          onChange={(e) => setCookieInput(e.target.value)}
        />
      </Modal>
    </div>
  )
}
