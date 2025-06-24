import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getLocalVersion } from '../lib/archiver.js';
import createZipArchive from '../utils/zip.util.js';
import { getSubjectsFromRequest, getUrlsFromRequest, uploadToServer } from '../lib/getUrls.js';

export class ArchiveService {
  static async archiveSubject(token, params) {
    const { curr, currYear, subject } = params;
    const curriculum = curr;
    const year = currYear;

    let name = `${curriculum}_${year}_${subject}`;
    name = name.replaceAll(" ", "");

    const payload = { curriculum, year, subject };
    console.log(`Downloading ${name}...`);
    
    await this.getChapters({ name, payload, token });
    console.log(`Uploading ${name}...`);
    
    await uploadToServer({ name, token });

    return { curriculum, year, subject };
  }

  static async archiveAllSubjects(token, params) {
    const { curr, currYear } = params;
    const subjects = await getSubjectsFromRequest({ token, curr, currYear });

    await Promise.all(subjects.map(async (item) => {
      const { curriculum, year, subject } = item;

      let name = `${curriculum}_${year}_${subject}`;
      name = name.replaceAll(" ", "");

      const payload = { curriculum, year, subject };
      console.log(`Downloading ${name}...`);
      
      await this.getChapters({ name, payload, token });
      console.log(`Uploading ${name}...`);
      
      await uploadToServer({ name, token });
    }));

    if (fsSync.existsSync('results')) {
      await fsSync.promises.rm('results', { recursive: true, force: true });
    }
    if (fsSync.existsSync('downloads')) {
      await fsSync.promises.rm('downloads', { recursive: true, force: true });
    }

    return subjects;
  }

  static async getChapters({ name, payload, token }) {
    const links = await getUrlsFromRequest({ name, token, payload });
    const urls = links.urls;
    const sitemap = links.sitemap;

    if (!urls || urls.length === 0) {
      throw new Error('URLs are required');
    }

    const startTime = Date.now();
    const _path = `results/${name}`;
    const outputPath = path.join(process.cwd(), _path);
    
    await getLocalVersion({ urls, outputPath, sitemap, token });

    const { fileName, buffer } = await createZipArchive(outputPath);

    await fs.mkdir('downloads', { recursive: true });
    const zipPath = path.join(process.cwd(), 'downloads', fileName);
    fsSync.writeFileSync(zipPath, buffer);

    const endTime = Date.now();

    console.log({
      message: 'Download completed successfully',
      fileName,
      duration: `${(endTime - startTime) / 1000} seconds`,
      downloadUrl: `http://localhost:3000/api/archive/download/${fileName}`
    });
  }

  static downloadArchive(filename) {
    const filePath = path.join(process.cwd(), 'downloads', filename);
    
    if (!fsSync.existsSync(filePath)) {
      throw new Error(`The file ${filename} does not exist`);
    }

    return filePath;
  }
}