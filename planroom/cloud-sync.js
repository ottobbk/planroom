(() => {
  let syncing = false, timer;
  const api = (path, options = {}) => fetch(`/api/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  $('#loginBtn').onclick = async () => {
    const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ…';
    try {
      let login;
      try { login = await api('login', { method: 'POST', body: JSON.stringify({ password: $('#pass').value }) }); }
      catch { throw Error('network'); }
      if (!login.ok) throw Error('login');
      let saved = null;
      try { const response = await api('data'); saved = response.ok ? await response.json() : null; }
      catch { /* signed in but couldn't fetch saved data yet; proceed with local data and retry sync in background */ }
      if (saved) { syncing = true; data = saved; localStorage.setItem(KEY, JSON.stringify(data)); syncing = false; }
      sessionStorage.setItem(LOGIN, 'yes'); if (!saved) save();
      $('#login').style.display = 'none'; $('#app').style.display = 'block'; render();
    } catch (err) {
      $('#error').textContent = err.message === 'network'
        ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
        : 'รหัสผ่านไม่ถูกต้อง';
    }
    finally { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
  };
  const showSyncWarning = () => {
    let el = document.querySelector('.sync-warning');
    if (!el) {
      el = document.createElement('div');
      el.className = 'sync-warning';
      el.style.cssText = 'margin-top:8px;padding:10px 12px;border-radius:11px;background:#fde1df;color:#b54038;font-size:.82rem';
      document.querySelector('.sync-card').insertAdjacentElement('afterend', el);
    }
    el.textContent = '⚠ ซิงก์ข้อมูลล่าสุดไม่สำเร็จ การเปลี่ยนแปลงอาจยังไม่ถูกบันทึกขึ้นเซิร์ฟเวอร์';
  };
  const clearSyncWarning = () => document.querySelector('.sync-warning')?.remove();
  const oldSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    oldSetItem.call(this, key, value);
    if (key === KEY && !syncing && sessionStorage.getItem(LOGIN) === 'yes') {
      clearTimeout(timer);
      timer = setTimeout(() => api('data', { method: 'PUT', body: value }).then(res => res.ok ? clearSyncWarning() : showSyncWarning()).catch(showSyncWarning), 500);
    }
  };
  $('#logout').onclick = async () => { await api('logout', { method: 'POST' }); sessionStorage.removeItem(LOGIN); location.reload(); };
  document.querySelector('.workspace-head').insertAdjacentHTML('afterend', '<div class="sync-card">☁ ซิงก์ข้อมูลอัตโนมัติระหว่างทุกอุปกรณ์</div>');
})();
