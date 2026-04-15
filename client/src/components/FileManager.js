import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  BarsOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  HolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SwapOutlined,
  UpOutlined,
  DownOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../i18n';

const { Title, Text } = Typography;

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 320;
const COLLAPSED_SIDEBAR_WIDTH = 64;
const REGULATION_SORT_MODE_STORAGE_KEY = 'fileManagerRegulationSortMode';
const REGULATION_CUSTOM_ORDER_STORAGE_KEY = 'fileManagerRegulationCustomOrder';
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH',
]);

const HIGHLIGHT_PRESET_COLORS = {
  yellow: {
    label: '黄色',
    fill: 'rgba(255, 230, 110, 0.72)',
    solid: '#f5cf45',
    text: '#7a5a00',
  },
  green: {
    label: '绿色',
    fill: 'rgba(120, 224, 143, 0.60)',
    solid: '#5ecb7a',
    text: '#14532d',
  },
  blue: {
    label: '蓝色',
    fill: 'rgba(126, 180, 255, 0.58)',
    solid: '#5b9cff',
    text: '#0f3d7a',
  },
  pink: {
    label: '粉色',
    fill: 'rgba(255, 148, 196, 0.58)',
    solid: '#ff82b2',
    text: '#7f1d4f',
  },
  orange: {
    label: '橙色',
    fill: 'rgba(255, 184, 108, 0.62)',
    solid: '#ffad5a',
    text: '#7c3d00',
  },
};

const DEFAULT_HIGHLIGHT_COLOR = 'yellow';

const getHighlightColorMeta = (colorKey) => HIGHLIGHT_PRESET_COLORS[colorKey] || HIGHLIGHT_PRESET_COLORS[DEFAULT_HIGHLIGHT_COLOR];
const getUploadTimestamp = (file) => {
  const value = new Date(file?.uploadDate || 0).getTime();
  return Number.isFinite(value) ? value : 0;
};

const highlightSidebarText = (text, search) => {
  if (!search) return text;
  const parts = text.split(new RegExp(`(${search})`, 'gi'));
  return (
    <>
      {parts.map((part, index) => (
        part.toLowerCase() === search.toLowerCase()
          ? <mark key={`${part}-${index}`} style={{ backgroundColor: 'var(--highlight-mark)', color: 'var(--text-primary)', padding: '0 2px', borderRadius: 2 }}>{part}</mark>
          : part
      ))}
    </>
  );
};

const getSlug = (text) => text.toLowerCase()
  .replace(/(\*\*|__|\*|_|`{1,3})/g, '')
  .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
  .replace(/(^-|-$)/g, '');

const extractText = (children) => React.Children.toArray(children).map((child) => {
  if (typeof child === 'string' || typeof child === 'number') return child;
  if (child?.props?.children) return extractText(child.props.children);
  return '';
}).join('');

const buildOutline = (markdown) => {
  if (!markdown) return [];
  return markdown
    .split('\n')
    .map((line) => line.match(/^(#{1,6})\s+(.*)$/))
    .filter(Boolean)
    .map((match) => {
      const text = match[2].trim().replace(/(\*\*|__|\*|_|`{1,3})/g, '');
      return {
        level: match[1].length,
        text,
        id: `heading-${getSlug(text)}`,
      };
    });
};

const getVersionSortValue = (version) => {
  const match = String(version || '').match(/(\d{4})[-/.年]?(\d{1,2})?/);
  if (!match) return Number.NEGATIVE_INFINITY;
  return Number(match[1]) * 100 + Number(match[2] || 0);
};

const renderDiffTokens = (tokens, side) => {
  if (!tokens || tokens.length === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>&nbsp;</span>;
  }

  return tokens.map((token, index) => {
    const isAdded = side === 'left' && token.added;
    const isRemoved = side === 'right' && token.removed;

    return (
      <span
        key={`${side}-${index}-${token.value}`}
        style={{
          whiteSpace: 'pre-wrap',
          borderRadius: 4,
          padding: isAdded || isRemoved ? '0 1px' : 0,
          background: isAdded
            ? 'var(--success-soft)'
            : isRemoved
              ? 'var(--danger-soft)'
              : 'transparent',
          color: isRemoved ? 'var(--danger-text)' : 'var(--text-primary)',
          fontWeight: isAdded ? 700 : 400,
          textDecoration: isRemoved ? 'line-through' : 'none',
        }}
      >
        {token.value || '\u00A0'}
      </span>
    );
  });
};

const getBlockAncestor = (node, root) => {
  let current = node?.parentNode;
  while (current && current !== root) {
    if (current.nodeType === 1 && BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentNode;
  }
  return root;
};

const buildHighlightTextMap = (root) => {
  if (!root) {
    return { records: [], fullText: '' };
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent) {
        return NodeFilter.FILTER_REJECT;
      }
      const parentTag = node.parentNode?.tagName;
      if (['SCRIPT', 'STYLE'].includes(parentTag)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const records = [];
  let fullText = '';
  let previousBlock = null;
  let currentNode = walker.nextNode();

  while (currentNode) {
    const block = getBlockAncestor(currentNode, root);
    if (previousBlock && block !== previousBlock) {
      fullText += '\n';
    }

    const start = fullText.length;
    fullText += currentNode.textContent;
    records.push({
      node: currentNode,
      start,
      end: fullText.length,
      block,
    });
    previousBlock = block;
    currentNode = walker.nextNode();
  }

  return { records, fullText };
};

const getClosestFromTarget = (target, selector) => {
  const element = target instanceof Element ? target : target?.parentElement;
  return element?.closest(selector) || null;
};

// Resolve an element-node selection endpoint to the nearest text node.
// For start containers: find first text node at/after the offset child.
// For end containers: find last text node before/at the offset child.
const resolveSelectionNode = (container, offset, isStart) => {
  if (container.nodeType === Node.TEXT_NODE) {
    return { node: container, offset };
  }
  const children = Array.from(container.childNodes);
  if (isStart) {
    for (let i = offset; i < children.length; i++) {
      const child = children[i];
      if (child.nodeType === Node.TEXT_NODE) return { node: child, offset: 0 };
      const w = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
      const first = w.nextNode();
      if (first) return { node: first, offset: 0 };
    }
  } else {
    for (let i = Math.min(offset, children.length) - 1; i >= 0; i--) {
      const child = children[i];
      if (child.nodeType === Node.TEXT_NODE) return { node: child, offset: child.textContent.length };
      const w = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
      let last = null;
      let n;
      // eslint-disable-next-line no-cond-assign
      while ((n = w.nextNode())) last = n;
      if (last) return { node: last, offset: last.textContent.length };
    }
  }
  return null;
};

const createSelectionSnapshot = (root, selection, range) => {
  // Normalize double newlines: selection.toString() may produce \n\n between blocks
  // while buildHighlightTextMap inserts only a single \n.
  const text = normalizeNewlines(selection?.toString()?.trim() ?? '');
  if (!root || !range || !text) {
    return null;
  }

  const { records } = buildHighlightTextMap(root);

  // Resolve containers — browsers sometimes report element nodes at block boundaries
  const resolved = {
    start: resolveSelectionNode(range.startContainer, range.startOffset, true),
    end: resolveSelectionNode(range.endContainer, range.endOffset, false),
  };

  const startNode = resolved.start?.node ?? range.startContainer;
  const startOff = resolved.start?.offset ?? range.startOffset;
  const endNode = resolved.end?.node ?? range.endContainer;
  const endOff = resolved.end?.offset ?? range.endOffset;

  if (startNode.nodeType !== Node.TEXT_NODE || endNode.nodeType !== Node.TEXT_NODE) {
    return { text };
  }

  const startRecord = records.find((record) => record.node === startNode);
  const endRecord = records.find((record) => record.node === endNode);

  if (!startRecord || !endRecord) {
    return { text };
  }

  return {
    text,
    anchorStart: startRecord.start + startOff,
    anchorEnd: endRecord.start + endOff,
  };
};

const normalizeNewlines = (str) => str.replace(/\n{2,}/g, '\n');

const findAvailableTextRange = (source, needle, occupiedRanges) => {
  if (!needle) return null;

  // Normalize needle in case selection.toString() produced \n\n where fullText has \n
  const searchNeedle = normalizeNewlines(needle);

  let searchIndex = source.indexOf(searchNeedle);
  while (searchIndex !== -1) {
    const nextRange = { start: searchIndex, end: searchIndex + searchNeedle.length };
    const overlaps = occupiedRanges.some((range) => nextRange.start < range.end && nextRange.end > range.start);
    if (!overlaps) {
      return nextRange;
    }
    searchIndex = source.indexOf(searchNeedle, searchIndex + 1);
  }

  return null;
};

const measureRenderedHighlights = (root, highlights) => {
  if (!root || !highlights.length) return [];

  const { records, fullText } = buildHighlightTextMap(root);
  if (!records.length || !fullText) return [];

  const occupiedRanges = [];

  return highlights.reduce((accumulator, highlight) => {
    let range = null;
    const hasAnchors = Number.isInteger(highlight.anchorStart) && Number.isInteger(highlight.anchorEnd);

    if (hasAnchors) {
      range = {
        start: Math.max(0, highlight.anchorStart),
        end: Math.max(highlight.anchorStart, highlight.anchorEnd),
      };
    } else {
      range = findAvailableTextRange(fullText, highlight.text, occupiedRanges);
    }

    if (!range || range.start >= range.end || range.end > fullText.length) {
      return accumulator;
    }

    const rects = records.reduce((rectAccumulator, record) => {
      if (record.end <= range.start || record.start >= range.end) {
        return rectAccumulator;
      }

      const nodeText = record.node.textContent || '';
      const startInNode = Math.max(0, range.start - record.start);
      const endInNode = Math.min(nodeText.length, range.end - record.start);

      if (startInNode >= endInNode) {
        return rectAccumulator;
      }

      const selectedText = nodeText.slice(startInNode, endInNode);
      if (!selectedText.trim()) {
        return rectAccumulator;
      }

      const segmentRange = document.createRange();
      segmentRange.setStart(record.node, startInNode);
      segmentRange.setEnd(record.node, endInNode);

      rectAccumulator.push(...Array.from(segmentRange.getClientRects())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          left: rect.left - root.getBoundingClientRect().left,
          top: rect.top - root.getBoundingClientRect().top,
          width: rect.width,
          height: rect.height,
        })));

      return rectAccumulator;
    }, []);

    if (!rects.length) {
      return accumulator;
    }

    occupiedRanges.push(range);
    accumulator.push({
      ...highlight,
      range,
      rects,
    });

    return accumulator;
  }, []);
};

