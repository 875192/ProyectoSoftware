const { getConfig, saveConfig } = require('../dao/configDao');

// Obtener toda la configuración
function getConfigHandler(req, res) {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error al obtener la configuración:', error);
    res.status(500).json({ message: 'Error al obtener la configuración' });
  }
}

// Actualizar configuración
function updateConfig(req, res) {
  try {
    const newConfig = req.body;
    const success = saveConfig(newConfig);
    
    if (success) {
      res.json({ message: 'Configuración actualizada correctamente' });
    } else {
      res.status(500).json({ message: 'Error al actualizar la configuración' });
    }
  } catch (error) {
    console.error('Error al actualizar la configuración:', error);
    res.status(500).json({ message: 'Error al actualizar la configuración' });
  }
}

module.exports = { getConfig: getConfigHandler, updateConfig };