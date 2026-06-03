import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Space, Typography, message } from 'antd';
import { CopyOutlined, LinkOutlined, MailOutlined } from '@ant-design/icons';
import CompanySearchSelect from './CompanySearchSelect';
import { ANKETA_TEMPLATES } from '../constants/anketaTemplates';
import {
  createAllAnketaInvites,
  createAnketaInvite,
  sendAllAnketaInvitesEmail,
  sendAnketaInviteEmail,
} from '../api/publicAnketa';

const { Text } = Typography;
const { TextArea } = Input;

export interface AnketaTemplateLike {
  anketaType: string;
  name: string;
}

interface AnketaInviteModalProps {
  open: boolean;
  template: AnketaTemplateLike | null;
  /** Если задан — компания фиксирована, выбор в форме скрыт */
  fixedCompanyId?: number;
  onClose: () => void;
}

export function AnketaInviteModal({
  open,
  template,
  fixedCompanyId,
  onClose,
}: AnketaInviteModalProps) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    setInviteUrl('');
    setInviteToken('');
    setInviteCompanyId(null);
    form.setFieldsValue({
      companyId: fixedCompanyId,
      email: '',
      comment: '',
    });
  }, [open, template, fixedCompanyId, form]);

  const handleClose = () => {
    setInviteUrl('');
    setInviteToken('');
    setInviteCompanyId(null);
    form.resetFields();
    onClose();
  };

  const generateLink = async () => {
    if (!template) return;
    let values: { companyId: number; email?: string; comment?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const companyId = fixedCompanyId ?? values.companyId;
    if (!companyId) {
      message.warning('Найдите организацию по ИНН, ОГРН или названию, либо выберите из реестра');
      return;
    }
    setGenerating(true);
    try {
      const result = await createAnketaInvite(
        companyId,
        template.anketaType,
        values.email?.trim() || undefined,
        values.comment,
      );
      setInviteUrl(result.url);
      setInviteToken(result.token);
      setInviteCompanyId(companyId);
      if (result.emailSent) {
        message.success(`Ссылка сформирована и отправлена на ${result.email}`);
      } else {
        message.success('Ссылка сформирована — скопируйте и отправьте вручную');
      }
      await form.validateFields().catch(() => undefined);
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
    const values = await form.validateFields(['email']);
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

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      message.success('Ссылка скопирована');
    } catch {
      message.info(inviteUrl);
    }
  };

  const emailRules = [
    {
      validator: (_: unknown, value: string | undefined) => {
        const v = value?.trim();
        if (!v) return Promise.resolve();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
          ? Promise.resolve()
          : Promise.reject(new Error('Некорректный email'));
      },
    },
  ];

  return (
    <Modal
      title={`Ссылка на анкету: ${template?.name ?? ''}`}
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>{inviteUrl ? 'Готово' : 'Отмена'}</Button>
          {!inviteUrl && (
            <Button type="primary" icon={<LinkOutlined />} loading={generating} onClick={generateLink}>
              Сформировать ссылку
            </Button>
          )}
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        {!fixedCompanyId && (
          <Form.Item name="companyId" label="Компания">
            <CompanySearchSelect disabled={!!inviteUrl} />
          </Form.Item>
        )}
        <Form.Item name="comment" label="Комментарий для заполняющего">
          <TextArea rows={2} placeholder="Пожалуйста, заполните анкету..." disabled={!!inviteUrl} />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email сотрудника"
          extra="Необязательно — при формировании ссылки письмо отправится сразу, если указан email"
          rules={emailRules}
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
  );
}

interface AnketaSendAllModalProps {
  open: boolean;
  fixedCompanyId?: number;
  onClose: () => void;
}

export function AnketaSendAllModal({ open, fixedCompanyId, onClose }: AnketaSendAllModalProps) {
  const [bulkInvites, setBulkInvites] = useState<{ name: string; url: string; token: string }[]>([]);
  const [bulkCompanyId, setBulkCompanyId] = useState<number | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkSendingEmail, setBulkSendingEmail] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    setBulkInvites([]);
    setBulkCompanyId(null);
    form.setFieldsValue({
      companyId: fixedCompanyId,
      email: '',
      comment: '',
    });
  }, [open, fixedCompanyId, form]);

  const handleClose = () => {
    setBulkInvites([]);
    setBulkCompanyId(null);
    form.resetFields();
    onClose();
  };

  const generateAllLinks = async () => {
    let values: { companyId: number; email?: string; comment?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const companyId = fixedCompanyId ?? values.companyId;
    if (!companyId) {
      message.warning('Найдите организацию по ИНН, ОГРН или названию, либо выберите из реестра');
      return;
    }
    setBulkGenerating(true);
    try {
      const result = await createAllAnketaInvites(
        companyId,
        values.email?.trim() || undefined,
        values.comment,
      );
      setBulkInvites(result.invites.map(inv => ({ name: inv.name, url: inv.url, token: inv.token })));
      setBulkCompanyId(companyId);
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
    const values = await form.validateFields(['email']);
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

  const emailRules = [
    {
      validator: (_: unknown, value: string | undefined) => {
        const v = value?.trim();
        if (!v) return Promise.resolve();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
          ? Promise.resolve()
          : Promise.reject(new Error('Некорректный email'));
      },
    },
  ];

  return (
    <Modal
      title="Отправить все анкеты"
      open={open}
      onCancel={handleClose}
      width={640}
      footer={
        <Space>
          <Button onClick={handleClose}>{bulkInvites.length ? 'Готово' : 'Отмена'}</Button>
          {!bulkInvites.length && (
            <Button type="primary" icon={<LinkOutlined />} loading={bulkGenerating} onClick={generateAllLinks}>
              Сформировать ссылки
            </Button>
          )}
        </Space>
      }
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Будут созданы отдельные ссылки на все {ANKETA_TEMPLATES.length} анкеты компании.
        При указании email все ссылки отправятся одним письмом.
      </Text>
      <Form form={form} layout="vertical">
        {!fixedCompanyId && (
          <Form.Item name="companyId" label="Компания">
            <CompanySearchSelect disabled={bulkInvites.length > 0} />
          </Form.Item>
        )}
        <Form.Item name="comment" label="Комментарий для заполняющего">
          <TextArea rows={2} placeholder="Пожалуйста, заполните все анкеты..." disabled={bulkInvites.length > 0} />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email сотрудника"
          extra="Необязательно — для отправки всех ссылок одним письмом"
          rules={emailRules}
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
  );
}
