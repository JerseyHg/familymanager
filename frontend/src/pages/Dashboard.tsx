import { Card, Col, Row, Typography } from 'antd'
import { MedicineBoxOutlined, AlertOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div>
      <Title level={3}>Family Manager</Title>
      <Paragraph type="secondary">
        家庭管家系统 - 管理家庭健康、安全与生活
      </Paragraph>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            onClick={() => navigate('/doctor/schedule')}
          >
            <Card.Meta
              avatar={<MedicineBoxOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
              title="家庭医生"
              description="医生预约排班查询、号源监控"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Card.Meta
              avatar={<AlertOutlined style={{ fontSize: 32, color: '#999' }} />}
              title="家庭检测（开发中）"
              description="燃气检测、温度湿度监控"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
