import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { downloadWebpage } from './downloader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/download', async (req, res) => {
  try {
    const { url } = req.query;
    console.log('url', url)

    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
        details: 'Please provide a valid URL to download'
      });
    }

    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format',
        details: 'Please provide a valid URL starting with http:// or https://'
      });
    }

    const { zipBuffer, filename } = await downloadWebpage(url);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(zipBuffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});