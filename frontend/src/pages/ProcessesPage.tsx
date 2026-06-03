import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Card, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import CompanyProcessesPanel from '../components/CompanyProcessesPanel';
import CompanySearchSelect from '../components/CompanySearchSelect';

const { Title, Text } = Typography;

const PANEL_TITLE = 'Процессы обработки ПДн в конкретных компаниях';

export default function ProcessesPage() {
  const { companyId: companyIdParam } = useParams<{ companyId?: string }>();
  const navigate = useNavigate();
  const { state } = useApp();

  const paramId = companyIdParam ? Number(companyIdParam) : null;
  const defaultId = state.companies[0]?.id ?? null;

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    paramId && state.companies.some(c => c.id === paramId) ? paramId : defaultId,
  );

  useEffect(() => {
    if (paramId && state.companies.some(c => c.id === paramId)) {
      setSelectedCompanyId(paramId);
    }
  }, [paramId, state.companies]);

  const company = useMemo(
    () => state.companies.find(c => c.id === selectedCompanyId),
    [state.companies, selectedCompanyId],
  );

  const onCompanyChange = (id: number) => {
    setSelectedCompanyId(id);
    navigate(`/processes/${id}`, { replace: true });
  };

  if (!state.companies.length) {
    return (
      <div>
        <Title level={3} style={{ marginTop: 0 }}>Процессы компаний</Title>
        <Card>
          <Text type="secondary">Сначала добавьте компанию в разделе «Компании».</Text>
          <div style={{ marginTop: 12 }}>
            <Button type="primary" onClick={() => navigate('/companies')}>Перейти к компаниям</Button>
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
          ...(company ? [{ title: company.shortName || company.name }] : []),
          { title: 'Процессы компаний' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <Title level={3} style={{ marginTop: 0 }}>{PANEL_TITLE}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Список процессов в конкретных компаниях группы.
      </Text>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Компания</Text>
        <CompanySearchSelect
          value={selectedCompanyId ?? undefined}
          onChange={id => {
            if (id != null) onCompanyChange(id);
          }}
        />
      </div>

      {selectedCompanyId != null && (
        <CompanyProcessesPanel companyId={selectedCompanyId} panelTitle={null} />
      )}
    </div>
  );
}
