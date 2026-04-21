import { beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

beforeAll(async () => {
  // Clean test database
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE contacts, workshops, activity_log CASCADE",
  );
});

export { prisma };
