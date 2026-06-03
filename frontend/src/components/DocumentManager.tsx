import { useCallback, useMemo, useState } from 'react';
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
import api, { apiActions } from '../api/client';
import { downloadBlob } from '../utils/downloadBlob';
import {
  collectRegisteredDedupeKeys,
  documentDedupeKey,
  isDuplicateOfRegistered,
} from '../utils/documentDedupe';
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
  /** Типы из всех разделов страницы — чтобы не дублировать в «Прочие» */
  allRegisteredTypes?: readonly string[];
  /** Показывать блок «Прочие документы» (обычно только у последнего раздела) */
  showOtherDocuments?: boolean;
  style?: React.CSSProperties;
}

type DocumentRow = {
  key: string;
  num: number;
  type: string;
  name: string;
  latest: Document | null;
  olderVersions: Document[];
};

function sortVersions(docs: Document[]): Document[] {
  return [...docs].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
}

function pickLatest(versions: Document[]): Document | null {
  if (!versions.length) return null;
  return versions.find(d => d.isCurrent) ?? versions[0];
}

export default function DocumentManager({
  companyId,
  title,
  description,
  documentTypes,
  allRegisteredTypes,
  showOtherDocuments = false,
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

  const versionsByType = useMemo(() => {
    const map = new Map<string, Document[]>();
    for (const doc of companyDocs) {
      const list = map.get(doc.type) ?? [];
      list.push(doc);
      map.set(doc.type, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
    }
    return map;
  }, [companyDocs]);

  const refreshDocuments = useCallback(async () => {
    try {
      const { data } = await api.get<Document[]>('/documents', { params: { companyId } });
      const other = state.documents.filter(d => d.companyId !== companyId);
      dispatch({ type: 'HYDRATE', data: { documents: [...other, ...data] } });
    } catch {
      message.error('Не удалось обновить список документов');
    }
  }, [companyId, dispatch, state.documents]);

  const buildRow = (type: string, label: string, num: number): DocumentRow => {
    const versions = sortVersions(versionsByType.get(type) ?? []);
    const latest = pickLatest(versions);
    return {
      key: type,
      num,
      type,
      name: label,
      latest,
      olderVersions: latest ? versions.filter(v => v.id !== latest.id) : [],
    };
  };

  const rows = useMemo(
    () => documentTypes.map((template, index) => buildRow(template.type, template.name, index + 1)),
    [documentTypes, versionsByType],
  );

  const registeredTypeSet = useMemo(() => {
    const types = allRegisteredTypes ?? documentTypes.map(t => t.type);
    return new Set(types);
  }, [allRegisteredTypes, documentTypes]);

  const registeredDedupeKeys = useMemo(
    () => collectRegisteredDedupeKeys(state.documents, companyId, registeredTypeSet),
    [state.documents, companyId, registeredTypeSet],
  );

  const registeredDocIds = useMemo(
    () => new Set(
      state.documents
        .filter(d => d.companyId === companyId && registeredTypeSet.has(d.type))
        .map(d => d.id),
    ),
    [state.documents, companyId, registeredTypeSet],
  );

  const extraDocs = useMemo(() => {
    if (!showOtherDocuments) return [];
    const byType = new Map<string, Document[]>();
    for (const doc of state.documents) {
      if (doc.companyId !== companyId) continue;
      if (
        isDuplicateOfRegistered(
          doc,
          companyId,
          registeredTypeSet,
          registeredDedupeKeys,
          registeredDocIds,
        )
      ) {
        continue;
      }
      const list = byType.get(doc.type) ?? [];
      list.push(doc);
      byType.set(doc.type, list);
    }
    return [...byType.entries()]
      .map(([type, versions], i) => {
        const sorted = sortVersions(versions);
        const latest = pickLatest(sorted);
        return {
          key: type,
          num: i + 1,
          type,
          name: latest?.name ?? type,
          latest,
          olderVersions: latest ? sorted.filter(v => v.id !== latest.id) : [],
        } satisfies DocumentRow;
      })
      .filter(row => {
        if (!row.latest) return true;
        const key = documentDedupeKey(row.latest);
        return !key || !registeredDedupeKeys.has(key);
      });
  }, [
    state.documents,
    companyId,
    registeredTypeSet,
    registeredDedupeKeys,
    registeredDocIds,
    showOtherDocuments,
  ]);

  const uploadedCount = rows.filter(r => r.latest?.hasFile).length
    + extraDocs.filter(r => r.latest?.hasFile).length;

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
      const formData = new FormData();
      formData.append('companyId', String(companyId));
      formData.append('type', values.type);
      formData.append('name', fileName);
      formData.append('file', fileList[0].originFileObj);

      if (replaceDoc) {
        formData.set('name', fileName);
        const { data } = await apiActions.replaceDocument(replaceDoc.id, formData);
        dispatch({ type: 'ADD_DOCUMENT_FROM_API', document: data as Document });
        message.success(`Загружена версия ${(data as Document).version ?? ''}`);
      } else {
        await dispatch({ type: 'ADD_DOCUMENT', formData });
        message.success('Документ загружен');
      }
      await refreshDocuments();
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
      await refreshDocuments();
      message.success('Версия удалена');
    } catch {
      message.error('Не удалось удалить документ');
    }
  };

  const versionColumns = [
    {
      title: 'Версия',
      key: 'version',
      width: 80,
      render: (_: unknown, doc: Document) => <Text>v{doc.version ?? 1}</Text>,
    },
    {
      title: 'Дата загрузки',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      width: 120,
      render: (v: string) => v || '—',
    },
    {
      title: 'Файл',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, doc: Document) => (
        <Space>
          <Button type="text" icon={<DownloadOutlined />} title="Скачать" onClick={() => downloadFile(doc)} />
          <Button type="text" danger icon={<DeleteOutlined />} title="Удалить версию" onClick={() => handleDelete(doc)} />
        </Space>
      ),
    },
  ];

  const actionButtons = (latest: Document | null, type: string, label: string) => {
    if (latest) {
      return (
        <Space>
          <Button type="text" icon={<DownloadOutlined />} title="Скачать" onClick={() => downloadFile(latest)} />
          <Button
            type="text"
            icon={<UploadOutlined />}
            title="Загрузить новую версию"
            onClick={() => openUpload(type, label, latest)}
          />
          <Button type="text" danger icon={<DeleteOutlined />} title="Удалить текущую версию" onClick={() => handleDelete(latest)} />
        </Space>
      );
    }
    return (
      <Button size="small" type="link" onClick={() => openUpload(type, label)}>
        Загрузить
      </Button>
    );
  };

  const renderDocumentTable = (dataSource: DocumentRow[], showExpand = true) => (
    <Table
      rowKey="key"
      dataSource={dataSource}
      pagination={false}
      size="middle"
      expandable={
        showExpand
          ? {
              expandRowByClick: true,
              rowExpandable: row => row.olderVersions.length > 0,
              expandedRowRender: row => (
                <div style={{ margin: '0 0 8px 48px' }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Предыдущие версии
                  </Text>
                  <Table
                    rowKey="id"
                    dataSource={row.olderVersions}
                    columns={versionColumns}
                    pagination={false}
                    size="small"
                  />
                </div>
              ),
            }
          : undefined
      }
      columns={[
        { title: '№', dataIndex: 'num', key: 'num', width: 56 },
        {
          title: 'Документ',
          key: 'name',
          render: (_: unknown, row: DocumentRow) => (
            <Space direction="vertical" size={0}>
              <span style={{ fontWeight: 550 }}>{row.name}</span>
              {row.latest && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {row.latest.name}
                  {row.olderVersions.length > 0 && ' · нажмите, чтобы показать прошлые версии'}
                </Text>
              )}
            </Space>
          ),
        },
        {
          title: 'Версия',
          key: 'version',
          width: 90,
          render: (_: unknown, row: DocumentRow) =>
            row.latest?.hasFile ? <Text>v{row.latest.version ?? 1}</Text> : '—',
        },
        {
          title: 'Статус',
          key: 'status',
          width: 160,
          render: (_: unknown, row: DocumentRow) =>
            row.latest?.hasFile
              ? <Tag color="success">Загружен</Tag>
              : <Tag>Отсутствует</Tag>,
        },
        {
          title: 'Дата',
          key: 'date',
          width: 120,
          render: (_: unknown, row: DocumentRow) => row.latest?.uploadDate || '—',
        },
        {
          title: '',
          key: 'actions',
          width: 160,
          render: (_: unknown, row: DocumentRow) => actionButtons(row.latest, row.type, row.name),
        },
      ]}
    />
  );

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
        {renderDocumentTable(rows)}

        {extraDocs.length > 0 && (
          <>
            <Text strong style={{ display: 'block', margin: '20px 0 8px' }}>Прочие документы</Text>
            {renderDocumentTable(extraDocs)}
          </>
        )}
      </Card>

      <Modal
        title={replaceDoc ? `Новая версия (сейчас v${replaceDoc.version ?? 1})` : 'Загрузить документ'}
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
