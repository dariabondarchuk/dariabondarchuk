import { useState } from 'react';
import { Button, Card, Descriptions, Modal, Popconfirm, Space, Table, Typography, message } from 'antd';
import { CloudDownloadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DadataLookup from '../components/DadataLookup';
import type { CompanyDadataPatch } from '../api/dadata';
import type { Company } from '../types';

const { Title, Text } = Typography;

export default function CompaniesPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [syncCompany, setSyncCompany] = useState<Company | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<CompanyDadataPatch | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const syncFromDadata = async (company: Company, query?: string) => {
    setSyncingId(company.id);
    try {
      const result = await dispatch({
        type: 'SYNC_COMPANY_DADATA',
        id: company.id,
        query,
      }) as { company: Company; events: { id: number }[] };
      message.success(`Реквизиты «${company.shortName || company.name}» обновлены из DaData`);
      if (result.events?.length) {
        message.info(`В «Уведомления» добавлено записей: ${result.events.length}`);
      }
      setSyncCompany(null);
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

  const closeAddModal = () => {
    setAddOpen(false);
    setPreview(null);
    setLastQuery('');
  };

  const addCompany = async () => {
    const query = lastQuery || preview?.inn || preview?.ogrn;
    if (!query) {
      message.warning('Сначала найдите организацию в DaData');
      return;
    }
    setAdding(true);
    try {
      const company = await dispatch({ type: 'ADD_COMPANY_DADATA', query }) as Company | undefined;
      message.success(`Компания «${company?.shortName || company?.name}» добавлена`);
      closeAddModal();
      if (company?.id) navigate(`/companies/${company.id}`);
    } catch (err) {
      const res = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string; companyId?: number }; status?: number } }).response
        : undefined;
      const msg = res?.data?.error;
      if (res?.status === 409 && res.data?.companyId) {
        message.warning(msg || 'Компания уже есть в реестре');
        closeAddModal();
        navigate(`/companies/${res.data.companyId}`);
        return;
      }
      message.error(
        msg?.includes('SUGGESTIONS')
          ? 'DaData: для токена не подключены «Подсказки». Включите API в личном кабинете dadata.ru'
          : (msg || 'Не удалось добавить компанию'),
      );
    } finally {
      setAdding(false);
    }
  };

  const deleteCompany = async (company: Company) => {
    setDeletingId(company.id);
    try {
      await dispatch({ type: 'DELETE_COMPANY', id: company.id });
      message.success(`Компания «${company.shortName || company.name}» удалена`);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      message.error(msg || 'Не удалось удалить компанию');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span style={{ fontWeight: 550, color: '#1677ff' }}>{v}</span>,
    },
    { title: 'ИНН', dataIndex: 'inn', key: 'inn', width: 140, render: (v: string) => v || '—' },
    { title: 'ОГРН', dataIndex: 'ogrn', key: 'ogrn', width: 160, render: (v: string) => v || '—' },
    { title: 'Сокращённое', dataIndex: 'shortName', key: 'shortName', width: 180 },
    { title: 'Вид деятельности', dataIndex: 'activity', key: 'activity', render: (v: string | undefined) => v || '—' },
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Company) => (
        <Space onClick={e => e.stopPropagation()}>
          <Button
            size="small"
            icon={<CloudDownloadOutlined />}
            loading={syncingId === record.id}
            onClick={() => {
              if (record.inn || record.ogrn) {
                syncFromDadata(record);
              } else {
                setSyncCompany(record);
              }
            }}
          >
            DaData
          </Button>
          <Popconfirm
            title="Удалить компанию?"
            description={`«${record.shortName || record.name}» и все связанные данные будут удалены.`}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => deleteCompany(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} loading={deletingId === record.id} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>Компании</Title>
      <Card
        title="Компании ГК «Самолёт»"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Добавить компанию
          </Button>
        }
      >
        <Table<Company>
          rowKey="id"
          dataSource={state.companies}
          columns={columns}
          pagination={false}
          size="middle"
          onRow={record => ({
            onClick: () => navigate(`/companies/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Modal
        title="Добавить компанию через DaData"
        open={addOpen}
        onCancel={closeAddModal}
        footer={null}
        destroyOnClose
        width={640}
      >
        <DadataLookup
          buttonText="Найти"
          hint="Введите ИНН, ОГРН или название организации"
          onLoaded={(data, query) => {
            setPreview(data);
            setLastQuery(query || data.inn || data.ogrn);
          }}
        />
        {preview && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Наименование">{preview.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Сокращённое">{preview.shortName || '—'}</Descriptions.Item>
              <Descriptions.Item label="ИНН">{preview.inn || '—'}</Descriptions.Item>
              <Descriptions.Item label="ОГРН">{preview.ogrn || '—'}</Descriptions.Item>
              <Descriptions.Item label="Юридический адрес">{preview.legalAddress || '—'}</Descriptions.Item>
              <Descriptions.Item label="Руководитель">
                {preview.ceo ? `${preview.ceo}${preview.ceoPosition ? ` — ${preview.ceoPosition}` : ''}` : '—'}
              </Descriptions.Item>
            </Descriptions>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeAddModal}>Отмена</Button>
              <Button type="primary" loading={adding} onClick={addCompany}>
                Добавить в реестр
              </Button>
            </Space>
          </>
        )}
      </Modal>

      <Modal
        title={`Загрузка из DaData: ${syncCompany?.shortName || syncCompany?.name || ''}`}
        open={!!syncCompany}
        onCancel={() => setSyncCompany(null)}
        footer={null}
        destroyOnClose
      >
        <DadataLookup
          buttonText="Найти и обновить"
          hint="У компании не указан ИНН/ОГРН — введите значение для поиска"
          onLoaded={async data => {
            if (!syncCompany) return;
            await syncFromDadata(syncCompany, data.inn || data.ogrn);
          }}
        />
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={() => setSyncCompany(null)}>Отмена</Button>
        </Space>
      </Modal>
    </div>
  );
}
