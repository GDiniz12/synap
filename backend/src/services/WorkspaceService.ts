import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

export class WorkspaceService {
  async createWorkspace(data: Prisma.WorkspaceUncheckedCreateInput) {
    return prisma.workspace.create({ data });
  }

  async getWorkspaces(userId: string) {
    return prisma.workspace.findMany({ where: { userId } });
  }

  async getWorkspaceById(id: string) {
    return prisma.workspace.findUnique({ where: { id } });
  }

  async updateWorkspace(id: string, data: Prisma.WorkspaceUpdateInput) {
    return prisma.workspace.update({ where: { id }, data });
  }

  async deleteWorkspace(id: string) {
    return prisma.workspace.delete({ where: { id } });
  }
}

export const workspaceService = new WorkspaceService();
