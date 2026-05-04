const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  empresa: {
    nome: 'DespachaPR Serviços',
    cnpj: '',
    inscricaoMunicipal: '',
    logradouro: 'Rua das Flores, 100 - Centro',
    cidade: 'Ibiporã',
    cep: '86200-000',
    telefone: '(43) 3252-0000',
    email: 'contato@despachapr.com',
  },
  nfse: {
    url: '',
    token: '',
    cnpjPrestador: '',
    inscricaoMunicipal: '',
  },
};

function settingsPath() {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'settings.json');
}

function readAll() {
  const file = settingsPath();
  if (!fs.existsSync(file)) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return DEFAULTS;
  }
}

function writeAll(data) {
  fs.writeFileSync(settingsPath(), JSON.stringify(data, null, 2), 'utf8');
}

const SettingsService = {
  get(key) {
    const data = readAll();
    return { success: true, data: key ? data[key] : data };
  },

  set(key, value) {
    const data = readAll();
    data[key] = { ...(data[key] || {}), ...(value || {}) };
    writeAll(data);
    return { success: true, data: data[key] };
  },
};

module.exports = SettingsService;
