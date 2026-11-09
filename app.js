(function () {
  var appModules = [
    window.WMS.dashboardModule,
    window.WMS.materialsModule,
    window.WMS.suppliersModule,
    window.WMS.locationsModule,
    window.WMS.qcModule,
    window.WMS.putawayModule,
    window.WMS.receivingModule,
    window.WMS.issuingModule,
    window.WMS.stockModule,
    window.WMS.movementModule,
    window.WMS.opnameModule,
    window.WMS.reportsModule
  ].filter(Boolean);

  function updateHeader() {
    var title = document.getElementById('pageTitle');
    var activeView = document.querySelector('.nav-btn.active');
    if (title && activeView) {
      var icon = activeView.querySelector('.nav-icon');
      title.textContent = activeView.textContent.replace(icon ? icon.textContent : '', '').trim();
    }
  }

  function bindViewSwitching() {
    function openView(selected, button) {
      document.querySelectorAll('.nav-btn').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      document.querySelectorAll('.view').forEach(function (view) {
        view.classList.toggle('active', view.id === selected + '-view');
      });
      updateHeader();
    }

    document.querySelectorAll('.nav-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var selected = button.getAttribute('data-view');
        openView(selected, button);
      });
    });
    document.querySelectorAll('[data-go-view]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        var selected = button.getAttribute('data-go-view');
        var navButton = document.querySelector('.nav-btn[data-view="' + selected + '"]');
        if (navButton) openView(selected, navButton);
      });
    });
  }

  function refreshAllModules() {
    appModules.forEach(function (module) {
      if (module && typeof module.render === 'function') {
        module.render();
      }
    });
  }

  function initialize() {
    window.WMS.ensureDb();
    bindViewSwitching();
    updateHeader();

    appModules.forEach(function (module) {
      if (module && typeof module.init === 'function') {
        module.init();
      }
    });

    refreshAllModules();
    window.WMS.notify('WMS ready', 'success');
  }

  function commitDb(db, successMessage, onSuccess) {
    if (window.WMS.currentRole !== 'admin') {
      window.WMS.notify('Akun manager dan direktur hanya memiliki akses lihat.', 'error');
      return Promise.resolve(false);
    }
    var lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) lastUpdated.textContent = 'Menyimpan ke Supabase…';
    var saveOperation;
    try {
      saveOperation = window.WMS.saveDb(db);
    } catch (error) {
      if (lastUpdated) lastUpdated.textContent = 'Gagal sinkronisasi';
      window.WMS.notify('Gagal menyimpan data lokal: ' + error.message, 'error');
      return Promise.resolve(false);
    }
    return Promise.resolve(saveOperation).then(function () {
      if (lastUpdated) lastUpdated.textContent = 'Tersinkron ke Supabase';
      if (successMessage) window.WMS.notify(successMessage, 'success');
      try {
        if (typeof onSuccess === 'function') onSuccess();
        refreshAllModules();
      } catch (error) {
        console.error('Data saved but the interface could not be refreshed', error);
        window.WMS.notify('Data tersimpan, tetapi tampilan tidak berhasil diperbarui: ' + error.message, 'error');
      }
      return true;
    }, function (error) {
      if (lastUpdated) lastUpdated.textContent = 'Gagal sinkronisasi';
      var reloadOperation = typeof window.WMS.reloadRemoteDb === 'function'
        ? window.WMS.reloadRemoteDb()
        : Promise.resolve();
      return Promise.resolve(reloadOperation).then(function () {
        if (lastUpdated) lastUpdated.textContent = 'Tersinkron ke Supabase';
        window.WMS.notify('Perubahan tidak tersimpan: ' + error.message + ' Data cloud terbaru sudah dimuat ulang.', 'error');
        return false;
      }, function (reloadError) {
        window.WMS.notify(
          'Gagal menyimpan ke Supabase: ' + error.message + '. Pemulihan data cloud juga gagal: ' + reloadError.message,
          'error'
        );
        return false;
      });
    });
  }

  window.WMS.app = {
    init: initialize,
    refreshAllModules: refreshAllModules,
    commitDb: commitDb
  };
})();
