import { Breadcrumb, Button, Card, Table, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import type { Document } from '../types';

const { Title } = Typography;

export default function DocumentsPage() {
  const { state } = useApp();
  const company = state.companies[0];
  const docs = state.documents.filter(d => d.companyId === company?.id);

  const docColumns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: () => (
        <Button type="text" icon={<DownloadOutlined />} title="Скачать" />
      ),
    },
  ];

  const threatRows = [
    { key: '1', name: 'Общие сведения по информационным системам' },
    { key: '2', name: 'Состав серверного оборудования' },
  ];

  const threatColumns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: () => (
        <Button type="text" icon={<DownloadOutlined />} title="Скачать" />
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Компании' },
          { title: company?.shortName ?? 'Компания' },
          { title: 'Документы' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <Title level={3} style={{ marginTop: 0 }}>Сгенерированные документы</Title>
      <Card title="Документы, сформированные на основе данных из анкет" style={{ marginBottom: 16 }}>
        <Table<Document> rowKey="id" dataSource={docs} columns={docColumns} pagination={false} size="middle" />
      </Card>
      <Card title="Модель угроз">
        <Table rowKey="key" dataSource={threatRows} columns={threatColumns} pagination={false} size="middle" />
      </Card>
    </div>
  );
}
