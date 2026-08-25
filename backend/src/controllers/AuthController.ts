import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome é obrigatório para criar uma conta.' });
      }

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        },
        select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
      });

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name
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
        select: { id: true, email: true, name: true }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.status(200).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateMe(req: any, res: Response) {
    try {
      const { nome, name, email, senha, password } = req.body;
      const updateData: any = {};

      const newName = nome || name;
      if (newName) updateData.name = newName;

      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== req.userId) {
          return res.status(400).json({ error: 'Email já está em uso.' });
        }
        updateData.email = email;
      }

      const newPass = senha || password;
      if (newPass) {
        updateData.password = await bcrypt.hash(newPass, 10);
      }

      const updated = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
        select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
      });

      res.status(200).json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao atualizar usuário.' });
    }
  }
}

export const authController = new AuthController();
