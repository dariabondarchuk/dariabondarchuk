import { useState } from 'react';
import { Select, Typography } from 'antd';
import { useApp } from '../context/AppContext';
import DocumentManager from '../components/DocumentManager';
import { PDN_DOCUMENT_TYPES, THREAT_DOCUMENT_TYPES } from '../constants/pdnDocuments';

const { Title } = Typography;

export default function DocumentsPage() {
  const { state } = useApp();
  const [companyId, setCompanyId] = useState(state.companies[0]?.id ?? 0);

  const company = state.companies.find(c => c.id === companyId);

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Документы</Title>

      <Select
        style={{ width: 360, marginBottom: 16 }}
        value={companyId || undefined}
        placeholder="Выберите компанию"
        options={state.companies.map(c => ({ value: c.id, label: c.name }))}
        onChange={setCompanyId}
      />

      {company ? (
        <>
          <DocumentManager
            companyId={company.id}
            title="Документы, сформированные на основе данных из анкет"
            description="Документы по процессам обработки ПДн компании"
            documentTypes={PDN_DOCUMENT_TYPES}
            style={{ marginBottom: 16 }}
          />
          <DocumentManager
            companyId={company.id}
            title="Модель угроз"
            description="Документы модели угроз информационных систем"
            documentTypes={THREAT_DOCUMENT_TYPES}
          />
        </>
      ) : (
        <Typography.Text type="secondary">Выберите компанию для работы с документами</Typography.Text>
      )}
    </div>
  );
}
