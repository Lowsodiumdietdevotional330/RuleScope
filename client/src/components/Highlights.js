import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Empty, Input, Layout, List, Space, Tag, Tooltip, Typography, message } from 'antd';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  PushpinFilled,
  PushpinOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

const HIGHLIGHT_COLOR_STYLES = {
  yellow: {
    border: '#f5cf45',
    background: 'rgba(255, 230, 110, 0.28)',
  },
  green: {
    border: '#5ecb7a',
    background: 'rgba(120, 224, 143, 0.24)',
  },
  blue: {
    border: '#5b9cff',
    background: 'rgba(126, 180, 255, 0.24)',
  },
  pink: {
    border: '#ff82b2',
    background: 'rgba(255, 148, 196, 0.24)',
  },
  orange: {
    border: '#ffad5a',
    background: 'rgba(255, 184, 108, 0.24)',
  },
};

const getHighlightColorStyle = (color) => HIGHLIGHT_COLOR_STYLES[color] || HIGHLIGHT_COLOR_STYLES.yellow;

const Highlights = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  const loadHighlights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/highlights');
      const data = await response.json();
      setHighlights(
        data.sort((a, b) => {
          if (!!a.isPinned !== !!b.isPinned) {
            return a.isPinned ? -1 : 1;
          }
          return new Date(b.timestamp) - new Date(a.timestamp);
        }),
      );
    } catch (error) {
      message.error(t('highlightsLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHighlights();
  }, []);

  const groupedHighlights = useMemo(() => {
    const groups = {};
    highlights.forEach((item) => {
      if (!groups[item.fileId]) {
        groups[item.fileId] = {
          fileId: item.fileId,
          regulationName: item.regulationName,
          version: item.version,
          items: [],
        };
      }
      groups[item.fileId].items.push(item);
    });
    return groups;
  }, [highlights]);

  const docList = Object.values(groupedHighlights);

  useEffect(() => {
    if (docList.length > 0 && !selectedDocId) {
      setSelectedDocId(docList[0].fileId);
    }
  }, [docList, selectedDocId]);

  const deleteHighlight = async (id) => {
    try {
      const response = await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
      if (response.ok) {
        message.success(t('highlightsDeleteSuccess'));
        setHighlights((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      message.error(t('highlightsDeleteFailed'));
    }
  };

  const updateNote = async (id) => {
    try {
      const response = await fetch(`/api/highlights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: tempNote }),
      });
      if (response.ok) {
        message.success(t('highlightsSaveSuccess'));
        setHighlights((prev) => prev.map((item) => (item.id === id ? { ...item, note: tempNote } : item)));
        setEditingNoteId(null);
      }
    } catch (error) {
      message.error(t('highlightsSaveFailed'));
    }
  };

  const togglePin = async (item) => {
    try {
      const response = await fetch(`/api/highlights/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !item.isPinned }),
      });
      if (response.ok) {
        message.success(item.isPinned ? t('highlightsUnpinSuccess') : t('highlightsPinSuccess'));
        loadHighlights();
      }
    } catch (error) {
      message.error(t('highlightsActionFailed'));
    }
  };

  const selectedDocHighlights = selectedDocId ? groupedHighlights[selectedDocId]?.items || [] : [];
  const selectedDocInfo = selectedDocId ? groupedHighlights[selectedDocId] : null;

  return (
    <div style={{ padding: '0 24px', height: 'calc(100vh - 120px)' }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<LeftOutlined />} onClick={() => navigate('/files')} shape="circle" />
        <Title level={3} style={{ margin: 0 }}>{t('highlightsTitle')}</Title>
      </Space>

      <Layout style={{ height: '100%', background: 'transparent', gap: 24 }}>
        <Sider
          width={320}
          style={{
            background: 'var(--surface-2)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: 24,
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--panel-shadow-soft)',
            overflowY: 'auto',
            padding: '12px',
          }}
        >
          <List
            loading={loading}
            header={<Text strong style={{ paddingLeft: 12, opacity: 0.5 }}>{t('highlightsCollectedDocs')} ({docList.length})</Text>}
            dataSource={docList}
            renderItem={(doc) => {
              const isActive = selectedDocId === doc.fileId;
              return (
                <div
                  onClick={() => setSelectedDocId(doc.fileId)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 16,
                    padding: '16px',
                    marginBottom: 12,
                    background: isActive ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))' : 'var(--surface-3)',
                    color: isActive ? '#1b130f' : 'var(--text-primary)',
                    boxShadow: isActive ? '0 10px 24px rgba(255, 138, 61, 0.22)' : 'var(--panel-shadow-soft)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: isActive ? '1px solid transparent' : '1px solid var(--border-soft)',
                  }}
                >
                  <Tooltip title={doc.regulationName} placement="right">
                    <Text strong style={{ color: isActive ? '#1b130f' : 'inherit', fontSize: 14 }} ellipsis>
                      {doc.regulationName}
                    </Text>
                  </Tooltip>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: isActive ? 'rgba(27, 19, 15, 0.12)' : 'var(--surface-muted)',
                        borderRadius: 6,
                        color: isActive ? '#1b130f' : 'var(--text-secondary)',
                      }}
                    >
                      {doc.version}
                    </span>
                    <Badge
                      count={doc.items.length}
                      style={{ backgroundColor: isActive ? '#1b130f' : 'var(--accent)', color: isActive ? '#fff' : '#1b130f', boxShadow: 'none' }}
                    />
                  </div>
                </div>
              );
            }}
          />
        </Sider>

        <Content
          style={{
            background: 'var(--surface-2)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderRadius: 24,
            border: '1px solid var(--border-soft)',
            padding: '28px',
            overflowY: 'auto',
            boxShadow: 'var(--panel-shadow-soft)',
          }}
        >
          {selectedDocInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>{selectedDocInfo.regulationName}</Title>
                <Text type="secondary">
                  {selectedDocInfo.version} · {t('highlightsSelectedCount')} {selectedDocHighlights.length} {t('highlightsItems')}
                </Text>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {selectedDocHighlights.map((item) => {
                  const colorStyle = getHighlightColorStyle(item.color);
                  return (
                  <Card
                    key={item.id}
                    className="highlight-card"
                    style={{
                      borderRadius: 20,
                      border: item.isPinned ? '2px solid var(--accent)' : '1px solid var(--border-soft)',
                      background: item.isPinned ? 'var(--accent-soft)' : 'var(--surface-3)',
                      boxShadow: 'var(--panel-shadow-soft)',
                      transition: 'all 0.3s',
                    }}
                    extra={item.isPinned && <Tag color="blue" icon={<PushpinFilled />}>{t('highlightsPinned')}</Tag>}
                    actions={[
                      <Button type="text" size="small" icon={item.isPinned ? <PushpinFilled style={{ color: 'var(--accent)' }} /> : <PushpinOutlined />} onClick={() => togglePin(item)}>
                        {item.isPinned ? t('highlightsUnpin') : t('highlightsPin')}
                      </Button>,
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingNoteId(item.id); setTempNote(item.note || ''); }}>
                        {item.note ? t('highlightsEditNote') : t('highlightsAddNote')}
                      </Button>,
                      <Button type="text" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate(`/files?id=${item.fileId}&find=${encodeURIComponent(item.text)}`)}>
                        {t('highlightsJump')}
                      </Button>,
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteHighlight(item.id)}>
                        {t('highlightsRemove')}
                      </Button>,
                    ]}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div
                        style={{
                          fontSize: 15,
                          lineHeight: 1.8,
                          color: 'var(--text-primary)',
                          borderLeft: `4px solid ${item.isPinned ? 'var(--accent)' : colorStyle.border}`,
                          background: item.isPinned ? 'var(--accent-soft)' : colorStyle.background,
                          padding: '12px 16px',
                          borderRadius: '0 12px 12px 0',
                        }}
                      >
                        {item.text}
                      </div>

                      {(item.note || editingNoteId === item.id) && (
                        <div style={{ padding: '0 4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 13, opacity: 0.6 }}>
                              <EditOutlined /> {t('highlightsNote')}
                            </Text>
                            {editingNoteId === item.id && (
                              <Button type="primary" size="small" icon={<SaveOutlined />} onClick={() => updateNote(item.id)}>
                                {t('highlightsSave')}
                              </Button>
                            )}
                          </div>

                          {editingNoteId === item.id ? (
                            <Input.TextArea
                              value={tempNote}
                              onChange={(event) => setTempNote(event.target.value)}
                              placeholder={t('highlightsNotePlaceholder')}
                              autoSize={{ minRows: 2 }}
                              style={{ borderRadius: 10, marginBottom: 8 }}
                            />
                          ) : (
                            <div
                              style={{
                                minHeight: 40,
                                padding: '10px 14px',
                                background: 'var(--surface-muted)',
                                borderRadius: 12,
                                fontSize: 13,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {item.note}
                            </div>
                          )}
                        </div>
                      )}

                      <Text type="secondary" style={{ fontSize: 11, textAlign: 'right' }}>
                        {t('highlightsRecordedAt')} {new Date(item.timestamp).toLocaleString()}
                      </Text>
                    </div>
                  </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Empty description={t('highlightsEmpty')} style={{ marginTop: 120 }} />
          )}
        </Content>
      </Layout>
    </div>
  );
};

export default Highlights;
