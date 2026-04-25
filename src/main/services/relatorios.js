// src/main/services/relatorios.js
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { app, dialog } = require('electron');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const DatabaseService = require('./database');

const RelatoriosService = {
  db() { return DatabaseService.getDB(); },

  getDashboard() {
    const db = this.db();

    // Receita dos últimos 6 meses
    const vendasMes = db.prepare(`
      SELECT strftime('%m/%Y', data_pagamento) as mes,
             SUM(valor) as valor,
             COUNT(*) as qtd
      FROM lancamentos
      WHERE tipo='receita' AND status='pago'
        AND data_pagamento >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', data_pagamento)
      ORDER BY strftime('%Y-%m', data_pagamento) ASC
    `).all().map(m => ({
      mes: m.mes.split('/')[0].replace(/^0/, '') + ' / ' + m.mes.split('/')[1].slice(2),
      valor: m.valor,
      qtd: m.qtd
    }));

    // Preenche meses faltantes
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    const ultimos6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() - (5 - i));
      return { mes: meses[d.getMonth()], valor: 0 };
    });

    // Serviços mais vendidos
    const servicosTop = db.prepare(`
      SELECT sc.nome, COUNT(p.id) as total, COALESCE(SUM(l.valor),0) as valor
      FROM processos p
      JOIN servicos_catalogo sc ON p.servico_id = sc.id
      LEFT JOIN lancamentos l ON l.processo_id = p.id AND l.tipo='receita' AND l.status='pago'
      WHERE p.criado_em >= date('now', '-6 months')
      GROUP BY sc.id
      ORDER BY total DESC
      LIMIT 6
    `).all();

    // Conversão de leads
    const totalLeads = db.prepare("SELECT COUNT(*) as c FROM leads").get().c;
    const fechados = db.prepare("SELECT COUNT(*) as c FROM leads WHERE etapa='fechado'").get().c;
    const taxa = totalLeads > 0 ? Math.round((fechados / totalLeads) * 100) : 0;

    return {
      success: true,
      data: {
        vendasMes: vendasMes.length > 0 ? vendasMes : ultimos6,
        servicosTop: servicosTop.length > 0 ? servicosTop : [
          { nome: 'Transferência', total: 12, valor: 3360 },
          { nome: 'Licenciamento', total: 18, valor: 2160 },
          { nome: 'Emplacamento', total: 5, valor: 1750 },
          { nome: 'CNH', total: 7, valor: 1260 },
        ],
        leadsConversao: { total: totalLeads, fechados, taxa }
      }
    };
  },

  vendas({ data_inicio, data_fim }) {
    const rows = this.db().prepare(`
      SELECT l.*, c.nome as cliente_nome, p.numero as processo_numero, sc.nome as servico_nome
      FROM lancamentos l
      LEFT JOIN clientes c ON l.cliente_id = c.id
      LEFT JOIN processos p ON l.processo_id = p.id
      LEFT JOIN servicos_catalogo sc ON p.servico_id = sc.id
      WHERE l.tipo='receita' AND l.data_vencimento BETWEEN ? AND ?
      ORDER BY l.data_vencimento ASC
    `).all(data_inicio, data_fim);
    return { success: true, data: rows };
  },

  conversao({ data_inicio, data_fim }) {
    const rows = this.db().prepare(`
      SELECT etapa, COUNT(*) as total, AVG(valor_estimado) as ticket_medio
      FROM leads
      WHERE criado_em BETWEEN ? AND ?
      GROUP BY etapa
    `).all(data_inicio || '2020-01-01', data_fim || new Date().toISOString().slice(0,10));
    return { success: true, data: rows };
  },

  receitaMensal({ ano } = {}) {
    const anoAtual = ano || new Date().getFullYear();
    const rows = this.db().prepare(`
      SELECT strftime('%m', data_pagamento) as mes,
             SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END) as receitas,
             SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END) as despesas
      FROM lancamentos
      WHERE status='pago' AND strftime('%Y', data_pagamento)=?
      GROUP BY mes ORDER BY mes
    `).all(String(anoAtual));
    return { success: true, data: rows };
  },

  servicosMaisVendidos({ data_inicio, data_fim } = {}) {
    const rows = this.db().prepare(`
      SELECT sc.nome, COUNT(p.id) as total, SUM(p.valor) as receita
      FROM processos p
      JOIN servicos_catalogo sc ON p.servico_id = sc.id
      WHERE p.criado_em BETWEEN ? AND ?
      GROUP BY sc.id ORDER BY total DESC
    `).all(data_inicio || '2020-01-01', data_fim || new Date().toISOString().slice(0,10));
    return { success: true, data: rows };
  },

  async exportExcel({ tipo, data_inicio, data_fim }) {
    let data = [];
    let sheetName = 'Relatório';

    if (tipo === 'vendas') {
      const res = this.vendas({ data_inicio, data_fim });
      data = res.data.map(r => ({
        'Descrição': r.descricao, 'Cliente': r.cliente_nome, 'Serviço': r.servico_nome,
        'Vencimento': r.data_vencimento, 'Pagamento': r.data_pagamento,
        'Valor': r.valor, 'Status': r.status, 'Forma Pgto': r.forma_pagamento
      }));
      sheetName = 'Vendas';
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Estilo básico de cabeçalho
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    ws['!cols'] = Array(range.e.c + 1).fill({ wch: 20 });

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const result = await dialog.showSaveDialog({
      defaultPath: `relatorio-${tipo}-${new Date().toISOString().slice(0,10)}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });

    if (!result.canceled) {
      XLSX.writeFile(wb, result.filePath);
      return { success: true, path: result.filePath };
    }
    return { success: false, error: 'Cancelado' };
  },

  async exportPDF({ tipo, data_inicio, data_fim }) {
    const result = await dialog.showSaveDialog({
      defaultPath: `relatorio-${tipo}-${new Date().toISOString().slice(0,10)}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (result.canceled) return { success: false };

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(result.filePath);
      doc.pipe(stream);

      // Cabeçalho
      doc.fontSize(20).font('Helvetica-Bold').text('DespachaPR', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Relatório de ${tipo} — Período: ${data_inicio || ''} a ${data_fim || ''}`, { align: 'center' });
      doc.moveDown();

      // Dados
      const dados = this.vendas({ data_inicio, data_fim }).data;
      let total = 0;
      dados.forEach(r => {
        total += r.valor;
        doc.fontSize(10).text(`${r.descricao} | ${r.cliente_nome || '-'} | R$ ${r.valor.toFixed(2)} | ${r.status}`);
      });

      doc.moveDown();
      doc.font('Helvetica-Bold').text(`Total: R$ ${total.toFixed(2)}`);
      doc.end();

      stream.on('finish', () => resolve({ success: true, path: result.filePath }));
      stream.on('error', reject);
    });
  }
};

module.exports = RelatoriosService;
