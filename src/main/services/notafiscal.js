// src/main/services/notafiscal.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { app, shell } = require('electron');
const axios = require('axios');
const DatabaseService = require('./database');
const LogService = require('./log');

const NotaFiscalService = {
  db() { return DatabaseService.getDB(); },
  getNFDir() {
    const dir = path.join(app.getPath('userData'), 'notas_fiscais');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  },

  async emitir(data) {
    const id = uuidv4();
    const valorISS = (data.valor_servico * (data.aliquota_iss || 5) / 100);
    const valorLiq = data.valor_servico - valorISS;

    // Inserir nota como pendente
    this.db().prepare(`
      INSERT INTO notas_fiscais (id, processo_id, cliente_id, servico_id, descricao_servico,
        valor_servico, aliquota_iss, valor_iss, valor_liquido, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
    `).run(id, data.processo_id || null, data.cliente_id, data.servico_id || null,
      data.descricao_servico, data.valor_servico, data.aliquota_iss || 5, valorISS, valorLiq);

    try {
      // Buscar config da API NFS-e
      const config = this._getConfig();
      
      if (!config.url || !config.token) {
        LogService.warn('NFS-e: API não configurada. Simulating emission.');
        // Simulação para desenvolvimento
        const numero = this._gerarNumeroNF();
        this.db().prepare(`
          UPDATE notas_fiscais SET status='emitida', numero=?, emitida_em=datetime('now') WHERE id=?
        `).run(numero, id);
        LogService.info('NFS-e simulada', { id, numero });
        return { success: true, id, numero, simulado: true };
      }

      // Buscar dados do cliente
      const cliente = this.db().prepare('SELECT * FROM clientes WHERE id=?').get(data.cliente_id);
      
      // Payload para API NFS-e (formato genérico)
      const payload = {
        tomador: {
          cpfCnpj: cliente?.cpf_cnpj?.replace(/\D/g, ''),
          razaoSocial: cliente?.nome,
          email: cliente?.email,
          endereco: { logradouro: cliente?.logradouro, numero: cliente?.numero, bairro: cliente?.bairro, codigoMunicipio: '4109708', uf: 'PR', cep: cliente?.cep?.replace(/\D/g, '') }
        },
        servico: {
          codigoTributacaoMunicipio: data.codigo_servico || '7319',
          discriminacao: data.descricao_servico,
          valorServicos: data.valor_servico,
          aliquota: data.aliquota_iss || 5,
          issRetido: false
        }
      };

      const response = await axios.post(`${config.url}/nfse/emitir`, payload, {
        headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const numero = response.data.numero || response.data.numeroNfse;
      const xml = response.data.xml;
      const pdf = response.data.pdf; // base64

      // Salvar XML e PDF
      let xmlPath = null, pdfPath = null;
      if (xml) { xmlPath = path.join(this.getNFDir(), `${id}.xml`); fs.writeFileSync(xmlPath, xml); }
      if (pdf) { pdfPath = path.join(this.getNFDir(), `${id}.pdf`); fs.writeFileSync(pdfPath, Buffer.from(pdf, 'base64')); }

      this.db().prepare(`
        UPDATE notas_fiscais SET status='emitida', numero=?, xml_path=?, pdf_path=?,
          codigo_verificacao=?, retorno_api=?, emitida_em=datetime('now') WHERE id=?
      `).run(numero, xmlPath, pdfPath, response.data.codigoVerificacao, JSON.stringify(response.data), id);

      LogService.info('NFS-e emitida', { id, numero });
      return { success: true, id, numero };

    } catch (err) {
      this.db().prepare("UPDATE notas_fiscais SET status='erro', retorno_api=? WHERE id=?")
        .run(err.message, id);
      LogService.error('NFS-e: Erro na emissão', err.message);
      return { success: false, error: err.message, id };
    }
  },

  list(filters = {}) {
    const notas = this.db().prepare(`
      SELECT n.*, c.nome as cliente_nome
      FROM notas_fiscais n
      LEFT JOIN clientes c ON n.cliente_id = c.id
      ORDER BY n.criado_em DESC
    `).all();
    return { success: true, data: notas };
  },

  async cancelar({ id, motivo }) {
    const nota = this.db().prepare('SELECT * FROM notas_fiscais WHERE id=?').get(id);
    if (!nota || nota.status !== 'emitida') return { success: false, error: 'Nota não pode ser cancelada' };

    const config = this._getConfig();
    if (config.url && config.token) {
      await axios.post(`${config.url}/nfse/cancelar`, { numero: nota.numero, motivo }, {
        headers: { Authorization: `Bearer ${config.token}` }
      });
    }

    this.db().prepare("UPDATE notas_fiscais SET status='cancelada', cancelada_em=datetime('now') WHERE id=?").run(id);
    return { success: true };
  },

  getServicos() {
    const servicos = this.db().prepare('SELECT * FROM servicos_catalogo WHERE ativo=1 ORDER BY nome').all();
    return { success: true, data: servicos };
  },

  openPDF(id) {
    const nota = this.db().prepare('SELECT pdf_path FROM notas_fiscais WHERE id=?').get(id);
    if (nota?.pdf_path && fs.existsSync(nota.pdf_path)) shell.openPath(nota.pdf_path);
    return { success: true };
  },

  _getConfig() {
    // Em produção: ler de electron-store ou arquivo de config
    return { url: process.env.NFS_API_URL || '', token: process.env.NFS_TOKEN || '' };
  },

  _gerarNumeroNF() {
    const ano = new Date().getFullYear();
    const ultimo = this.db().prepare("SELECT numero FROM notas_fiscais WHERE status='emitida' ORDER BY emitida_em DESC LIMIT 1").get();
    let seq = 1;
    if (ultimo?.numero) seq = parseInt(ultimo.numero.split('-')[1] || '0') + 1;
    return `${ano}-${String(seq).padStart(5, '0')}`;
  }
};

module.exports = NotaFiscalService;
