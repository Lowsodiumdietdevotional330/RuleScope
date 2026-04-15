import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Button, ConfigProvider, Segmented, theme as antdTheme } from 'antd';
import { UploadOutlined, BookOutlined, ReadOutlined, FileTextOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import FileManager from './components/FileManager';
import FileUpload from './components/FileUpload';
import FilePreview from './components/FilePreview';
import Highlights from './components/Highlights';
import { LanguageProvider, useLanguage } from './i18n';
import { ThemeProvider, useThemeMode } from './theme';
import './App.css';

const { Header, Content } = Layout;

const NavBar = () => {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { themeMode, toggleTheme, isDarkMode } = useThemeMode();
  const inactiveButtonStyle = {
    borderRadius: 10,
    border: '1px solid var(--border-soft)',
    color: 'var(--text-primary)',
    background: isDarkMode ? 'var(--surface-raised)' : 'var(--surface-contrast)',
    boxShadow: 'none',
  };
  const activeButtonStyle = {
    borderRadius: 10,
    border: 'none',
    boxShadow: isDarkMode ? '0 10px 24px rgba(255, 138, 61, 0.22)' : '0 10px 24px rgba(0, 179, 186, 0.18)',
  };

  return (
    <Header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      height: 64,
      padding: '0 28px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: isDarkMode ? 'var(--surface-contrast)' : 'var(--surface-1)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      backdropFilter: 'blur(20px) saturate(160%)',
      borderBottom: '1px solid var(--border-soft)',
      boxShadow: isDarkMode ? 'var(--panel-shadow-soft)' : '0 2px 10px rgba(0, 0, 0, 0.02)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: isDarkMode
            ? 'linear-gradient(135deg, var(--accent), #ff6f4d)'
            : 'linear-gradient(135deg, #00B3BA, #16c6cd)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDarkMode ? '0 10px 24px rgba(255, 138, 61, 0.24)' : 'none',
        }}>
          <ReadOutlined style={{ color: '#fff', fontSize: 18 }} />
        </div>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          {t('appTitle')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Button
          icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          style={inactiveButtonStyle}
        >
          {themeMode === 'dark' ? t('themeLight') : t('themeDark')}
        </Button>
        <Segmented
          size="middle"
          value={language}
          onChange={setLanguage}
          options={[
            { label: t('langChinese'), value: 'zh-CN' },
            { label: t('langEnglish'), value: 'en-US' },
          ]}
        />
        <Link to="/upload">
          <Button
            type={location.pathname === '/upload' ? 'primary' : 'default'}
            icon={<UploadOutlined />}
            style={location.pathname === '/upload' ? activeButtonStyle : inactiveButtonStyle}
          >
            {t('navUpload')}
          </Button>
        </Link>
        <Link to="/">
          <Button
            type={location.pathname === '/' || location.pathname === '/files' ? 'primary' : 'default'}
            icon={<FileTextOutlined />}
            style={(location.pathname === '/' || location.pathname === '/files') ? activeButtonStyle : inactiveButtonStyle}
          >
            {t('navFiles')}
          </Button>
        </Link>
        <Link to="/highlights">
          <Button
            type={location.pathname === '/highlights' ? 'primary' : 'default'}
            icon={<BookOutlined />}
            style={location.pathname === '/highlights' ? activeButtonStyle : inactiveButtonStyle}
          >
            {t('navHighlights')}
          </Button>
        </Link>
      </div>
    </Header>
  );
};

const AppShell = () => {
  useEffect(() => {
    const checkUploadsDir = async () => {
      try {
        await fetch('/api/files');
      } catch (error) {
        console.error('Failed to check uploads directory', error);
      }
    };
    checkUploadsDir();
  }, []);

  return (
    <Router>
      <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden', background: 'var(--app-bg)' }}>
        <NavBar />
        <Content style={{ padding: '20px', height: 'calc(100vh - 64px)', overflowY: 'auto', overflowX: 'hidden', background: 'var(--app-bg)', color: 'var(--text-primary)', transition: 'background 0.25s ease, color 0.25s ease' }}>
          <Routes>
            <Route path="/" element={<FileManager />} />
            <Route path="/files" element={<FileManager />} />
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/preview/:id" element={<FilePreview />} />
            <Route path="/highlights" element={<Highlights />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
};

const ThemedApp = () => {
  const { isDarkMode } = useThemeMode();

  return (
      <ConfigProvider
        theme={{
          algorithm: isDarkMode
            ? [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm]
            : [antdTheme.defaultAlgorithm, antdTheme.compactAlgorithm],
          token: {
            colorPrimary: isDarkMode ? '#ff8a3d' : '#00B3BA',
            colorBgBase: isDarkMode ? '#141414' : '#ffffff',
            colorBgContainer: isDarkMode ? '#232323' : '#ffffff',
            colorBgElevated: isDarkMode ? '#1f1f1f' : '#ffffff',
            colorText: isDarkMode ? '#f3eee7' : '#1f1f1f',
            colorTextSecondary: isDarkMode ? '#b8aea6' : '#6b7280',
            colorBorder: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0, 0, 0, 0.08)',
            colorFillSecondary: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0, 0, 0, 0.04)',
            colorFillTertiary: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0, 0, 0, 0.03)',
            borderRadius: 12,
          },
        }}
      >
        <AppShell />
      </ConfigProvider>
  );
};

const App = () => (
  <LanguageProvider>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </LanguageProvider>
);

export default App;
