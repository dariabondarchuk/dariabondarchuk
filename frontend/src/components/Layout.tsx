import { Layout, Menu, Badge, Button, Typography } from 'antd';
import {
  FormOutlined,
  TableOutlined,
  BellOutlined,
  BookOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/ankety', icon: <FormOutlined />, label: 'Анкеты' },
  { key: '/registry', icon: <TableOutlined />, label: 'Реестры' },
  { key: '/rkn', icon: <BellOutlined />, label: 'Уведомления РКН' },
  { key: '/journal', icon: <BookOutlined />, label: 'Журналы' },
  { key: '/monitor', icon: <ClockCircleOutlined />, label: 'Мониторинг' },
  { key: '/docs', icon: <FileTextOutlined />, label: 'Документы' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Настройки' },
];

export default function AppLayout() {
  const { state } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const unread = state.monitorEvents.filter(e => !e.read).length;

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { email?: string; name?: string };
    } catch {
      return {};
    }
  })();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={232}
        style={{ background: '#002E8C', position: 'sticky', top: 0, height: '100vh' }}
      >
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#0055FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>С</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>ГК «Самолёт»</div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)' }}>Реестр ПДн</div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ background: 'transparent', border: 'none', padding: '8px' }}
          items={menuItems.map(item => ({
            ...item,
            label: item.key === '/monitor' && unread > 0 ? (
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.label}
                <Badge count={unread} size="small" />
              </span>
            ) : item.label,
          }))}
          onClick={({ key }) => navigate(key)}
        />
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
          {user.email || 'e.mayer@samolet.ru'}
        </div>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #ECEEF5', height: 52 }}>
          <Text type="secondary" style={{ marginRight: 16 }}>{user.name || 'DPO'}</Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
            Выйти
          </Button>
        </Header>
        <Content style={{ padding: '20px 28px', background: '#F5F6FA', minWidth: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
