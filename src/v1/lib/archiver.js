import { downloadWebsite } from "./downloadWeb.js";
import fs from 'fs/promises';

const token = "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJpYmxpYkpXVCIsInN1YiI6IntcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwidXNlclwiOntcImlkXCI6XCIxMDNcIixcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwiaWRTdHVkZW50XCI6XCJcIixcImZpcnN0TmFtZVwiOlwiTmVoYVwiLFwibGFzdE5hbWVcIjpcIkFycm93XCIsXCJmYXRoZXJOYW1lXCI6XCJcIixcInBob25lTnVtYmVyXCI6XCI2Mzk1OTUyMjcxXCIsXCJlbWFpbEFkZHJlc3NcIjpcImlibGliLmluZm9AZ21haWwuY29tXCIsXCJiaXJ0aERhdGVcIjpcIjIwMDAtMDEtMDFcIixcImdlbmRlclwiOlwiRkVNQUxFXCIsXCJ1c2VySW1hZ2VcIjpcImh0dHBzOi8vZ3JhZGVwbHVzLnMzLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS91c2Vycy9hc3NldHMvaW1nL3VzZXJzL2Nyb3BwZWQ5MjE0MzgxMjk5MjI3Nzg1ODg1LmpwZ1wiLFwidXNlclR5cGVcIjpcIkNMSUVOVF9BRE1JTlwiLFwiaWRTY2hvb2xcIjpcIjQ4XCIsXCJzY2hvb2xOYW1lXCI6bnVsbCxcImN1cnJcIjpcIlVQU1NTQ1wiLFwiY3VyclllYXJcIjpcIlVQIExla2hwYWxcIixcInllYXJHcm91cFwiOlwiXCIsXCJpZEFkZHJlc3NcIjpcIjM1OVwiLFwibG9jYWxBZGRyZXNzXCI6XCJVR0YgMDMsIFRyaW5pdHkgU3F1YXJlXCIsXCJpc0xvY2tlZFwiOlwiMFwifSxcInJvbGVcIjpbXX0iLCJhdXRob3JpdGllcyI6WyJST0xFX1VTRVIiXSwiaWF0IjoxNzQ0MDk4OTU1LCJleHAiOjE3NDQyNzg5NTV9.mZI4XvU8zf9xsOJZJRMv2m7cSJrlcZjH436UyNys153DSjU2yi1JHzpM65VuaSID6j2BziguQGJdyAYryCdLgA";

export const getLocalVersion = async ({ urls, outputPath }) => {
    await fs.mkdir(outputPath, { recursive: true });
    try {
        for (const url of urls) {
            await downloadWebsite({
                startUrl: url, outputPath, options: {
                    maxDepth: 2,
                    sameDomainOnly: true,
                },
                token
            });
        }
    } catch (error) {
        console.error('Error during website download:', error);
        throw error;
    }
};
























const urls = [
    'https://www.iblib.com/user/html/topic/ENENT10021',
    'https://www.iblib.com/user/html/topic/ENENT10022',
    'https://www.iblib.com/user/html/topic/ENENT10023',
    'https://www.iblib.com/user/html/topic/ENENT10024',
    'https://www.iblib.com/user/html/topic/ENENT10025'
];

// getLocalVersion({ urls })
//   .then(() => {
//     console.log('Download completed successfully.');
//   })
//   .catch((error) => {
//     console.error('Error during download:', error);
//   });
