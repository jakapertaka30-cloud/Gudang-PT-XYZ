(function () {
  function nextReceiptNo(db) {
    var number = 'BM-' + String(Date.now()).slice(-8);
    while ((db.receipts || []).some(function (receipt) {
      return receipt.receiptNo === number;
    })) {
      number = 'BM-' + String(Number(number.slice(3)) + 1).padStart(8, '0');
    }
    return number;
  }

  function renderOptions() {
    var db = window.WMS.getDb();
    var materialSelect = document.getElementById('receivingMaterial');
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

    var supplierOptions = document.getElementById('supplierOptions');
    if (supplierOptions) {
      var supplierNames = (db.suppliers || []).map(function (supplier) { return supplier.name; });
      (db.receipts || []).forEach(function (receipt) {
        var name = receipt.supplier || (window.WMS.getSupplierById(db.suppliers, receipt.supplierId) || {}).name;
        if (name && supplierNames.indexOf(name) === -1) supplierNames.push(name);
      });
      supplierOptions.innerHTML = '';
      supplierNames.forEach(function (name) {
        var option = document.createElement('option');
        option.value = name;
        supplierOptions.appendChild(option);
      });
    }

    var dateInput = document.getElementById('receivingDate');
    if (dateInput && !dateInput.value) dateInput.value = window.WMS.todayLocalDate();
    updateUnit();
  }

  function updateUnit() {
    var db = window.WMS.getDb();
    var material = window.WMS.getMaterialById(db.materials, document.getElementById('receivingMaterial').value);
    document.getElementById('receivingUom').value = material ? material.uom : '';
  }

  function renderTable() {
    var db = window.WMS.getDb();
    var body = document.getElementById('receivingTableBody');
    if (!db || !body) return;
    body.innerHTML = '';
    (db.receipts || []).slice().sort(function (a, b) {
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    }).forEach(function (receipt) {
      var material = window.WMS.getMaterialById(db.materials, receipt.materialId);
      var supplier = receipt.supplier || (window.WMS.getSupplierById(db.suppliers, receipt.supplierId) || {}).name || '—';
      var row = document.createElement('tr');
      [
        window.WMS.formatDate(receipt.date || receipt.createdAt),
        receipt.receiptNo || '—',
        material ? material.name : 'Bahan dihapus',
        window.WMS.formatQty(receipt.qty) + ' ' + (material ? material.uom : ''),
        supplier,
        window.WMS.formatMoney(receipt.unitCost)
      ].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function bindForm() {
    var form = document.getElementById('receivingForm');
    if (!form) return;

    document.getElementById('receivingMaterial').addEventListener('change', updateUnit);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var materialId = document.getElementById('receivingMaterial').value;
      var material = window.WMS.getMaterialById(db.materials, materialId);
      var qty = Number(document.getElementById('receivingQty').value);
      var unitCost = Number(document.getElementById('receivingCost').value || 0);
      var date = document.getElementById('receivingDate').value;
      var receiptNo = document.getElementById('receivingNo').value.trim() || nextReceiptNo(db);
      var supplier = document.getElementById('receivingSupplier').value.trim();
      var lotNo = document.getElementById('receivingLot').value.trim();
      var notes = document.getElementById('receivingNotes').value.trim();

      if (!material || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost < 0 || !date) {
        window.WMS.notify('Lengkapi bahan, tanggal, qty, dan harga satuan dengan benar.', 'error');
        return;
      }
      if ((db.receipts || []).some(function (receipt) { return receipt.receiptNo === receiptNo; })) {
        window.WMS.notify('Nomor transaksi sudah digunakan.', 'error');
        return;
      }

      var timestamp = window.WMS.timestampForDate(date);
      var receipt = {
        id: window.WMS.makeId('rcpt'),
        receiptNo: receiptNo,
        supplier: supplier,
        materialId: material.id,
        qty: qty,
        unitCost: unitCost,
        lotNo: lotNo,
        notes: notes,
        date: timestamp
      };

      window.WMS.createStockMovement(db, {
        type: 'IN',
        materialId: material.id,
        qty: qty,
        referenceNo: receiptNo,
        remarks: notes,
        lotNo: lotNo,
        date: timestamp
      });
      db.receipts.unshift(receipt);
      db.receiptItems.unshift({
        id: window.WMS.makeId('ri'),
        receiptId: receipt.id,
        materialId: material.id,
        qty: qty,
        unitCost: unitCost,
        lotNo: lotNo
      });
      window.WMS.addActivity(db, 'IN', material.name + ' +' + window.WMS.formatQty(qty) + ' ' + material.uom);
      window.WMS.app.commitDb(db, 'Barang masuk berhasil disimpan.', function () {
        form.reset();
        document.getElementById('receivingCost').value = '0';
        document.getElementById('receivingDate').value = window.WMS.todayLocalDate();
        renderOptions();
        renderTable();
      });
    });
  }

  window.WMS.receivingModule = {
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
