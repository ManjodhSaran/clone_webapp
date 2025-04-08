import path from 'path';
import { URL } from 'url';
import sanitize from 'sanitize-filename';

export const createLocalPath = (url, depth, outputPath) => {
    const urlObj = new URL(url);
    const hostname = sanitize(urlObj.hostname);
    let pathname = urlObj.pathname;

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    } else if (!path.extname(pathname)) {
        pathname = `${pathname}/index.html`.replace(/\/+/g, '/');
    }

    const localPath = path.join(
        outputPath,
        hostname,
        pathname.replace(/^\//, '')
    );

    return localPath;
};

export const createRelativePath = (fromPath, toPath) => {
    let relativePath = path.relative(path.dirname(fromPath), toPath).replace(/\\/g, '/');

    if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
        relativePath = `./${relativePath}`;
    }

    return relativePath;
};
