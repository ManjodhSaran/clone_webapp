export const createErrorPage = async (error, word = 'Unknown') => {
    const errorTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - ${word}</title>
    <style>
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .error-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { color: #e74c3c; margin-bottom: 20px; }
        p { color: #2c3e50; line-height: 1.6; margin-bottom: 20px; }
        .error-code { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            font-family: monospace; 
            color: #e74c3c;
            margin: 20px 0;
        }
        .retry-btn {
            background: linear-gradient(45deg, #3498db, #2ecc71);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            font-weight: 500;
            transition: transform 0.3s ease;
        }
        .retry-btn:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Oops! Something went wrong</h1>
        <p>We couldn't generate the educational content for "<strong>${word}</strong>" at this time.</p>
        <div class="error-code">${error.message}</div>
        <a href="javascript:history.back()" class="retry-btn">← Go Back</a>
        <a href="javascript:location.reload()" class="retry-btn">Try Again</a>
    </div>
</body>
</html>`;

    return errorTemplate;
};