import { useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd';
import { EyeOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { apiActions } from '../api/client';
import type { JournalEntry } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

export default function JournalPage() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'subject' | 'rkn'>('subject');
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [detail, setDetail] = useState<JournalEntry | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [answerFile, setAnswerFile] = useState<UploadFile[]>([]);
  const [contentFiles, setContentFiles] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const entries = state.journalEntries.filter(
    j =>
      j.type === tab &&
      (j.sender.toLowerCase().includes(search.toLowerCase()) ||
        j.content.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => {
    form.setFieldsValue({
      companyId: state.companies[0]?.id ?? 1,
      dateIn: null,
      sender: '',
      content: '',
    });
    setAddModal(true);
  };

  const handleAdd = (values: { companyId: number; dateIn: dayjs.Dayjs; sender: string; content: string }) => {
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

    if (localStorage.getItem('token') === 'mock-dev-token') {
      dispatch({
        type: 'ADD_JOURNAL',
        entry: {
          companyId: values.companyId,
          type: tab,
          dateIn: values.dateIn ? values.dateIn.format('DD.MM.YYYY') : '',
          dateOut: '',
          sender: values.sender,
          content: values.content,
          answer: '',
          status: 'new',
        },
      });
    } else {
      dispatch({ type: 'ADD_JOURNAL', formData });
    }

    message.success('Обращение добавлено');
    setAddModal(false);
    setContentFiles([]);
    form.resetFields();
  };

  const saveAnswer = async () => {
    if (!detail || !answerDraft.trim()) return;
    await dispatch({
      type: 'UPDATE_JOURNAL',
      id: detail.id,
      data: {
        answer: answerDraft,
        dateOut: dayjs().format('DD.MM.YYYY'),
        status: 'closed',
      },
    });
    if (answerFile[0]?.originFileObj && localStorage.getItem('token') !== 'mock-dev-token') {
      const fd = new FormData();
      fd.append('answerFile', answerFile[0].originFileObj);
      await apiActions.uploadJournalAnswerFile(detail.id, fd);
    }
    message.success('Ответ сохранён');
    setDetail(null);
    setAnswerDraft('');
    setAnswerFile([]);
  };

  const columns = [
    { title: 'Дата запроса', dataIndex: 'dateIn', key: 'dateIn' },
    {
      title: 'Дата ответа',
      dataIndex: 'dateOut',
      key: 'dateOut',
      render: (v: string) => v || <Text type="warning">Ожидает</Text>,
    },
    { title: 'Отправитель', dataIndex: 'sender', key: 'sender', render: (v: string) => <span style={{ fontWeight: 550 }}>{v}</span> },
    {
      title: 'Компания',
      key: 'company',
      render: (_: unknown, record: JournalEntry) =>
        state.companies.find(c => c.id === record.companyId)?.shortName,
    },
    { title: 'Содержание', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      render: (_: unknown, record: JournalEntry) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => { setDetail(record); setAnswerDraft(''); }} />
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
        <Table<JournalEntry> rowKey="id" dataSource={entries} columns={columns} pagination={false} size="middle" />
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
          <Form.Item name="sender" label="Отправитель" rules={[{ required: true, message: 'Укажите отправителя' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="companyId" label="Компания" rules={[{ required: true }]}>
            <Select
              options={state.companies.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="content" label="Содержание запроса" rules={[{ required: true, message: 'Укажите содержание' }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item label="Прикрепить файл">
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
        footer={detail && !detail.answer ? (
          <Space>
            <Button onClick={() => setDetail(null)}>Закрыть</Button>
            <Button type="primary" onClick={saveAnswer} disabled={!answerDraft.trim()}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Text type="secondary">Дата поступления</Text>
                <div>{detail.dateIn}</div>
              </div>
              <div>
                <Text type="secondary">Дата ответа</Text>
                <div>{detail.dateOut || 'Нет ответа'}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">Содержание</Text>
              <div style={{ padding: '10px 12px', background: '#fafafa', borderRadius: 7, border: '1px solid #e8e8e8', marginTop: 4 }}>
                {detail.content}
              </div>
            </div>
            <div>
              <Text type="secondary">Ответ</Text>
              {detail.answer ? (
                <div style={{ padding: '10px 12px', background: '#f6ffed', borderRadius: 7, border: '1px solid #b7eb8f', marginTop: 4 }}>
                  {detail.answer}
                </div>
              ) : (
                <>
                  <TextArea
                    rows={4}
                    placeholder="Введите ответ..."
                    value={answerDraft}
                    onChange={e => setAnswerDraft(e.target.value)}
                    style={{ marginTop: 4, marginBottom: 12 }}
                  />
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
          </>
        )}
      </Modal>
    </div>
  );
}
