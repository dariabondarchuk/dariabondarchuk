import { useState } from 'react';
import { Button, Form, Input, Space, Typography, Upload } from 'antd';
import { LinkOutlined, UploadOutlined } from '@ant-design/icons';
import type { SectionData } from '../types';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

const INSTRUCTION =
  'Здесь вы можете указать любую дополнительную информацию, которую считаете важной';

const PLACEHOLDER =
  'Например: Планируется подписать договор с третьим лицом для предоставления услуг';

function normalizeLinks(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.additionalInfoLinks)) {
    return data.additionalInfoLinks.map(String);
  }
  return [];
}

function normalizeFiles(data: SectionData | undefined): string[] {
  if (Array.isArray(data?.additionalInfoFiles)) {
    return data.additionalInfoFiles.map(String);
  }
  return [];
}

export interface ProcessSection9FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
}

export default function ProcessSection9Fields({ data, onChange }: ProcessSection9FieldsProps) {
  const [linkInput, setLinkInput] = useState('');
  const links = normalizeLinks(data);
  const files = normalizeFiles(data);

  const text =
    data?.additionalInfo
    ?? (typeof data?.additionalNotes === 'string' ? data.additionalNotes : '')
    ?? '';

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    onChange({ additionalInfoLinks: [...links, url] });
    setLinkInput('');
  };

  return (
    <>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {INSTRUCTION}
      </Paragraph>

      <Form.Item label="Дополнительная информация">
        <TextArea
          rows={6}
          value={text}
          onChange={e => onChange({ additionalInfo: e.target.value, additionalNotes: e.target.value })}
          placeholder={PLACEHOLDER}
        />
      </Form.Item>

      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {links.map((link, i) => (
          <Input
            key={`add-link-${i}`}
            value={link}
            onChange={e => {
              const next = [...links];
              next[i] = e.target.value;
              onChange({ additionalInfoLinks: next });
            }}
            addonAfter={
              <Button
                type="link"
                size="small"
                danger
                onClick={() => onChange({ additionalInfoLinks: links.filter((_, j) => j !== i) })}
              >
                Удалить
              </Button>
            }
          />
        ))}
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="https://..."
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            onPressEnter={addLink}
          />
          <Button type="link" icon={<LinkOutlined />} onClick={addLink}>
            Добавить ссылку на документ
          </Button>
        </Space.Compact>
        <Upload
          multiple
          showUploadList
          beforeUpload={file => {
            onChange({ additionalInfoFiles: [...files, file.name] });
            return false;
          }}
          onRemove={file =>
            onChange({ additionalInfoFiles: files.filter(n => n !== file.name) })
          }
          fileList={files.map((name, i) => ({
            uid: `add-file-${i}`,
            name,
            status: 'done' as const,
          }))}
        >
          <Button icon={<UploadOutlined />}>Загрузить файл дополнительной информации</Button>
        </Upload>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Доступные форматы: pdf, txt, doc, docx, dot, xls, xlsx, png
        </Text>
      </Space>
    </>
  );
}
