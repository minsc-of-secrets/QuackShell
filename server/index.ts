import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Server } from 'socket.io';
import * as pty from 'node-pty';
import duckdb from 'duckdb';
import os from 'os';

// Handle BigInt serialization for JSON.stringify
declare global {
  interface BigInt {
    toJSON(): number;
  }
}
BigInt.prototype.toJSON = function () {
  return Number(this);
};

// --- STARTUP LOGIC: Change CWD to 'uploads' ---
import fs from 'fs';
const UPLOADS_DIR_NAME = 'uploads';

if (!fs.existsSync(UPLOADS_DIR_NAME)) {
  console.log(`Creating ${UPLOADS_DIR_NAME} directory...`);
  fs.mkdirSync(UPLOADS_DIR_NAME);
}

console.log(`Changing working directory to ${UPLOADS_DIR_NAME}...`);
process.chdir(UPLOADS_DIR_NAME);
// ----------------------------------------------

const app = new Hono();

// Enable CORS for frontend dev server
app.use('/*', cors());

// DuckDB Setup (persistent DB in parent directory)
const db = new duckdb.Database('../my-duckdb.db');
const conn = db.connect();

// DuckDB API Routes
app.get('/api/schema', async (c) => {
  return new Promise<Response>((resolve) => {
    // Get all tables and their columns in one query using information_schema
    const sql = `
      SELECT 
        table_name, 
        column_name, 
        data_type as column_type
      FROM information_schema.columns 
      WHERE table_schema = 'main'
      ORDER BY table_name, ordinal_position;
    `;

    conn.all(sql, async (err, rows) => {
      if (err) {
        return resolve(c.json({ error: err.message }, 500));
      }

      // Group by table_name
      const schema: { [key: string]: any[] } = {};
      rows.forEach((row: any) => {
        if (!schema[row.table_name]) {
          schema[row.table_name] = [];
        }
        schema[row.table_name].push({
          name: row.column_name,
          type: row.column_type
        });
      });

      // Get queryable files from CWD
      let files: string[] = [];
      try {
        const allFiles = await fsPromises.readdir('.');
        files = allFiles.filter(f => /\.(csv|parquet|tsv|json)$/i.test(f));
      } catch (fErr) {
        console.error('File list error:', fErr);
      }

      // Convert to array format
      const tables = Object.entries(schema).map(([name, columns]) => ({
        name,
        columns,
        type: 'table'
      }));

      // Fetch column info for each file using DESCRIBE
      const fileSchemaPromises = files.map(fileName => {
        return new Promise<{ name: string; columns: any[]; type: string }>((fileResolve) => {
          conn.all(`DESCRIBE SELECT * FROM '${fileName}' LIMIT 0;`, (descErr, descRows) => {
            if (descErr) {
              console.error(`Failed to describe ${fileName}:`, descErr.message);
              fileResolve({ name: fileName, columns: [], type: 'file' });
            } else {
              const columns = descRows.map((row: any) => ({
                name: row.column_name,
                type: row.column_type
              }));
              fileResolve({ name: fileName, columns, type: 'file' });
            }
          });
        });
      });

      const virtualTables = await Promise.all(fileSchemaPromises);

      resolve(c.json({ tables: [...tables, ...virtualTables] }));
    });
  });
});

