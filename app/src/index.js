const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const categoriasRoutes = require('./routes/categoriasRoutes');
const materialesRoutes = require('./routes/materialesRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API de UniGear funcionando' });
});

app.get('/db-test', (req, res) => {
  res.json({ ok: true, message: 'Conexión preparada' });
});

app.use('/categorias', categoriasRoutes);
app.use('/materiales', materialesRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});