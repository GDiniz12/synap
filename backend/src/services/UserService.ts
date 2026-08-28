import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

export class UserService {
  async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async getUsers() {
    return prisma.user.findMany({
      select: { id: true, email: true, name: true, preferences: true, createdAt: true, updatedAt: true }
    });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, preferences: true, createdAt: true, updatedAt: true }
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, preferences: true, createdAt: true, updatedAt: true }
    });
  }

  async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export const userService = new UserService();
