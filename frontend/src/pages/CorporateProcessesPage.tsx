import { Breadcrumb, Typography } from 'antd';
import CompanyProcessesPanel from '../components/CompanyProcessesPanel';

const { Title, Text } = Typography;

const PANEL_TITLE = 'Общекорпоративные процессы обработки ПДн';

export default function CorporateProcessesPage() {
  return (
    <div>
      <Breadcrumb
        items={[{ title: 'Общекорпоративные процессы' }]}
        style={{ marginBottom: 8 }}
      />
      <Title level={3} style={{ marginTop: 0 }}>{PANEL_TITLE}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Список общих процессов группы, не привязанных к отдельным компаниям.
      </Text>

      <CompanyProcessesPanel corporateOnly panelTitle={null} />
    </div>
  );
}
