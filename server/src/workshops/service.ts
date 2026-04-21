import { prisma } from "../lib/prisma.js";

interface CreateWorkshopInput {
  title: string;
  date: Date;
  zoomLink?: string;
  maxCapacity?: number;
  stripeProductId?: string;
  priceCents?: number;
  status?: string;
}

interface RegisterInput {
  source?: string;
  paymentStatus?: string;
  stripePaymentId?: string;
}

export const workshopsService = {
  async list(status?: string) {
    return prisma.workshop.findMany({
      where: status ? { status } : undefined,
      orderBy: { date: "desc" },
      include: {
        _count: { select: { registrations: true } },
      },
    });
  },

  async getById(id: string) {
    return prisma.workshop.findUnique({
      where: { id },
      include: {
        registrations: {
          include: { contact: true },
          orderBy: { registeredAt: "desc" },
        },
      },
    });
  },

  async create(data: CreateWorkshopInput) {
    return prisma.workshop.create({ data });
  },

  async update(id: string, data: Partial<CreateWorkshopInput>) {
    return prisma.workshop.update({ where: { id }, data });
  },

  async register(workshopId: string, contactId: string, input: RegisterInput) {
    return prisma.workshopRegistration.create({
      data: {
        workshopId,
        contactId,
        source: input.source ?? "manual",
        paymentStatus: input.paymentStatus ?? "pending",
        stripePaymentId: input.stripePaymentId,
      },
    });
  },

  async markAttendance(registrationId: string, attended: boolean) {
    return prisma.workshopRegistration.update({
      where: { id: registrationId },
      data: { attended },
    });
  },

  async getRegistrationCount(workshopId: string) {
    return prisma.workshopRegistration.count({ where: { workshopId } });
  },
};
