(function () {
  var reportRows = {};

  function addRow(body, values) {
    var row = document.createElement('tr');
    values.forEach(function (value) {
      var cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    body.appendChild(row);
  }

  function addEmpty(body, columns) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = columns;
    cell.className = 'empty-state';
    cell.textContent = 'Tidak ada data untuk filter yang dipilih.';
    row.appendChild(cell);
    body.appendChild(row);
  }

  function matchesMaterial(material, filters) {
    if (!material) return filters.material === 'all' && filters.category === 'all';
    return (filters.material === 'all' || material.id === filters.material) &&
      (filters.category === 'all' || material.category === filters.category);
  }

  function matchesDate(value, filters) {
    var date = window.WMS.localDateKey(value);
    return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);
  }

  function filteredRecords(records, materialFor, dateFor, filters) {
    return records.filter(function (record) {
      return matchesDate(dateFor(record), filters) && matchesMaterial(materialFor(record), filters);
    });
  }

  function status(material, db) {
    var qty = window.WMS.getMaterialStock(db, material.id);
    return window.WMS.getStockStatus(qty, material.reorderLevel, material.maxStock);
  }

  function render() {
    var db = window.WMS.getDb();
    if (!db) return;
    var materialFilter = document.getElementById('reportMaterialFilter');
    var selectedMaterial = materialFilter.value || 'all';
    var categoryFilter = document.getElementById('reportCategoryFilter');
    var selectedCategory = categoryFilter.value || 'all';
    var categories = Array.from(new Set((db.materials || []).map(function (item) { return item.category || 'Lainnya'; }))).sort();
    materialFilter.innerHTML = '';
    var allMaterials = document.createElement('option');
    allMaterials.value = 'all';
    allMaterials.textContent = 'Semua bahan';
    materialFilter.appendChild(allMaterials);
    (db.materials || []).forEach(function (material) {
      var option = document.createElement('option');
      option.value = material.id;
      option.textContent = material.code + ' — ' + material.name;
      materialFilter.appendChild(option);
    });
    if (selectedMaterial !== 'all' && (db.materials || []).some(function (item) { return item.id === selectedMaterial; })) materialFilter.value = selectedMaterial;
    categoryFilter.innerHTML = '';
    var allCategories = document.createElement('option');
    allCategories.value = 'all';
    allCategories.textContent = 'Semua kategori';
    categoryFilter.appendChild(allCategories);
    categories.forEach(function (category) {
      var option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
    if (categories.indexOf(selectedCategory) !== -1) categoryFilter.value = selectedCategory;

    var filters = {
      from: document.getElementById('reportFromDate').value,
      to: document.getElementById('reportToDate').value,
      material: materialFilter.value,
      category: categoryFilter.value
    };
    var stockRows = (db.materials || []).filter(function (material) {
      return matchesMaterial(material, filters);
    }).map(function (material) {
      var qty = window.WMS.getMaterialStock(db, material.id);
      return {
        code: material.code,
        name: material.name,
        category: material.category || 'Lainnya',
        qty: qty,
        minimum: material.reorderLevel,
        maximum: material.maxStock,
        status: status(material, db)
      };
    });
    var receivingRows = filteredRecords(db.receipts || [], function (item) {
      return window.WMS.getMaterialById(db.materials, item.materialId);
    }, function (item) { return item.date || item.createdAt; }, filters).map(function (receipt) {
      var material = window.WMS.getMaterialById(db.materials, receipt.materialId);
      var supplier = receipt.supplier || (window.WMS.getSupplierById(db.suppliers, receipt.supplierId) || {}).name || '—';
      return {
        date: window.WMS.formatDate(receipt.date || receipt.createdAt),
        transaction: receipt.receiptNo || '—',
        material: material ? material.name : 'Bahan dihapus',
        qty: window.WMS.formatQty(receipt.qty) + ' ' + (material ? material.uom : ''),
        supplier: supplier
      };
    });
    var issuingRows = filteredRecords(db.issues || [], function (item) {
      return window.WMS.getMaterialById(db.materials, item.materialId);
    }, function (item) { return item.date || item.createdAt; }, filters).map(function (issue) {
      var material = window.WMS.getMaterialById(db.materials, issue.materialId);
      return {
        date: window.WMS.formatDate(issue.date || issue.createdAt),
        transaction: issue.transactionNo || issue.issueNo || '—',
        material: material ? material.name : 'Bahan dihapus',
        qty: window.WMS.formatQty(issue.qty) + ' ' + (material ? material.uom : ''),
        purpose: issue.purpose || '—'
      };
    });
    var movementRows = filteredRecords(db.movements || [], function (item) {
      return window.WMS.getMaterialById(db.materials, item.materialId);
    }, function (item) { return item.createdAt || item.date; }, filters).map(function (movement) {
      var material = window.WMS.getMaterialById(db.materials, movement.materialId);
      var qty = window.WMS.getMovementQty(movement);
      return {
        date: window.WMS.formatDate(movement.createdAt || movement.date),
        type: window.WMS.getMovementType(movement),
        material: material ? material.name : 'Bahan dihapus',
        qty: (qty > 0 ? '+' : '') + window.WMS.formatQty(qty) + ' ' + (material ? material.uom : ''),
        reference: movement.referenceNo || '—'
      };
    });
    var opnameRows = filteredRecords(db.opnames || [], function (item) {
      return window.WMS.getMaterialById(db.materials, item.materialId);
    }, function (item) { return item.date || item.createdAt; }, filters).map(function (record) {
      var material = window.WMS.getMaterialById(db.materials, record.materialId);
      return {
        date: window.WMS.formatDate(record.date || record.createdAt),
        material: material ? material.name : 'Bahan dihapus',
        system: window.WMS.formatQty(record.systemQty || 0),
        physical: window.WMS.formatQty(record.countedQty || 0),
        variance: window.WMS.formatQty(record.variance || 0)
      };
    });
    reportRows = {
      stock: {
        headers: ['Kode', 'Nama', 'Kategori', 'Stok', 'Minimum', 'Maksimum', 'Status'],
        rows: stockRows.map(function (item) { return [item.code, item.name, item.category, item.qty, item.minimum, item.maximum, item.status]; })
      },
      receiving: {
        headers: ['Tanggal', 'No Transaksi', 'Bahan', 'Qty', 'Supplier'],
        rows: receivingRows.map(function (item) { return Object.values(item); })
      },
      issuing: {
        headers: ['Tanggal', 'No Transaksi', 'Bahan', 'Qty', 'Tujuan'],
        rows: issuingRows.map(function (item) { return Object.values(item); })
      },
      movement: {
        headers: ['Tanggal', 'Jenis', 'Bahan', 'Qty', 'Reference'],
        rows: movementRows.map(function (item) { return Object.values(item); })
      },
      opname: {
        headers: ['Tanggal', 'Bahan', 'System', 'Physical', 'Variance'],
        rows: opnameRows.map(function (item) { return Object.values(item); })
      }
    };

    var tableMap = [
      ['reportStockBody', stockRows, function (item) {
        return [
          item.code,
          item.name,
          item.category,
          window.WMS.formatQty(item.qty),
          item.minimum === null || item.minimum === undefined || item.minimum === '' ? '—' : window.WMS.formatQty(item.minimum),
          item.maximum === null || item.maximum === undefined || item.maximum === '' ? '—' : window.WMS.formatQty(item.maximum),
          item.status
        ];
      }, 7],
      ['reportReceivingBody', receivingRows, function (item) { return [item.date, item.transaction, item.material, item.qty, item.supplier]; }, 5],
      ['reportIssuingBody', issuingRows, function (item) { return [item.date, item.transaction, item.material, item.qty, item.purpose]; }, 5],
      ['reportMovementBody', movementRows, function (item) { return [item.date, item.type, item.material, item.qty, item.reference]; }, 5],
      ['reportOpnameBody', opnameRows, function (item) { return [item.date, item.material, item.system, item.physical, item.variance]; }, 5]
    ];
    tableMap.forEach(function (table) {
      var body = document.getElementById(table[0]);
      body.innerHTML = '';
      if (!table[1].length) {
        addEmpty(body, table[3]);
        return;
      }
      table[1].forEach(function (item) { addRow(body, table[2](item)); });
    });
  }

  function exportCsv() {
    var type = document.getElementById('reportExportType').value;
    var report = reportRows[type];
    if (!report) return;
    var csv = [report.headers].concat(report.rows).map(function (row) {
      return row.map(function (value) {
        var text = String(value === undefined || value === null ? '' : value);
        return '"' + text.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\r\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'laporan-' + type + '-' + window.WMS.todayLocalDate() + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 1000);
  }

  function bindFilters() {
    ['reportFromDate', 'reportToDate', 'reportMaterialFilter', 'reportCategoryFilter'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', render);
      document.getElementById(id).addEventListener('change', render);
    });
    document.getElementById('exportReportBtn').addEventListener('click', exportCsv);
  }

  window.WMS.reportsModule = {
    init: function () {
      bindFilters();
      render();
    },
    render: render
  };
})();
