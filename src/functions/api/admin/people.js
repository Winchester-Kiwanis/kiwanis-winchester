import { getAccess, json, readAccessLog, requireAdmin, writeAccessStore } from '../../_lib/editor-utils.js';

function statusFor(error) {
  if (error.message === 'Missing editor session.' || /token/i.test(error.message)) return 401;
  if (error.message === 'Admin access is required.' || error.message === 'Editor is not authorized.') return 403;
  if (/not set up yet/.test(error.message)) return 503;
  if (/valid email|at most|must be a list/.test(error.message)) return 400;
  return 500;
}

async function snapshot(env, me) {
  const { store, owners } = await getAccess(env);
  return {
    ok: true,
    me,
    configured: store.configured,
    owners,
    admins: store.admins.filter((email) => !owners.includes(email)),
    editors: store.editors.filter((email) => !owners.includes(email)),
    updatedAt: store.updatedAt,
    updatedBy: store.updatedBy,
    log: (await readAccessLog(env)).slice(0, 10),
  };
}

export async function onRequestGet({ request, env }) {
  try {
    const admin = await requireAdmin(request, env);
    return json(await snapshot(env, admin.email));
  } catch (error) {
    return json({ error: error.message || 'Unable to load people.' }, statusFor(error));
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const admin = await requireAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    await writeAccessStore(env, { admins: body.admins, editors: body.editors }, admin.email);
    return json(await snapshot(env, admin.email));
  } catch (error) {
    return json({ error: error.message || 'Unable to save people.' }, statusFor(error));
  }
}
