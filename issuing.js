(function () {
  function nextIssueNo(db) {
    var number = 'BK-' + String(Date.now()).slice(-8);
    while ((db.issues || []).some(function (issue) {
      return issue.transactionNo === number;
    })) {
      number = 'BK-' + String(Number(number.slice(3)) + 1).padStart(8, '0');
    }
    return number;
  }

  function renderOptions() {
    var db = window.WMS.getDb();
    var materialSelect = document.getElementById('issueMaterial');
    if (!db || !materialSelect) return;
    var selected = materialSelect.value;
    materialSelect.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Pilih bahan baku';
    materialSelect.appendChild(placeholder);
    (db.materials || []).forEach(function (material) {
      var option = document.createElement('option');
      option.value = material.id;
      option.textContent = material.code + ' — ' + material.name;
      materialSelect.appendChild(option);
    });
    if ((db.materials || []).some(function (material) { return material.id === selected; })) {
      materialSelect.value = selected;
    }
    updateMaterialInfo();

    var dateInput = document.getElementById('issueDate');
    if (dateInput && !dateInput.value) dateInput.value = window.WMS.todayLocalDate();
  }

  function updateMaterialInfo() {
    var db = window.WMS.getDb();
    var material = window.WMS.getMaterialById(db.materials, document.getElementById('issueMaterial').value);
    var stock = material ? window.WMS.getMaterialStock(db, material.id) : 0;
    document.getElementById('issueAvailable').value = material
      ? window.WMS.formatQty(stock) + ' ' + material.uom
      : 'Pilih bahan untuk melihat stok';
    document.getElementById('issueUom').value = material ? material.uom : '';
  }

  function renderTable() {
    var db = window.WMS.getDb();
    var body = document.getElementById('issuingTableBody');
    if (!db || !body) return;
    body.innerHTML = '';
    (db.issues || []).slice().sort(function (a, b) {
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    }).forEach(function (issue) {
      var material = window.WMS.getMaterialById(db.materials, issue.materialId);
      var row = document.createElement('tr');
      [
        window.WMS.formatDate(issue.date || issue.createdAt),
        issue.transactionNo || issue.issueNo || '—',
        material ? material.name : 'Bahan dihapus',
        window.WMS.formatQty(issue.qty) + ' ' + (material ? material.uom : ''),
        issue.purpose || '—'
      ].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function bindForm() {
    var form = document.getElementById('issuingForm');
    if (!form) return;
    document.getElementById('issueMaterial').addEventListener('change', updateMaterialInfo);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var material = window.WMS.getMaterialById(db.materials, document.getElementById('issueMaterial').value);
      var qty = Number(document.getElementById('issueQty').value);
      var date = document.getElementById('issueDate').value;
      var issueNo = document.getElementById('issueNo').value.trim() || nextIssueNo(db);
      var purpose = document.getElementById('issuePurpose').value;
      var notes = document.getElementById('issueNotes').value.trim();

      if (!material || !Number.isFinite(qty) || qty <= 0 || !date) {
        window.WMS.notify('Pilih bahan dan tanggal serta masukkan qty yang valid.', 'error');
        return;
      }
      if ((db.issues || []).some(function (issue) { return issue.transactionNo === issueNo; })) {
        window.WMS.notify('Nomor transaksi sudah digunakan.', 'error');
        return;
      }
      var available = window.WMS.getMaterialStock(db, material.id);
      if (qty > available) {
        window.WMS.notify('Stok tidak mencukupi. Stok tersedia: ' + window.WMS.formatQty(available) + '.', 'error');
        return;
      }

      var timestamp = window.WMS.timestampForDate(date);
      window.WMS.createStockMovement(db, {
        type: 'OUT',
        materialId: material.id,
        qty: -qty,
        referenceNo: issueNo,
        remarks: [purpose, notes].filter(Boolean).join(' — '),
        date: timestamp
      });
      db.issues.unshift({
        id: window.WMS.makeId('iss'),
        transactionNo: issueNo,
        materialId: material.id,
        qty: qty,
        purpose: purpose,
        notes: notes,
        date: timestamp,
        createdAt: timestamp
      });
      window.WMS.addActivity(db, 'OUT', material.name + ' -' + window.WMS.formatQty(qty) + ' ' + material.uom);
      window.WMS.app.commitDb(db, 'Barang keluar berhasil disimpan.', function () {
        form.reset();
        document.getElementById('issueDate').value = window.WMS.todayLocalDate();
        renderOptions();
        renderTable();
      });
    });
  }

  window.WMS.issuingModule = {
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
