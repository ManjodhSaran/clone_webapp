import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const subjects_base_url = ({ curr, currYear }) =>
    `https://www.iblib.com/api/study/subjects?curr=${curr}&currYear=${currYear}`;
const chapters_base_url = "https://www.iblib.com/api/study/chapters";
const html_base_url = "https://www.iblib.com/user/html/topic/";

const uploadUrl = 'https://iblib.com/api/uploadfile';

export const uploadToServer = async ({ name, token }) => {
    const filePath = path.join(process.cwd(), 'downloads', `${name}.zip`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error(`File does not exist: ${filePath}`);
        return null;
    }

    // Create form data
    const formData = new FormData();

    // Read file as buffer and append to form
    const fileBuffer = fs.readFileSync(filePath);
    formData.append('file', fileBuffer, {
        filename: `${name}.zip`,
        contentType: 'application/zip'
    });

    // Append other fields
    formData.append('module', 'iMyCurrSubject');
    formData.append('fileName', name);

    console.log("Uploading file:", filePath);

    try {
        const response = await axios.post(uploadUrl, formData, {
            headers: {
                Authorization: token,
                ...formData.getHeaders()
            }
        });

        // remove 
        console.log("Upload successful:", response.status);
        return response.data;

    } catch (error) {
        console.error("Upload failed:", error.response?.data || error.message);
        return null;
    }
};

export const getSubjectsFromRequest = async ({ token, curr, currYear }) => {
    console.log('token', token)
    try {
        const response = await fetch(subjects_base_url({ curr, currYear }), {
            method: 'GET',
            headers: {
                'Authorization': token
            }
        });
        console.log('response', JSON.stringify(response, null, 2));
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();

        return data

    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const getUrlsFromRequest = async ({ token, payload, }) => {
    try {
        const response = await fetch(chapters_base_url, {
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
            subtopics: topic.subtopics.map((subtopic, i) => {
                const chapters = subtopic.chapters.map(chapter => {
                    const full_url = `${html_base_url}${chapter.tid}`;
                    urls.push(full_url);
                    return {
                        ...chapter,
                        live_url: full_url,
                        local_url: `./www.iblib.com/user/html/topic/${chapter.tid}/index.html`
                    };
                });
                return {
                    ...subtopic,
                    title: subtopic?.title || chapters[0]?.title || 'Untitled',
                    chapters,
                }
            })
        }));

        return {
            urls,
            sitemap
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            urls: [],
            sitemap: []
        };
    }
};