app.post('/api/query', async (c) => {
  const body = await c.req.json();
  const sql = body.sql;

  if (!sql) {
    return c.json({ error: 'SQL query is required' }, 400);
  }

  return new Promise<Response>((resolve) => {
    // 1. Get query results
    conn.all(sql, (err, rows) => {
      if (err) {
        return resolve(c.json({ error: err.message }, 500));
      }

      // 2. Get schema info (only for SELECT-like queries or file references)
      const isSelectQuery = /^\s*(SELECT|WITH|DESCRIBE|SUMMARIZE|EXPLAIN|PRAGMA|SHOW|FROM|TABLE|VALUES)/i.test(sql);
      const isMetadataQuery = /^\s*(DESCRIBE|SHOW|EXPLAIN|SUMMARIZE|PRAGMA)/i.test(sql);

      if (isSelectQuery && !isMetadataQuery) {
        conn.all(`DESCRIBE (${sql.trim().replace(/;$/, '')});`, (schemaErr, schema) => {
          if (schemaErr) {
            return resolve(c.json({ rows }));
          }
          resolve(c.json({ rows, schema }));
        });
      } else if (isMetadataQuery) {
        // For metadata queries, the result itself is the schema information
        // We can treat the results as schema if they have the expected columns
        resolve(c.json({ rows, schema: rows }));
      } else {
        resolve(c.json({ rows }));
      }
    });
  });
});

// File Management Routes (Simplified since CWD is uploads)
import fsPromises from 'fs/promises';

app.get('/api/cwd', (c) => {
  return c.json({ cwd: process.cwd() });
});

app.post('/api/cwd', async (c) => {
  try {
    const body = await c.req.json();
    const newPath = body.path;

    if (!newPath) {
      return c.json({ error: 'Path is required' }, 400);
    }

    // Validate path exists and is a directory
    const stats = await fsPromises.stat(newPath);
    if (!stats.isDirectory()) {
      return c.json({ error: 'Path is not a directory' }, 400);
    }

    process.chdir(newPath);
    console.log(`Changed directory to: ${newPath}`);

    // Return new file list
    const files = await fsPromises.readdir('.');
    return c.json({ message: 'Directory changed', cwd: process.cwd(), files });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/files', async (c) => {
  try {
    const files = await fsPromises.readdir('.');
    return c.json({ files });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file']; // Expecting 'file' key

    if (file && file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Save directly to CWD (which is uploads)
      const filePath = file.name;

      await fsPromises.writeFile(filePath, buffer);
      console.log(`File uploaded: ${file.name}`);
      return c.json({ message: 'File uploaded successfully', filename: file.name });
    } else {
      return c.json({ error: 'No file uploaded' }, 400);
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return c.json({ error: error.message }, 500);
  }
});

import { exec } from 'child_process';

app.post('/api/open-uploads', async (c) => {
  try {
    // macOS 'open' command - open current directory
    exec(`open .`, (error) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }
    });
    return c.json({ message: 'Opened uploads folder' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/pick-dir', async (c) => {
  return new Promise<Response>((resolve) => {
    // AppleScript to choose folder
    const script = `osascript -e 'POSIX path of (choose folder)'`;

    exec(script, (error, stdout, stderr) => {
      if (error) {
        // User cancelled or error
        console.error('Pick dir error:', stderr);
        resolve(c.json({ cancelled: true }));
        return;
      }
      const path = stdout.trim();
      if (path) {
        resolve(c.json({ path }));
      } else {
        resolve(c.json({ cancelled: true }));
      }
    });
  });
});

// Start Hono Server with Socket.io
const port = 3001;
console.log(`Server is starting on port ${port}...`);

const server = serve({
  fetch: app.fetch,
  port: port
});

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev
    methods: ['GET', 'POST']
  }
});

// Terminal Socket Logic
io.on('connection', (socket) => {
  console.log('Terminal: Client connected');
  const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh');

  console.log(`Spawning shell: ${shell}`);

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });
  } catch (err) {
    console.error('Failed to spawn pty:', err);
    socket.emit('terminal:output', `\r\nError: Failed to spawn shell '${shell}': ${(err as Error).message}\r\n`);
    return;
  }

  socket.on('terminal:input', (data) => {
    ptyProcess.write(data);
  });

  socket.on('terminal:resize', (size) => {
    ptyProcess.resize(size.cols, size.rows);
  });

  ptyProcess.onData((data) => {
    socket.emit('terminal:output', data);
  });

  socket.on('disconnect', () => {
    console.log('Terminal: Client disconnected');
    ptyProcess.kill();
  });
});

console.log(`Server running at http://localhost:${port}`);
