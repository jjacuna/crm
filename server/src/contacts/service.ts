import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

interface ListFilters {
  leadSource?: string;
  contactType?: string;
  funnelStage?: string;
  status?: string;
  search?: string;
}

interface CreateContactInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  leadSource?: string;
  contactType?: string;
  tags?: string[];
}

export const contactsService = {
  async list(filters: ListFilters) {
    const where: Prisma.ContactWhereInput = {
      status: filters.status ?? "active",
    };

    if (filters.leadSource) where.leadSource = filters.leadSource;
    if (filters.contactType) where.contactType = filters.contactType;
    if (filters.funnelStage) where.funnelStage = filters.funnelStage;

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      include: {
        registrations: {
          include: { workshop: true },
          orderBy: { registeredAt: "desc" },
        },
        sessions: { orderBy: { scheduledAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        subscriptions: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 50 },
        knowledgeFile: true,
      },
    });
  },

  async create(data: CreateContactInput) {
    return prisma.contact.create({ data });
  },

  async update(
    id: string,
    data: Partial<CreateContactInput> & {
      contactType?: string;
      funnelStage?: string;
    },
  ) {
    return prisma.contact.update({ where: { id }, data });
  },

  async softDelete(id: string) {
    return prisma.contact.update({
      where: { id },
      data: { status: "deleted" },
    });
  },

  async findByEmail(email: string) {
    return prisma.contact.findUnique({ where: { email } });
  },
};
