import { useState } from 'react';
import { Button, Card, Space, Table, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { ANKETA_TEMPLATES } from '../constants/anketaTemplates';
import { AnketaInviteModal, AnketaSendAllModal } from '../components/AnketaInviteModals';

const { Title, Text } = Typography;

export default function AnketyPage() {
  const [sendTemplate, setSendTemplate] = useState<(typeof ANKETA_TEMPLATES)[number] | null>(null);
  const [sendAllOpen, setSendAllOpen] = useState(false);

  const rows = ANKETA_TEMPLATES.map((template, index) => ({
    key: template.anketaType,
    num: index + 1,
    ...template,
  }));

  const columns = [
    { title: '№', dataIndex: 'num', key: 'num', width: 56 },
    { title: 'Шаблон анкеты', dataIndex: 'name', key: 'name', render: (v: string) => <span style={{ fontWeight: 550 }}>{v}</span> },
    { title: 'Описание', dataIndex: 'description', key: 'description' },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: (typeof rows)[0]) => (
        <Button type="primary" icon={<SendOutlined />} onClick={() => setSendTemplate(record)}>
          Отправить
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Шаблоны анкет</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Шаблоны анкет для отправки сотрудникам. После заполнения по ссылке данные попадают в реестр процессов компании со статусом «Нужно проверить».
      </Text>

      <Card
        title="Шаблоны анкет"
        extra={
          <Button type="primary" icon={<SendOutlined />} onClick={() => setSendAllOpen(true)}>
            Отправить все анкеты
          </Button>
        }
      >
        <Table rowKey="key" dataSource={rows} columns={columns} pagination={false} size="middle" />
      </Card>

      <AnketaInviteModal
        open={!!sendTemplate}
        template={sendTemplate}
        onClose={() => setSendTemplate(null)}
      />
      <AnketaSendAllModal open={sendAllOpen} onClose={() => setSendAllOpen(false)} />
    </div>
  );
}
