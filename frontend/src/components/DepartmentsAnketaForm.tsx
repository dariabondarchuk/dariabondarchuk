import { Form, Input, Typography } from 'antd';
import type { Company } from '../types';

const { Paragraph } = Typography;
const { TextArea } = Input;

export interface DepartmentsAnketaValues {
  departmentsInfo: string;
  contactEmail: string;
}

export function parseDepartmentsInfo(text: string): { name: string; address: string }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed.includes(';')
    ? trimmed.split(';')
    : trimmed.split('\n');

  return parts
    .map(s => s.trim())
    .filter(Boolean)
    .map(line => {
      const [name, address] = line.split('|').map(x => x.trim());
      return { name: name || line, address: address || '' };
    });
}

export function officesToDepartmentsInfo(offices: { name?: string; address?: string }[]): string {
  if (!offices?.length) return '';
  return offices.map(o => o.name?.trim()).filter(Boolean).join('; ');
}

export function companyToDepartmentsAnketaValues(company: Company): DepartmentsAnketaValues {
  return {
    departmentsInfo: officesToDepartmentsInfo(company.offices ?? []),
    contactEmail: company.contactEmail || '',
  };
}

export function departmentsAnketaValuesToCompanyPatch(values: DepartmentsAnketaValues): Partial<Company> {
  return {
    offices: parseDepartmentsInfo(values.departmentsInfo),
    contactEmail: values.contactEmail?.trim() || '',
  };
}

export function normalizeDepartmentsAnketaData(
  data: Record<string, unknown> | null | undefined,
): DepartmentsAnketaValues {
  if (!data) {
    return { departmentsInfo: '', contactEmail: '' };
  }

  if (Array.isArray(data.offices)) {
    return {
      departmentsInfo: officesToDepartmentsInfo(data.offices as { name?: string }[]),
      contactEmail: String(data.contactEmail || ''),
    };
  }

  return {
    departmentsInfo: String(data.departmentsInfo || ''),
    contactEmail: String(data.contactEmail || ''),
  };
}

export function departmentsAnketaValuesToPayload(values: DepartmentsAnketaValues): DepartmentsAnketaValues {
  return {
    departmentsInfo: values.departmentsInfo?.trim() || '',
    contactEmail: values.contactEmail?.trim() || '',
  };
}

export default function DepartmentsAnketaFormFields() {
  return (
    <>
      <Paragraph strong style={{ marginBottom: 8 }}>
        Укажите должности и/или структурные подразделения, которые работают с персональными данными
        в вашей компании, согласно организационно-штатному расписанию.
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Названия должны совпадать с организационно-штатным расписанием. Запросить данные можно
        в отделе кадров, SAP HR или 1С. Вводите через точку с запятой «;».
      </Paragraph>
      <Form.Item name="departmentsInfo">
        <TextArea rows={8} placeholder="Например: IT-отдел" />
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
