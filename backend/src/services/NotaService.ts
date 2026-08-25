import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve(__dirname, '../../uploads');

export class NotaService {
  async createNota(data: Prisma.NotaUncheckedCreateInput) {
    return prisma.nota.create({ data });
  }

  async getNotas(workspaceId: string, pastaId?: string) {
    const where: Prisma.NotaWhereInput = { workspaceId };
    if (pastaId !== undefined) {
      where.pastaId = pastaId === 'null' ? null : pastaId;
    }
    return prisma.nota.findMany({ where });
  }

  async getNotaById(id: string) {
    return prisma.nota.findUnique({ where: { id } });
  }

  async updateNota(id: string, data: Prisma.NotaUpdateInput) {
    return prisma.nota.update({ where: { id }, data });
  }

  async deleteNota(id: string) {
    const nota = await prisma.nota.findUnique({ where: { id } });
    if (nota?.conteudo) {
      // Find all /uploads/<filename> occurrences and remove corresponding files
      const matches = nota.conteudo.matchAll(/\/uploads\/([a-zA-Z0-9._-]+)/g);
      for (const match of matches) {
        const filename = match[1];
        if (filename) {
          const filePath = path.join(uploadDir, path.basename(filename));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error(`Erro ao remover imagem ${filename}:`, err);
            }
          }
        }
      }
    }
    return prisma.nota.delete({ where: { id } });
  }
}

export const notaService = new NotaService();
