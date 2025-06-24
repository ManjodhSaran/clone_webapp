import { SubjectService } from '../services/SubjectService.js';
import { getSubjectsFromRequest } from '../lib/getUrls.js';
import { handleApiError } from '../utils/errorHandler.js';

export class SubjectController {
  static async getChapters(req, res) {
    try {
      if (!SubjectService.validateSubjectParams(req.query)) {
        return res.status(400).json({
          message: 'Curriculum, curriculum year, and subject are required'
        });
      }

      const subjectData = await SubjectService.getChapters(req.token, req.query);
      
      if (!subjectData) {
        return res.status(404).json({
          message: 'Subject data not found'
        });
      }

      res.status(200).json({
        message: 'Subject data retrieved successfully',
        subjectData
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }

  static async getCourses(req, res) {
    try {
      const courseData = await SubjectService.getCourses(req.token);
      
      if (!courseData) {
        return res.status(404).json({
          message: 'Course data not found'
        });
      }

      res.status(200).json({
        message: 'Course data retrieved successfully',
        data: courseData
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }

  static async getYears(req, res) {
    try {
      const courseData = await SubjectService.getYears(req.token);
      
      if (!courseData) {
        return res.status(404).json({
          message: 'Course data not found'
        });
      }

      res.status(200).json({
        message: 'Course data retrieved successfully',
        data: courseData
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }

  static async getSubjects(req, res) {
    try {
      const { curr, currYear } = req.query;

      if (!curr || !currYear) {
        return res.status(400).json({
          message: 'Curriculum and curriculum year are required'
        });
      }

      const subjects = await getSubjectsFromRequest({
        token: req.token,
        curr,
        currYear
      });

      res.status(200).json({
        message: 'Subject data retrieved successfully',
        data: subjects
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }

  static async getOfflineSubject(req, res) {
    try {
      if (!SubjectService.validateSubjectParams(req.query)) {
        return res.status(400).json({
          message: 'Curriculum, curriculum year, and subject are required'
        });
      }

      const url = await SubjectService.getOfflineSubject(req.token, req.query);
      
      if (!url) {
        return res.status(404).json({
          message: 'Subject data not found'
        });
      }

      res.status(200).json({
        message: 'Subject data retrieved successfully',
        url
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }

  static async getOfflineSubjectStatus(req, res) {
    try {
      const subjectStatus = await SubjectService.getOfflineSubjectStatus(req.token, req.query);
      
      if (!subjectStatus) {
        return res.status(404).json({
          message: 'Subject status not found'
        });
      }

      res.status(200).json({
        message: 'Subject status retrieved successfully',
        subjectStatus
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }

  static async updateOfflineSubjectStatus(req, res) {
    try {
      if (!SubjectService.validateSubjectParams(req.body)) {
        return res.status(400).json({
          message: 'Curriculum, curriculum year, and subject are required'
        });
      }

      const subjectStatus = await SubjectService.updateOfflineSubjectStatus(req.token, req.body);
      
      if (!subjectStatus) {
        return res.status(404).json({
          message: 'Subject status not found'
        });
      }

      res.status(200).json({
        message: 'Subject status updated successfully',
        subjectStatus
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }
}