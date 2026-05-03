const fs = require('fs');
const path = require('path');

// Ruta al archivo de configuración
const configPath = path.resolve(__dirname, '../config.json');

// Función para leer la configuración
function getConfig() {
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error al leer el archivo de configuración:', error);
    return {};
  }
}

// Función para guardar configuración
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error al guardar la configuración:', error);
    return false;
  }
}

module.exports = { getConfig, saveConfig };