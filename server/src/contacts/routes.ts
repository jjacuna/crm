import { Router } from "express";
import { contactsService } from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  const contacts = await contactsService.list({
    leadSource: req.query.leadSource as string,
    contactType: req.query.contactType as string,
    funnelStage: req.query.funnelStage as string,
    search: req.query.search as string,
  });
  res.json(contacts);
});

router.get("/:id", async (req, res) => {
  const contact = await contactsService.getById(req.params.id);
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(contact);
});

router.post("/", async (req, res) => {
  const contact = await contactsService.create(req.body);
  res.status(201).json(contact);
});

router.patch("/:id", async (req, res) => {
  const contact = await contactsService.update(req.params.id, req.body);
  res.json(contact);
});

router.delete("/:id", async (req, res) => {
  await contactsService.softDelete(req.params.id);
  res.json({ ok: true });
});

export { router as contactRoutes };
