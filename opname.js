(function () {
  function nextOpnameNo(db) {
    var number = 'SO-' + String(Date.now()).slice(-8);
    while ((db.opnames || []).some(function (record) {
      return record.transactionNo === number;
    })) {
      number = 'SO-' + String(Number(number.slice(3)) + 1).padStart(8, '0');
    }
    return number;
  }

  function updateVariance() {
    var systemQty = Number(document.getElementById('opnameSystemQty').value || 0);
    var physicalQty = Number(document.getElementById('opnameQty').value || 0);
    document.getElementById('opnameVariance').value = physicalQty - systemQty;
  }

  function renderOptions() {
    var db = window.WMS.getDb();
    var select = document.getElementById('opnameMaterial');
    if (!db || !select) return;
    var selected = select.value;
    select.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Pilih bahan baku';
    select.appendChild(placeholder);
    (db.materials || []).forEach(function (material) {
      var option = document.createElement('option');
      option.value = material.id;
      option.textContent = material.code + ' — ' + material.name;
      select.appendChild(option);
    });
    if ((db.materials || []).some(function (material) { return material.id === selected; })) select.value = selected;
    if (!document.getElementById('opnameDate').value) {
      document.getElementById('opnameDate').value = window.WMS.todayLocalDate();
    }
    updateSystemStock();
  }

  function updateSystemStock() {
    var db = window.WMS.getDb();
    var materialId = document.getElementById('opnameMaterial').value;
    var systemQty = materialId ? window.WMS.getMaterialStock(db, materialId) : 0;
    document.getElementById('opnameSystemQty').value = systemQty;
    updateVariance();
  }

  function renderTable() {
    var db = window.WMS.getDb();
    var body = document.getElementById('opnameTableBody');
    if (!db || !body) return;
    body.innerHTML = '';
    (db.opnames || []).slice().sort(function (a, b) {
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    }).forEach(function (record) {
      var material = window.WMS.getMaterialById(db.materials, record.materialId);
      var row = document.createElement('tr');
      [
        window.WMS.formatDate(record.date || record.createdAt),
        record.transactionNo || '—',
        material ? material.name : 'Bahan dihapus',
        window.WMS.formatQty(record.systemQty || 0),
        window.WMS.formatQty(record.countedQty || 0),
        window.WMS.formatQty(record.variance || 0),
        record.notes || '—'
      ].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    if (!(db.opnames || []).length) {
      var empty = document.createElement('tr');
      var cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'empty-state';
      cell.textContent = 'Belum ada catatan stock opname.';
      empty.appendChild(cell);
      body.appendChild(empty);
    }
  }

  function bindForm() {
    var form = document.getElementById('opnameForm');
    if (!form) return;
    document.getElementById('opnameMaterial').addEventListener('change', updateSystemStock);
    document.getElementById('opnameQty').addEventListener('input', updateVariance);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var material = window.WMS.getMaterialById(db.materials, document.getElementById('opnameMaterial').value);
      var physicalQty = Number(document.getElementById('opnameQty').value);
      var date = document.getElementById('opnameDate').value;
      var notes = document.getElementById('opnameNotes').value.trim();
      var transactionNo = document.getElementById('opnameNo').value.trim() || nextOpnameNo(db);
      if (!material || !Number.isFinite(physicalQty) || physicalQty < 0 || !date) {
        window.WMS.notify('Pilih bahan dan tanggal serta masukkan stok fisik yang valid.', 'error');
        return;
      }
      if ((db.opnames || []).some(function (record) { return record.transactionNo === transactionNo; })) {
        window.WMS.notify('Nomor opname sudah digunakan.', 'error');
        return;
      }

      var systemQty = window.WMS.getMaterialStock(db, material.id);
      var variance = physicalQty - systemQty;
      var timestamp = window.WMS.timestampForDate(date);
      window.WMS.createStockMovement(db, {
        type: 'ADJUSTMENT',
        materialId: material.id,
        qty: variance,
        referenceNo: transactionNo,
        remarks: notes || 'Stock opname',
        date: timestamp
      });
      db.opnames.unshift({
        id: window.WMS.makeId('op'),
        transactionNo: transactionNo,
        materialId: material.id,
        countedQty: physicalQty,
        systemQty: systemQty,
        variance: variance,
        notes: notes,
        date: timestamp,
        createdAt: timestamp
      });
      window.WMS.addActivity(db, 'ADJUSTMENT', material.name + ' ' + (variance > 0 ? '+' : '') + window.WMS.formatQty(variance) + ' ' + material.uom);
      window.WMS.app.commitDb(db, 'Stock opname berhasil disimpan.', function () {
        form.reset();
        document.getElementById('opnameSystemQty').value = '0';
        document.getElementById('opnameVariance').value = '0';
        document.getElementById('opnameDate').value = window.WMS.todayLocalDate();
        renderOptions();
        renderTable();
      });
    });
  }

  window.WMS.opnameModule = {
    init: function () {
      renderOptions();
      renderTable();
      bindForm();
    },
    render: function () {
      renderOptions();
      renderTable();
    }
  };
})();
