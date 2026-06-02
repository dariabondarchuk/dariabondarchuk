import { Button, Col, Form, Input, Row, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { SectionData } from '../types';

const { TextArea } = Input;

export interface AdditionalContact {
  email: string;
}

function normalizeAdditionalContacts(data: SectionData | undefined): AdditionalContact[] {
  const raw = data?.additionalContacts;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(item => {
      if (typeof item === 'string') return { email: item };
      const row = item as { email?: string };
      return { email: row.email || '' };
    });
  }
  const legacy = data?.additionalContactEmails;
  if (typeof legacy === 'string' && legacy.trim()) {
    return legacy.split(/[,;\n]/).map(s => ({ email: s.trim() })).filter(c => c.email);
  }
  return [];
}

export interface ProcessSection1FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
}

export default function ProcessSection1Fields({ data, onChange }: ProcessSection1FieldsProps) {
  const additionalContacts = normalizeAdditionalContacts(data);

  const patchContacts = (contacts: AdditionalContact[]) => {
    onChange({ additionalContacts: contacts });
  };

  const updateContact = (index: number, email: string) => {
    const next = [...additionalContacts];
    next[index] = { email };
    patchContacts(next);
  };

  const addContact = () => {
    patchContacts([...additionalContacts, { email: '' }]);
  };

  const removeContact = (index: number) => {
    patchContacts(additionalContacts.filter((_, i) => i !== index));
  };

  return (
    <>
      <Form.Item label="Краткое описание процесса">
        <TextArea
          rows={4}
          value={data?.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Организация доставки товаров клиентам"
        />
      </Form.Item>

      <Form.Item label="ФИО контактного лица по процессу">
        <Input
          value={data?.contactName || ''}
          onChange={e => onChange({ contactName: e.target.value })}
          placeholder="Например: Иванов Иван Иванович"
        />
      </Form.Item>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item label="Должность">
            <Input
              value={data?.contactPosition || ''}
              onChange={e => onChange({ contactPosition: e.target.value })}
              placeholder="Например: Генеральный директор"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Email контактного лица">
            <Input
              value={data?.contactEmail || ''}
              onChange={e => onChange({ contactEmail: e.target.value })}
              placeholder="Например: contact@b-152.ru"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Дополнительные контактные лица">
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {additionalContacts.length === 0 ? (
            <Input
              disabled
              placeholder="Список дополнительных адресов электронной почты"
              style={{ color: 'rgba(0,0,0,0.25)' }}
            />
          ) : (
            additionalContacts.map((contact, index) => (
              <Space key={index} style={{ width: '100%' }} align="start">
                <Input
                  style={{ flex: 1 }}
                  value={contact.email}
                  onChange={e => updateContact(index, e.target.value)}
                  placeholder="email@example.ru"
                />
                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeContact(index)}
                  aria-label="Удалить контакт"
                />
              </Space>
            ))
          )}
          <Button type="link" icon={<PlusOutlined />} onClick={addContact} style={{ padding: 0 }}>
            Добавить контактное лицо
          </Button>
        </Space>
      </Form.Item>

      <Form.Item label="Документы, регламентирующие процесс">
        <Input
          value={data?.regulatingDocuments || ''}
          onChange={e => onChange({ regulatingDocuments: e.target.value })}
          placeholder="Перечислите документы"
        />
      </Form.Item>
    </>
  );
}
