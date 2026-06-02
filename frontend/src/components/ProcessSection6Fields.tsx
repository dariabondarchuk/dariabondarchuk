import { useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd';
import { LinkOutlined, UploadOutlined } from '@ant-design/icons';
import type { PaperDocumentEntry, SectionData } from '../types';

const { Text, Title } = Typography;

const MAIN_QUESTION =
  'Создаются ли в рамках данного процесса документы, кроме договоров и приказов, в которых присутствуют персональные данные?';

const DEFAULT_DOCUMENT_TYPES = [
  'Кассовый чек',
  'Накладные на отгрузку с подписью',
  'Транспортные накладные с подписью',
];

function normalizePaperDocuments(data: SectionData | undefined): PaperDocumentEntry[] {
  if (Array.isArray(data?.paperDocuments) && data.paperDocuments.length > 0) {
    return data.paperDocuments.map(doc => ({
      name: String(doc.name || ''),
      storageLocation: doc.storageLocation ? String(doc.storageLocation) : undefined,
      formApprovedChoice:
        doc.formApprovedChoice
        ?? (doc.formApproved === true ? 'yes' : doc.formApproved === false ? 'no' : undefined),
      incompatiblePurposesChoice: doc.incompatiblePurposesChoice as 'yes' | 'no' | undefined,
      links: Array.isArray(doc.links) ? doc.links.map(String) : [],
      templateFiles: Array.isArray(doc.templateFiles) ? doc.templateFiles.map(String) : [],
    }));
  }
  return [];
}

function yesNoValue(choice?: 'yes' | 'no'): 'yes' | 'no' | undefined {
  return choice;
}

interface DocAttachmentsProps {
  docKey: string;
  links: string[];
  files: string[];
  onLinksChange: (links: string[]) => void;
  onFilesChange: (files: string[]) => void;
}

function DocAttachments({ docKey, links, files, onLinksChange, onFilesChange }: DocAttachmentsProps) {
  const [linkInput, setLinkInput] = useState('');

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    onLinksChange([...links, url]);
    setLinkInput('');
  };

  return (
    <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size={8}>
      {links.map((link, i) => (
        <Input
          key={`${docKey}-link-${i}`}
          value={link}
          onChange={e => {
            const next = [...links];
            next[i] = e.target.value;
            onLinksChange(next);
          }}
          addonAfter={
            <Button type="link" size="small" danger onClick={() => onLinksChange(links.filter((_, j) => j !== i))}>
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
          onFilesChange([...files, file.name]);
          return false;
        }}
        onRemove={file => onFilesChange(files.filter(n => n !== file.name))}
        fileList={files.map((name, i) => ({ uid: `${docKey}-tpl-${i}`, name, status: 'done' as const }))}
      >
        <Button icon={<UploadOutlined />} size="small">
          Загрузить шаблон
        </Button>
      </Upload>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Доступные форматы: pdf, txt, doc, docx, dot
      </Text>
    </Space>
  );
}

export interface ProcessSection6FieldsProps {
  data: SectionData | undefined;
  onChange: (patch: Partial<SectionData>) => void;
  storageLocationSuggestions?: string[];
}

export default function ProcessSection6Fields({
  data,
  onChange,
  storageLocationSuggestions = [],
}: ProcessSection6FieldsProps) {
  const documentsCreated =
    data?.paperDocumentsCreated ?? (normalizePaperDocuments(data).length > 0 ? 'created' : 'not_created');
  const documents = normalizePaperDocuments(data);
  const docNames = documents.map(d => d.name);

  const patchDocuments = (entries: PaperDocumentEntry[]) => {
    onChange({
      paperDocuments: entries,
      paperDocumentsCreated: entries.length > 0 ? 'created' : 'not_created',
    });
  };

  const onDocNamesChange = (names: string[]) => {
    const next = names.map(name => {
      const existing = documents.find(d => d.name === name);
      return (
        existing || {
          name,
          formApprovedChoice: 'no' as const,
          incompatiblePurposesChoice: 'no' as const,
          links: [],
          templateFiles: [],
        }
      );
    });
    patchDocuments(next);
  };

  const updateDoc = (name: string, patch: Partial<PaperDocumentEntry>) => {
    patchDocuments(documents.map(d => (d.name === name ? { ...d, ...patch } : d)));
  };

  const locationOptions = Array.from(
    new Set([...storageLocationSuggestions, ...documents.map(d => d.storageLocation).filter(Boolean) as string[]]),
  ).map(v => ({ value: v, label: v }));

  const docTypeOptions = Array.from(new Set([...DEFAULT_DOCUMENT_TYPES, ...docNames])).map(v => ({
    value: v,
    label: v,
  }));

  return (
    <>
      <Form.Item label={MAIN_QUESTION}>
        <Radio.Group
          value={documentsCreated}
          onChange={e => {
            const v = e.target.value as 'created' | 'not_created';
            onChange({
              paperDocumentsCreated: v,
              ...(v === 'not_created' ? { paperDocuments: [] } : {}),
            });
          }}
        >
          <Space direction="vertical">
            <Radio value="created">Создаются</Radio>
            <Radio value="not_created">Не создаются</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      {documentsCreated === 'created' && (
        <>
          <Divider style={{ margin: '12px 0 16px' }} />
          <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
            СОЗДАВАЕМЫЕ ДОКУМЕНТЫ
          </Title>

          <Form.Item label="Типы документов">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Выберите или введите тип документа"
              value={docNames}
              onChange={onDocNamesChange}
              options={docTypeOptions}
              tokenSeparators={[',', ';']}
            />
          </Form.Item>

          {documents.map(doc => (
            <div
              key={doc.name}
              style={{
                marginBottom: 20,
                padding: '14px 16px',
                background: '#fafafa',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                {doc.name}
              </Text>

              <Form.Item label="Место хранения" style={{ marginBottom: 12 }}>
                <Select
                  mode="tags"
                  maxCount={1}
                  showSearch
                  allowClear
                  placeholder="Выберите место хранения"
                  value={doc.storageLocation ? [doc.storageLocation] : []}
                  onChange={vals => updateDoc(doc.name, { storageLocation: vals[0] || '' })}
                  options={locationOptions}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="Бланк документа утвержден в организации?"
                style={{ marginBottom: 12 }}
              >
                <Radio.Group
                  value={yesNoValue(doc.formApprovedChoice) ?? 'no'}
                  onChange={e =>
                    updateDoc(doc.name, {
                      formApprovedChoice: e.target.value,
                      formApproved: e.target.value === 'yes',
                    })
                  }
                >
                  <Radio value="yes">Да</Radio>
                  <Radio value="no">Нет</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label="Фиксируются ли в документе персональные данные в заведомо несовместимых целях?"
                style={{ marginBottom: 8 }}
              >
                <Radio.Group
                  value={yesNoValue(doc.incompatiblePurposesChoice) ?? 'no'}
                  onChange={e =>
                    updateDoc(doc.name, { incompatiblePurposesChoice: e.target.value })
                  }
                >
                  <Radio value="yes">Да</Radio>
                  <Radio value="no">Нет</Radio>
                </Radio.Group>
              </Form.Item>

              <DocAttachments
                docKey={doc.name}
                links={doc.links || []}
                files={doc.templateFiles || []}
                onLinksChange={links => updateDoc(doc.name, { links })}
                onFilesChange={templateFiles => updateDoc(doc.name, { templateFiles })}
              />
            </div>
          ))}
        </>
      )}

      <Divider />

      <Form.Item style={{ marginBottom: 16 }}>
        <Checkbox
          checked={!!data?.lnaStorageAccessEstablished}
          onChange={e => onChange({ lnaStorageAccessEstablished: e.target.checked })}
        >
          Установлены ли Оператором в ЛНА места хранения и перечень лиц, имеющих доступ к персональным
          данным, обрабатываемым неавтоматизированным способом?
        </Checkbox>
      </Form.Item>

      <Form.Item label="Хранятся ли материальные носители с персональными данными отдельно друг от друга?">
        <Radio.Group
          value={
            data?.carriersStoredSeparatelyChoice
            ?? (data?.carriersStoredSeparately ? 'yes' : 'no')
          }
          onChange={e => {
            const choice = e.target.value as 'yes' | 'no';
            onChange({
              carriersStoredSeparatelyChoice: choice,
              carriersStoredSeparately: choice === 'yes',
            });
          }}
        >
          <Radio value="no">Нет</Radio>
          <Radio value="yes">Да</Radio>
        </Radio.Group>
      </Form.Item>
    </>
  );
}
