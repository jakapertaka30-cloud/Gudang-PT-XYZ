(function () {
  function getRows(db) {
    return (db.materials || []).map(function (material) {
      var stock = window.WMS.getMaterialStock(db, material.id);
      return {
        material: material,
        stock: stock,
        minimum: material.reorderLevel,
        maximum: material.maxStock,
        status: window.WMS.getStockStatus(stock, material.reorderLevel, material.maxStock)
      };
    });
  }

  function renderCategoryOptions(db) {
    var select = document.getElementById('stockCategoryFilter');
    if (!select) return;
    var selected = select.value || 'all';
    var categories = Array.from(new Set((db.materials || []).map(function (material) {
      return material.category || 'Lainnya';
    }))).sort();
    select.innerHTML = '<option value="all">Semua kategori</option>';
    categories.forEach(function (category) {
      var option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    if (categories.indexOf(selected) !== -1) select.value = selected;
  }

  function renderSummary(rows) {
    document.getElementById('stockItemStat').textContent = window.WMS.formatQty(rows.length);
    document.getElementById('stockQuantityStat').textContent = window.WMS.formatQty(rows.reduce(function (sum, row) {
      return sum + row.stock;
    }, 0));
    document.getElementById('stockLowStat').textContent = window.WMS.formatQty(rows.filter(function (row) {
      return row.status === 'BELOW MINIMUM';
    }).length);
    document.getElementById('stockOutStat').textContent = window.WMS.formatQty(rows.filter(function (row) {
      return row.status === 'OUT OF STOCK';
    }).length);
  }

  function renderTable() {
    var db = window.WMS.getDb();
    var body = document.getElementById('stockTableBody');
    if (!db || !body) return;
    var rows = getRows(db);
    renderSummary(rows);
    var query = document.getElementById('stockSearch').value.trim().toLowerCase();
    var category = document.getElementById('stockCategoryFilter').value;
    var status = document.getElementById('stockStatusFilter').value;
    var filtered = rows.filter(function (row) {
      var matchesQuery = !query || (row.material.name || '').toLowerCase().includes(query) || (row.material.code || '').toLowerCase().includes(query);
      return matchesQuery &&
        (category === 'all' || row.material.category === category) &&
        (status === 'all' || row.status === status);
    });

    body.innerHTML = '';
    if (!filtered.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 9;
      emptyCell.className = 'empty-state';
      emptyCell.textContent = rows.length ? 'Tidak ada bahan yang sesuai dengan filter.' : 'Belum ada bahan baku.';
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }
    filtered.forEach(function (item) {
      var updated = (db.stock || []).filter(function (record) {
        return record.materialId === item.material.id && record.lastUpdated;
      }).map(function (record) {
        return record.lastUpdated;
      }).sort().pop();
      var row = document.createElement('tr');
      [
        item.material.code || '—',
        item.material.name || '—',
        item.material.category || 'Lainnya',
        item.material.uom || '—',
        window.WMS.formatQty(item.stock),
        item.minimum === null || item.minimum === undefined || item.minimum === '' ? '—' : window.WMS.formatQty(item.minimum),
        item.maximum === null || item.maximum === undefined || item.maximum === '' ? '—' : window.WMS.formatQty(item.maximum)
      ].forEach(function (value, index) {
        var cell = document.createElement('td');
        cell.textContent = value;
        if (index === 2) {
          var pill = document.createElement('span');
          pill.className = 'category-pill';
          pill.textContent = value;
          cell.textContent = '';
          cell.appendChild(pill);
        }
        row.appendChild(cell);
      });
      var statusCell = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'status-badge ' + window.WMS.statusClass(item.status);
      badge.textContent = item.status;
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      var updatedCell = document.createElement('td');
      updatedCell.textContent = updated ? window.WMS.formatDateTime(updated) : '—';
      row.appendChild(updatedCell);
      body.appendChild(row);
    });
  }

  function render() {
    var db = window.WMS.getDb();
    if (!db) return;
    renderCategoryOptions(db);
    renderTable();
  }

  function bindFilters() {
    ['stockSearch', 'stockCategoryFilter', 'stockStatusFilter'].forEach(function (id) {
      var element = document.getElementById(id);
      element.addEventListener(id === 'stockSearch' ? 'input' : 'change', renderTable);
    });
  }

  window.WMS.stockModule = {
    init: function () {
      render();
      bindFilters();
    },
    render: render
  };
})();
