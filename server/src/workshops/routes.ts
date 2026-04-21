import { Router } from "express";
import { workshopsService } from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  const workshops = await workshopsService.list(req.query.status as string);
  res.json(workshops);
});

router.get("/:id", async (req, res) => {
  const workshop = await workshopsService.getById(req.params.id);
  if (!workshop) {
    res.status(404).json({ error: "Workshop not found" });
    return;
  }
  res.json(workshop);
});

router.post("/", async (req, res) => {
  const workshop = await workshopsService.create(req.body);
  res.status(201).json(workshop);
});

router.patch("/:id", async (req, res) => {
  const workshop = await workshopsService.update(req.params.id, req.body);
  res.json(workshop);
});

router.post("/:id/register", async (req, res) => {
  const { contactId, ...input } = req.body;
  const reg = await workshopsService.register(req.params.id, contactId, input);
  res.status(201).json(reg);
});

router.patch("/registrations/:regId/attendance", async (req, res) => {
  const reg = await workshopsService.markAttendance(
    req.params.regId,
    req.body.attended,
  );
  res.json(reg);
});

export { router as workshopRoutes };
