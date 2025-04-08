
import sanitize from 'sanitize-filename';
import crypto from 'crypto';
import path from 'path';
import mime from 'mime-types';
import { URL } from 'url';

export const getSanitizedFilename = (url, contentType) => {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = path.basename(pathname);

    // If no filename or just a slash, generate one based on the URL
    if (!filename || filename === '/' || filename === '') {
        const extension = mime.extension(contentType) || 'txt';
        const urlHash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
        filename = `${urlObj.hostname}-${urlHash}.${extension}`;
    }

    // Ensure the filename has an extension
    if (!path.extname(filename) && contentType) {
        const extension = mime.extension(contentType);
        if (extension) {
            filename = `${filename}.${extension}`;
        }
    }

    return sanitize(filename);
}