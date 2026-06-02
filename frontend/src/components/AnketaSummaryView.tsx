import { Descriptions, Typography } from 'antd';
import type { Company, Responsible } from '../types';

const { Text } = Typography;

interface AnketaSummaryViewProps {
  anketaType: string;
  company: Company;
  responsible?: Responsible;
}

export default function AnketaSummaryView({ anketaType, company, responsible }: AnketaSummaryViewProps) {
  if (anketaType === 'company') {
    return (
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="ИНН">{company.inn || '—'}</Descriptions.Item>
        <Descriptions.Item label="ОГРН">{company.ogrn || '—'}</Descriptions.Item>
        <Descriptions.Item label="ОКВЭД">{company.okved || '—'}</Descriptions.Item>
        <Descriptions.Item label="Email">{company.email || '—'}</Descriptions.Item>
        <Descriptions.Item label="Телефон">{company.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Руководитель">{company.ceo || '—'}</Descriptions.Item>
        <Descriptions.Item label="Юридический адрес" span={2}>{company.legalAddress || '—'}</Descriptions.Item>
      </Descriptions>
    );
  }

  if (anketaType === 'responsible') {
    return (
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="ФИО">{responsible?.fio || '—'}</Descriptions.Item>
        <Descriptions.Item label="Должность">{responsible?.position || '—'}</Descriptions.Item>
        <Descriptions.Item label="Email">{responsible?.email || '—'}</Descriptions.Item>
        <Descriptions.Item label="Телефон">{responsible?.phone || '—'}</Descriptions.Item>
      </Descriptions>
    );
  }

  if (anketaType === 'sites') {
    const sites = company.sites ?? [];
    const apps = company.apps ?? [];
    if (!sites.length && !apps.length) {
      return <Text type="secondary">Данные не заполнены</Text>;
    }
    return (
      <Descriptions size="small" column={1} bordered>
        {sites.map((s, i) => (
          <Descriptions.Item key={`site-${i}`} label={`Сайт ${i + 1}`}>{s.name} — {s.url}</Descriptions.Item>
        ))}
        {apps.map((a, i) => (
          <Descriptions.Item key={`app-${i}`} label={`Приложение ${i + 1}`}>{a.name} — {a.url}</Descriptions.Item>
        ))}
        <Descriptions.Item label="Справочники">{company.hasDirectories ? 'Есть' : 'Нет'}</Descriptions.Item>
      </Descriptions>
    );
  }

  if (anketaType === 'departments') {
    const offices = company.offices ?? [];
    if (!offices.length) {
      return <Text type="secondary">{company.contactEmail ? `Контакт: ${company.contactEmail}` : 'Данные не заполнены'}</Text>;
    }
    return (
      <Descriptions size="small" column={1} bordered>
        {offices.map((o, i) => (
          <Descriptions.Item key={i} label={o.name || `Отдел ${i + 1}`}>{o.address || '—'}</Descriptions.Item>
        ))}
      </Descriptions>
    );
  }

  return null;
}
