import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Create temp directory if it doesn't exist
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Generate UUID for this upload
        const uuid = uuidv4();
        const uploadDir = path.join(tempDir, uuid);

        // Create UUID directory
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Store UUID in req for later use
        req.uploadUuid = uuid;

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Always name the file 'main.pdf'
        cb(null, 'main.pdf');
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Helper function to get the full path of uploaded PDF
export const getPdfPath = (uuid) => {
    return path.join(tempDir, uuid, 'main.pdf');
};

// Helper function to clean up specific UUID directory
export const cleanupUuidDir = (uuid) => {
    const dirPath = path.join(tempDir, uuid);
    fs.rm(dirPath, { recursive: true, force: true }, (err) => {
        if (err) console.error('Error deleting UUID directory:', err);
    });
};

// Optional: Helper function to clean up temp files (legacy single file cleanup)
export const cleanupTempFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
    });
};

// Clean up all temp directories older than 1 hour
export const cleanupOldTempFiles = () => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return;

        files.forEach(file => {
            const dirPath = path.join(tempDir, file);
            fs.stat(dirPath, (err, stats) => {
                if (err) return;

                const now = new Date().getTime();
                const fileTime = new Date(stats.mtime).getTime();
                const oneHour = 60 * 60 * 1000;

                if ((now - fileTime) > oneHour && stats.isDirectory()) {
                    fs.rm(dirPath, { recursive: true, force: true }, (err) => {
                        if (err) console.error('Error deleting old temp directory:', err);
                    });
                }
            });
        });
    });
};