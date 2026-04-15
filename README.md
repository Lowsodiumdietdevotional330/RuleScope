# RuleScope

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-34.5.8-blue.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.8.6-blue.svg)](https://ant.design/)

RuleScope is a desktop application for browsing, searching, and outlining regulation documents. It is specifically designed for structured policy files in Word, text, and PDF formats, with special support for Word auto-numbering recognition such as `Chapter 1`, `Article 1`, and `(1)` style headings.

[中文文档](./README.zh-CN.md)

## ✨ Features

- 📄 **Multi-format Support**: Upload and manage `.docx`, `.doc`, `.txt`, and `.pdf` files
- 🔍 **Smart Search**: Full-text search with highlighting across all documents
- 📑 **Auto Outline Extraction**: Automatically extracts document structure from Word numbering definitions
- 🌓 **Dark/Light Theme**: Switch between light and dark modes for comfortable reading
- 🌐 **Bilingual Support**: Chinese and English language switch
- 📌 **Highlight & Notes**: Collect highlights with note support for important content
- 🖥️ **Desktop App**: Built with Electron for a native desktop experience
- 💼 **Portable**: Windows portable version available - no installation required

## 📸 Screenshots

![RuleScope Main Interface](./assets/screenshots/rulescope-main.png)

## 🚀 Quick Start

### Download Pre-built Executable (Recommended)

The easiest way to use RuleScope is to download the portable Windows package from [GitHub Releases](https://github.com/Pumatlarge/RuleScope/releases).

#### Steps:

1. Go to the [Releases page](https://github.com/Pumatlarge/RuleScope/releases)
2. Download the latest `RuleScope-X.X.X-win.zip` file
3. Extract the ZIP file to any local directory
4. Run `RuleScope.exe` from the extracted folder

> **Note**: Keep the executable and all accompanying files in the same directory. The app stores uploaded files and local metadata in this directory.

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later recommended
- [npm](https://www.npmjs.com/) 8 or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Pumatlarge/RuleScope.git
cd RuleScope
```

2. Install dependencies:
```bash
npm run install:all
```

### Running in Development Mode

Start both backend and frontend concurrently:
```bash
npm run dev
```

Or start them separately:

Backend:
```bash
npm start
```

Frontend:
```bash
cd client
npm start
```

### Building

Build the React frontend:
```bash
npm run build
```

Build the Electron desktop app:
```bash
npm run dist
```

Build portable Windows version:
```bash
npm run build-portable
```

## 📁 Project Structure

```
RuleScope/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   └── src/               # React source code
│       ├── components/    # React components
│       ├── contexts/      # React contexts
│       ├── pages/         # Page components
│       └── services/      # API services
├── controllers/           # Backend controllers
├── middleware/            # Express middleware
├── models/                # Data models
├── routes/                # API routes
├── scripts/               # Utility scripts
├── utils/                 # Document parsing utilities
├── main.js                # Electron entry point
├── server-filemanager.js  # Desktop backend entry
├── loading.html           # Loading screen
└── package.json           # Project configuration
```

## 📝 Document Numbering Support

RuleScope automatically recognizes and extracts the following numbering formats:

- **Chapters**: `第一章`, `Chapter 1`, etc.
- **Articles**: `第一条`, `Article 1`, etc.
- **Sub-items**: `（一）`, `(1)`, etc.

This allows for automatic generation of document outlines and navigation.

## ⚙️ Configuration

Create a `.env` file in the project root for custom configuration:

```env
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## 🗄️ Data Storage

The application uses local JSON files for data storage:

- `db.json` - Document metadata
- `highlights.json` - User highlights and notes
- `uploads/` - Uploaded document files

These files are created automatically at runtime and are not tracked in Git.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electron](https://electronjs.org/) - Desktop app framework
- [React](https://reactjs.org/) - Frontend library
- [Ant Design](https://ant.design/) - UI component library
- [Mammoth](https://github.com/mwilliamson/mammoth.js) - Word document parsing

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ by Pumatlarge
