import { Router } from "express";
import { openApiDocument } from "../docs/openapi.js";

const router = Router();

router.get("/api/docs/openapi.json", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.type("application/json").send(openApiDocument);
});

router.get("/api/docs", (_req, res) => {
  res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MERN API Documentation</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:4rem auto;padding:0 1.5rem;line-height:1.6}code{background:#f2f2f2;padding:.15rem .35rem;border-radius:4px}a{color:#2563eb}</style></head><body><h1>MERN Reusable Backend API</h1><p>OpenAPI 3.1 contract for the reusable backend.</p><p><a href="/api/docs/openapi.json">OpenAPI JSON</a></p><p>Import the JSON into Swagger UI, Postman, Insomnia, or another OpenAPI-compatible client.</p></body></html>`);
});

export default router;
