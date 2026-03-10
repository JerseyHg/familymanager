import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme } from 'antd'
import {
  HomeOutlined,
  MedicineBoxOutlined,
  AlertOutlined,
} from '@ant-design/icons'

const { Sider, Content, Header } = Layout

const menuItems = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: '首页',
  },
  {
    key: '/doctor',
    icon: <MedicineBoxOutlined />,
    label: '家庭医生',
    children: [
      { key: '/doctor/schedule', label: '预约排班' },
    ],
  },
  {
    key: '/monitoring',
    icon: <AlertOutlined />,
    label: '家庭检测',
    disabled: true,
    children: [
      { key: '/monitoring/sensors', label: '传感器监控', disabled: true },
    ],
  },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: token.colorBgContainer }}
      >
        <div style={{
          height: 48,
          margin: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: collapsed ? 14 : 18,
          color: token.colorPrimary,
        }}>
          {collapsed ? 'FM' : 'Family Manager'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['/doctor']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          fontSize: 16,
          fontWeight: 500,
        }}>
          Family Manager
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
