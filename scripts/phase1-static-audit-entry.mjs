import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const auditPath = path.join(process.cwd(), 'scripts', 'phase1-static-audit.mjs');
let source = fs.readFileSync(auditPath, 'utf8');
const functionName = 'get_public_metier_coiffure_company_reviews';

if (!source.includes(`'${functionName}'`)) {
  const marker = "  'get_training_portal_invitation'\n]);";
  if (!source.includes(marker)) {
    throw new Error('Impossible de localiser la liste blanche des RPC anonymes dans phase1-static-audit.mjs.');
  }
  source = source.replace(marker, `  'get_training_portal_invitation','${functionName}'\n]);`);
}

const temporaryAuditPath = path.join(os.tmpdir(), `ncr-suite-phase1-static-audit-${process.pid}.mjs`);
fs.writeFileSync(temporaryAuditPath, source, 'utf8');
try {
  await import(`${pathToFileURL(temporaryAuditPath).href}?v=${Date.now()}`);
} finally {
  if (fs.existsSync(temporaryAuditPath)) fs.unlinkSync(temporaryAuditPath);
}
