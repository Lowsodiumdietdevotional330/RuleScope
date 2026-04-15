# RuleScope v0.1.0 Release Notes

## 🎉 Initial Release

We are excited to announce the first official release of **RuleScope** - a desktop application for browsing, searching, and outlining regulation documents.

## 📦 Downloads

- **Windows Portable**: `RuleScope-0.1.0-win.zip`
  - No installation required
  - Extract and run `RuleScope.exe`
  - All data stored locally in the application folder

## ✨ Features

### Document Management
- 📄 **Multi-format Support**: Upload and manage Word (.docx, .doc), text (.txt), and PDF files
- 🔄 **Version Control**: Track document versions with automatic version comparison
- 📂 **File Organization**: Intuitive file manager with search and filter capabilities

### Smart Document Analysis
- 📑 **Auto Outline Extraction**: Automatically recognizes and extracts document structure from Word auto-numbering (Chapter, Article, Sub-item)
- 🔍 **Full-text Search**: Powerful search across all documents with result highlighting
- 📝 **Highlight & Notes**: Mark important content and add personal notes

### User Experience
- 🌓 **Dark/Light Theme**: Comfortable reading in any lighting condition
- 🌐 **Bilingual Interface**: Switch between Chinese and English
- ⌨️ **Keyboard Shortcuts**: Quick zoom with Ctrl/Cmd + +/- and reset with Ctrl/Cmd + 0
- 🖥️ **Native Desktop App**: Built with Electron for smooth performance

### Technical Highlights
- **Word Numbering Recognition**: Special support for Chinese regulation document formats
  - Chapters: `第一章`, `Chapter 1`
  - Articles: `第一条`, `Article 1`
  - Sub-items: `（一）`, `(1)`
- **Local Data Storage**: All data stored locally for privacy
- **Portable Design**: Run from USB drive without installation

## 🚀 Getting Started

### For End Users

1. Download `RuleScope-0.1.0-win.zip` from the Assets section below
2. Extract the ZIP file to your preferred location
3. Run `RuleScope.exe`
4. Start uploading and managing your regulation documents!

### For Developers

```bash
# Clone the repository
git clone https://github.com/Pumatlarge/RuleScope.git
cd RuleScope

# Install dependencies
npm run install:all

# Run in development mode
npm run dev

# Build for production
npm run build-portable
```

## 📝 Known Issues

- Large PDF files (>50MB) may take longer to process
- First launch may take a few seconds to initialize

## 🔮 Roadmap

- [ ] macOS and Linux support
- [ ] Cloud sync option
- [ ] Advanced search with filters
- [ ] Document collaboration features
- [ ] Mobile companion app

## 🙏 Credits

- Built with [Electron](https://electronjs.org/), [React](https://reactjs.org/), and [Ant Design](https://ant.design/)
- Document parsing powered by [Mammoth](https://github.com/mwilliamson/mammoth.js)

## 📄 License

This project is licensed under the MIT License.

---

**Full Changelog**: https://github.com/Pumatlarge/RuleScope/commits/v0.1.0
