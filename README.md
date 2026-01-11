# QuackShell (DuckDB UI with Terminal)

[日本語 (Japanese)](README.ja.md)

QuackShell is a powerful integrated development environment for operating DuckDB from a web browser. It integrates a SQL query editor, data viewer, file explorer, and a terminal connected to the system shell into a single screen.

![QuackShell Mockup](https://via.placeholder.com/1200x600?text=QuackShell+Modern+UI+Design)

## ✨ Key Features

- **SQL Query Editor**: Equipped with Monaco Editor, supporting syntax highlighting and auto-completion.
- **Data Viewer**: Displays query results in an interactive table. Sortable with a single click.
- **Integrated Terminal**: Uses xterm.js and node-pty to operate the local shell (zsh/bash, etc.) directly in the browser.
- **File Management**: Quick access to CSV/Parquet files, folder uploads, and support for native macOS folder selection.
- **Material Design 3**: Modern and sophisticated UI design. Intuitive pane splitting and responsive operation.

## 🛠 Tech Stack

### Frontend
- **React 19**
- **Vite**
- **Tailwind CSS v4**
- **Monaco Editor** (SQL Editing)
- **Xterm.js** (Terminal)
- **Socket.io-client** (Communication)

### Backend
- **Hono** (Node.js runtime)
- **DuckDB** (In-process DB)
- **Node-pty** (Pseudo-terminal)
- **Socket.io** (Terminal Communication)

## 🚀 Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- pnpm (Recommended)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd duckdb-ui-with-terminal

# Install dependencies
pnpm install
```

### How to Start

This project requires running two servers: frontend and backend.

**1. Start the Backend Server:**
```bash
npm run server
# or
pnpm run server
```
The server starts at `http://localhost:3001`.

**2. Start the Frontend (Vite) Proxy:**
```bash
npm run dev
# or
pnpm run dev
```
Access the URL displayed in the browser (usually `http://localhost:5173`).

## 📂 File Structure

- `/client`: React frontend source code
- `/server`: Hono backend source code
- `/uploads`: Default working directory (uploaded files are saved here)
- `my-duckdb.db`: Persisted DuckDB database file

## 💡 Usage

1. **Import Data**: Use the Explorer's upload feature to add CSV or Parquet files to the project.
2. **Execute Queries**: Enter SQL in the query editor and execute. Selecting a file from the table automatically generates an optimal `SELECT` statement.
3. **Terminal Integration**: Launch the DuckDB CLI in the terminal or execute system commands directly.

## 🗺 Roadmap

### ✅ Implemented
- [x] **CSV Export**: Download query results directly as CSV from the browser.
- [x] **Query History & Save**: Automatically records executed SQL, allowing saving, previewing, and applying.
- [x] **Type Information**: Displays DuckDB data types under column names in query results.
- [x] **Flexible Layout**: Adjust pane sizes by dragging.
- [x] **File Management**: Drag & drop uploads, OS standard folder selection.
- [x] **Schema Browser**: Tree view of tables and CSV/Parquet structures in folders, with instant item copying.
- [x] **Multi-tab Terminal**: Manage and run multiple shell sessions in tabs simultaneously.

### 🚀 Future Plans
- [ ] **Data Visualization**: Instant visualization of query results with bar or line charts (Recharts, etc.).
- [ ] **Multi-tab Editor**: Tabbed SQL editor to run multiple analyses in parallel.
- [ ] **Import Wizard**: Adjust detailed settings (delimiters, types, etc.) automatically when reading CSV/JSON.
- [ ] **Advanced Auto-completion**: IntelliSense that suggests actual table and column names from the database.
- [ ] **Auto-save**: Automatically save draft SQL to Local Storage to prevent loss on reload.
- [ ] **DuckDB-WASM Support**: Provide a mode that runs entirely in the browser (serverless).

## 📄 License

[ISC License](LICENSE)
