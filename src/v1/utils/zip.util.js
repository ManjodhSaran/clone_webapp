import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const createZipArchive = async (sourceDir) => {
    try {

        const zip = new AdmZip();

        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Source directory does not exist: ${sourceDir}`);
        }

        zip.addLocalFolder(sourceDir);
        // zip.writeZip(path.join(sourceDir, `${path.basename(sourceDir)}.zip`));

        return {
            fileName: `${path.basename(sourceDir)}.zip`,
            buffer: zip.toBuffer()
        };
    } catch (error) {
        console.error('Error creating zip archive:', error);
        throw new Error('Failed to create zip archive');
    }


};

export default createZipArchive;
