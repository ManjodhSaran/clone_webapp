import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { apiEndpoints } from '../config/index.js';

export const uploadToServer = async ({ name, token }) => {
  const filePath = path.join(process.cwd(), 'downloads', `${name}.zip`);

  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return null;
  }

  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  
  formData.append('file', fileBuffer, {
    filename: `${name}.zip`,
    contentType: 'application/zip'
  });

  formData.append('module', 'iMyCurrSubject');
  formData.append('fileName', name);

  console.log("Uploading file:", filePath);

  try {
    const response = await axios.post(apiEndpoints.uploadFile, formData, {
      headers: {
        Authorization: token,
        ...formData.getHeaders()
      }
    });

    console.log("Upload successful:", response.status);
    return response.data;
  } catch (error) {
    console.error("Upload failed:", error.response?.data || error.message);
    return null;
  }
};

export const getSubjectsFromRequest = async ({ token, curr, currYear }) => {
  try {
    const response = await fetch(apiEndpoints.subjects(curr, currYear), {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

export const getUrlsFromRequest = async ({ token, payload }) => {
  try {
    const response = await fetch(apiEndpoints.getChapters, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    const urls = [];
    
    const sitemap = data.map(topic => ({
      ...topic,
      subtopics: topic.subtopics.map(subtopic => ({
        ...subtopic,
        chapters: subtopic.chapters.map(chapter => {
          const full_url = `${apiEndpoints.htmlBase}${chapter.tid}`;
          urls.push(full_url);
          return {
            ...chapter,
            live_url: full_url,
            local_url: `./www.iblib.com/user/html/topic/${chapter.tid}/index.html`
          };
        })
      }))
    }));

    return { urls, sitemap };
  } catch (error) {
    console.error("Error:", error);
    return { urls: [], sitemap: [] };
  }
};