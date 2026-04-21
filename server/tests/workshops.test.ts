import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { workshopsService } from "../src/workshops/service.js";
import { contactsService } from "../src/contacts/service.js";

describe("Workshops Service", () => {
  beforeEach(async () => {
    await prisma.workshopRegistration.deleteMany();
    await prisma.workshop.deleteMany();
    await prisma.contact.deleteMany();
  });

  it("creates a workshop", async () => {
    const workshop = await workshopsService.create({
      title: "Claude Code Vibe Coding",
      date: new Date("2026-04-26T14:00:00Z"),
      zoomLink: "https://zoom.us/j/123",
    });
    expect(workshop.id).toBeDefined();
    expect(workshop.status).toBe("upcoming");
    expect(workshop.priceCents).toBe(25000);
  });

  it("lists workshops by status", async () => {
    await workshopsService.create({
      title: "Past",
      date: new Date("2026-01-01"),
      status: "completed",
    });
    await workshopsService.create({
      title: "Future",
      date: new Date("2026-12-01"),
    });

    const upcoming = await workshopsService.list("upcoming");
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].title).toBe("Future");
  });

  it("registers a contact for a workshop", async () => {
    const workshop = await workshopsService.create({
      title: "W1",
      date: new Date(),
    });
    const contact = await contactsService.create({
      firstName: "Test",
      email: "t@t.com",
    });

    const reg = await workshopsService.register(workshop.id, contact.id, {
      source: "manual",
    });
    expect(reg.workshopId).toBe(workshop.id);
    expect(reg.contactId).toBe(contact.id);
    expect(reg.paymentStatus).toBe("pending");
  });

  it("gets workshop with registrations", async () => {
    const workshop = await workshopsService.create({
      title: "W2",
      date: new Date(),
    });
    const contact = await contactsService.create({
      firstName: "A",
      email: "a@a.com",
    });
    await workshopsService.register(workshop.id, contact.id, {
      source: "stripe",
      paymentStatus: "paid",
    });

    const detail = await workshopsService.getById(workshop.id);
    expect(detail?.registrations.length).toBe(1);
    expect(detail?.registrations[0].contact.firstName).toBe("A");
  });

  it("marks attendance", async () => {
    const workshop = await workshopsService.create({
      title: "W3",
      date: new Date(),
    });
    const contact = await contactsService.create({
      firstName: "B",
      email: "b@b.com",
    });
    const reg = await workshopsService.register(workshop.id, contact.id, {});

    await workshopsService.markAttendance(reg.id, true);
    const updated = await prisma.workshopRegistration.findUnique({
      where: { id: reg.id },
    });
    expect(updated?.attended).toBe(true);
  });

  it("prevents duplicate registrations", async () => {
    const workshop = await workshopsService.create({
      title: "W4",
      date: new Date(),
    });
    const contact = await contactsService.create({
      firstName: "C",
      email: "c@c.com",
    });
    await workshopsService.register(workshop.id, contact.id, {});

    await expect(
      workshopsService.register(workshop.id, contact.id, {}),
    ).rejects.toThrow();
  });
});
