import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';

import { config } from './config/index.js';
import { specs, swaggerUi } from './config/swagger.js';
import apiRoutes from './routes/api/index.js';
import webRoutes from './routes/web/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors(config.cors));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: "Educational Content API Documentation",
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true
  }
}));

app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(config.session));

app.use('/api', apiRoutes);
app.use('/', webRoutes);

app.get('/docs', (req, res) => res.redirect('/api-docs'));

app.use(errorHandler);
app.use(notFoundHandler);

app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
  console.log(`API Documentation: http://localhost:${config.server.port}/api-docs`);
  console.log(`Dashboard: http://localhost:${config.server.port}/dashboard`);
});

export default app;