import fs from 'fs';
import path from 'path';
import FormData from 'form-data'; // npm install form-data
import axios from 'axios';         // npm install axios

const subjects_base_url = ({ curr, currYear }) =>
    `https://www.iblib.com/api/study/subjects?curr=${curr}&currYear=${currYear}`;
const chapters_base_url = "https://www.iblib.com/api/study/chapters";
const html_base_url = "https://www.iblib.com/user/html/topic/";

const uploadUrl = 'https://test.iblib.com/api/uploadfile';

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

        console.log("Upload successful:", response.status);
        return response.data;

    } catch (error) {
        console.error("Upload failed:", error.response?.data || error.message);
        return null;
    }
};

uploadToServer({
    name: 'ICSE_CLASS-IV_Computer Studies',
    token: 'eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJpYmxpYkpXVCIsInN1YiI6IntcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwidXNlclwiOntcImlkXCI6XCIxMDNcIixcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwiaWRTdHVkZW50XCI6XCJcIixcImZpcnN0TmFtZVwiOlwiTmVoYVwiLFwibGFzdE5hbWVcIjpcIkFycm93XCIsXCJmYXRoZXJOYW1lXCI6XCJcIixcInBob25lTnVtYmVyXCI6XCI2Mzk1OTUyMjcxXCIsXCJlbWFpbEFkZHJlc3NcIjpcImlibGliLmluZm9AZ21haWwuY29tXCIsXCJiaXJ0aERhdGVcIjpcIjIwMDAtMDEtMDFcIixcImdlbmRlclwiOlwiRkVNQUxFXCIsXCJ1c2VySW1hZ2VcIjpcImh0dHBzOi8vZ3JhZGVwbHVzLnMzLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS91c2Vycy9hc3NldHMvaW1nL3VzZXJzL2Nyb3BwZWQ5MjE0MzgxMjk5MjI3Nzg1ODg1LmpwZ1wiLFwidXNlclR5cGVcIjpcIkNMSUVOVF9BRE1JTlwiLFwiaWRTY2hvb2xcIjpcIjQ4XCIsXCJzY2hvb2xOYW1lXCI6XCJBcnJvdyBJbnRlciBDb2xsZWdlXCIsXCJjdXJyXCI6XCJDQlNFXCIsXCJjdXJyWWVhclwiOlwiQ0xBU1MtWFwiLFwieWVhckdyb3VwXCI6XCJcIixcImlkQWRkcmVzc1wiOlwiMzU5XCIsXCJsb2NhbEFkZHJlc3NcIjpcIlVHRiAwMywgVHJpbml0eSBTcXVhcmVcIixcImlzTG9ja2VkXCI6XCIwXCJ9LFwicm9sZVwiOltdfSIsImF1dGhvcml0aWVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE3NDYwMzcxMzAsImV4cCI6MTc0NjA0NjEzMH0.rK-aC8VL5NDLgMQamMhwPkSNA3WnT77yzzy_uMvIFqdHbX3EJPR2uS5-oG7j1lR9VX0GJwVdMbMYmHK7Ihf2dw'
})

export const getSubjectsFromRequest = async ({ token, curr, currYear }) => {
    try {
        const response = await fetch(subjects_base_url({ curr, currYear }), {
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
            subtopics: topic.subtopics.map(subtopic => ({
                ...subtopic,
                chapters: subtopic.chapters.map(chapter => {
                    const full_url = `${html_base_url}${chapter.tid}`;
                    urls.push(full_url);
                    return {
                        ...chapter,
                        live_url: full_url,
                        local_url: `./www.iblib.com/user/html/topic/${chapter.tid}/index.html`
                    };
                })
            }))
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
