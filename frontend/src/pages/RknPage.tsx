import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  FileZipOutlined,
  InboxOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import DadataLookup from '../components/DadataLookup';
import { apiActions } from '../api/client';
import { downloadBlob } from '../utils/downloadBlob';
import type { RknNotification, RknFile } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export default function RknPage() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [showFiles, setShowFiles] = useState<RknNotification | null>(null);
  const [syncCompanyId, setSyncCompanyId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const notifications = state.rknNotifications.filter(n => {
    const comp = state.companies.find(c => c.id === n.companyId);
    return comp?.name.toLowerCase().includes(search.toLowerCase());
  });
  const submitted = notifications.filter(n => n.status === 'submitted').length;

  const refreshRkn = async () => {
    const { data } = await apiActions.getRknNotifications();
    dispatch({ type: 'SET_RKN_NOTIFICATIONS', items: data as RknNotification[] });
    return data as RknNotification[];
  };

  const syncFromDadata = async (companyId: number, query?: string) => {
    setSyncingId(companyId);
    try {
      await dispatch({ type: 'SYNC_COMPANY_DADATA', id: companyId, query });
      const comp = state.companies.find(c => c.id === companyId);
      message.success(`Реквизиты «${comp?.shortName || comp?.name || 'компании'}» обновлены из DaData`);
      setSyncCompanyId(null);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(
        msg?.includes('SUGGESTIONS')
          ? 'DaData: для токена не подключены «Подсказки». Включите API в личном кабинете dadata.ru'
          : (msg || 'Не удалось обновить данные из DaData'),
      );
    } finally {
      setSyncingId(null);
    }
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
      await apiActions.uploadRknDocument(showFiles.id, fd);
      const items = await refreshRkn();
      const updated = items.find(n => n.id === showFiles.id);
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
      await apiActions.deleteRknDocument(showFiles.id, file.id);
      const items = await refreshRkn();
      const updated = items.find(n => n.id === showFiles.id);
      if (updated) setShowFiles(updated);
      message.success('Документ удалён');
    } catch {
      message.error('Не удалось удалить документ');
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
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Документы',
      key: 'files',
      render: (_: unknown, record: RknNotification) =>
        record.files.length ? (
          <Button icon={<FileOutlined />} onClick={() => openFiles(record)}>
            {record.files.length}
          </Button>
        ) : (
          <Button type="link" size="small" onClick={() => openFiles(record)}>Загрузить</Button>
        ),
    },
    {
      title: '',
      key: 'dadata',
      width: 150,
      render: (_: unknown, record: RknNotification) => {
        const comp = state.companies.find(c => c.id === record.companyId);
        return (
          <Button
            size="small"
            icon={<CloudDownloadOutlined />}
            loading={syncingId === record.companyId}
            onClick={() => {
              if (comp?.inn || comp?.ogrn) {
                syncFromDadata(record.companyId);
              } else {
                setSyncCompanyId(record.companyId);
              }
            }}
          >
            DaData
          </Button>
        );
      },
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
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: current ? 550 : 400 }}>{f.name}</span>
      <Text type="secondary" style={{ fontSize: 11 }}>{f.date}</Text>
      <Button type="text" icon={<DownloadOutlined />} title="Скачать" onClick={() => downloadFile(f)} />
      <Button type="text" danger icon={<DeleteOutlined />} title="Удалить" onClick={() => deleteFile(f)} />
    </div>
  );

  const syncCompany = syncCompanyId ? state.companies.find(c => c.id === syncCompanyId) : null;

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
        <Input.Search
          placeholder="Поиск..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280, marginBottom: 16 }}
        />
        <Table<RknNotification> rowKey="id" dataSource={notifications} columns={columns} pagination={false} size="middle" />
      </Card>

      <Modal
        title={`Загрузка из DaData: ${syncCompany?.shortName || syncCompany?.name || ''}`}
        open={!!syncCompanyId}
        onCancel={() => setSyncCompanyId(null)}
        footer={null}
        destroyOnClose
      >
        <DadataLookup
          buttonText="Найти и обновить"
          hint="Укажите ИНН или ОГРН для обновления реквизитов компании"
          onLoaded={async data => {
            if (!syncCompanyId) return;
            await syncFromDadata(syncCompanyId, data.inn || data.ogrn);
          }}
        />
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
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Загрузить документ</Text>
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
                Загрузить
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
