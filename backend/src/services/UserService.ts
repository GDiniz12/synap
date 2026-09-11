import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { deleteUploadedFile } from '../utils/fileStorage';

export class UserService {
  async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async getUsers() {
    return prisma.user.findMany({
      select: { id: true, email: true, username: true, name: true, avatarUrl: true, preferences: true, createdAt: true, updatedAt: true }
    });
  }

  async searchUsers(query: string, currentUserId?: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const cleanQuery = query.trim().replace(/^@/, '');

    return prisma.user.findMany({
      where: {
        AND: [
          currentUserId ? { id: { not: currentUserId } } : {},
          {
            OR: [
              { username: { contains: cleanQuery, mode: 'insensitive' } },
              { name: { contains: cleanQuery, mode: 'insensitive' } },
              { email: { contains: cleanQuery, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true
      },
      take: 10
    });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true, name: true, avatarUrl: true, preferences: true, createdAt: true, updatedAt: true }
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    if (data.avatarUrl !== undefined) {
      const current = await prisma.user.findUnique({
        where: { id },
        select: { avatarUrl: true }
      });
      if (current?.avatarUrl && current.avatarUrl !== data.avatarUrl) {
        deleteUploadedFile(current.avatarUrl);
      }
    }
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, username: true, name: true, avatarUrl: true, preferences: true, createdAt: true, updatedAt: true }
    });
  }

  async deleteUser(id: string) {
    const current = await prisma.user.findUnique({
      where: { id },
      select: { avatarUrl: true }
    });
    if (current?.avatarUrl) {
      deleteUploadedFile(current.avatarUrl);
    }
    return prisma.user.delete({ where: { id } });
  }
}

export const userService = new UserService();
