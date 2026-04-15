# RuleScope - 规章文档检索分析系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-34.5.8-blue.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.8.6-blue.svg)](https://ant.design/)

RuleScope 是一款专为规章制度文档设计的桌面应用程序，支持浏览、检索和文档大纲分析。特别针对 Word 文档的自动编号（如`第一章`、`第一条`、`（一）`等格式）进行了优化识别。

[English Documentation](./README.md)

## ✨ 功能特性

- 📄 **多格式支持**：上传和管理 `.docx`、`.doc`、`.txt` 和 `.pdf` 文件
- 🔍 **智能检索**：全文搜索并高亮显示所有文档中的匹配内容
- 📑 **自动大纲提取**：从 Word 编号定义中自动提取文档结构
- 🌓 **深色/浅色主题**：支持明暗主题切换，提供舒适的阅读体验
- 🌐 **双语支持**：支持中文和英文界面切换
- 📌 **高亮与笔记**：收藏重要内容并添加笔记
- 🖥️ **桌面应用**：基于 Electron 构建，提供原生桌面体验
- 💼 **便携版本**：提供 Windows 便携版，无需安装即可使用

## 📸 界面截图

![RuleScope 主界面](./assets/screenshots/rulescope-main.png)

## 🚀 快速开始

### 下载预编译可执行文件（推荐）

使用 RuleScope 最简单的方式是从 [GitHub Releases](https://github.com/Pumatlarge/RuleScope/releases) 下载 Windows 便携版。

#### 使用步骤：

1. 访问 [Releases 页面](https://github.com/Pumatlarge/RuleScope/releases)
2. 下载最新的 `RuleScope-X.X.X-win.zip` 文件
3. 将 ZIP 文件解压到任意本地目录
4. 运行解压后的 `RuleScope.exe`

> **注意**：请保持可执行文件与所有配套文件在同一目录中。应用程序会将上传的文件和本地元数据存储在此目录中。

## 🛠️ 开发指南

### 环境要求

- [Node.js](https://nodejs.org/) 18 或更高版本
- [npm](https://www.npmjs.com/) 8 或更高版本

### 安装步骤

1. 克隆仓库：
```bash
git clone https://github.com/Pumatlarge/RuleScope.git
cd RuleScope
```

2. 安装依赖：
```bash
npm run install:all
```

### 开发模式运行

同时启动后端和前端：
```bash
npm run dev
```

或者分别启动：

后端：
```bash
npm start
```

前端：
```bash
cd client
npm start
```

### 构建应用

构建 React 前端：
```bash
npm run build
```

构建 Electron 桌面应用：
```bash
npm run dist
```

构建 Windows 便携版：
```bash
npm run build-portable
```

## 📁 项目结构

```
RuleScope/
├── client/                 # React 前端
│   ├── public/            # 静态资源
│   └── src/               # React 源代码
│       ├── components/    # React 组件
│       ├── contexts/      # React 上下文
│       ├── pages/         # 页面组件
│       └── services/      # API 服务
├── controllers/           # 后端控制器
├── middleware/            # Express 中间件
├── models/                # 数据模型
├── routes/                # API 路由
├── scripts/               # 工具脚本
├── utils/                 # 文档解析工具
├── main.js                # Electron 入口
├── server-filemanager.js  # 桌面后端入口
├── loading.html           # 加载页面
└── package.json           # 项目配置
```

## 📝 文档编号支持

RuleScope 自动识别并提取以下编号格式：

- **章节**：`第一章`、`Chapter 1` 等
- **条款**：`第一条`、`Article 1` 等
- **子项**：`（一）`、`(1)` 等

这使得应用程序能够自动生成文档大纲和导航。

## ⚙️ 配置说明

在项目根目录创建 `.env` 文件进行自定义配置：

```env
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## 🗄️ 数据存储

应用程序使用本地 JSON 文件进行数据存储：

- `db.json` - 文档元数据
- `highlights.json` - 用户高亮和笔记
- `uploads/` - 上传的文档文件

这些文件在运行时自动创建，不会被 Git 跟踪。

## 🤝 贡献指南

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Electron](https://electronjs.org/) - 桌面应用框架
- [React](https://reactjs.org/) - 前端库
- [Ant Design](https://ant.design/) - UI 组件库
- [Mammoth](https://github.com/mwilliamson/mammoth.js) - Word 文档解析

## 📧 联系方式

如有问题或需要支持，请在 GitHub 上提交 Issue。

---

Made with ❤️ by Pumatlarge
