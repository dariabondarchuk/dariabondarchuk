import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileOutlined,
  FileZipOutlined,
  InboxOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import CompanySearchSelect from '../components/CompanySearchSelect';
import { apiActions } from '../api/client';
import { downloadBlob } from '../utils/downloadBlob';
import { getRknDisplayStatus } from '../utils/rknStatus';
import type { RknNotification, RknFile } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function RknPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [showFiles, setShowFiles] = useState<RknNotification | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addCompanyId, setAddCompanyId] = useState<number | undefined>();
  const [adding, setAdding] = useState(false);
  const [editRecord, setEditRecord] = useState<RknNotification | null>(null);
  const [editSubmit, setEditSubmit] = useState<dayjs.Dayjs | null>(null);
  const [editChange, setEditChange] = useState<dayjs.Dayjs | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const companiesAvailableForRkn = useMemo(
    () => state.companies.filter(
      c => !state.rknNotifications.some(n => n.companyId === c.id),
    ),
    [state.companies, state.rknNotifications],
  );

  const notifications = state.rknNotifications.filter(n => {
    const comp = state.companies.find(c => c.id === n.companyId);
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${comp?.name ?? ''} ${comp?.shortName ?? ''} ${comp?.inn ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
  const submitted = notifications.filter(n => getRknDisplayStatus(n) === 'submitted').length;

  const refreshRkn = async () => {
    const { data } = await apiActions.getRknNotifications();
    dispatch({ type: 'SET_RKN_NOTIFICATIONS', items: data as RknNotification[] });
    return data as RknNotification[];
  };

  const closeFilesModal = () => {
    setShowFiles(null);
    setFileList([]);
  };

  const openFiles = (record: RknNotification) => {
    setShowFiles(record);
    setFileList([]);
  };

  const handleUpload = async () => {
    if (!showFiles || !fileList[0]?.originFileObj) {
      message.error('Выберите файл');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', fileList[0].originFileObj);
      const { data } = await apiActions.uploadRknDocument(showFiles.id, fd);
      const items = await refreshRkn();
      const updated = (data as { notification?: RknNotification }).notification
        ?? items.find(n => n.id === showFiles.id);
      if (updated) setShowFiles(updated);
      setFileList([]);
      message.success('Документ загружен');
    } catch {
      message.error('Не удалось загрузить документ');
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (file: RknFile) => {
    if (!showFiles || !file.id) return;
    try {
      const { data } = await apiActions.downloadRknDocument(showFiles.id, file.id);
      downloadBlob(data as Blob, file.name);
    } catch {
      message.error('Не удалось скачать файл');
    }
  };

  const deleteFile = async (file: RknFile) => {
    if (!showFiles || !file.id) return;
    try {
      const { data } = await apiActions.deleteRknDocument(showFiles.id, file.id);
      const items = await refreshRkn();
      const updated = (data as { notification?: RknNotification }).notification
        ?? items.find(n => n.id === showFiles.id);
      if (updated) setShowFiles(updated);
      message.success('Документ удалён');
    } catch {
      message.error('Не удалось удалить документ');
    }
  };

  const addNotification = async () => {
    if (!addCompanyId) {
      message.warning('Выберите компанию из реестра');
      return;
    }
    setAdding(true);
    try {
      await apiActions.createRknNotification(addCompanyId);
      const items = await refreshRkn();
      const created = items.find(n => n.companyId === addCompanyId);
      setAddOpen(false);
      setAddCompanyId(undefined);
      message.success('Уведомление добавлено в реестр');
      if (created) openFiles(created);
    } catch (err) {
      const res = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; notificationId?: number }; status?: number } }).response
        : undefined;
      if (res?.status === 409) {
        message.warning(res.data?.error || 'Уведомление для компании уже существует');
        setAddOpen(false);
        return;
      }
      const errText = res?.data?.error;
      if (res?.status === 404 && errText === 'Not found') {
        message.error('Сервер API устарел или не перезапущен. Перезапустите backend (порт 4000) и повторите.');
        return;
      }
      message.error(errText || 'Не удалось добавить уведомление');
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (record: RknNotification) => {
    setEditRecord(record);
    setEditSubmit(record.dateSubmit ? dayjs(record.dateSubmit, 'DD.MM.YYYY') : null);
    setEditChange(record.dateChange ? dayjs(record.dateChange, 'DD.MM.YYYY') : null);
  };

  const saveEdit = async () => {
    if (!editRecord) return;
    setSavingEdit(true);
    try {
      await apiActions.updateRknNotification(editRecord.id, {
        dateSubmit: editSubmit ? editSubmit.format('DD.MM.YYYY') : null,
        dateChange: editChange ? editChange.format('DD.MM.YYYY') : null,
      });
      const items = await refreshRkn();
      const updated = items.find(n => n.id === editRecord.id);
      if (showFiles?.id === editRecord.id && updated) {
        setShowFiles(updated);
      }
      setEditRecord(null);
      message.success('Запись обновлена');
    } catch {
      message.error('Не удалось сохранить изменения');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteNotification = async (record: RknNotification) => {
    setDeletingId(record.id);
    try {
      await apiActions.deleteRknNotification(record.id);
      dispatch({
        type: 'SET_RKN_NOTIFICATIONS',
        items: state.rknNotifications.filter(n => n.id !== record.id),
      });
      if (showFiles?.id === record.id) closeFilesModal();
      message.success('Уведомление удалено из реестра');
    } catch {
      message.error('Не удалось удалить уведомление');
    } finally {
      setDeletingId(null);
    }
  };

  const downloadArchive = async () => {
    if (!showFiles) return;
    try {
      const comp = state.companies.find(c => c.id === showFiles.companyId);
      const { data } = await apiActions.downloadRknArchive(showFiles.id);
      downloadBlob(data as Blob, `${comp?.shortName || 'rkn'}-documents.zip`);
    } catch {
      message.error('Не удалось скачать архив');
    }
  };

  const columns = [
    {
      title: 'Компания',
      key: 'company',
      render: (_: unknown, record: RknNotification) => {
        const comp = state.companies.find(c => c.id === record.companyId);
        return <span style={{ fontWeight: 550 }}>{comp?.name}</span>;
      },
    },
    {
      title: 'ИНН',
      key: 'inn',
      width: 130,
      render: (_: unknown, record: RknNotification) => {
        const comp = state.companies.find(c => c.id === record.companyId);
        return comp?.inn || '—';
      },
    },
    { title: 'Дата подачи', dataIndex: 'dateSubmit', key: 'dateSubmit', render: (v: string) => v || '—' },
    { title: 'Дата изменений', dataIndex: 'dateChange', key: 'dateChange', render: (v: string) => v || '—' },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_: unknown, record: RknNotification) => (
        <StatusBadge status={getRknDisplayStatus(record)} />
      ),
    },
    {
      title: 'Документы',
      key: 'files',
      width: 200,
      render: (_: unknown, record: RknNotification) => {
        const count = record.files.length;
        const current = record.files.find(f => f.current);
        const hasArchive = count > 1;
        return (
          <Space direction="vertical" size={4}>
            <Button
              type={count ? 'default' : 'link'}
              size="small"
              icon={<FileOutlined />}
              onClick={() => openFiles(record)}
            >
              {count ? (hasArchive ? `${count} версии` : '1 документ') : 'Загрузить'}
            </Button>
            {current?.version != null && count > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Актуальная: v{current.version}
                {hasArchive ? ' · есть архив' : ''}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 88,
      render: (_: unknown, record: RknNotification) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title="Изменить"
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Удалить уведомление?"
            description="Компания останется в реестре, запись РКН будет удалена вместе с документами."
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteNotification(record)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Удалить"
              loading={deletingId === record.id}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderFile = (f: RknFile, current: boolean) => (
    <div
      key={f.id ?? f.name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px',
        background: current ? '#f6ffed' : '#fafafa',
        borderRadius: 7,
        border: `1px solid ${current ? '#b7eb8f' : '#e8e8e8'}`,
        marginBottom: 6,
      }}
    >
      <FileOutlined />
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: current ? 550 : 400 }}>
        {f.name}
        {f.version != null && (
          <Tag color={current ? 'green' : 'default'} style={{ marginLeft: 6 }}>v{f.version}</Tag>
        )}
      </span>
      <Text type="secondary" style={{ fontSize: 11 }}>{f.date}</Text>
      <Button type="text" icon={<DownloadOutlined />} title="Скачать" onClick={() => downloadFile(f)} />
      <Button type="text" danger icon={<DeleteOutlined />} title="Удалить" onClick={() => deleteFile(f)} />
    </div>
  );

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Реестр уведомлений РКН</Title>
      <Row gutter={10} style={{ marginBottom: 14 }}>
        <Col span={8}>
          <Card><Statistic title="Подано" value={submitted} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Не подано" value={notifications.length - submitted} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Всего компаний" value={notifications.length} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
      </Row>
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Поиск по компании, ИНН..."
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setAddCompanyId(undefined);
              setAddOpen(true);
            }}
            disabled={!state.companies.length}
          >
            Добавить уведомление
          </Button>
        </div>
        <Table<RknNotification> rowKey="id" dataSource={notifications} columns={columns} pagination={false} size="middle" />
      </Card>

      <Modal
        title="Добавить уведомление"
        open={addOpen}
        onCancel={() => {
          setAddOpen(false);
          setAddCompanyId(undefined);
        }}
        onOk={companiesAvailableForRkn.length ? addNotification : undefined}
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={adding}
        okButtonProps={{ disabled: companiesAvailableForRkn.length === 0 }}
        destroyOnClose
      >
        {companiesAvailableForRkn.length === 0 ? (
          <Text type="secondary">
            Для всех компаний из реестра уже созданы уведомления. Добавьте новую компанию в разделе «Компании».
          </Text>
        ) : (
          <Form layout="vertical">
            <Form.Item label="Компания" required>
              <CompanySearchSelect
                value={addCompanyId}
                onChange={setAddCompanyId}
                includeCompanyIds={companiesAvailableForRkn.map(c => c.id)}
              />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>
              После добавления можно сразу загрузить файл уведомления. При повторной загрузке сохраняется новая версия, предыдущие остаются в архиве.
            </Text>
          </Form>
        )}
      </Modal>

      <Modal
        title="Изменить уведомление"
        open={!!editRecord}
        onCancel={() => setEditRecord(null)}
        onOk={saveEdit}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={savingEdit}
        destroyOnClose
      >
        {editRecord && (
          <Form layout="vertical">
            <Form.Item label="Компания">
              <Input
                disabled
                value={state.companies.find(c => c.id === editRecord.companyId)?.name ?? ''}
              />
            </Form.Item>
            <Form.Item label="Дата подачи">
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                value={editSubmit}
                onChange={setEditSubmit}
                allowClear
              />
            </Form.Item>
            <Form.Item label="Дата изменений">
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                value={editChange}
                onChange={setEditChange}
                allowClear
              />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Статус: {getRknDisplayStatus(editRecord) === 'submitted' ? 'Подано' : 'Не подано'}
              {' '}(определяется по наличию загруженного документа)
            </Text>
          </Form>
        )}
      </Modal>

      <Modal
        title={`Документы: ${state.companies.find(c => c.id === showFiles?.companyId)?.name ?? ''}`}
        open={!!showFiles}
        onCancel={closeFilesModal}
        footer={null}
        width={620}
        destroyOnClose
      >
        {showFiles && (
          <>
            {showFiles.files.length > 0 && (
              <div style={{ marginBottom: 12, textAlign: 'right' }}>
                <Button icon={<FileZipOutlined />} onClick={downloadArchive}>
                  Скачать архивом
                </Button>
              </div>
            )}

            {showFiles.files.filter(f => f.current).length > 0 && (
              <>
                <Text strong style={{ color: '#52c41a', fontSize: 12, display: 'block', marginBottom: 8 }}>
                  Актуальная редакция
                </Text>
                {showFiles.files.filter(f => f.current).map(f => renderFile(f, true))}
              </>
            )}
            {showFiles.files.filter(f => !f.current).length > 0 && (
              <>
                <Text type="secondary" strong style={{ fontSize: 12, display: 'block', margin: '14px 0 8px' }}>
                  Архивные версии
                </Text>
                {showFiles.files.filter(f => !f.current).map(f => renderFile(f, false))}
              </>
            )}

            <div style={{ marginTop: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {showFiles.files.length ? 'Загрузить новую версию (изменения)' : 'Загрузить уведомление'}
              </Text>
              {showFiles.files.length > 0 && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                  Текущий файл перейдёт в архив, актуальной станет новая загрузка. Дата изменений обновится автоматически.
                </Text>
              )}
              <Dragger
                fileList={fileList}
                beforeUpload={() => false}
                onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
                maxCount={1}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">PDF или другой формат</p>
              </Dragger>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={uploading}
                onClick={handleUpload}
                style={{ marginTop: 12 }}
              >
                {showFiles.files.length ? 'Загрузить новую версию' : 'Загрузить'}
              </Button>
            </div>

            <div style={{ marginTop: 14, padding: '10px 12px', background: '#fffbe6', borderRadius: 7, border: '1px solid #ffe58f', fontSize: 12 }}>
              Стандарт именования: <b>Название_ДДММГГГГ.pdf</b>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
