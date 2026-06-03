import { useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileZipOutlined,
  InboxOutlined,
  PaperClipOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { apiActions } from '../api/client';
import { downloadBlob } from '../utils/downloadBlob';
import type { JournalEntry } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const MAX_ADDITIONAL_FILES = 20;

function journalDisplayStatus(record: JournalEntry) {
  return record.displayStatus || (record.hasAnswerFile ? record.status : 'waiting_answer');
}

export default function JournalPage() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'subject' | 'rkn'>('subject');
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [detail, setDetail] = useState<JournalEntry | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [answerFile, setAnswerFile] = useState<UploadFile[]>([]);
  const [contentFiles, setContentFiles] = useState<UploadFile[]>([]);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const entries = state.journalEntries.filter(
    j =>
      j.type === tab &&
      (j.sender.toLowerCase().includes(search.toLowerCase()) ||
        j.content.toLowerCase().includes(search.toLowerCase())),
  );

  const replaceEntry = (entry: JournalEntry) => {
    dispatch({ type: 'REPLACE_JOURNAL_ENTRY', entry });
    if (detail?.id === entry.id) setDetail(entry);
  };

  const openAdd = () => {
    form.setFieldsValue({
      companyId: state.companies[0]?.id ?? 1,
      dateIn: null,
      sender: '',
      content: '',
    });
    setContentFiles([]);
    setAddModal(true);
  };

  const handleAdd = async (values: { companyId: number; dateIn: dayjs.Dayjs; sender: string; content: string }) => {
    const formData = new FormData();
    formData.append('companyId', String(values.companyId));
    formData.append('type', tab);
    formData.append('dateIn', values.dateIn ? values.dateIn.format('YYYY-MM-DD') : '');
    formData.append('sender', values.sender);
    formData.append('content', values.content);
    formData.append('status', 'new');
    if (contentFiles[0]?.originFileObj) {
      formData.append('contentFile', contentFiles[0].originFileObj);
    }

    try {
      await dispatch({ type: 'ADD_JOURNAL', formData });
      message.success('Обращение добавлено');
      setAddModal(false);
      setContentFiles([]);
      form.resetFields();
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось сохранить обращение');
    }
  };

  const uploadKindFile = async (record: JournalEntry, kind: 'content' | 'answer', file: File) => {
    setUploadingId(record.id);
    try {
      const fd = new FormData();
      fd.append(kind === 'content' ? 'contentFile' : 'answerFile', file);
      fd.append('kind', kind);
      const { data } = await apiActions.uploadJournalFile(record.id, fd);
      replaceEntry(data as JournalEntry);
      message.success(kind === 'content' ? 'Файл обращения загружен' : 'Файл ответа загружен');
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось загрузить файл');
    } finally {
      setUploadingId(null);
    }
  };

  const downloadKindFile = async (record: JournalEntry, kind: 'content' | 'answer') => {
    const name = kind === 'content' ? record.contentFileName : record.answerFileName;
    try {
      const { data } = await apiActions.downloadJournalFile(record.id, kind);
      downloadBlob(data as Blob, name || `${kind}.bin`);
    } catch {
      message.error('Не удалось скачать файл');
    }
  };

  const uploadAdditionalFiles = async (record: JournalEntry, files: File[]) => {
    if (!files.length) return;

    const current = record.additionalFiles?.length ?? 0;
    if (current + files.length > MAX_ADDITIONAL_FILES) {
      message.warning(`Можно прикрепить не более ${MAX_ADDITIONAL_FILES} дополнительных файлов (сейчас ${current})`);
      return;
    }

    setUploadingId(record.id);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const { data } = await apiActions.uploadJournalAdditionalFiles(record.id, fd);
      replaceEntry(data as JournalEntry);
      message.success(files.length > 1 ? `Загружено файлов: ${files.length}` : 'Файл загружен');
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось загрузить файлы');
    } finally {
      setUploadingId(null);
    }
  };

  const downloadAdditionalFile = async (record: JournalEntry, index: number, name: string) => {
    try {
      const { data } = await apiActions.downloadJournalAdditionalFile(record.id, index);
      downloadBlob(data as Blob, name);
    } catch {
      message.error('Не удалось скачать файл');
    }
  };

  const deleteAdditionalFile = async (record: JournalEntry, index: number) => {
    try {
      const { data } = await apiActions.deleteJournalAdditionalFile(record.id, index);
      replaceEntry(data as JournalEntry);
      message.success('Файл удалён');
    } catch {
      message.error('Не удалось удалить файл');
    }
  };

  const saveAnswer = async () => {
    if (!detail) return;
    if (!answerDraft.trim() && !answerFile[0]?.originFileObj) return;

    try {
      if (answerDraft.trim()) {
        await dispatch({
          type: 'UPDATE_JOURNAL',
          id: detail.id,
          data: {
            answer: answerDraft,
            ...(detail.hasAnswerFile
              ? { dateOut: dayjs().format('DD.MM.YYYY'), status: 'closed' }
              : {}),
          },
        });
      }
      if (answerFile[0]?.originFileObj) {
        const fd = new FormData();
        fd.append('answerFile', answerFile[0].originFileObj);
        fd.append('kind', 'answer');
        const { data } = await apiActions.uploadJournalFile(detail.id, fd);
        replaceEntry(data as JournalEntry);
      }
      message.success('Ответ сохранён');
      setAnswerDraft('');
      setAnswerFile([]);
    } catch {
      message.error('Не удалось сохранить ответ');
    }
  };

  const downloadJournalFile = async (kind: 'content' | 'answer', filename?: string | null) => {
    if (!detail) return;
    try {
      const { data } = await apiActions.downloadJournalFile(detail.id, kind);
      downloadBlob(data as Blob, filename || `${kind}.bin`);
    } catch {
      message.error('Не удалось скачать файл');
    }
  };

  const deleteJournalFile = async (kind: 'content' | 'answer') => {
    if (!detail) return;
    try {
      const { data } = await apiActions.deleteJournalFile(detail.id, kind);
      replaceEntry(data as JournalEntry);
      message.success('Файл удалён');
    } catch {
      message.error('Не удалось удалить файл');
    }
  };

  const downloadArchive = async () => {
    if (!detail) return;
    try {
      const { data } = await apiActions.downloadJournalArchive(detail.id);
      downloadBlob(data as Blob, `journal-${detail.id}.zip`);
    } catch {
      message.error('Не удалось скачать архив');
    }
  };

  const renderFileRow = (label: string, kind: 'content' | 'answer', hasFile?: boolean, fileName?: string | null) => {
    if (!hasFile) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Text type="secondary">{label}:</Text>
        <Text style={{ flex: 1 }}>{fileName}</Text>
        <Button type="text" icon={<DownloadOutlined />} onClick={() => downloadJournalFile(kind, fileName || undefined)} />
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteJournalFile(kind)} />
      </div>
    );
  };

  const renderFileCell = (record: JournalEntry, kind: 'content' | 'answer') => {
    const hasFile = kind === 'content' ? record.hasContentFile : record.hasAnswerFile;
    const fileName = kind === 'content' ? record.contentFileName : record.answerFileName;
    if (hasFile) {
      return (
        <Button
          type="link"
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => downloadKindFile(record, kind)}
          style={{ padding: 0 }}
        >
          {fileName && fileName.length > 18 ? `${fileName.slice(0, 16)}…` : fileName}
        </Button>
      );
    }

    return (
      <Upload
        showUploadList={false}
        beforeUpload={file => {
          uploadKindFile(record, kind, file);
          return false;
        }}
        disabled={uploadingId === record.id}
      >
        <Button type="link" size="small" icon={<UploadOutlined />} loading={uploadingId === record.id}>
          Загрузить
        </Button>
      </Upload>
    );
  };

  const renderAdditionalCell = (record: JournalEntry) => {
    const files = record.additionalFiles ?? [];
    const remaining = MAX_ADDITIONAL_FILES - files.length;

    const popoverContent = (
      <div style={{ width: 280 }}>
        {files.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {files.map(f => (
              <div key={`${record.id}-${f.index}`} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <Text ellipsis style={{ flex: 1, maxWidth: 180 }}>{f.name}</Text>
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => downloadAdditionalFile(record, f.index, f.name)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteAdditionalFile(record, f.index)}
                />
              </div>
            ))}
          </div>
        )}
        {remaining > 0 ? (
          <Upload
            multiple
            showUploadList={false}
            beforeUpload={(file, fileList) => {
              if (fileList.indexOf(file) === fileList.length - 1) {
                const batch = fileList
                  .map(f => (f as UploadFile).originFileObj ?? f)
                  .filter((f): f is File => f instanceof File)
                  .slice(0, remaining);
                if (batch.length) uploadAdditionalFiles(record, batch);
              }
              return false;
            }}
            disabled={uploadingId === record.id}
          >
            <Button size="small" icon={<UploadOutlined />} loading={uploadingId === record.id}>
              Добавить ({remaining} из {MAX_ADDITIONAL_FILES})
            </Button>
          </Upload>
        ) : (
          <Text type="secondary">Достигнут лимит {MAX_ADDITIONAL_FILES} файлов</Text>
        )}
      </div>
    );

    return (
      <Popover title="Дополнительные файлы" trigger="click" content={popoverContent}>
        <Button type="link" size="small" icon={<PaperClipOutlined />}>
          {files.length ? `${files.length} файл(ов)` : 'Добавить'}
        </Button>
      </Popover>
    );
  };

  const columns = [
    { title: 'Дата запроса', dataIndex: 'dateIn', key: 'dateIn', width: 110 },
    {
      title: 'Дата ответа',
      dataIndex: 'dateOut',
      key: 'dateOut',
      width: 110,
      render: (v: string) => v || '—',
    },
    {
      title: 'Заявитель',
      dataIndex: 'sender',
      key: 'sender',
      render: (v: string) => <span style={{ fontWeight: 550 }}>{v}</span>,
    },
    {
      title: 'Компания',
      key: 'company',
      render: (_: unknown, record: JournalEntry) =>
        state.companies.find(c => c.id === record.companyId)?.shortName,
    },
    { title: 'Содержание', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: 'Обращение',
      key: 'appeal',
      width: 130,
      render: (_: unknown, record: JournalEntry) => renderFileCell(record, 'content'),
    },
    {
      title: 'Ответ',
      key: 'answerFile',
      width: 130,
      render: (_: unknown, record: JournalEntry) => renderFileCell(record, 'answer'),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 150,
      render: (_: unknown, record: JournalEntry) => (
        <StatusBadge status={journalDisplayStatus(record)} />
      ),
    },
    {
      title: 'Доп. файлы',
      key: 'additional',
      width: 120,
      render: (_: unknown, record: JournalEntry) => renderAdditionalCell(record),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, record: JournalEntry) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => {
            setDetail(record);
            setAnswerDraft(record.answer || '');
            setAnswerFile([]);
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Журналы обращений</Title>
      <Card>
        <Tabs
          activeKey={tab}
          onChange={k => setTab(k as 'subject' | 'rkn')}
          items={[
            { key: 'subject', label: 'Обращения субъектов ПДн' },
            { key: 'rkn', label: 'Обращения РКН' },
          ]}
        />
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Input.Search placeholder="Поиск..." allowClear value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Добавить
          </Button>
        </Space>
        <Table<JournalEntry> rowKey="id" dataSource={entries} columns={columns} pagination={false} size="middle" scroll={{ x: 1200 }} />
      </Card>

      <Modal
        title={`Новое обращение (${tab === 'subject' ? 'субъекта' : 'РКН'})`}
        open={addModal}
        onCancel={() => setAddModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="dateIn" label="Дата поступления" rules={[{ required: true, message: 'Укажите дату' }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="sender" label="Заявитель" rules={[{ required: true, message: 'Укажите заявителя' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="companyId" label="Компания" rules={[{ required: true }]}>
            <Select options={state.companies.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="content" label="Содержание запроса" rules={[{ required: true, message: 'Укажите содержание' }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item label="Файл обращения">
            <Dragger
              fileList={contentFiles}
              beforeUpload={() => false}
              onChange={({ fileList }) => setContentFiles(fileList.slice(-1))}
              maxCount={1}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Перетащите файл или нажмите для выбора</p>
            </Dragger>
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setAddModal(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit">Сохранить</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Детали обращения"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={detail && !detail.hasAnswerFile ? (
          <Space>
            <Button onClick={() => setDetail(null)}>Закрыть</Button>
            <Button type="primary" onClick={saveAnswer} disabled={!answerDraft.trim() && !answerFile.length}>
              Сохранить ответ
            </Button>
          </Space>
        ) : (
          <Button onClick={() => setDetail(null)}>Закрыть</Button>
        )}
        width={640}
        destroyOnClose
      >
        {detail && (
          <>
            {(detail.hasContentFile || detail.hasAnswerFile || (detail.additionalFiles?.length ?? 0) > 0) && (
              <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Button icon={<FileZipOutlined />} onClick={downloadArchive}>
                  Скачать архивом
                </Button>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Text type="secondary">Дата поступления</Text>
                <div>{detail.dateIn}</div>
              </div>
              <div>
                <Text type="secondary">Дата ответа</Text>
                <div>{detail.dateOut || '—'}</div>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Заявитель</Text>
              <div>{detail.sender}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Статус</Text>
              <div style={{ marginTop: 4 }}>
                <StatusBadge status={journalDisplayStatus(detail)} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">Содержание</Text>
              <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 7, border: '1px solid #e8e8e8', marginTop: 4 }}>
                {detail.content}
              </div>
              {renderFileRow('Файл обращения', 'content', detail.hasContentFile, detail.contentFileName)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">Ответ</Text>
              {detail.answer ? (
                <div style={{ padding: '10px 12px', background: '#f6ffed', borderRadius: 7, border: '1px solid #b7eb8f', marginTop: 4 }}>
                  {detail.answer}
                </div>
              ) : null}
              {renderFileRow('Файл ответа', 'answer', detail.hasAnswerFile, detail.answerFileName)}
              {!detail.hasAnswerFile && (
                <>
                  {!detail.answer && (
                    <TextArea
                      rows={4}
                      placeholder="Введите текст ответа (статус изменится после загрузки файла ответа)..."
                      value={answerDraft}
                      onChange={e => setAnswerDraft(e.target.value)}
                      style={{ marginTop: 8, marginBottom: 12 }}
                    />
                  )}
                  <Dragger
                    fileList={answerFile}
                    beforeUpload={() => false}
                    onChange={({ fileList }) => setAnswerFile(fileList.slice(-1))}
                    maxCount={1}
                  >
                    <p className="ant-upload-text">Прикрепить файл ответа</p>
                  </Dragger>
                </>
              )}
            </div>
            <div>
              <Text type="secondary">Дополнительные файлы</Text>
              <div style={{ marginTop: 8 }}>{renderAdditionalCell(detail)}</div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
