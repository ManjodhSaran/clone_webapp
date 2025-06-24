export const handleApiError = (error, res) => {
  if (error.response) {
    return res.status(error.response.status).json({
      message: 'Request failed',
      error: error.response.data?.message || 'Server returned an error'
    });
  } else if (error.request) {
    return res.status(503).json({
      message: 'Service unavailable',
      error: 'No response from server'
    });
  } else {
    return res.status(500).json({
      message: 'An error occurred',
      error: error.message
    });
  }
};