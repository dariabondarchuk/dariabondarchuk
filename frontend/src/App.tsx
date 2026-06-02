import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

const theme = {
  token: {
    colorPrimary: '#0055FF',
    borderRadius: 8,
    colorBgLayout: '#F5F6FA',
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
  },
};

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={ruRU}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
