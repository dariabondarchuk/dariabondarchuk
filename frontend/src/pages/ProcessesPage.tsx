import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Card, Select, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import CompanyProcessesPanel from '../components/CompanyProcessesPanel';

const { Title, Text } = Typography;

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
        <Title level={3} style={{ marginTop: 0 }}>Процессы</Title>
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
          { title: 'Процессы' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <Title level={3} style={{ marginTop: 0 }}>Процессы обработки ПДн</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Список процессов компании, заполнение анкет по секциям, отправка ссылок и проверка данных.
      </Text>

      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Компания</Text>
        <Select
          value={selectedCompanyId ?? undefined}
          onChange={onCompanyChange}
          style={{ minWidth: 320 }}
          options={state.companies.map(c => ({
            value: c.id,
            label: c.shortName || c.name,
          }))}
        />
      </Card>

      {selectedCompanyId != null && <CompanyProcessesPanel companyId={selectedCompanyId} />}
    </div>
  );
}
