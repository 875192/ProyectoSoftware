const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const categoriasRoutes = require('./routes/categoriasRoutes');
const materialesRoutes = require('./routes/materialesRoutes');
const authRoutes = require('./routes/authRoutes');
const solicitudesRoutes = require('./routes/solicitudesRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const notificacionesRoutes = require('./routes/notificacionesRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'API de UniGear funcionando' });
});

app.get('/db-test', (req, res) => {
  res.json({ ok: true, message: 'Conexión preparada' });
});

app.use('/auth', authRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/materiales', materialesRoutes);
app.use('/solicitudes', solicitudesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/notificaciones', notificacionesRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});