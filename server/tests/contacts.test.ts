import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { contactsService } from "../src/contacts/service.js";

describe("Contacts Service", () => {
  beforeEach(async () => {
    await prisma.workshopRegistration.deleteMany();
    await prisma.workshop.deleteMany();
    await prisma.contact.deleteMany();
  });

  it("creates a contact", async () => {
    const contact = await contactsService.create({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      leadSource: "workshop",
    });
    expect(contact.id).toBeDefined();
    expect(contact.firstName).toBe("Test");
    expect(contact.contactType).toBe("lead");
    expect(contact.funnelStage).toBe("lead");
  });

  it("lists contacts with filtering", async () => {
    await contactsService.create({
      firstName: "A",
      email: "a@test.com",
      leadSource: "tiktok",
    });
    await contactsService.create({
      firstName: "B",
      email: "b@test.com",
      leadSource: "workshop",
    });

    const all = await contactsService.list({});
    expect(all.length).toBe(2);

    const filtered = await contactsService.list({ leadSource: "tiktok" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].firstName).toBe("A");
  });

  it("gets contact by id with relations", async () => {
    const created = await contactsService.create({
      firstName: "C",
      email: "c@test.com",
    });
    const found = await contactsService.getById(created.id);
    expect(found?.email).toBe("c@test.com");
  });

  it("updates a contact", async () => {
    const created = await contactsService.create({
      firstName: "D",
      email: "d@test.com",
    });
    const updated = await contactsService.update(created.id, {
      contactType: "student",
    });
    expect(updated.contactType).toBe("student");
  });

  it("soft deletes a contact", async () => {
    const created = await contactsService.create({
      firstName: "E",
      email: "e@test.com",
    });
    await contactsService.softDelete(created.id);
    const found = await contactsService.getById(created.id);
    expect(found?.status).toBe("deleted");
    // Should not appear in list
    const list = await contactsService.list({});
    expect(list.length).toBe(0);
  });

  it("searches contacts by name or email", async () => {
    await contactsService.create({
      firstName: "Jonathan",
      lastName: "Acuna",
      email: "j@test.com",
    });
    await contactsService.create({
      firstName: "Other",
      email: "other@test.com",
    });

    const results = await contactsService.list({ search: "jonathan" });
    expect(results.length).toBe(1);
  });
});
