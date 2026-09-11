import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { deleteUploadedFile } from '../utils/fileStorage';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name, username, avatarUrl } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome é obrigatório para criar uma conta.' });
      }

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
      }

      if (!username || !username.trim()) {
        return res.status(400).json({ error: 'O nome de usuário é obrigatório.' });
      }

      const formattedUsername = username.trim().toLowerCase();
      const usernameRegex = /^[a-z0-9_.]+$/;
      if (formattedUsername.length < 3 || formattedUsername.length > 30 || !usernameRegex.test(formattedUsername)) {
        return res.status(400).json({
          error: 'O nome de usuário deve ter entre 3 e 30 caracteres e conter apenas letras minúsculas, números, pontos ou underscores.'
        });
      }

      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
      }

      const existingUsername = await prisma.user.findUnique({ where: { username: formattedUsername } });
      if (existingUsername) {
        return res.status(400).json({ error: 'Este nome de usuário já está em uso. Por favor, escolha outro.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          username: formattedUsername,
          password: hashedPassword,
          name: name.trim(),
          avatarUrl: avatarUrl || null,
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password, identifier } = req.body;
      const loginId = identifier || email;

      if (!loginId || !password) {
        return res.status(400).json({ error: 'Email/usuário e senha são obrigatórios' });
      }

      const trimmedId = loginId.trim();

      // Find user by either email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: trimmedId, mode: 'insensitive' } },
            { username: { equals: trimmedId.toLowerCase() } }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          preferences: user.preferences,
        },
        token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async me(req: any, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      res.status(200).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateMe(req: any, res: Response) {
    try {
      const { nome, name, username, avatarUrl, email, senha, password, preferences } = req.body;
      const updateData: any = {};

      const newName = nome || name;
      if (newName !== undefined) updateData.name = newName ? newName.trim() : null;

      if (avatarUrl !== undefined) {
        // If avatar is being changed or removed, delete previous uploaded file from disk
        const current = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { avatarUrl: true },
        });
        if (current?.avatarUrl && current.avatarUrl !== avatarUrl) {
          deleteUploadedFile(current.avatarUrl);
        }
        updateData.avatarUrl = avatarUrl;
      }

      if (username !== undefined) {
        if (!username || !username.trim()) {
          return res.status(400).json({ error: 'O nome de usuário não pode ficar vazio.' });
        }
        const formatted = username.trim().toLowerCase();
        const usernameRegex = /^[a-z0-9_.]+$/;
        if (formatted.length < 3 || formatted.length > 30 || !usernameRegex.test(formatted)) {
          return res.status(400).json({
            error: 'O nome de usuário deve ter entre 3 e 30 caracteres e conter apenas letras minúsculas, números, pontos ou underscores.'
          });
        }

        const existing = await prisma.user.findUnique({ where: { username: formatted } });
        if (existing && existing.id !== req.userId) {
          return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
        }
        updateData.username = formatted;
      }

      if (preferences !== undefined) {
        updateData.preferences = preferences;
      }

      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== req.userId) {
          return res.status(400).json({ error: 'Email já está em uso.' });
        }
        updateData.email = email.trim();
      }

      const newPass = senha || password;
      if (newPass) {
        updateData.password = await bcrypt.hash(newPass, 10);
      }

      const updated = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatarUrl: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      res.status(200).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao atualizar usuário.' });
    }
  }
}

export const authController = new AuthController();
