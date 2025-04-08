import AdmZip from 'adm-zip';
import path from 'path';

const createZipArchive = async (sourceDir) => {
    const zipFilePath = path.join(path.dirname(sourceDir), `${path.basename(sourceDir)}.zip`);

    const zip = new AdmZip();

    zip.addLocalFolder(sourceDir);
    zip.writeZip(zipFilePath);

    return zipFilePath;
};

export default createZipArchive;
