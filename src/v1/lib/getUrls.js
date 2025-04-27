

const subjects_base_url = ({ curr, currYear }) => `https://www.iblib.com/api/study/subjects?curr=${curr}&currYear=${currYear}`
const chapters_base_url = "https://www.iblib.com/api/study/chapters";
const html_base_url = "https://www.iblib.com/user/html/topic/";


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
