import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApiDocument } from '../src/docs/openapi.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routesDir = path.join(root, 'src', 'routes');
const mounts = {
  'user.route.js': '/api/user',
  'profile.routes.js': '/api/profile',
  'userManagement.routes.js': '/api/users',
  'role.routes.js': '/api/roles',
  'settings.routes.js': '/api/settings',
  'media.routes.js': '/api/media',
  'notification.routes.js': '/api/notifications',
  'announcement.routes.js': '/api/announcements',
  'event.routes.js': '/api/events',
  'auditLog.routes.js': '/api/audit-logs',
  'order.routes.js': '/api/orders',
  'coupon.routes.js': '/api/coupons',
  'payment.routes.js': '/api/payments',
  'security.routes.js': '/api/security',
};

const normalize = (value) => {
  let p = value.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!p) p = '/';
  p = p.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  return p;
};

const routes = new Map();
const add = (file, method, route) => {
  const mount = mounts[file];
  if (!mount) return;
  const full = normalize(`${mount}${route === '/' ? '' : route}`);
  if (!routes.has(full)) routes.set(full, new Set());
  routes.get(full).add(method.toLowerCase());
};

for (const file of Object.keys(mounts)) {
  const source = fs.readFileSync(path.join(routesDir, file), 'utf8');
  for (const match of source.matchAll(/router\.(get|post|put|patch|delete|head|options|all)\(\s*["'`]([^"'`]+)["'`]/g)) {
    if (match[1] === 'all') {
      for (const method of ['get', 'post']) add(file, method, match[2]);
    } else add(file, match[1], match[2]);
  }
  for (const match of source.matchAll(/router\.route\(\s*["'`]([^"'`]+)["'`]\s*\)([\s\S]*?)(?=\n\s*router\.route|\n\s*export default|$)/g)) {
    const route = match[1];
    for (const method of match[2].matchAll(/\.(get|post|put|patch|delete|head|options)\s*\(/g)) add(file, method[1], route);
  }
}

const documented = new Map();
for (const [route, item] of Object.entries(openApiDocument.paths ?? {})) {
  documented.set(normalize(route), new Set(Object.keys(item).filter((k) => ['get','post','put','patch','delete','head','options'].includes(k))));
}

const allowedMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
const documentErrors = [];
if (openApiDocument.openapi !== '3.1.0') documentErrors.push('OpenAPI version must be 3.1.0');
if (!openApiDocument.info?.title || !openApiDocument.info?.version) documentErrors.push('OpenAPI info.title and info.version are required');
if (!openApiDocument.paths || typeof openApiDocument.paths !== 'object') documentErrors.push('OpenAPI paths object is required');
for (const [route, item] of Object.entries(openApiDocument.paths ?? {})) {
  if (!route.startsWith('/')) documentErrors.push(`Invalid OpenAPI path: ${route}`);
  for (const [method, operation] of Object.entries(item ?? {})) {
    if (!allowedMethods.has(method)) continue;
    if (!operation?.responses || typeof operation.responses !== 'object' || !Object.keys(operation.responses).length) {
      documentErrors.push(`Missing responses: ${method.toUpperCase()} ${route}`);
    }
    const pathParams = [...route.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    const declaredParams = new Set([...(item.parameters ?? []), ...(operation.parameters ?? [])].filter((p) => p?.in === 'path').map((p) => p.name));
    for (const name of pathParams) if (!declaredParams.has(name)) documentErrors.push(`Missing path parameter '${name}': ${method.toUpperCase()} ${route}`);
  }
}
if (documentErrors.length) {
  console.error('Invalid OpenAPI contract:\n- ' + documentErrors.join('\n- '));
  process.exit(1);
}

const ignored = new Set(['/api/docs', '/api/docs/openapi.json']);
const missing = [];
for (const [route, methods] of routes) {
  if (ignored.has(route)) continue;
  const docs = documented.get(route);
  if (!docs) {
    missing.push(`${route} [${[...methods].sort().join(', ')}]`);
    continue;
  }
  for (const method of methods) if (!docs.has(method)) missing.push(`${route} [${method}]`);
}

const extra = [];
for (const [route, methods] of documented) {
  if (ignored.has(route) || route === '/health' || route === '/ready' || route === '/metrics' || route === '/api/webhooks/stripe') continue;
  const actual = routes.get(route);
  if (!actual) extra.push(`${route} [${[...methods].sort().join(', ')}]`);
  else for (const method of methods) if (!actual.has(method)) extra.push(`${route} [${method}]`);
}

if (missing.length || extra.length) {
  console.error('API contract drift detected.');
  if (missing.length) console.error(`Undocumented routes (${missing.length}):\n- ${missing.join('\n- ')}`);
  if (extra.length) console.error(`Documented-but-unregistered routes (${extra.length}):\n- ${extra.join('\n- ')}`);
  process.exit(1);
}

console.log(`API contract check passed: ${routes.size} route paths are documented.`);