const findRenderedHighlightAtPoint = (root, highlights, clientX, clientY) => {
  if (!root || !highlights.length) return null;

  const rootRect = root.getBoundingClientRect();

  return highlights.find((highlight) => highlight.rects.some((rect) => {
    const left = rootRect.left + rect.left;
    const top = rootRect.top + rect.top;
    return clientX >= left
      && clientX <= left + rect.width
      && clientY >= top
      && clientY <= top + rect.height;
  })) || null;
};

const FileManager = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [searchCount, setSearchCount] = useState(0);
  const [selectedReg, setSelectedReg] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [compareVersionId, setCompareVersionId] = useState(null);
  const [regulationSortMode, setRegulationSortMode] = useState(() => (
    window.localStorage.getItem(REGULATION_SORT_MODE_STORAGE_KEY) || 'name-asc'
  ));
  const [customRegulationOrder, setCustomRegulationOrder] = useState(() => {
    try {
      const saved = window.localStorage.getItem(REGULATION_CUSTOM_ORDER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });
  const [highlightCountsByRegulation, setHighlightCountsByRegulation] = useState({});
  const [draggingRegulation, setDraggingRegulation] = useState(null);
  const [dragOverRegulation, setDragOverRegulation] = useState(null);
  const [diffParts, setDiffParts] = useState([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = window.localStorage.getItem('fileManagerSidebarWidth');
    const parsedWidth = Number(savedWidth);
    return Number.isFinite(parsedWidth) ? parsedWidth : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedFileToDelete, setSelectedFileToDelete] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [savedHighlights, setSavedHighlights] = useState([]);
  const [selectionSnapshot, setSelectionSnapshot] = useState(null);
  const [showHighlightBtn, setShowHighlightBtn] = useState(false);
  const [activeHighlightAction, setActiveHighlightAction] = useState(null);
  const [highlightNoteDraft, setHighlightNoteDraft] = useState('');
  const [newHighlightNoteDraft, setNewHighlightNoteDraft] = useState('');
  const [newHighlightColor, setNewHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR);
  const [activeHighlightColor, setActiveHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR);
  const [renderedHighlights, setRenderedHighlights] = useState([]);
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [diffMarkers, setDiffMarkers] = useState([]);
  const [diffViewport, setDiffViewport] = useState({ top: 0, height: 0 });
  const [sidebarScrollbar, setSidebarScrollbar] = useState({ top: 0, height: 0, visible: false });
  const [form] = Form.useForm();
  const contentScrollerRef = useRef(null);
  const markdownContentRef = useRef(null);
  const sidebarShellRef = useRef(null);
  const sidebarScrollRef = useRef(null);
  const diffMinimapRef = useRef(null);
  const isDraggingDiffViewportRef = useRef(false);

  const groupedFiles = useMemo(() => {
    const groups = {};
    files.forEach((file) => {
      const name = file.regulationName || 'Untitled';
      if (!groups[name]) groups[name] = [];
      groups[name].push(file);
    });
    Object.keys(groups).forEach((name) => {
      groups[name] = groups[name].sort((a, b) => getVersionSortValue(b.version) - getVersionSortValue(a.version));
    });
    return groups;
  }, [files]);

  const regulationMeta = useMemo(
    () => Object.entries(groupedFiles).map(([name, group]) => ({
      name,
      files: group,
      createdAt: group.length > 0 ? Math.min(...group.map(getUploadTimestamp)) : 0,
      highlightCount: highlightCountsByRegulation[name] || 0,
    })),
    [groupedFiles, highlightCountsByRegulation],
  );

  const regulationNames = useMemo(
    () => {
      const filtered = regulationMeta.filter((item) => item.name.toLowerCase().includes(globalSearch.toLowerCase()));
      const sorted = [...filtered];

      switch (regulationSortMode) {
        case 'name-desc':
          sorted.sort((a, b) => b.name.localeCompare(a.name, 'zh-Hans-CN'));
          break;
        case 'created-asc':
          sorted.sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name, 'zh-Hans-CN'));
          break;
        case 'created-desc':
          sorted.sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name, 'zh-Hans-CN'));
          break;
        case 'highlight-asc':
          sorted.sort((a, b) => a.highlightCount - b.highlightCount || a.name.localeCompare(b.name, 'zh-Hans-CN'));
          break;
        case 'highlight-desc':
          sorted.sort((a, b) => b.highlightCount - a.highlightCount || a.name.localeCompare(b.name, 'zh-Hans-CN'));
          break;
        case 'custom': {
          const orderMap = new Map(customRegulationOrder.map((name, index) => [name, index]));
          sorted.sort((a, b) => {
            const aOrder = orderMap.has(a.name) ? orderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
            const bOrder = orderMap.has(b.name) ? orderMap.get(b.name) : Number.MAX_SAFE_INTEGER;
            return aOrder - bOrder || a.name.localeCompare(b.name, 'zh-Hans-CN');
          });
          break;
        }
        case 'name-asc':
        default:
          sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
          break;
      }

      return sorted.map((item) => item.name);
    },
    [customRegulationOrder, globalSearch, regulationMeta, regulationSortMode],
  );

  const currentVersions = useMemo(
    () => (selectedReg ? groupedFiles[selectedReg] || [] : []),
    [groupedFiles, selectedReg],
  );
  const selectedFile = currentVersions.find((file) => file.id === selectedVersionId) || null;
  const compareFile = currentVersions.find((file) => file.id === compareVersionId) || null;
  const isCompareMode = Boolean(selectedFile && compareFile && selectedFile.id !== compareFile.id);
  const outlineData = useMemo(() => buildOutline(previewContent), [previewContent]);
  const diffRows = useMemo(
    () => diffParts.map((row, index) => ({
      id: `diff-${index}`,
      index,
      type: row.type || 'unchanged',
      left: row.left || [],
      right: row.right || [],
    })),
    [diffParts],
  );

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      message.error(t('filesLoadListFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadHighlightCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/highlights');
      const data = await response.json();
      const counts = data.reduce((accumulator, item) => {
        const key = item.regulationName;
        if (key) {
          accumulator[key] = (accumulator[key] || 0) + 1;
        }
        return accumulator;
      }, {});
      setHighlightCountsByRegulation(counts);
    } catch (error) {
      console.error('Failed to load highlight counts', error);
    }
  }, []);

  const loadSavedHighlights = useCallback(async () => {
    if (!selectedVersionId || isCompareMode) {
      setSavedHighlights([]);
      return;
    }
    try {
      const response = await fetch('/api/highlights');
      const data = await response.json();
      setSavedHighlights(data.filter((item) => item.fileId === selectedVersionId));
    } catch (error) {
      console.error('Failed to load highlights', error);
    }
  }, [isCompareMode, selectedVersionId]);

  const loadPreview = useCallback(async (id) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/files/${id}/content`);
      const data = await response.json();
      setPreviewContent(data.content || '');
    } catch (error) {
      message.error(t('filesLoadContentFailed'));
    } finally {
      setPreviewLoading(false);
    }
  }, [t]);

  const loadDiff = useCallback(async (primaryId, secondaryId) => {
    setDiffLoading(true);
    try {
      const response = await fetch(`/api/files/diff/${primaryId}/${secondaryId}`);
      const data = await response.json();
      setDiffParts(data.diff || []);
    } catch (error) {
      message.error(t('filesCompareFailed'));
      setDiffParts([]);
    } finally {
      setDiffLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    loadHighlightCounts();
  }, [loadHighlightCounts]);

  useEffect(() => {
    window.localStorage.setItem(REGULATION_SORT_MODE_STORAGE_KEY, regulationSortMode);
  }, [regulationSortMode]);

  useEffect(() => {
    window.localStorage.setItem(REGULATION_CUSTOM_ORDER_STORAGE_KEY, JSON.stringify(customRegulationOrder));
  }, [customRegulationOrder]);

  useEffect(() => {
    if (regulationSortMode !== 'custom') {
      setDraggingRegulation(null);
      setDragOverRegulation(null);
    }
  }, [regulationSortMode]);

  useEffect(() => {
    const allNames = regulationMeta
      .map((item) => item.name)
      .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

    setCustomRegulationOrder((prev) => {
      const next = prev.filter((name) => allNames.includes(name));
      allNames.forEach((name) => {
        if (!next.includes(name)) {
          next.push(name);
        }
      });

      if (next.length === prev.length && next.every((name, index) => name === prev[index])) {
        return prev;
      }

      return next;
    });
  }, [regulationMeta]);

  useEffect(() => {
    if (!selectedReg && regulationNames.length > 0) {
      setSelectedReg(regulationNames[0]);
    }
  }, [regulationNames, selectedReg]);

  useEffect(() => {
    if (selectedReg && currentVersions.length > 0 && !currentVersions.some((file) => file.id === selectedVersionId)) {
      setSelectedVersionId(currentVersions[0].id);
    }
  }, [currentVersions, selectedReg, selectedVersionId]);

  useEffect(() => {
    if (compareVersionId && !currentVersions.some((file) => file.id === compareVersionId)) {
      setCompareVersionId(null);
      setDiffParts([]);
    }
  }, [compareVersionId, currentVersions]);

  useEffect(() => {
    const docId = searchParams.get('id');
    const searchText = searchParams.get('find');
    if (docId && files.length > 0) {
      const file = files.find((item) => item.id === docId);
      if (file) {
        setSelectedReg(file.regulationName);
        setSelectedVersionId(file.id);
        setCompareVersionId(null);
        if (searchText) {
          setPageSearch(decodeURIComponent(searchText));
        }
      }
    }
  }, [files, searchParams]);

  useEffect(() => {
    window.localStorage.setItem('fileManagerSidebarWidth', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isSidebarResizing) return undefined;

    const handleMouseMove = (event) => {
      const nextWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, event.clientX - 16),
      );
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsSidebarResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSidebarResizing]);

  useEffect(() => {
    if (sidebarCollapsed) {
      setSidebarScrollbar((prev) => ({ ...prev, visible: false }));
      return undefined;
    }

    const shell = sidebarShellRef.current;
    const scroller = sidebarScrollRef.current;
    if (!shell || !scroller) return undefined;

    const updateSidebarScrollbar = () => {
      const shellRect = shell.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const scrollHeight = scroller.scrollHeight;
      const clientHeight = scroller.clientHeight;

      if (scrollHeight <= clientHeight + 1) {
        setSidebarScrollbar({ top: 0, height: 0, visible: false });
        return;
      }

      const trackHeight = scrollerRect.height;
      const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 54);
      const maxThumbTravel = Math.max(trackHeight - thumbHeight, 0);
      const scrollProgress = scroller.scrollTop / Math.max(scrollHeight - clientHeight, 1);

      setSidebarScrollbar({
        top: Math.max(scrollerRect.top - shellRect.top + scrollProgress * maxThumbTravel, 0),
        height: thumbHeight,
        visible: true,
      });
    };

    updateSidebarScrollbar();
    scroller.addEventListener('scroll', updateSidebarScrollbar);
    window.addEventListener('resize', updateSidebarScrollbar);

    return () => {
      scroller.removeEventListener('scroll', updateSidebarScrollbar);
      window.removeEventListener('resize', updateSidebarScrollbar);
    };
  }, [files, globalSearch, groupedFiles, regulationNames, selectedReg, sidebarCollapsed, sidebarWidth]);

  useEffect(() => {
    if (!selectedVersionId) {
      setPreviewContent('');
      setDiffParts([]);
      return;
    }
    if (isCompareMode) {
      loadDiff(selectedVersionId, compareVersionId);
    } else {
      loadPreview(selectedVersionId);
      setDiffParts([]);
    }
  }, [compareVersionId, isCompareMode, loadDiff, loadPreview, selectedVersionId]);

  useEffect(() => {
    loadSavedHighlights();
  }, [loadSavedHighlights]);

  useEffect(() => {
    const container = contentScrollerRef.current;
    if (!container || isCompareMode) return undefined;
    const handleMouseUp = (event) => {
      try {
        if (getClosestFromTarget(event.target, 'mark.saved-highlight') || getClosestFromTarget(event.target, '[data-highlight-action-popover="true"]')) {
          return;
        }

        const currentSelection = window.getSelection();
        if (!currentSelection || currentSelection.rangeCount === 0) {
          setSelectionSnapshot(null);
          setShowHighlightBtn(false);
          return;
        }

        const selectedText = currentSelection.toString().trim();
        if (!selectedText) {
          setSelectionSnapshot(null);
          setShowHighlightBtn(false);
          return;
        }

        const range = currentSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const snapshot = createSelectionSnapshot(container, currentSelection, range);
        if (!snapshot?.text) {
          setSelectionSnapshot(null);
          setShowHighlightBtn(false);
          return;
        }

        setActiveHighlightAction(null);
        setNewHighlightNoteDraft('');
        setNewHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
        setSelectionSnapshot(snapshot);
        setBtnPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
        setShowHighlightBtn(true);
      } catch (error) {
        console.error('Highlight selection failed:', error);
        setSelectionSnapshot(null);
        setShowHighlightBtn(false);
      }
    };
    container.addEventListener('mouseup', handleMouseUp);
    return () => container.removeEventListener('mouseup', handleMouseUp);
  }, [isCompareMode, previewContent]);

  useEffect(() => {
    if (isCompareMode) {
      setActiveHighlightAction(null);
      setRenderedHighlights([]);
      return undefined;
    }

    const container = markdownContentRef.current;
    if (!container) return undefined;

    const handleHighlightClick = (event) => {
      try {
        const highlight = findRenderedHighlightAtPoint(
          container,
          renderedHighlights,
          event.clientX,
          event.clientY,
        );

        if (!highlight) {
          setActiveHighlightAction(null);
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setShowHighlightBtn(false);
        setHighlightNoteDraft(highlight?.note || '');
        setActiveHighlightColor(highlight?.color || DEFAULT_HIGHLIGHT_COLOR);
        // Clamp popup to viewport: prefer right of mark, fallback to left
        const popoverWidth = 220;
        const popoverHeight = highlight.note ? 230 : 150;
        const clickX = event.clientX;
        const clickY = event.clientY;
        const spaceRight = window.innerWidth - clickX - 8;
        const rawX = spaceRight >= popoverWidth
          ? clickX + 8
          : Math.max(8, clickX - popoverWidth - 8);
        const rawY = clickY + 8;
        setActiveHighlightAction({
          id: highlight.id,
          x: Math.min(rawX, window.innerWidth - popoverWidth - 8),
          y: Math.min(rawY, window.innerHeight - popoverHeight - 8),
          showNoteEditor: false,
          hasNote: Boolean(highlight.note),
        });
      } catch (error) {
        console.error('Highlight action popup failed:', error);
        setActiveHighlightAction(null);
      }
    };

    const handleDocumentClick = (event) => {
      try {
        if (getClosestFromTarget(event.target, '[data-highlight-action-popover="true"]')) {
          return;
        }
        setActiveHighlightAction(null);
        setShowHighlightBtn(false);
      } catch (error) {
        console.error('Highlight action cleanup failed:', error);
        setActiveHighlightAction(null);
      }
    };

    container.addEventListener('click', handleHighlightClick);
    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      container.removeEventListener('click', handleHighlightClick);
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isCompareMode, renderedHighlights]);

  useEffect(() => {
    if (isCompareMode) {
      setSearchCount(0);
      setSearchIndex(0);
      return;
    }

    const container = document.getElementById('markdown-content-area');
    if (!container) return;

    container.querySelectorAll('mark.page-search-match').forEach((node) => {
      const parent = node.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(node.textContent), node);
        parent.normalize();
      }
    });

    if (!pageSearch) {
      setSearchCount(0);
      setSearchIndex(0);
      return;
    }

    const walk = (node) => {
      if (node.nodeType === 3) {
        const content = node.textContent;
        const lowerContent = content.toLowerCase();
        const lowerSearch = pageSearch.toLowerCase();
        if (!lowerContent.includes(lowerSearch)) return;

        const fragment = document.createDocumentFragment();
        let start = 0;
        let index = lowerContent.indexOf(lowerSearch, start);
        while (index !== -1) {
          fragment.appendChild(document.createTextNode(content.slice(start, index)));
          const mark = document.createElement('mark');
          mark.className = 'page-search-match';
          mark.style.backgroundColor = 'var(--highlight-mark)';
          mark.style.color = 'inherit';
          mark.textContent = content.slice(index, index + lowerSearch.length);
          fragment.appendChild(mark);
          start = index + lowerSearch.length;
          index = lowerContent.indexOf(lowerSearch, start);
        }
        fragment.appendChild(document.createTextNode(content.slice(start)));
        node.parentNode.replaceChild(fragment, node);
      } else if (node.nodeType === 1 && !['MARK', 'SCRIPT', 'STYLE'].includes(node.tagName)) {
        Array.from(node.childNodes).forEach(walk);
      }
    };

    walk(container);
    const matches = container.querySelectorAll('mark.page-search-match');
    setSearchCount(matches.length);
    if (matches.length > 0) {
      setSearchIndex(0);
      matches[0].style.backgroundColor = 'var(--accent)';
      matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCompareMode, pageSearch, previewContent]);

  useEffect(() => {
    if (isCompareMode) {
      setRenderedHighlights([]);
      return undefined;
    }

    const container = markdownContentRef.current;
    if (!container || !savedHighlights.length) {
      setRenderedHighlights([]);
      return undefined;
    }

    let frameId = null;
    const measure = () => {
      frameId = window.requestAnimationFrame(() => {
        setRenderedHighlights(measureRenderedHighlights(container, savedHighlights));
      });
    };

    measure();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', measure);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isCompareMode, previewContent, savedHighlights, pageSearch]);

  useEffect(() => {
    if (!isCompareMode || diffLoading) {
      setDiffMarkers([]);
      return undefined;
    }

    const updateDiffViewport = () => {
      const scroller = contentScrollerRef.current;
      if (!scroller) return;
      const scrollHeight = scroller.scrollHeight;
      const clientHeight = scroller.clientHeight;
      if (scrollHeight <= 0) return;
      setDiffViewport({
        top: (scroller.scrollTop / scrollHeight) * 100,
        height: Math.max((clientHeight / scrollHeight) * 100, 8),
      });
    };

    const updateMarkers = () => {
      const scroller = contentScrollerRef.current;
      if (!scroller) return;
      const blocks = Array.from(scroller.querySelectorAll('[data-diff-index]'));
      const scrollHeight = scroller.scrollHeight || 1;
      setDiffMarkers(blocks.map((block) => ({
        id: block.getAttribute('data-diff-index'),
        top: (block.offsetTop / scrollHeight) * 100,
        height: Math.max((block.offsetHeight / scrollHeight) * 100, 1.4),
        type: block.getAttribute('data-diff-type'),
      })));
      updateDiffViewport();
    };

    const timer = window.setTimeout(updateMarkers, 80);
    const scroller = contentScrollerRef.current;
    scroller?.addEventListener('scroll', updateDiffViewport);
    window.addEventListener('resize', updateMarkers);

    return () => {
      window.clearTimeout(timer);
      scroller?.removeEventListener('scroll', updateDiffViewport);
      window.removeEventListener('resize', updateMarkers);
    };
  }, [diffLoading, diffRows, isCompareMode]);

  const handleNextSearch = () => {
    if (searchCount === 0) return;
    const matches = document.querySelectorAll('mark.page-search-match');
    const next = searchIndex + 1 >= searchCount ? 0 : searchIndex + 1;
    matches[searchIndex].style.backgroundColor = 'var(--highlight-mark)';
    matches[next].style.backgroundColor = 'var(--accent)';
    matches[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSearchIndex(next);
  };

  const handlePrevSearch = () => {
    if (searchCount === 0) return;
    const matches = document.querySelectorAll('mark.page-search-match');
    const prev = searchIndex - 1 < 0 ? searchCount - 1 : searchIndex - 1;
    matches[searchIndex].style.backgroundColor = 'var(--highlight-mark)';
    matches[prev].style.backgroundColor = 'var(--accent)';
    matches[prev].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setSearchIndex(prev);
  };

  const handleEditMetadata = async (values) => {
    if (!editingFile) return;
    try {
      const response = await fetch(`/api/files/${editingFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success(t('filesUpdateSuccess'));
        setEditModalVisible(false);
        loadFiles();
      }
    } catch (error) {
      message.error(t('filesUpdateFailed'));
    }
  };

  const handleDelete = async () => {
    if (!selectedFileToDelete) return;
    try {
      const response = await fetch(`/api/files/${selectedFileToDelete.id}`, { method: 'DELETE' });
      if (response.ok) {
        message.success(t('filesDeleteSuccess'));
        setDeleteModalVisible(false);
        if (selectedVersionId === selectedFileToDelete.id) {
          setSelectedVersionId(null);
          setPreviewContent('');
        }
        if (compareVersionId === selectedFileToDelete.id) {
          setCompareVersionId(null);
        }
        loadFiles();
      }
    } catch (error) {
      message.error(t('filesDeleteFailed'));
    }
  };

  const handleDownload = async () => {
    if (!selectedFile) return;
    message.loading(t('filesDownloadPreparing'), 0.5);
    try {
      const response = await fetch(`/api/files/download/${selectedFile.id}`);
      if (!response.ok) throw new Error('download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedFile.name || 'document');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error(`${t('filesDownloadFailed')}: ${error.message}`);
    }
  };

  const saveHighlight = async () => {
    if (!selectionSnapshot?.text || !selectedFile) return;
    try {
      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectionSnapshot.text,
          anchorStart: Number.isInteger(selectionSnapshot.anchorStart) ? selectionSnapshot.anchorStart : undefined,
          anchorEnd: Number.isInteger(selectionSnapshot.anchorEnd) ? selectionSnapshot.anchorEnd : undefined,
          fileId: selectedFile.id,
          regulationName: selectedFile.regulationName,
          version: selectedFile.version,
          note: newHighlightNoteDraft,
          color: newHighlightColor,
        }),
      });
      if (response.ok) {
        setShowHighlightBtn(false);
        setSelectionSnapshot(null);
        setNewHighlightNoteDraft('');
        setNewHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
        window.getSelection()?.removeAllRanges();
        loadSavedHighlights();
        loadHighlightCounts();
      }
    } catch (error) {
      message.error(t('highlightsActionFailed'));
    }
  };

  const deleteSavedHighlight = async (highlightId) => {
    try {
      const response = await fetch(`/api/highlights/${highlightId}`, { method: 'DELETE' });
      if (response.ok) {
        setActiveHighlightAction(null);
        loadSavedHighlights();
        loadHighlightCounts();
      } else {
        message.error(t('highlightsDeleteFailed'));
      }
    } catch (error) {
      message.error(t('highlightsDeleteFailed'));
    }
  };

  const saveHighlightNote = async () => {
    if (!activeHighlightAction?.id) return;
    try {
      const response = await fetch(`/api/highlights/${activeHighlightAction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: highlightNoteDraft }),
      });
      if (response.ok) {
        message.success(t('highlightsSaveSuccess'));
        setActiveHighlightAction((prev) => (prev ? { ...prev, showNoteEditor: false } : prev));
        loadSavedHighlights();
      } else {
        message.error(t('highlightsSaveFailed'));
      }
    } catch (error) {
      message.error(t('highlightsSaveFailed'));
    }
  };

  const updateHighlightColor = async (highlightId, color) => {
    try {
      const response = await fetch(`/api/highlights/${highlightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      if (response.ok) {
        setActiveHighlightColor(color);
        loadSavedHighlights();
      } else {
        message.error(t('highlightsActionFailed'));
      }
    } catch (error) {
      message.error(t('highlightsActionFailed'));
    }
  };

  const handleSelectVersion = (file) => {
    setSelectedReg(file.regulationName);
    setSelectedVersionId(file.id);
    if (compareVersionId === file.id) {
      setCompareVersionId(null);
    }
  };

  const handleCompareVersion = (file) => {
    if (!selectedVersionId) {
      setSelectedVersionId(file.id);
      return;
    }
    if (file.id === selectedVersionId) return;
    setCompareVersionId(file.id);
  };

  const moveCustomRegulation = (draggedName, targetName) => {
    setCustomRegulationOrder((prev) => {
      const draggedIndex = prev.indexOf(draggedName);
      const targetIndex = prev.indexOf(targetName);
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return prev;
      const next = [...prev];
      next.splice(draggedIndex, 1);
      const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      next.splice(insertIndex, 0, draggedName);
      return next;
    });
  };

  const jumpToDiffMarker = (markerId) => {
    const scroller = contentScrollerRef.current;
    const target = scroller?.querySelector(`[data-diff-index="${markerId}"]`);
    if (scroller && target) {
      scroller.scrollTo({
        top: Math.max(target.offsetTop - 120, 0),
        behavior: 'smooth',
      });
    }
  };

  const scrollToDiffViewportPosition = useCallback((clientY) => {
    const scroller = contentScrollerRef.current;
    const minimap = diffMinimapRef.current;
    if (!scroller || !minimap) return;

    const rect = minimap.getBoundingClientRect();
    const relative = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    const maxScrollTop = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
    scroller.scrollTop = relative * maxScrollTop;
  }, []);

  useEffect(() => {
    if (!isCompareMode) {
      isDraggingDiffViewportRef.current = false;
      return undefined;
    }

    const handleMouseMove = (event) => {
      if (!isDraggingDiffViewportRef.current) return;
      scrollToDiffViewportPosition(event.clientY);
    };

    const handleMouseUp = () => {
      isDraggingDiffViewportRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isCompareMode, scrollToDiffViewportPosition]);

  return (
    <div style={{ height: 'calc(100vh - 104px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>
        {`
          .file-manager-sidebar-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .file-manager-sidebar-scrollbar::-webkit-scrollbar {
            width: 0;
            height: 0;
          }
          .compare-content-scroller {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .compare-content-scroller::-webkit-scrollbar {
            width: 0;
            height: 0;
          }
          .sidebar-version-item {
            transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
          }
          .sidebar-version-item:hover {
            transform: translateY(-1px);
            box-shadow: var(--panel-shadow-soft);
          }
          .sidebar-version-item.sidebar-version-default:hover {
            background: var(--accent-soft) !important;
            border-color: var(--accent-soft-strong) !important;
          }
          .sidebar-version-item.sidebar-version-selected:hover {
            background: var(--accent-soft-strong) !important;
            border-color: var(--accent) !important;
          }
          .sidebar-version-item.sidebar-version-compare:hover {
            background: var(--accent-warm-soft) !important;
            border-color: var(--accent-warm) !important;
          }
        `}
      </style>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 16px 16px', gap: 16 }}>
        <div
          ref={sidebarShellRef}
          style={{
            width: sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth,
            flexShrink: 0,
            transition: isSidebarResizing ? 'none' : 'width 0.25s ease',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          {sidebarCollapsed ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 18,
                background: 'var(--surface-2)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 24,
                border: '1px solid var(--border-soft)',
                boxShadow: 'var(--panel-shadow-soft)',
              }}
            >
              <Button
                icon={<MenuUnfoldOutlined />}
                style={{ borderRadius: 14 }}
                onClick={() => setSidebarCollapsed(false)}
              />
            </div>
          ) : (
            <>
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--surface-1)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: 24,
                  border: '1px solid var(--border-soft)',
                  boxShadow: 'var(--panel-shadow-soft)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: 16 }}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder={t('filesSearchRegulation')}
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    allowClear
                    style={{ borderRadius: 20, height: 40 }}
                  />
                </div>

                <div style={{ padding: '0 16px 12px' }}>
                  <Select
                    value={regulationSortMode}
                    onChange={setRegulationSortMode}
                    style={{ width: '100%' }}
                    size="middle"
                    options={[
                      { value: 'name-asc', label: '按名称字母升序' },
                      { value: 'name-desc', label: '按名称字母降序' },
                      { value: 'created-asc', label: '按创建时间升序' },
                      { value: 'created-desc', label: '按创建时间降序' },
                      { value: 'highlight-asc', label: '按高亮数升序' },
                      { value: 'highlight-desc', label: '按高亮数降序' },
                      { value: 'custom', label: '自定义排序' },
                    ]}
                  />
                  {regulationSortMode === 'custom' && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                      拖拽规章标题右侧手柄调整顺序
                    </Text>
                  )}
                </div>

                <div
                  className="file-manager-sidebar-scrollbar"
                  ref={sidebarScrollRef}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 0 12px 10px',
                    width: '100%',
                  }}
                >
                  <div style={{ paddingRight: 14 }}>
                    {regulationNames.length > 0 ? regulationNames.map((regName) => {
                      const group = groupedFiles[regName] || [];
                      const isExpanded = selectedReg === regName;
                      const isDragMode = regulationSortMode === 'custom';
                      const isDragOver = dragOverRegulation === regName && draggingRegulation !== regName;
                      return (
                        <div
                          key={regName}
                          onDragOver={(event) => {
                            if (!isDragMode || !draggingRegulation || draggingRegulation === regName) return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            setDragOverRegulation(regName);
                          }}
                          onDragLeave={() => {
                            if (dragOverRegulation === regName) {
                              setDragOverRegulation(null);
                            }
                          }}
                          onDrop={(event) => {
                            if (!isDragMode || !draggingRegulation || draggingRegulation === regName) return;
                            event.preventDefault();
                            moveCustomRegulation(draggingRegulation, regName);
                            setDraggingRegulation(null);
                            setDragOverRegulation(null);
                          }}
                          style={{
                            marginBottom: 12,
                            borderRadius: 18,
                            outline: isDragOver ? '2px solid var(--accent)' : 'none',
                            outlineOffset: 2,
                          }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedReg((prev) => (prev === regName ? null : regName))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedReg((prev) => (prev === regName ? null : regName));
                              }
                            }}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: isExpanded ? 'var(--accent-soft)' : 'var(--surface-2)',
                              borderRadius: 16,
                              padding: '14px 22px 14px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              cursor: 'pointer',
                              textAlign: 'left',
                              boxShadow: isExpanded ? 'inset 0 0 0 1px var(--accent-soft-strong)' : 'inset 0 0 0 1px var(--hover-soft)',
                            }}
                          >
                            <Tooltip title={regName} placement="right">
                              <Text strong style={{ flex: 1, minWidth: 0 }} ellipsis>
                                {highlightSidebarText(regName, globalSearch)}
                              </Text>
                            </Tooltip>
                            <Space size={4}>
                              {isDragMode && (
                                <span
                                  role="button"
                                  tabIndex={-1}
                                  draggable
                                  onClick={(event) => event.stopPropagation()}
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.dataTransfer.setData('text/plain', regName);
                                    setDraggingRegulation(regName);
                                    setDragOverRegulation(regName);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingRegulation(null);
                                    setDragOverRegulation(null);
                                  }}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 8,
                                    background: draggingRegulation === regName ? 'var(--accent-soft-strong)' : 'var(--surface-muted)',
                                    color: draggingRegulation === regName ? 'var(--accent)' : 'var(--text-secondary)',
                                    cursor: draggingRegulation === regName ? 'grabbing' : 'grab',
                                  }}
                                  title="拖拽排序"
                                >
                                  <HolderOutlined />
                                </span>
                              )}
                              <DownOutlined
                                style={{
                                  color: 'var(--accent)',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                            </Space>
                          </div>

                          {isExpanded && (
                            <div style={{ marginTop: 8, padding: '4px 0 0 10px' }}>
                              {group.map((file) => {
                                const isSelected = selectedVersionId === file.id;
                                const isComparing = compareVersionId === file.id;
                                return (
                                <div
                                  key={file.id}
                                  className={`sidebar-version-item ${
                                    isSelected
                                      ? 'sidebar-version-selected'
                                      : isComparing
                                        ? 'sidebar-version-compare'
                                        : 'sidebar-version-default'
                                  }`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleSelectVersion(file)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      handleSelectVersion(file);
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 18px 10px 14px',
                                      borderRadius: 14,
                                      marginBottom: 6,
                                      background: isSelected
                                        ? 'var(--accent-soft)'
                                        : isComparing
                                        ? 'var(--accent-warm-soft)'
                                        : 'transparent',
                                    border: isSelected
                                      ? '1px solid var(--accent-soft-strong)'
                                      : isComparing
                                        ? '1px solid var(--accent-warm)'
                                        : '1px solid transparent',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EyeOutlined />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleSelectVersion(file);
                                    }}
                                    title={t('filesReadVersion')}
                                  />
                                  <Tooltip title={`${t('filesCompareWithCurrent')}: ${file.version}`}>
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<SwapOutlined />}
                                      disabled={!selectedVersionId || selectedVersionId === file.id}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleCompareVersion(file);
                                      }}
                                    />
                                  </Tooltip>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <Tooltip title={`${regName} ${file.version}`} placement="right">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <Text strong={isSelected} style={{ color: isComparing ? 'var(--accent-warm)' : isSelected ? 'var(--accent)' : undefined }}>
                                            {file.version}
                                          </Text>
                                          {isSelected && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                              {t('filesCurrent')}
                                            </Text>
                                          )}
                                          {isComparing && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                              {t('filesCompareTarget')}
                                            </Text>
                                          )}
                                        </div>
                                      </Tooltip>
                                    </div>
                                    <Space size={4}>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined style={{ fontSize: 12 }} />}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setEditingFile(file);
                                          form.setFieldsValue({ regulationName: file.regulationName, version: file.version });
                                          setEditModalVisible(true);
                                        }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedFileToDelete(file);
                                          setDeleteModalVisible(true);
                                        }}
                                      />
                                    </Space>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }) : (
                      <div style={{ padding: '40px 10px' }}>
                        <Empty description={t('filesEmptyList')} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: 16, borderTop: '1px solid var(--border-soft)', textAlign: 'right' }}>
                  <Button type="text" icon={<MenuFoldOutlined />} onClick={() => setSidebarCollapsed(true)} />
                </div>
              </div>

              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setIsSidebarResizing(true);
                }}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: -10,
                  bottom: 12,
                  width: 20,
                  cursor: 'col-resize',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 56,
                    borderRadius: 999,
                    background: isSidebarResizing ? 'var(--accent-soft-strong)' : 'var(--surface-muted)',
                    transition: 'background 0.2s ease',
                  }}
                />
              </div>

            </>
          )}
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface-1)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            borderRadius: 24,
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--panel-shadow-soft)',
            overflow: 'hidden',
          }}
        >
          {selectedFile ? (
            <>
              <div
                style={{
                  minHeight: 96,
                  borderBottom: '1px solid var(--border-soft)',
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <Space>
                  <Button
                    icon={isFullWidth ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    title={isFullWidth ? t('filesExitFullWidth') : t('filesEnterFullWidth')}
                    onClick={() => setIsFullWidth((prev) => !prev)}
                  />
                  <Button icon={<DownloadOutlined />} shape="circle" onClick={handleDownload} />
                </Space>

                <div style={{ flex: 1, minWidth: 260, textAlign: 'center' }}>
                  <Title level={4} style={{ margin: 0 }}>{selectedFile.regulationName}</Title>
                  <Space style={{ marginTop: 8 }} wrap>
                    <div style={{ fontSize: 13, background: 'var(--accent-soft)', padding: '2px 10px', borderRadius: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>{t('filesVersion')}</Text>
                      <Text strong style={{ color: 'var(--accent)' }}>{selectedFile.version}</Text>
                    </div>
                    <div style={{ fontSize: 13, background: 'var(--surface-muted)', padding: '2px 10px', borderRadius: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>{t('filesUploadedAt')}</Text>
                      <Text>{selectedFile.uploadDate?.split('T')[0]}</Text>
                    </div>
                    {isCompareMode && compareFile && (
                      <div style={{ fontSize: 13, background: 'var(--accent-warm-soft)', padding: '2px 10px', borderRadius: 8 }}>
                        <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>{t('filesComparingWith')}</Text>
                        <Text strong style={{ color: 'var(--accent-warm)' }}>{compareFile.version}</Text>
                      </div>
                    )}
                  </Space>
                </div>

                <Space>
                  {isCompareMode && (
                    <Button icon={<CloseOutlined />} onClick={() => setCompareVersionId(null)}>
                      {t('filesExitCompare')}
                    </Button>
                  )}
                  {!isCompareMode && (
                    <Button icon={<BarsOutlined />} onClick={() => setOutlineCollapsed((prev) => !prev)} type={outlineCollapsed ? 'primary' : 'default'}>
                      {t('filesOutline')}
                    </Button>
                  )}
                </Space>
              </div>

              {!isCompareMode && (
                <div style={{ padding: '8px 24px', background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Input
                      placeholder={t('filesSearchDocument')}
                      prefix={<SearchOutlined />}
                      value={pageSearch}
                      onChange={(event) => setPageSearch(event.target.value)}
                      onPressEnter={handleNextSearch}
                      style={{ width: 240, borderRadius: 20, height: 36 }}
                    />
                    {searchCount > 0 && <Badge count={`${searchIndex + 1}/${searchCount}`} style={{ backgroundColor: 'var(--accent)', color: '#1b130f' }} />}
                  </Space>
                  <Space>
                    <Button type="text" size="small" icon={<UpOutlined />} onClick={handlePrevSearch} disabled={searchCount === 0} />
                    <Button type="text" size="small" icon={<DownOutlined />} onClick={handleNextSearch} disabled={searchCount === 0} />
                  </Space>
                </div>
              )}

              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                <div
                  id="content-scroller"
                  ref={contentScrollerRef}
                  className={isCompareMode ? 'compare-content-scroller' : undefined}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: isCompareMode
                      ? '28px 32px 32px'
                      : isFullWidth
                        ? '40px 4%'
                        : '40px 10%',
                    background: 'var(--surface-3)',
                    scrollbarWidth: isCompareMode ? 'none' : undefined,
                    msOverflowStyle: isCompareMode ? 'none' : undefined,
                  }}
                >
                  {(previewLoading || diffLoading) ? (
                    <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>
                  ) : isCompareMode ? (
                    <div style={{ width: '100%', paddingRight: 12 }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <div style={{ padding: '6px 12px', borderRadius: 999, background: 'var(--success-soft)', color: 'var(--success-text)', fontWeight: 600 }}>
                          {t('filesDiffAdded')}
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: 999, background: 'var(--danger-soft)', color: 'var(--danger-text)', fontWeight: 600 }}>
                          {t('filesDiffRemoved')}
                        </div>
                        <Text type="secondary">{t('filesDiffHint')}</Text>
                      </div>

                      <div
                        style={{
                          background: 'var(--compare-shell-bg)',
                          border: '1px solid var(--border-soft)',
                          borderRadius: 24,
                          padding: 24,
                          boxShadow: 'var(--panel-shadow)',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                            gap: 20,
                            paddingBottom: 12,
                            marginBottom: 18,
                            borderBottom: '1px solid var(--border-soft)',
                            position: 'sticky',
                            top: 0,
                            background: 'var(--compare-sticky-bg)',
                            zIndex: 1,
                          }}
                        >
                          <div
                            style={{
                              borderRadius: 16,
                              border: '1px solid var(--accent-soft-strong)',
                              background: 'var(--accent-soft)',
                              padding: '12px 16px',
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>{t('filesVersion')}</Text>
                            <Text strong style={{ color: 'var(--accent)' }}>{selectedFile.version}</Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>{t('filesCurrent')}</Text>
                          </div>
                          <div
                            style={{
                              borderRadius: 16,
                              border: '1px solid var(--accent-warm)',
                              background: 'var(--accent-warm-soft)',
                              padding: '12px 16px',
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>{t('filesComparingWith')}</Text>
                            <Text strong style={{ color: 'var(--accent-warm)' }}>{compareFile?.version}</Text>
                          </div>
                        </div>

                        {diffRows.map((row) => (
                          <div
                            key={row.id}
                            data-diff-index={row.type === 'unchanged' ? undefined : row.id}
                            data-diff-type={row.type}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                              gap: 20,
                              marginBottom: row.type === 'unchanged' ? 10 : 16,
                            }}
                          >
                            <div
                              style={{
                                minHeight: 52,
                                borderRadius: 16,
                                border: row.type === 'added' || row.type === 'changed'
                                  ? '1px solid var(--success-soft)'
                                  : '1px solid var(--border-soft)',
                                background: 'var(--compare-card-bg)',
                                padding: '14px 16px',
                                lineHeight: 1.9,
                                boxShadow: row.type === 'added' || row.type === 'changed'
                                  ? '0 8px 24px rgba(82, 196, 26, 0.06)'
                                  : 'none',
                                wordBreak: 'break-word',
                              }}
                            >
                              {renderDiffTokens(row.left, 'left')}
                            </div>
                            <div
                              style={{
                                minHeight: 52,
                                borderRadius: 16,
                                border: row.type === 'removed' || row.type === 'changed'
                                  ? '1px solid var(--danger-soft)'
                                  : '1px solid var(--border-soft)',
                                background: 'var(--compare-card-bg)',
                                padding: '14px 16px',
                                lineHeight: 1.9,
                                boxShadow: row.type === 'removed' || row.type === 'changed'
                                  ? '0 8px 24px rgba(255, 77, 79, 0.05)'
                                  : 'none',
                                wordBreak: 'break-word',
                              }}
                            >
                              {renderDiffTokens(row.right, 'right')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: 900, margin: '0 auto' }}>
                      <div
                        ref={markdownContentRef}
                        id="markdown-content-area"
                        className="markdown-preview"
                        style={{ position: 'relative', lineHeight: 1.8, fontSize: 16 }}
                      >
                        {renderedHighlights.length > 0 && (
                          <div
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              pointerEvents: 'none',
                              zIndex: 0,
                            }}
                          >
                            {renderedHighlights.flatMap((highlight) => highlight.rects.map((rect, rectIndex) => (
                              <div
                                key={`${highlight.id}-${rectIndex}`}
                                style={{
                                  position: 'absolute',
                                  left: rect.left,
                                  top: rect.top,
                                  width: rect.width,
                                  height: rect.height,
                                  borderRadius: 4,
                                  background: getHighlightColorMeta(highlight.color).fill,
                                  opacity: 0.96,
                                }}
                              />
                            )))}
                          </div>
                        )}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => {
                                const text = extractText(children);
                                return <h1 id={`heading-${getSlug(text)}`} style={{ scrollMarginTop: 100 }}>{children}</h1>;
                              },
                              h2: ({ children }) => {
                                const text = extractText(children);
                                return <h2 id={`heading-${getSlug(text)}`} style={{ scrollMarginTop: 100 }}>{children}</h2>;
                              },
                              h3: ({ children }) => {
                                const text = extractText(children);
                                return <h3 id={`heading-${getSlug(text)}`} style={{ scrollMarginTop: 100 }}>{children}</h3>;
                              },
                            }}
                          >
                            {previewContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {isCompareMode && diffMarkers.length > 0 && (
                  <div
                    style={{
                      width: 28,
                      borderLeft: '1px solid var(--border-soft)',
                      background: 'linear-gradient(180deg, transparent, var(--surface-muted))',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      ref={diffMinimapRef}
                      onMouseDown={(event) => {
                        isDraggingDiffViewportRef.current = true;
                        document.body.style.userSelect = 'none';
                        document.body.style.cursor = 'ns-resize';
                        scrollToDiffViewportPosition(event.clientY);
                      }}
                      style={{
                        position: 'absolute',
                        top: 12,
                        bottom: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 10,
                        borderRadius: 999,
                        background: 'var(--minimap-rail-bg)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                    >
                      {diffMarkers.map((marker) => (
                        <button
                          key={marker.id}
                          type="button"
                          onClick={() => jumpToDiffMarker(marker.id)}
                          style={{
                            position: 'absolute',
                            top: `${marker.top}%`,
                            left: 0,
                            width: '100%',
                            height: `${marker.height}%`,
                            border: 'none',
                            cursor: 'pointer',
                            background: marker.type === 'added'
                              ? 'rgba(82, 196, 26, 0.65)'
                              : 'rgba(255, 77, 79, 0.65)',
                          }}
                        />
                      ))}
                      <div
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          isDraggingDiffViewportRef.current = true;
                          document.body.style.userSelect = 'none';
                          document.body.style.cursor = 'ns-resize';
                        }}
                        style={{
                          position: 'absolute',
                          top: `${Math.min(diffViewport.top, 100 - diffViewport.height)}%`,
                          left: 0,
                          width: '100%',
                          height: `${diffViewport.height}%`,
                          borderRadius: 999,
                          background: 'var(--minimap-viewport-bg)',
                          boxShadow: '0 0 0 1px var(--border-strong), 0 3px 10px rgba(0,0,0,0.12)',
                          cursor: 'grab',
                        }}
                      />
                    </div>
                  </div>
                )}

                {!isCompareMode && !outlineCollapsed && (
                  <div
                    style={{
                      width: 260,
                      background: 'var(--surface-2)',
                      borderLeft: '1px solid var(--border-soft)',
                      padding: 20,
                      overflowY: 'auto',
                    }}
                  >
                    <Title level={5} style={{ marginBottom: 20 }}>{t('filesOutlineTitle')}</Title>
                    {outlineData.length > 0 ? outlineData.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderRadius: 8,
                          fontSize: 13,
                          marginLeft: (item.level - 1) * 16,
                          marginBottom: 4,
                        }}
                        onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      >
                        {item.text}
                      </div>
                    )) : <Empty description={t('filesOutlineEmpty')} />}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.55 }}>
              {loading ? <Spin size="large" /> : (
                <>
                  <FileTextOutlined style={{ fontSize: 80, marginBottom: 24 }} />
                  <Title level={3} style={{ fontWeight: 300 }}>{t('filesSelectDoc')}</Title>
                  <Button type="primary" size="large" icon={<CloudUploadOutlined />} style={{ marginTop: 20 }} onClick={() => navigate('/upload')}>
                    {t('filesUploadAction')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        title={t('filesEditTitle')}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        okText={t('filesSave')}
        cancelText={t('filesCancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleEditMetadata}>
          <Form.Item name="regulationName" label={t('filesRegulationName')} rules={[{ required: true, message: t('filesRequiredName') }]}>
            <Input placeholder={t('filesRegulationPlaceholder')} />
          </Form.Item>
          <Form.Item name="version" label={t('filesVersion')} rules={[{ required: true, message: t('filesRequiredVersion') }]}>
            <Input placeholder={t('filesVersionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('filesDeleteConfirmTitle')}
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText={t('filesDeleteConfirmOk')}
        cancelText={t('filesDeleteConfirmCancel')}
        okType="danger"
      >
        <p>
          {t('filesDeletePrompt')}
          <b>{selectedFileToDelete?.regulationName} ({selectedFileToDelete?.version})</b>
          {t('filesDeletePromptSuffix')}
        </p>
      </Modal>

      {showHighlightBtn && !isCompareMode && (
        <div
          data-highlight-action-popover="true"
          style={{
            position: 'fixed',
            left: btnPos.x,
            top: btnPos.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 14,
            background: 'var(--popover-bg)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderRadius: 20,
            border: '1px solid var(--border-soft)',
            minWidth: 220,
            boxShadow: 'var(--popover-shadow)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(HIGHLIGHT_PRESET_COLORS).map(([colorKey, meta]) => {
              const isActive = newHighlightColor === colorKey;
              return (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setNewHighlightColor(colorKey)}
                  title={meta.label}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    border: isActive ? `2px solid ${meta.text}` : '2px solid transparent',
                    background: meta.solid,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 0 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                />
              );
            })}
          </div>
          <Input.TextArea
            placeholder={t('highlightsNotePlaceholder')}
            autoSize={{ minRows: 1, maxRows: 3 }}
            value={newHighlightNoteDraft}
            onChange={(event) => setNewHighlightNoteDraft(event.target.value)}
            style={{ borderRadius: 8 }}
          />
          <Button
            type="primary"
            block
            shape="round"
            icon={<EditOutlined />}
            onClick={saveHighlight}
          >
            {t('highlightsAddToCollection')}
          </Button>
        </div>
      )}

      {activeHighlightAction && !isCompareMode && (
        <div
          data-highlight-action-popover="true"
          style={{
            position: 'fixed',
            left: activeHighlightAction.x,
            top: activeHighlightAction.y,
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            background: 'var(--popover-bg)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: 16,
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--popover-shadow)',
            minWidth: 220,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="small"
              icon={<EditOutlined />}
              style={{ flex: 1 }}
              onClick={() => setActiveHighlightAction((prev) => (prev ? { ...prev, showNoteEditor: !prev.showNoteEditor } : prev))}
            >
              评论
            </Button>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => deleteSavedHighlight(activeHighlightAction.id)}
            >
              {t('highlightsRemove')}
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(HIGHLIGHT_PRESET_COLORS).map(([colorKey, meta]) => {
              const isActive = activeHighlightColor === colorKey;
              return (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => updateHighlightColor(activeHighlightAction.id, colorKey)}
                  title={`切换为${meta.label}`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: isActive ? `2px solid ${meta.text}` : '2px solid transparent',
                    background: meta.solid,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 0 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                />
              );
            })}
          </div>
          {activeHighlightAction.showNoteEditor && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {highlightNoteDraft && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--surface-muted)',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {highlightNoteDraft}
                </div>
              )}
              <Input.TextArea
                autoFocus
                value={highlightNoteDraft}
                onChange={(event) => setHighlightNoteDraft(event.target.value)}
                placeholder={t('highlightsNotePlaceholder')}
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ borderRadius: 10 }}
              />
              <Button type="primary" size="small" icon={<EditOutlined />} onClick={saveHighlightNote}>
                {t('highlightsSave')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileManager;
