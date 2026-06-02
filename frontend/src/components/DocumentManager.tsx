import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { DeleteOutlined, DownloadOutlined, FileZipOutlined, InboxOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { useApp } from '../context/AppContext';
import { apiActions } from '../api/client';
import { downloadBlob } from '../utils/downloadBlob';
import type { Document } from '../types';

const { Text } = Typography;
const { Dragger } = Upload;

export interface DocumentTypeTemplate {
  type: string;
  name: string;
}

interface DocumentManagerProps {
  companyId: number;
  title: string;
  description?: string;
  documentTypes: readonly DocumentTypeTemplate[];
  style?: React.CSSProperties;
}

export default function DocumentManager({
  companyId,
  title,
  description,
  documentTypes,
  style,
}: DocumentManagerProps) {
  const { state, dispatch } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const typeSet = useMemo(() => new Set(documentTypes.map(t => t.type)), [documentTypes]);
  const companyDocs = state.documents.filter(
    d => d.companyId === companyId && typeSet.has(d.type),
  );

  const rows = useMemo(() => documentTypes.map((template, index) => {
    const existing = companyDocs.find(d => d.type === template.type);
    return {
      key: template.type,
      num: index + 1,
      type: template.type,
      name: template.name,
      document: existing ?? null,
    };
  }), [companyDocs, documentTypes]);

  const extraDocs = companyDocs.filter(
    d => !documentTypes.some(t => t.type === d.type),
  );

  const uploadedCount = rows.filter(r => r.document?.hasFile).length + extraDocs.filter(d => d.hasFile).length;

  const downloadFile = async (doc: Document) => {
    if (!doc.hasFile) {
      message.info('Файл не прикреплён');
      return;
    }
    try {
      const { data } = await apiActions.downloadDocument(doc.id);
      downloadBlob(data as Blob, doc.name);
    } catch {
      message.error('Не удалось скачать файл');
    }
  };

  const downloadArchive = async () => {
    try {
      const types = documentTypes.map(t => t.type).join(',');
      const { data } = await apiActions.downloadDocumentsArchive(companyId, types);
      downloadBlob(data as Blob, `${title}.zip`);
    } catch {
      message.error('Не удалось скачать архив');
    }
  };

  const openUpload = (type?: string, name?: string, existing?: Document | null) => {
    form.setFieldsValue({ type, name: name ?? undefined });
    setReplaceDoc(existing ?? null);
    setFileList([]);
    setAddOpen(true);
  };

  const closeUpload = () => {
    setAddOpen(false);
    setReplaceDoc(null);
    setFileList([]);
    form.resetFields();
  };

  const handleSave = async (values: { type: string; name?: string }) => {
    if (!fileList[0]?.originFileObj) {
      message.error('Прикрепите файл');
      return;
    }

    const template = documentTypes.find(t => t.type === values.type);
    const fileName = values.name?.trim() || template?.name || values.type;

    setUploading(true);
    try {
      if (replaceDoc) {
        const formData = new FormData();
        formData.append('name', fileName);
        formData.append('file', fileList[0].originFileObj);
        const { data } = await apiActions.replaceDocument(replaceDoc.id, formData);
        dispatch({ type: 'REMOVE_DOCUMENT', id: replaceDoc.id });
        dispatch({ type: 'ADD_DOCUMENT_FROM_API', document: data as Document });
        message.success('Документ обновлён');
      } else {
        const existing = companyDocs.find(d => d.type === values.type);
        if (existing) {
          await dispatch({ type: 'DELETE_DOCUMENT', id: existing.id });
        }
        const formData = new FormData();
        formData.append('companyId', String(companyId));
        formData.append('type', values.type);
        formData.append('name', fileName);
        formData.append('file', fileList[0].originFileObj);
        await dispatch({ type: 'ADD_DOCUMENT', formData });
        message.success('Документ загружен');
      }
      closeUpload();
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось сохранить документ');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    try {
      await dispatch({ type: 'DELETE_DOCUMENT', id: doc.id });
      message.success('Документ удалён');
    } catch {
      message.error('Не удалось удалить документ');
    }
  };

  const actionButtons = (doc: Document | null, type: string, label: string) => {
    if (doc) {
      return (
        <Space>
          <Button type="text" icon={<DownloadOutlined />} title="Скачать" onClick={() => downloadFile(doc)} />
          <Button type="text" icon={<UploadOutlined />} title="Заменить" onClick={() => openUpload(type, label, doc)} />
          <Button type="text" danger icon={<DeleteOutlined />} title="Удалить" onClick={() => handleDelete(doc)} />
        </Space>
      );
    }
    return (
      <Button size="small" type="link" onClick={() => openUpload(type, label)}>
        Загрузить
      </Button>
    );
  };

  const columns = [
    { title: '№', dataIndex: 'num', key: 'num', width: 56 },
    { title: 'Документ', dataIndex: 'name', key: 'name', render: (v: string) => <span style={{ fontWeight: 550 }}>{v}</span> },
    {
      title: 'Статус',
      key: 'status',
      width: 160,
      render: (_: unknown, row: (typeof rows)[0]) =>
        row.document?.hasFile
          ? <Tag color="success">Загружен</Tag>
          : <Tag>Отсутствует</Tag>,
    },
    {
      title: 'Дата',
      key: 'date',
      width: 120,
      render: (_: unknown, row: (typeof rows)[0]) => row.document?.uploadDate || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_: unknown, row: (typeof rows)[0]) => actionButtons(row.document, row.type, row.name),
    },
  ];

  return (
    <>
      <Card
        title={title}
        style={style}
        extra={
          <Space wrap>
            {uploadedCount > 0 && (
              <Button icon={<FileZipOutlined />} onClick={downloadArchive}>
                Скачать архивом
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openUpload()}>
              Загрузить документ
            </Button>
          </Space>
        }
      >
        {description && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            {description}
          </Text>
        )}
        <Table rowKey="key" dataSource={rows} columns={columns} pagination={false} size="middle" />

        {extraDocs.length > 0 && (
          <>
            <Text strong style={{ display: 'block', margin: '20px 0 8px' }}>Прочие документы</Text>
            <Table<Document>
              rowKey="id"
              dataSource={extraDocs}
              pagination={false}
              size="small"
              columns={[
                { title: 'Название', dataIndex: 'name', key: 'name' },
                { title: 'Дата', dataIndex: 'uploadDate', key: 'uploadDate', render: (v: string) => v || '—' },
                {
                  title: '',
                  key: 'actions',
                  render: (_: unknown, doc: Document) => actionButtons(doc, doc.type, doc.name),
                },
              ]}
            />
          </>
        )}
      </Card>

      <Modal
        title={replaceDoc ? 'Заменить документ' : 'Загрузить документ'}
        open={addOpen}
        onCancel={closeUpload}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="type" label="Тип документа" rules={[{ required: true, message: 'Выберите тип' }]}>
            <Select
              disabled={!!replaceDoc}
              options={documentTypes.map(t => ({ value: t.type, label: t.name }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Название" extra="Оставьте пустым — подставится название типа">
            <Input placeholder="Необязательно" />
          </Form.Item>
          <Form.Item label="Файл" required>
            <Dragger
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              maxCount={1}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">PDF, DOCX или другой формат</p>
            </Dragger>
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeUpload}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={uploading}>Сохранить</Button>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
