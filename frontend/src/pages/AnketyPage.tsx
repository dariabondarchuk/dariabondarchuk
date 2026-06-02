import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import { CopyOutlined, LinkOutlined, MailOutlined, SendOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { ANKETA_TEMPLATES } from '../constants/anketaTemplates';
import {
  createAllAnketaInvites,
  createAnketaInvite,
  sendAllAnketaInvitesEmail,
  sendAnketaInviteEmail,
} from '../api/publicAnketa';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function AnketyPage() {
  const { state } = useApp();
  const [sendTemplate, setSendTemplate] = useState<(typeof ANKETA_TEMPLATES)[number] | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [bulkInvites, setBulkInvites] = useState<{ name: string; url: string; token: string }[]>([]);
  const [bulkCompanyId, setBulkCompanyId] = useState<number | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkSendingEmail, setBulkSendingEmail] = useState(false);
  const [sendForm] = Form.useForm();
  const [bulkForm] = Form.useForm();

  const rows = ANKETA_TEMPLATES.map((template, index) => ({
    key: template.anketaType,
    num: index + 1,
    ...template,
  }));

  const closeSendModal = () => {
    setSendTemplate(null);
    setInviteUrl('');
    setInviteToken('');
    setInviteCompanyId(null);
    sendForm.resetFields();
  };

  const openSendModal = (template: (typeof ANKETA_TEMPLATES)[number]) => {
    setSendTemplate(template);
    setInviteUrl('');
    setInviteToken('');
    setInviteCompanyId(null);
    sendForm.setFieldsValue({
      companyId: state.companies[0]?.id,
      email: '',
      comment: '',
    });
  };

  const generateLink = async () => {
    if (!sendTemplate) return;
    let values: { companyId: number; email?: string; comment?: string };
    try {
      values = await sendForm.validateFields();
    } catch {
      return;
    }
    setGenerating(true);
    try {
      const result = await createAnketaInvite(
        values.companyId,
        sendTemplate.anketaType,
        values.email?.trim() || undefined,
        values.comment,
      );
      setInviteUrl(result.url);
      setInviteToken(result.token);
      setInviteCompanyId(values.companyId);
      if (result.emailSent) {
        message.success(`Ссылка сформирована и отправлена на ${result.email}`);
      } else {
        message.success('Ссылка сформирована — скопируйте и отправьте вручную');
      }
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось сформировать ссылку');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!inviteToken || inviteCompanyId == null) return;
    const values = await sendForm.validateFields(['email']);
    if (!values.email?.trim()) {
      message.warning('Укажите email для отправки');
      return;
    }
    setSendingEmail(true);
    try {
      const result = await sendAnketaInviteEmail(inviteCompanyId, inviteToken, values.email);
      message.success(`Ссылка отправлена на ${result.email}`);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось отправить письмо');
    } finally {
      setSendingEmail(false);
    }
  };

  const closeSendAllModal = () => {
    setSendAllOpen(false);
    setBulkInvites([]);
    setBulkCompanyId(null);
    bulkForm.resetFields();
  };

  const openSendAllModal = () => {
    setSendAllOpen(true);
    setBulkInvites([]);
    setBulkCompanyId(null);
    bulkForm.setFieldsValue({
      companyId: state.companies[0]?.id,
      email: '',
      comment: '',
    });
  };

  const generateAllLinks = async () => {
    let values: { companyId: number; email?: string; comment?: string };
    try {
      values = await bulkForm.validateFields();
    } catch {
      return;
    }
    setBulkGenerating(true);
    try {
      const result = await createAllAnketaInvites(
        values.companyId,
        values.email?.trim() || undefined,
        values.comment,
      );
      setBulkInvites(result.invites.map(inv => ({ name: inv.name, url: inv.url, token: inv.token })));
      setBulkCompanyId(values.companyId);
      if (result.emailSent) {
        message.success(`Ссылки на все анкеты отправлены на ${result.email}`);
      } else {
        message.success('Ссылки сформированы — скопируйте и отправьте вручную');
      }
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось сформировать ссылки');
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleBulkSendEmail = async () => {
    if (!bulkCompanyId || bulkInvites.length === 0) return;
    const values = await bulkForm.validateFields(['email']);
    if (!values.email?.trim()) {
      message.warning('Укажите email для отправки');
      return;
    }
    setBulkSendingEmail(true);
    try {
      await sendAllAnketaInvitesEmail(
        bulkCompanyId,
        bulkInvites.map(inv => inv.token),
        values.email.trim(),
      );
      message.success(`Ссылки отправлены на ${values.email}`);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось отправить письмо');
    } finally {
      setBulkSendingEmail(false);
    }
  };

  const copyAllInviteUrls = async () => {
    const text = bulkInvites.map(inv => `${inv.name}\n${inv.url}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      message.success('Все ссылки скопированы');
    } catch {
      message.info(text);
    }
  };

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      message.success('Ссылка скопирована');
    } catch {
      message.info(inviteUrl);
    }
  };

  const columns = [
    { title: '№', dataIndex: 'num', key: 'num', width: 56 },
    { title: 'Шаблон анкеты', dataIndex: 'name', key: 'name', render: (v: string) => <span style={{ fontWeight: 550 }}>{v}</span> },
    { title: 'Описание', dataIndex: 'description', key: 'description' },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: (typeof rows)[0]) => (
        <Button type="primary" icon={<SendOutlined />} onClick={() => openSendModal(record)}>
          Отправить
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Анкеты</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Шаблоны анкет для отправки сотрудникам. После заполнения по ссылке данные попадают в реестр процессов компании со статусом «Нужно проверить».
      </Text>

      <Card
        title="Шаблоны анкет"
        extra={
          <Button type="primary" icon={<SendOutlined />} onClick={openSendAllModal}>
            Отправить все анкеты
          </Button>
        }
      >
        <Table rowKey="key" dataSource={rows} columns={columns} pagination={false} size="middle" />
      </Card>

      <Modal
        title={`Ссылка на анкету: ${sendTemplate?.name ?? ''}`}
        open={!!sendTemplate}
        onCancel={closeSendModal}
        footer={
          <Space>
            <Button onClick={closeSendModal}>{inviteUrl ? 'Готово' : 'Отмена'}</Button>
            {!inviteUrl && (
              <Button type="primary" icon={<LinkOutlined />} loading={generating} onClick={generateLink}>
                Сформировать ссылку
              </Button>
            )}
          </Space>
        }
      >
        <Form form={sendForm} layout="vertical">
          <Form.Item name="companyId" label="Компания" rules={[{ required: true, message: 'Выберите компанию' }]}>
            <Select
              options={state.companies.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Выберите компанию"
              disabled={!!inviteUrl}
            />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий для заполняющего">
            <TextArea rows={2} placeholder="Пожалуйста, заполните анкету..." disabled={!!inviteUrl} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email сотрудника"
            extra="Необязательно — для отправки ссылки по почте"
            rules={[
              {
                validator: (_, value) => {
                  const v = (value as string | undefined)?.trim();
                  if (!v) return Promise.resolve();
                  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
                    ? Promise.resolve()
                    : Promise.reject(new Error('Некорректный email'));
                },
              },
            ]}
          >
            <Input placeholder="ivanov@samolet.ru" />
          </Form.Item>
        </Form>

        {inviteUrl && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Скопируйте ссылку и отправьте сотруднику любым удобным способом"
            />
            <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
              <Input readOnly value={inviteUrl} />
              <Button type="primary" icon={<CopyOutlined />} onClick={copyInviteUrl}>
                Копировать
              </Button>
            </Space.Compact>
            <Button icon={<MailOutlined />} loading={sendingEmail} onClick={handleSendEmail}>
              Отправить на email
            </Button>
          </>
        )}
      </Modal>

      <Modal
        title="Отправить все анкеты"
        open={sendAllOpen}
        onCancel={closeSendAllModal}
        width={640}
        footer={
          <Space>
            <Button onClick={closeSendAllModal}>{bulkInvites.length ? 'Готово' : 'Отмена'}</Button>
            {!bulkInvites.length && (
              <Button type="primary" icon={<LinkOutlined />} loading={bulkGenerating} onClick={generateAllLinks}>
                Сформировать ссылки
              </Button>
            )}
          </Space>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Будут созданы отдельные ссылки на все {ANKETA_TEMPLATES.length} шаблона анкет. При указании email все ссылки отправятся одним письмом.
          </Text>
        <Form form={bulkForm} layout="vertical">
          <Form.Item name="companyId" label="Компания" rules={[{ required: true, message: 'Выберите компанию' }]}>
            <Select
              options={state.companies.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Выберите компанию"
              disabled={bulkInvites.length > 0}
            />
              </Form.Item>
          <Form.Item name="comment" label="Комментарий для заполняющего">
            <TextArea rows={2} placeholder="Пожалуйста, заполните все анкеты..." disabled={bulkInvites.length > 0} />
              </Form.Item>
          <Form.Item
            name="email"
            label="Email сотрудника"
            extra="Необязательно — для отправки всех ссылок одним письмом"
            rules={[
              {
                validator: (_, value) => {
                  const v = (value as string | undefined)?.trim();
                  if (!v) return Promise.resolve();
                  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
                    ? Promise.resolve()
                    : Promise.reject(new Error('Некорректный email'));
                },
              },
            ]}
          >
            <Input placeholder="ivanov@samolet.ru" />
            </Form.Item>
        </Form>

        {bulkInvites.length > 0 && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Скопируйте ссылки или отправьте их на email"
            />
            <div style={{ marginBottom: 12, maxHeight: 240, overflow: 'auto' }}>
              {bulkInvites.map(inv => (
                <div key={inv.url} style={{ marginBottom: 12 }}>
                  <Text strong>{inv.name}</Text>
                  <Input readOnly value={inv.url} size="small" style={{ marginTop: 4 }} />
                </div>
              ))}
            </div>
            <Space>
              <Button type="primary" icon={<CopyOutlined />} onClick={copyAllInviteUrls}>
                Копировать все
              </Button>
              <Button icon={<MailOutlined />} loading={bulkSendingEmail} onClick={handleBulkSendEmail}>
                Отправить на email
                </Button>
            </Space>
          </>
        )}
      </Modal>
    </div>
  );
}
