import { ArchiveService } from '../services/ArchiveService.js';

export class ArchiveController {
  static async archiveContent(req, res) {
    try {
      const { curr, currYear, subject } = req.body;
      const token = req?.body?.token || req.token;

      if (subject) {
        const result = await ArchiveService.archiveSubject(token, { curr, currYear, subject });
        
        return res.status(200).json({
          message: 'Download completed',
          details: `Subject ${subject} has been downloaded and uploaded successfully.`,
          subject: result
        });
      }

      const subjects = await ArchiveService.archiveAllSubjects(token, { curr, currYear });

      res.status(200).json({
        message: 'Download completed',
        details: 'All subjects have been downloaded and uploaded successfully.',
        subjects
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        message: 'An error occurred',
        error: error.message
      });
    }
  }

  static async downloadArchive(req, res) {
    try {
      const { filename } = req.params;
      const filePath = ArchiveService.downloadArchive(filename);

      res.download(filePath, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({
            error: 'Download failed',
            details: err.message
          });
        }
      });
    } catch (error) {
      res.status(404).json({
        error: 'File not found',
        details: error.message
      });
    }
  }
}