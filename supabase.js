(function () {
  var client = null;
  var revision = 0;
  var saveQueue = Promise.resolve();
  var pendingWrites = 0;

  function setAuthStatus(message, isError) {
    var status = document.getElementById('authStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', Boolean(isError));
  }

  function showLogin(email) {
    var gate = document.getElementById('authGate');
    var appShell = document.querySelector('.app-shell');
    var loginForm = document.getElementById('loginForm');
    var loginButton = document.getElementById('loginButton');
    var emailInput = document.getElementById('loginEmail');
    if (gate) gate.hidden = false;
    if (appShell) appShell.hidden = true;
    if (emailInput && email) emailInput.value = email;
    if (loginForm) loginForm.hidden = false;
    if (loginButton) loginButton.disabled = false;
  }

  function showApp(user) {
    var gate = document.getElementById('authGate');
    var appShell = document.querySelector('.app-shell');
    var userEmail = document.getElementById('authUserEmail');
    var roleLabel = document.getElementById('authRoleLabel');
    var isReadOnly = window.WMS.currentRole === 'manager' || window.WMS.currentRole === 'director';
    if (gate) gate.hidden = true;
    if (appShell) appShell.hidden = false;
    document.body.classList.toggle('wms-readonly', isReadOnly);
    [
      'materialForm',
      'supplierForm',
      'locationForm',
      'qcForm',
      'putawayForm',
      'receivingForm',
      'issuingForm',
      'opnameForm'
    ].forEach(function (formId) {
      var form = document.getElementById(formId);
      if (form) form.hidden = isReadOnly;
    });
    if (userEmail) userEmail.textContent = user.email || 'Pengguna';
    if (roleLabel) {
      roleLabel.textContent = isReadOnly
        ? (window.WMS.currentRole === 'manager' ? 'Manager · hanya lihat' : 'Direktur · hanya lihat')
        : 'Admin · akses penuh';
    }
  }

  function normalizeRemoteDb(db) {
    var normalized = window.WMS.normalizeDb
      ? window.WMS.normalizeDb(db)
      : db;
    return normalized;
  }

  function loadRemoteDb() {
    return client.rpc('wms_load_db').then(function (response) {
      if (response.error) throw response.error;
      if (!response.data || typeof response.data.revision !== 'number') {
        throw new Error('Respons database Supabase tidak valid.');
      }
      revision = response.data.revision;
      return response.data.db;
    });
  }

  function persistRemoteDb(db) {
    if (window.WMS.currentRole !== 'admin') {
      return Promise.reject(new Error('Akun manager dan direktur hanya memiliki akses lihat.'));
    }
    pendingWrites += 1;
    var operation = saveQueue.then(function () {
      return client.rpc('wms_save_db', {
        p_db: db,
        p_expected_revision: revision
      }).then(function (response) {
        if (response.error) throw response.error;
        if (!response.data || typeof response.data.revision !== 'number') {
          throw new Error('Supabase tidak mengembalikan nomor revisi yang valid.');
        }
        revision = response.data.revision;
        var lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) lastUpdated.textContent = 'Tersinkron ke Supabase';
        return db;
      });
    });
    var settled = operation.then(function (value) {
      pendingWrites -= 1;
      return value;
    }, function (error) {
      pendingWrites -= 1;
      throw error;
    });
    saveQueue = settled.catch(function () {});
    return settled;
  }

  function bindLogin() {
    var form = document.getElementById('loginForm');
    var button = document.getElementById('loginButton');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      var password = document.getElementById('loginPassword').value;
      button.disabled = true;
      setAuthStatus('Sedang masuk…');
      client.auth.signInWithPassword({ email: email, password: password }).then(function (response) {
        if (response.error) throw response.error;
        return openWarehouse(response.data.user);
      }).catch(function (error) {
        setAuthStatus('Login gagal: ' + error.message, true);
        button.disabled = false;
      });
    });

    var signOutButton = document.getElementById('signOutBtn');
    if (signOutButton) {
      signOutButton.addEventListener('click', function () {
        signOutButton.disabled = true;
        client.auth.signOut().then(function (response) {
          if (response.error) throw response.error;
          window.location.reload();
        }).catch(function (error) {
          signOutButton.disabled = false;
          window.WMS.notify('Gagal keluar: ' + error.message, 'error');
        });
      });
    }

    var refreshButton = document.getElementById('refreshCloudBtn');
    if (refreshButton) {
      refreshButton.addEventListener('click', function () {
        if (pendingWrites > 0) {
          window.WMS.notify('Tunggu sampai penyimpanan selesai sebelum memuat ulang.', 'error');
          return;
        }
        refreshButton.disabled = true;
        loadRemoteDb().then(function (db) {
          if (!db) throw new Error('Database cloud belum memiliki data.');
          window.WMS.saveDb(normalizeRemoteDb(db), { skipRemote: true });
          window.WMS.app.refreshAllModules();
          var lastUpdated = document.getElementById('lastUpdated');
          if (lastUpdated) lastUpdated.textContent = 'Tersinkron ke Supabase';
          window.WMS.notify('Data cloud berhasil dimuat ulang.', 'success');
        }).catch(function (error) {
          window.WMS.notify('Gagal memuat data cloud: ' + error.message, 'error');
        }).then(function () {
          refreshButton.disabled = false;
        });
      });
    }
  }

  function openWarehouse(user) {
    setAuthStatus('Memuat data gudang…');
    window.WMS.remoteSaveDb = persistRemoteDb;
    window.WMS.reloadRemoteDb = function () {
      return loadRemoteDb().then(function (remoteDb) {
        if (!remoteDb) {
          throw new Error('Database cloud belum memiliki data.');
        }
        var normalized = normalizeRemoteDb(remoteDb);
        window.WMS.saveDb(normalized, { skipRemote: true });
        window.WMS.app.refreshAllModules();
        return normalized;
      });
    };
    return client.rpc('wms_current_role').then(function (roleResponse) {
      if (roleResponse.error) throw roleResponse.error;
      if (['admin', 'manager', 'director'].indexOf(roleResponse.data) === -1) {
        throw new Error('Peran akun belum diatur. Minta admin menetapkan peran admin, manager, atau director di Supabase.');
      }
      window.WMS.currentRole = roleResponse.data;
      return loadRemoteDb();
    }).then(function (remoteDb) {
      if (remoteDb) {
        window.WMS.saveDb(normalizeRemoteDb(remoteDb), { skipRemote: true });
      } else {
        var localDb = window.WMS.buildEmptyDb();
        window.WMS.saveDb(localDb, { skipRemote: true });
        return persistRemoteDb(localDb).then(function () {
          return localDb;
        });
      }
    }).then(function () {
      showApp(user);
      window.WMS.app.init();
      var lastUpdated = document.getElementById('lastUpdated');
      if (lastUpdated) lastUpdated.textContent = 'Tersinkron ke Supabase';
      setAuthStatus(window.WMS.currentRole === 'admin'
        ? 'Terhubung ke Supabase sebagai admin.'
        : 'Terhubung ke Supabase sebagai ' + window.WMS.currentRole + ' (hanya lihat).');
    }).catch(function (error) {
      showLogin(user.email);
      setAuthStatus('Gagal memuat/menyimpan database: ' + error.message, true);
    });
  }

  function start(onReady) {
    var config = window.WMS_SUPABASE_CONFIG || {};
    if (!config.url || !config.anonKey) {
      showLogin();
      setAuthStatus('Isi Project URL dan anon/publishable key di supabase-config.js, lalu muat ulang.', true);
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      showLogin();
      setAuthStatus('Library Supabase gagal dimuat. Periksa koneksi internet lalu muat ulang.', true);
      return;
    }

    try {
      client = window.supabase.createClient(config.url, config.anonKey);
    } catch (error) {
      showLogin();
      setAuthStatus('Konfigurasi Supabase tidak valid: ' + error.message, true);
      return;
    }
    bindLogin();
    window.WMS.app.init = onReady;
    setAuthStatus('Memeriksa sesi…');
    client.auth.getSession().then(function (response) {
      if (response.error) throw response.error;
      var session = response.data.session;
      if (session) return openWarehouse(session.user);
      showLogin();
      setAuthStatus('Masuk menggunakan akun yang dibuat admin Supabase.');
    }).catch(function (error) {
      showLogin();
      setAuthStatus('Gagal memeriksa sesi: ' + error.message, true);
    });
  }

  window.WMS = window.WMS || {};
  window.WMS.supabase = { start: start };
})();
