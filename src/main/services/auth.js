// src/main/services/auth.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const DatabaseService = require('./database');
const LogService = require('./log');

const TOKEN_EXPIRY_HOURS = 8;

const AuthService = {
  getDB() {
    return DatabaseService.getDB();
  },

  async login({ email, senha }) {
    try {
      const db = this.getDB();
      const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email);

      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      const valid = await bcrypt.compare(senha, user.senha_hash);
      if (!valid) {
        LogService.warn('Tentativa de login inválida', { email });
        return { success: false, error: 'Senha incorreta' };
      }

      // Criar sessão
      const token = uuidv4() + '-' + uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

      db.prepare(`
        INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)
      `).run(token, user.id, expiresAt.toISOString());

      db.prepare(`
        UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?
      `).run(user.id);

      LogService.info('Login realizado', { userId: user.id, nome: user.nome });

      return {
        success: true,
        token,
        usuario: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil,
        }
      };
    } catch (err) {
      LogService.error('Erro no login', err);
      return { success: false, error: 'Erro interno no login' };
    }
  },

  async logout(token) {
    const db = this.getDB();
    db.prepare('DELETE FROM sessoes WHERE token = ?').run(token);
    return { success: true };
  },

  verifyToken(token) {
    if (!token) return { valid: false };
    const db = this.getDB();

    const sessao = db.prepare(`
      SELECT s.*, u.id as uid, u.nome, u.email, u.perfil
      FROM sessoes s
      JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.token = ? AND s.expira_em > datetime('now') AND u.ativo = 1
    `).get(token);

    if (!sessao) return { valid: false };

    return {
      valid: true,
      usuario: {
        id: sessao.uid,
        nome: sessao.nome,
        email: sessao.email,
        perfil: sessao.perfil,
      }
    };
  },

  async changePassword({ token, senhaAtual, novaSenha }) {
    const verify = this.verifyToken(token);
    if (!verify.valid) return { success: false, error: 'Não autorizado' };

    const db = this.getDB();
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(verify.usuario.id);

    const valid = await bcrypt.compare(senhaAtual, user.senha_hash);
    if (!valid) return { success: false, error: 'Senha atual incorreta' };

    const hash = await bcrypt.hash(novaSenha, 10);
    db.prepare('UPDATE usuarios SET senha_hash = ?, atualizado_em = datetime(\'now\') WHERE id = ?')
      .run(hash, user.id);

    return { success: true };
  },

  listUsers(token) {
    const verify = this.verifyToken(token);
    if (!verify.valid || verify.usuario.perfil !== 'admin') {
      return { success: false, error: 'Sem permissão' };
    }

    const db = this.getDB();
    const users = db.prepare(
      'SELECT id, nome, email, perfil, ativo, ultimo_acesso, criado_em FROM usuarios ORDER BY nome'
    ).all();

    return { success: true, data: users };
  },

  async createUser({ token, nome, email, senha, perfil }) {
    const verify = this.verifyToken(token);
    if (!verify.valid || verify.usuario.perfil !== 'admin') {
      return { success: false, error: 'Sem permissão' };
    }

    const db = this.getDB();
    const exists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (exists) return { success: false, error: 'E-mail já cadastrado' };

    const hash = await bcrypt.hash(senha, 10);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO usuarios (id, nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?, ?)
    `).run(id, nome, email, hash, perfil || 'operador');

    LogService.info('Usuário criado', { nome, email });
    return { success: true, id };
  },

  // Criar admin padrão se não existir
  async ensureDefaultAdmin() {
    const db = DatabaseService.getDB();
    const exists = db.prepare('SELECT id FROM usuarios WHERE perfil = \'admin\'').get();
    
    if (!exists) {
      const hash = await bcrypt.hash('admin123', 10);
      db.prepare(`
        INSERT INTO usuarios (id, nome, email, senha_hash, perfil)
        VALUES (?, 'Administrador', 'admin@despachapr.com', ?, 'admin')
      `).run(uuidv4(), hash);
      console.log('Admin padrão criado: admin@despachapr.com / admin123');
    }
  }
};

module.exports = AuthService;
