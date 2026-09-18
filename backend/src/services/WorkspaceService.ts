import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { deleteUploadedFile } from '../utils/fileStorage';

export class WorkspaceService {
  async createWorkspace(data: Prisma.WorkspaceUncheckedCreateInput) {
    return prisma.workspace.create({
      data: {
        ...data,
        isCollaborative: data.isCollaborative ?? false,
      },
    });
  }

  async getWorkspaces(userId: string) {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { userId: userId },
          { collaborators: { some: { userId: userId } } }
        ]
      },
      include: {
        collaborators: {
          where: { userId },
          select: { role: true }
        },
        _count: {
          select: { collaborators: true }
        }
      }
    });

    return workspaces.map((ws) => {
      const isOwner = ws.userId === userId;
      const currentUserRole = isOwner ? 'OWNER' : (ws.collaborators[0]?.role || 'MEMBER');
      const isCollaborative = ws.isCollaborative || (ws._count?.collaborators ?? 0) > 0;
      const { collaborators, _count, ...rest } = ws;
      return {
        ...rest,
        isCollaborative,
        isOwner,
        currentUserRole
      };
    });
  }

  async getWorkspaceById(id: string, userId?: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!workspace) return null;

    let currentUserRole: 'OWNER' | 'MEMBER' | 'VIEWER' | null = null;
    let isOwner = false;

    if (userId) {
      if (workspace.userId === userId) {
        currentUserRole = 'OWNER';
        isOwner = true;
      } else {
        const collab = workspace.collaborators.find((c) => c.userId === userId);
        if (collab) {
          currentUserRole = collab.role;
        }
      }
    }

    const isCollaborative = workspace.isCollaborative || workspace.collaborators.length > 0;

    return {
      ...workspace,
      isCollaborative,
      isOwner,
      currentUserRole
    };
  }

  async updateWorkspace(id: string, data: Prisma.WorkspaceUpdateInput, requesterId: string) {
    const current = await prisma.workspace.findUnique({
      where: { id },
      select: { userId: true, icone: true },
    });
    if (!current) throw new Error('Workspace não encontrada.');
    if (current.userId !== requesterId) throw new Error('Apenas o proprietário pode alterar as configurações do workspace.');

    if (data.icone !== undefined) {
      if (current.icone && current.icone !== data.icone) {
        deleteUploadedFile(current.icone);
      }
    }
    return prisma.workspace.update({ where: { id }, data });
  }

  async deleteWorkspace(id: string, requesterId: string) {
    const current = await prisma.workspace.findUnique({
      where: { id },
      select: { userId: true, icone: true },
    });
    if (!current) throw new Error('Workspace não encontrada.');
    if (current.userId !== requesterId) throw new Error('Apenas o proprietário pode excluir o workspace.');

    if (current.icone) {
      deleteUploadedFile(current.icone);
    }
    return prisma.workspace.delete({ where: { id } });
  }

  async inviteCollaborator(
    workspaceId: string,
    identifier: { email?: string; userId?: string },
    ownerId: string,
    role: 'MEMBER' | 'VIEWER' = 'MEMBER'
  ) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace não encontrada.');
    if (workspace.userId !== ownerId) throw new Error('Apenas o proprietário pode convidar colaboradores.');

    let user = null;
    if (identifier.userId) {
      user = await prisma.user.findUnique({ where: { id: identifier.userId } });
    } else if (identifier.email) {
      user = await prisma.user.findUnique({ where: { email: identifier.email.trim().toLowerCase() } });
    }

    if (!user) throw new Error('Usuário não encontrado.');
    if (workspace.userId === user.id) throw new Error('O usuário já é o proprietário desta workspace.');

    const existing = await prisma.workspaceCollaborator.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id
        }
      }
    });

    if (existing) throw new Error('Usuário já é um colaborador.');

    if (!workspace.isCollaborative) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { isCollaborative: true }
      });
    }

    return prisma.workspaceCollaborator.create({
      data: {
        workspaceId,
        userId: user.id,
        role: role || 'MEMBER'
      },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } }
      }
    });
  }

  async getCollaborators(workspaceId: string) {
    const collabs = await prisma.workspaceCollaborator.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    return collabs;
  }

  async removeCollaborator(workspaceId: string, collaboratorUserId: string, requesterId: string) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace não encontrada.');

    if (collaboratorUserId === workspace.userId) {
      throw new Error('O proprietário não pode ser removido como colaborador.');
    }

    const isOwner = workspace.userId === requesterId;
    const isSelf = collaboratorUserId === requesterId;

    if (!isOwner && !isSelf) {
      throw new Error('Apenas o proprietário pode remover outros colaboradores.');
    }

    const deleted = await prisma.workspaceCollaborator.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: collaboratorUserId
        }
      }
    });

    const remainingCount = await prisma.workspaceCollaborator.count({
      where: { workspaceId }
    });
    if (remainingCount === 0) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { isCollaborative: false }
      });
    }

    return deleted;
  }

  async leaveWorkspace(workspaceId: string, userId: string) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace não encontrada.');

    if (workspace.userId === userId) {
      throw new Error('O proprietário não pode sair do próprio workspace. Para encerrar o acesso, transfira a posse ou exclua o workspace.');
    }

    const collab = await prisma.workspaceCollaborator.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      }
    });

    if (!collab) {
      throw new Error('Você não faz parte deste workspace.');
    }

    const deleted = await prisma.workspaceCollaborator.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      }
    });

    const remainingCount = await prisma.workspaceCollaborator.count({
      where: { workspaceId }
    });
    if (remainingCount === 0) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { isCollaborative: false }
      });
    }

    return deleted;
  }

  async updateCollaboratorRole(
    workspaceId: string,
    targetUserId: string,
    newRole: 'MEMBER' | 'VIEWER',
    requesterId: string
  ) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error('Workspace não encontrada.');

    if (workspace.userId !== requesterId) {
      throw new Error('Apenas o proprietário pode alterar papéis de colaboradores.');
    }

    if (targetUserId === workspace.userId) {
      throw new Error('O papel do proprietário não pode ser alterado.');
    }

    if (newRole !== 'MEMBER' && newRole !== 'VIEWER') {
      throw new Error('Papel inválido. Escolha MEMBER ou VIEWER.');
    }

    return prisma.workspaceCollaborator.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId
        }
      },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, avatarUrl: true } }
      }
    });
  }

  async getOrCreateInviteLink(workspaceId: string, ownerId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, userId: true, inviteCode: true, isCollaborative: true }
    });

    if (!workspace) throw new Error('Workspace não encontrada.');
    if (workspace.userId !== ownerId) throw new Error('Apenas o proprietário pode gerenciar links de convite.');

    if (workspace.inviteCode) {
      if (!workspace.isCollaborative) {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { isCollaborative: true }
        });
      }
      return { inviteCode: workspace.inviteCode };
    }

    const inviteCode = crypto.randomBytes(6).toString('hex');
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        inviteCode,
        isCollaborative: true
      },
      select: { inviteCode: true }
    });

    return { inviteCode: updated.inviteCode! };
  }

  async resetInviteLink(workspaceId: string, ownerId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, userId: true }
    });

    if (!workspace) throw new Error('Workspace não encontrada.');
    if (workspace.userId !== ownerId) throw new Error('Apenas o proprietário pode redefinir o link de convite.');

    const newCode = crypto.randomBytes(6).toString('hex');
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        inviteCode: newCode,
        isCollaborative: true
      },
      select: { inviteCode: true }
    });

    return { inviteCode: updated.inviteCode! };
  }

  async getJoinPreview(inviteCode: string, currentUserId?: string) {
    if (!inviteCode) throw new Error('Código de convite inválido.');

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        nome: true,
        icone: true,
        userId: true,
        isCollaborative: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            collaborators: true
          }
        }
      }
    });

    if (!workspace) {
      throw new Error('Convite inválido ou expirado.');
    }

    let isMember = false;
    let isOwner = false;

    if (currentUserId) {
      if (workspace.userId === currentUserId) {
        isOwner = true;
        isMember = true;
      } else {
        const collab = await prisma.workspaceCollaborator.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId: currentUserId
            }
          }
        });
        if (collab) {
          isMember = true;
        }
      }
    }

    return {
      id: workspace.id,
      nome: workspace.nome,
      icone: workspace.icone,
      owner: workspace.user,
      collaboratorCount: workspace._count.collaborators,
      isMember,
      isOwner
    };
  }

  async joinByInviteCode(inviteCode: string, userId: string) {
    if (!inviteCode) throw new Error('Código de convite inválido.');
    if (!userId) throw new Error('Usuário não autenticado.');

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
      select: { id: true, nome: true, userId: true, isCollaborative: true }
    });

    if (!workspace) throw new Error('Convite inválido ou expirado.');

    if (workspace.userId === userId) {
      return { id: workspace.id, nome: workspace.nome, status: 'already_owner' };
    }

    const existing = await prisma.workspaceCollaborator.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId
        }
      }
    });

    if (existing) {
      return { id: workspace.id, nome: workspace.nome, status: 'already_member' };
    }

    await prisma.workspaceCollaborator.create({
      data: {
        workspaceId: workspace.id,
        userId
      }
    });

    if (!workspace.isCollaborative) {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { isCollaborative: true }
      });
    }

    return { id: workspace.id, nome: workspace.nome, status: 'joined' };
  }
}

export const workspaceService = new WorkspaceService();
