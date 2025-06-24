import axios from 'axios';
import { apiEndpoints } from '../config/index.js';

export class SubjectService {
  static validateSubjectParams(params) {
    const { curr, currYear, subject } = params;
    return curr && currYear && subject;
  }

  static async getChapters(token, params) {
    const { curr, currYear, subject } = params;
    const payload = { curr, currYear, subject };

    const response = await axios.post(
      apiEndpoints.getChapters,
      payload,
      {
        headers: {
          Authorization: token
        }
      }
    );

    return response.data;
  }

  static async getCourses(token) {
    const response = await axios.get(
      apiEndpoints.getCourses,
      {
        headers: {
          Authorization: token
        }
      }
    );

    return response.data;
  }

  static async getYears(token) {
    const response = await axios.get(
      apiEndpoints.getYears,
      {
        headers: {
          Authorization: token
        }
      }
    );

    return response.data?.data;
  }

  static async getOfflineSubject(token, params) {
    const { curr, currYear, subject } = params;
    const payload = { curr, currYear, subject };

    const response = await axios.post(
      apiEndpoints.subjectOfflineFile,
      payload,
      {
        headers: {
          Authorization: token
        }
      }
    );

    return response.data?.response;
  }

  static async getOfflineSubjectStatus(token, params) {
    const { curr, currYear, subject } = params;
    const payload = { curr, currYear, subject };

    const response = await axios.post(
      apiEndpoints.subjectOfflineStatus,
      payload,
      {
        headers: {
          Authorization: token
        }
      }
    );

    return response.data;
  }

  static async updateOfflineSubjectStatus(token, params) {
    const { curr, currYear, subject } = params;
    const payload = { curr, currYear, subject };

    const response = await axios.post(
      apiEndpoints.subjectOfflineStatusUpdate,
      payload,
      {
        headers: {
          Authorization: token
        }
      }
    );

    return response.data;
  }
}