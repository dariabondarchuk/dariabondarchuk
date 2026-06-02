import { Button, Checkbox, Space } from 'antd';

interface AnketaFormFooterProps {
  onClose: () => void;
  markVerified: boolean;
  onMarkVerifiedChange: (checked: boolean) => void;
  verifyDisabled?: boolean;
}

export default function AnketaFormFooter({
  onClose,
  markVerified,
  onMarkVerifiedChange,
  verifyDisabled,
}: AnketaFormFooterProps) {
  return (
    <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <Checkbox
        checked={markVerified}
        disabled={verifyDisabled}
        onChange={e => onMarkVerifiedChange(e.target.checked)}
      >
        Анкета проверена
      </Checkbox>
      <Space>
        <Button onClick={onClose}>Закрыть</Button>
        <Button type="primary" htmlType="submit">Сохранить</Button>
      </Space>
    </Space>
  );
}
