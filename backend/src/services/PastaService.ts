import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

export class PastaService {
  async createPasta(data: Prisma.PastaUncheckedCreateInput) {
    return prisma.pasta.create({ data });
  }

  async getPastas(workspaceId: string) {
    return prisma.pasta.findMany({ where: { workspaceId } });
  }

  async getPastaById(id: string) {
    return prisma.pasta.findUnique({ where: { id } });
  }

  async updatePasta(id: string, data: Prisma.PastaUpdateInput) {
    return prisma.pasta.update({ where: { id }, data });
  }

  async deletePasta(id: string) {
    // Recursive helper to collect all descendant pasta IDs
    const getAllDescendantPastaIds = async (pastaId: string): Promise<string[]> => {
      const subpastas = await prisma.pasta.findMany({
        where: { parentId: pastaId },
        select: { id: true },
      });
      let ids: string[] = [];
      for (const sub of subpastas) {
        ids.push(sub.id);
        const childIds = await getAllDescendantPastaIds(sub.id);
        ids = ids.concat(childIds);
      }
      return ids;
    };

    const descendantIds = await getAllDescendantPastaIds(id);
    const allPastaIds = [id, ...descendantIds];

    // Delete all notes inside this pasta and all subpastas
    await prisma.nota.deleteMany({
      where: {
        pastaId: { in: allPastaIds },
      },
    });

    // Delete all descendant subpastas first, then the root pasta
    return prisma.pasta.deleteMany({
      where: {
        id: { in: allPastaIds },
      },
    });
  }
}

export const pastaService = new PastaService();
