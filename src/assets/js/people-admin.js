(function () {
  // Shares the Admin Portal login: same browser storage key as admin-portal.js.
  const SESSION_KEY = 'kiwanis_admin_session';
  const params = new URLSearchParams(window.location.search);
  const IS_LOCAL_HOST = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  const IS_DEMO = IS_LOCAL_HOST && (params.has('demo') || params.has('adminTest'));
  const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

  const $ = (selector) => document.querySelector(selector);
  const state = {
    token: IS_DEMO ? 'demo' : (localStorage.getItem(SESSION_KEY) || ''),
    me: '',
    configured: false,
    owners: [],
    saved: { admins: [], editors: [] },
    draft: { admins: [], editors: [] },
    log: [],
  };

  function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setStatus(message, isError) {
    const el = $('#status');
    el.textContent = message || '';
    el.style.color = isError ? '#b42318' : '';
  }

  function isDirty() {
    return JSON.stringify(state.draft) !== JSON.stringify(state.saved);
  }

  async function api(method, body) {
    const response = await fetch('/api/admin/people', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      const error = new Error(payload.error || 'Please log in again.');
      error.signedOut = true;
      throw error;
    }
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload;
  }

  function demoData() {
    return {
      me: 'demo-admin@example.com',
      configured: true,
      owners: ['president@example.com', 'club@example.com'],
      admins: ['secretary@example.com'],
      editors: ['volunteer@example.com'],
      log: [{ at: new Date().toISOString(), by: 'president@example.com', addedEditors: ['volunteer@example.com'], removedEditors: [], addedAdmins: [], removedAdmins: [] }],
    };
  }

  function applySnapshot(data) {
    state.me = data.me || '';
    state.configured = Boolean(data.configured);
    state.owners = data.owners || [];
    state.saved = { admins: [...(data.admins || [])], editors: [...(data.editors || [])] };
    state.draft = { admins: [...state.saved.admins], editors: [...state.saved.editors] };
    state.log = data.log || [];
    render();
  }

  function row(email, role, { owner = false } = {}) {
    const you = email === state.me ? ' <span class="tag">You</span>' : '';
    if (owner) {
      return `<li class="people-row"><span class="who">${escapeHtml(email)}${you}</span><span class="row-actions"><span class="tag owner">Owner</span></span></li>`;
    }
    const other = role === 'admin' ? 'editor' : 'admin';
    const otherLabel = role === 'admin' ? 'Make Editor' : 'Make Admin';
    return `<li class="people-row"><span class="who">${escapeHtml(email)}${you}</span>
      <span class="row-actions">
        <button type="button" class="ghost" data-move="${other}" data-email="${escapeHtml(email)}">${otherLabel}</button>
        <button type="button" class="ghost" data-remove="${role}" data-email="${escapeHtml(email)}">Remove</button>
      </span></li>`;
  }

  function list(items, role) {
    if (!items.length) return '<li class="people-empty">Nobody yet.</li>';
    return items.map((email) => row(email, role)).join('');
  }

  function describe(entry) {
    const parts = [];
    if (entry.addedAdmins?.length) parts.push(`added admin ${entry.addedAdmins.join(', ')}`);
    if (entry.addedEditors?.length) parts.push(`added editor ${entry.addedEditors.join(', ')}`);
    if (entry.removedAdmins?.length) parts.push(`removed admin ${entry.removedAdmins.join(', ')}`);
    if (entry.removedEditors?.length) parts.push(`removed editor ${entry.removedEditors.join(', ')}`);
    const when = entry.at ? new Date(entry.at).toLocaleString() : '';
    return `${escapeHtml(when)} · ${escapeHtml(entry.by || 'unknown')}: ${escapeHtml(parts.join('; ') || 'saved with no changes')}`;
  }

  function render() {
    $('#signed-out').classList.add('hidden');
    $('#people-app').classList.remove('hidden');
    $('#setup-warning').classList.toggle('hidden', state.configured);
    $('#owners-list').innerHTML = state.owners.length
      ? state.owners.map((email) => row(email, 'admin', { owner: true })).join('')
      : '<li class="people-empty">No owners are set in Cloudflare.</li>';
    $('#admins-list').innerHTML = list(state.draft.admins, 'admin');
    $('#editors-list').innerHTML = list(state.draft.editors, 'editor');
    $('#log-list').innerHTML = state.log.length
      ? state.log.map((entry) => `<li>${describe(entry)}</li>`).join('')
      : '<li class="people-empty">No changes yet.</li>';
    const dirty = isDirty();
    $('#save-btn').disabled = !dirty || !state.configured;
    $('#discard-btn').disabled = !dirty;
    if (dirty) setStatus('You have unsaved changes.');
  }

  function showSignedOut(message) {
    $('#people-app').classList.add('hidden');
    $('#signed-out').classList.remove('hidden');
    if (message) $('#signed-out .hint').textContent = message;
  }

  function addPerson(email, role) {
    const clean = String(email || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(clean)) {
      setStatus('That doesn’t look like an email address.', true);
      return false;
    }
    if (state.owners.includes(clean)) {
      setStatus(`${clean} is already an owner.`, true);
      return false;
    }
    state.draft.admins = state.draft.admins.filter((e) => e !== clean);
    state.draft.editors = state.draft.editors.filter((e) => e !== clean);
    state.draft[role === 'admin' ? 'admins' : 'editors'].push(clean);
    render();
    setStatus(`${clean} added as ${role}. Click Save Changes to finish.`);
    return true;
  }

  async function save() {
    $('#save-btn').disabled = true;
    setStatus('Saving...');
    try {
      if (IS_DEMO) {
        const before = state.saved;
        const diff = (a, b) => a.filter((e) => !b.includes(e));
        state.log.unshift({
          at: new Date().toISOString(), by: state.me,
          addedAdmins: diff(state.draft.admins, before.admins), removedAdmins: diff(before.admins, state.draft.admins),
          addedEditors: diff(state.draft.editors, before.editors), removedEditors: diff(before.editors, state.draft.editors),
        });
        state.saved = { admins: [...state.draft.admins], editors: [...state.draft.editors] };
        render();
        setStatus('Demo mode: saved on screen only. Nothing was changed on the real site.');
        return;
      }
      applySnapshot(await api('POST', state.draft));
      setStatus('Saved. Changes take effect immediately.');
    } catch (error) {
      if (error.signedOut) return showSignedOut(error.message);
      setStatus(error.message, true);
      $('#save-btn').disabled = false;
    }
  }

  async function load() {
    if (IS_DEMO) {
      $('#back-link').href = '/admin/?demo=1';
      applySnapshot(demoData());
      setStatus('Demo mode: sample people, nothing here is real.');
      return;
    }
    if (!state.token) return showSignedOut();
    try {
      applySnapshot(await api('GET'));
      setStatus('');
    } catch (error) {
      if (error.signedOut) return showSignedOut(error.message);
      $('#people-app').classList.remove('hidden');
      setStatus(error.message, true);
    }
  }

  $('#add-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (addPerson($('#new-email').value, $('#new-role').value)) $('#new-email').value = '';
  });

  $('#people-app').addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-remove]');
    const moveBtn = event.target.closest('[data-move]');
    if (removeBtn) {
      const email = removeBtn.dataset.email;
      if (email === state.me && !window.confirm('Remove yourself? You will lose access when you save.')) return;
      const key = removeBtn.dataset.remove === 'admin' ? 'admins' : 'editors';
      state.draft[key] = state.draft[key].filter((e) => e !== email);
      render();
      setStatus(`${email} will be removed when you save.`);
    } else if (moveBtn) {
      addPerson(moveBtn.dataset.email, moveBtn.dataset.move);
    }
  });

  $('#save-btn').addEventListener('click', save);
  $('#discard-btn').addEventListener('click', () => {
    state.draft = { admins: [...state.saved.admins], editors: [...state.saved.editors] };
    render();
    setStatus('Changes discarded.');
  });
  window.addEventListener('beforeunload', (event) => {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  load();
})();
