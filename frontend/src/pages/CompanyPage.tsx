import { Breadcrumb, Button, Card, Tabs, Typography } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import CompanyAnketyPanel from '../components/CompanyAnketyPanel';
import CompanyProcessesPanel from '../components/CompanyProcessesPanel';
import CompanyDocumentsPanel from '../components/CompanyDocumentsPanel';

const { Title, Text } = Typography;

const TAB_KEYS = ['ankety', 'processes', 'documents'] as const;

export default function CompanyPage() {
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useApp();

  const companyId = Number(companyIdParam);
  const company = state.companies.find(c => c.id === companyId);
  const tabParam = searchParams.get('tab') ?? 'ankety';
  const tab = TAB_KEYS.includes(tabParam as typeof TAB_KEYS[number]) ? tabParam : 'ankety';

  if (!company) {
    return (
      <div>
        <Title level={3} style={{ marginTop: 0 }}>Компания</Title>
        <Card>
          <Text type="secondary">Компания не найдена.</Text>
          <div style={{ marginTop: 12 }}>
            <Button type="primary" onClick={() => navigate('/companies')}>К списку компаний</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { title: <span style={{ cursor: 'pointer' }} onClick={() => navigate('/companies')}>Компании</span> },
          { title: company.shortName || company.name },
        ]}
        style={{ marginBottom: 8 }}
      />
      <Title level={3} style={{ marginTop: 0 }}>{company.name}</Title>

      <Tabs
        activeKey={tab}
        onChange={key => setSearchParams(key === 'ankety' ? {} : { tab: key })}
        items={[
          {
            key: 'ankety',
            label: 'Анкеты',
            children: <CompanyAnketyPanel companyId={companyId} />,
          },
          {
            key: 'processes',
            label: 'Процессы',
            children: <CompanyProcessesPanel companyId={companyId} />,
          },
          {
            key: 'documents',
            label: 'Документы',
            children: <CompanyDocumentsPanel companyId={companyId} />,
          },
        ]}
      />
    </div>
  );
}
