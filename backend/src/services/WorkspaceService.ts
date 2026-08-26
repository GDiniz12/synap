import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

export class WorkspaceService {
  async createWorkspace(data: Prisma.WorkspaceUncheckedCreateInput) {
    return prisma.workspace.create({ data });
  }

  async getWorkspaces(userId: string) {
    return prisma.workspace.findMany({
      where: {
        OR: [
          { userId: userId },
          { collaborators: { some: { userId: userId } } }
        ]
      }
    });
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

  async inviteCollaborator(workspaceId: string, email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Usuário não encontrado com este email.');

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace não encontrada.');
    if (!workspace.isCollaborative) throw new Error('Esta workspace não está marcada como colaborativa.');
    if (workspace.userId === user.id) throw new Error('Você já é o dono desta workspace.');

    const existing = await prisma.workspaceCollaborator.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id
        }
      }
    });

    if (existing) throw new Error('Usuário já é um colaborador.');

    return prisma.workspaceCollaborator.create({
      data: {
        workspaceId,
        userId: user.id
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async getCollaborators(workspaceId: string) {
    const collabs = await prisma.workspaceCollaborator.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
    return collabs;
  }
}

export const workspaceService = new WorkspaceService();
