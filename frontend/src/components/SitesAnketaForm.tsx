import { Button, Checkbox, Col, Form, Input, Row, Typography } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { Company } from '../types';

const { Text } = Typography;

export interface SitesAnketaValues {
  sites: { name: string; location: string }[];
  apps: { name: string; location: string }[];
  hasDirectories: boolean;
  contactEmail: string;
}

export function companyToSitesAnketaValues(company: Company): SitesAnketaValues {
  return {
    sites: (company.sites ?? []).map(s => ({ name: s.name || '', location: s.url || '' })),
    apps: (company.apps ?? []).map(a => ({ name: a.name || '', location: a.url || '' })),
    hasDirectories: Boolean(company.hasDirectories),
    contactEmail: company.contactEmail || '',
  };
}

export function sitesAnketaValuesToCompanyPatch(values: SitesAnketaValues): Partial<Company> {
  return {
    sites: values.sites
      .filter(s => s.name?.trim())
      .map(s => ({ name: s.name.trim(), url: (s.location || '').trim() })),
    apps: values.apps
      .filter(a => a.name?.trim())
      .map(a => ({ name: a.name.trim(), url: (a.location || '').trim() })),
    hasDirectories: values.hasDirectories,
    contactEmail: values.contactEmail?.trim() || '',
  };
}

export function normalizeSitesAnketaData(data: Record<string, unknown> | null | undefined): SitesAnketaValues {
  if (!data) {
    return { sites: [], apps: [], hasDirectories: false, contactEmail: '' };
  }

  if (Array.isArray(data.sites) || Array.isArray(data.apps)) {
    const mapRows = (rows: unknown) =>
      (Array.isArray(rows) ? rows : []).map(row => {
        const r = row as Record<string, unknown>;
        return {
          name: String(r.name || ''),
          location: String(r.location ?? r.url ?? ''),
        };
      });

    return {
      sites: mapRows(data.sites),
      apps: mapRows(data.apps),
      hasDirectories: Boolean(data.hasDirectories),
      contactEmail: String(data.contactEmail || ''),
    };
  }

  const sites = String(data.sitesList || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(line => {
      const [name, location] = line.split('|').map(x => x.trim());
      return { name: name || line, location: location || '' };
    });

  const apps = String(data.appsList || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(name => ({ name, location: '' }));

  return {
    sites,
    apps,
    hasDirectories: Boolean(data.hasDirectories),
    contactEmail: String(data.contactEmail || ''),
  };
}

export function sitesAnketaValuesToPayload(values: SitesAnketaValues): SitesAnketaValues {
  return {
    sites: values.sites.filter(s => s.name?.trim()),
    apps: values.apps.filter(a => a.name?.trim()),
    hasDirectories: values.hasDirectories,
    contactEmail: values.contactEmail?.trim() || '',
  };
}

interface SitesAnketaFormFieldsProps {
  showSectionTitles?: boolean;
}

function ResourceList({
  name,
  addLabel,
  showTitle,
  title,
}: {
  name: 'sites' | 'apps';
  addLabel: string;
  showTitle: boolean;
  title: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {showTitle && (
        <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 12 }}>
          {title}
        </Text>
      )}
      <Row gutter={12} style={{ marginBottom: 4 }}>
        <Col span={11}><Text type="secondary">Название</Text></Col>
        <Col span={11}><Text type="secondary">Местоположение</Text></Col>
      </Row>
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(field => (
              <Row gutter={12} key={field.key} align="top">
                <Col span={11}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'name']}
                    rules={[{ required: true, message: 'Укажите название' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="Название" />
                  </Form.Item>
                </Col>
                <Col span={11}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'location']}
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="Местоположение" />
                  </Form.Item>
                </Col>
                <Col span={2}>
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(field.name)}
                    style={{ marginTop: 4 }}
                  />
                </Col>
              </Row>
            ))}
            <Button type="dashed" onClick={() => add({ name: '', location: '' })} block icon={<PlusOutlined />}>
              {addLabel}
            </Button>
          </>
        )}
      </Form.List>
    </div>
  );
}

export default function SitesAnketaFormFields({ showSectionTitles = true }: SitesAnketaFormFieldsProps) {
  return (
    <>
      <ResourceList
        name="sites"
        addLabel="Добавить сайт"
        showTitle={showSectionTitles}
        title="Сайты компании"
      />
      <ResourceList
        name="apps"
        addLabel="Добавить приложение"
        showTitle={showSectionTitles}
        title="Мобильные приложения"
      />
      {showSectionTitles && (
        <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 12 }}>
          Корпоративные справочники
        </Text>
      )}
      <Form.Item name="hasDirectories" valuePropName="checked" style={{ marginBottom: 24 }}>
        <Checkbox>Имеются справочники</Checkbox>
      </Form.Item>
      <Form.Item
        name="contactEmail"
        label="Email контактного лица"
        rules={[{ type: 'email', message: 'Некорректный email' }]}
      >
        <Input placeholder="Email контактного лица" />
      </Form.Item>
    </>
  );
}
