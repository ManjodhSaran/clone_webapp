import express from 'express';
import router from './v1/routes/index.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.set('view engine', 'ejs');

app.use('/v1/api', router)

// home page
app.get('/', (req, res) => {
  res.send('Offline API is running');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});