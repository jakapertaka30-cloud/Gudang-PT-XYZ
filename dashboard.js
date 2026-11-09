(function () {
  function addCell(row, value) {
    var cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function addEmptyRow(body, columns, text) {
    var row = document.createElement('tr');
    var cell = addCell(row, text);
    cell.colSpan = columns;
    cell.className = 'empty-state';
    body.appendChild(row);
  }

  function appendStatus(row, status) {
    var cell = document.createElement('td');
    var badge = document.createElement('span');
    var statusType = status === 'STOCKOUT' ? 'OUT OF STOCK' :
      status === 'OVERSTOCK' ? 'ABOVE MAXIMUM' :
        status === 'NORMAL' ? 'NORMAL' :
          status === 'BELOW MINIMUM' ? 'BELOW MINIMUM' : 'PARAMETER INCOMPLETE';
    badge.className = 'status-badge ' + window.WMS.statusClass(statusType);
    badge.textContent = status;
    cell.appendChild(badge);
    row.appendChild(cell);
  }

  function getMaterialRows(db) {
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

  function selectedFilters(db) {
    var period = document.getElementById('dashboardPeriodFilter').value || 'week';
    var material = document.getElementById('dashboardMaterialFilter').value || 'all';
    var category = document.getElementById('dashboardCategoryFilter').value || 'all';
    return { period: period, material: material, category: category, range: getDateRange(period) };
  }

  function getDateRange(period) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(start);
    if (period === 'week') {
      var weekday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - weekday);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    return {
      start: start,
      end: end,
      startKey: window.WMS.localDateKey(start),
      endKey: window.WMS.localDateKey(end)
    };
  }

  function updateFilterOptions(db) {
    var materialSelect = document.getElementById('dashboardMaterialFilter');
    var categorySelect = document.getElementById('dashboardCategoryFilter');
    var selectedMaterial = materialSelect.value || 'all';
    var selectedCategory = categorySelect.value || 'all';
    materialSelect.innerHTML = '';
    [
      { value: 'all', label: 'Semua material' }
    ].concat((db.materials || []).map(function (material) {
      return { value: material.id, label: (material.code || '') + ' — ' + (material.name || '') };
    })).forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      materialSelect.appendChild(option);
    });
    if ((db.materials || []).some(function (item) { return item.id === selectedMaterial; })) {
      materialSelect.value = selectedMaterial;
    }

    var categories = Array.from(new Set((db.materials || []).map(function (material) {
      return material.category || 'Lainnya';
    }))).sort();
    categorySelect.innerHTML = '';
    [{ value: 'all', label: 'Semua kategori' }].concat(categories.map(function (category) {
      return { value: category, label: category };
    })).forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      categorySelect.appendChild(option);
    });
    if (categories.indexOf(selectedCategory) !== -1) categorySelect.value = selectedCategory;
  }

  function matchesMaterialFilter(material, filters) {
    return (filters.material === 'all' || material.id === filters.material) &&
      (filters.category === 'all' || (material.category || 'Lainnya') === filters.category);
  }

  function movementInRange(movement, range) {
    var date = window.WMS.localDateKey(movement.createdAt || movement.date);
    return date && date >= range.startKey && date <= range.endKey;
  }

  function getFilteredMovements(db, filters) {
    return (db.movements || []).filter(function (movement) {
      if (!movementInRange(movement, filters.range)) return false;
      var material = window.WMS.getMaterialById(db.materials, movement.materialId);
      return material && matchesMaterialFilter(material, filters);
    }).sort(function (a, b) {
      return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });
  }

  function sumMovementQty(movements, type) {
    return movements.reduce(function (sum, movement) {
      if (type && window.WMS.getMovementType(movement) !== type) return sum;
      return sum + Math.abs(window.WMS.getMovementQty(movement));
    }, 0);
  }

  function renderStats(db, rows, movements, filters) {
    var inbound = movements.filter(function (movement) {
      return window.WMS.getMovementType(movement) === 'IN';
    });
    var outbound = movements.filter(function (movement) {
      return window.WMS.getMovementType(movement) === 'OUT';
    });
    var values = {
      totalMaterialsStat: rows.length,
      totalStockStat: rows.reduce(function (sum, row) { return sum + row.stock; }, 0),
      availableStockStat: rows.filter(function (row) { return row.stock > 0; }).length,
      normalStockStat: rows.filter(function (row) { return row.status === 'NORMAL'; }).length,
      lowStockStat: rows.filter(function (row) { return row.status === 'BELOW MINIMUM'; }).length,
      outOfStockStat: rows.filter(function (row) { return row.stock <= 0; }).length,
      overStockStat: rows.filter(function (row) { return row.status === 'ABOVE MAXIMUM'; }).length,
      incompleteStockStat: rows.filter(function (row) { return row.status === 'PARAMETER INCOMPLETE'; }).length,
      periodInStat: sumMovementQty(inbound, 'IN'),
      periodOutStat: sumMovementQty(outbound, 'OUT'),
      periodTransactionsStat: movements.length,
      periodInCount: inbound.length + ' transaksi',
      periodOutCount: outbound.length + ' transaksi',
      periodCaption: filters.range.startKey === filters.range.endKey
        ? window.WMS.formatDate(filters.range.startKey)
        : window.WMS.formatDate(filters.range.startKey) + ' – ' + window.WMS.formatDate(filters.range.endKey),
      dashboardDate: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    };
    Object.keys(values).forEach(function (id) {
      var element = document.getElementById(id);
      if (!element) return;
      element.textContent = id === 'dashboardDate' || id === 'periodCaption' ||
        id === 'periodInCount' || id === 'periodOutCount'
        ? values[id]
        : window.WMS.formatQty(values[id]);
    });
  }

  function renderMovementChart(db, filters, movements) {
    var chart = document.getElementById('movementChart');
    chart.innerHTML = '';
    var buckets = [];
    if (filters.period === 'month') {
      for (var week = 0; week < 5; week += 1) {
        buckets.push({ key: week, label: 'Mg ' + (week + 1), incoming: 0, outgoing: 0 });
      }
    } else {
      for (var dayOffset = 0; dayOffset < (filters.period === 'day' ? 1 : 7); dayOffset += 1) {
        var date = new Date(filters.range.start);
        date.setDate(date.getDate() + dayOffset);
        buckets.push({
          key: window.WMS.localDateKey(date),
          label: filters.period === 'day'
            ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            : date.toLocaleDateString('id-ID', { weekday: 'short' }),
          incoming: 0,
          outgoing: 0
        });
      }
    }
    movements.forEach(function (movement) {
      var type = window.WMS.getMovementType(movement);
      if (type !== 'IN' && type !== 'OUT') return;
      var key = window.WMS.localDateKey(movement.createdAt || movement.date);
      var bucketKey = filters.period === 'month'
        ? Math.floor((new Date((movement.createdAt || movement.date)).getDate() - 1) / 7)
        : key;
      var bucket = buckets.find(function (item) { return item.key === bucketKey; });
      if (bucket) bucket[type === 'IN' ? 'incoming' : 'outgoing'] += Math.abs(window.WMS.getMovementQty(movement));
    });
    var max = Math.max(1, ...buckets.map(function (bucket) {
      return Math.max(bucket.incoming, bucket.outgoing);
    }));
    buckets.forEach(function (bucket) {
      var column = document.createElement('div');
      column.className = 'chart-day';
      var bars = document.createElement('div');
      bars.className = 'chart-bars';
      [['in', bucket.incoming], ['out', bucket.outgoing]].forEach(function (series) {
        var bar = document.createElement('div');
        bar.className = 'chart-bar chart-bar-' + series[0];
        bar.style.height = (series[1] ? Math.max(3, series[1] / max * 100) : 1) + '%';
        bar.title = (series[0] === 'in' ? 'Masuk: ' : 'Keluar: ') + window.WMS.formatQty(series[1]);
        bars.appendChild(bar);
      });
      var label = document.createElement('span');
      label.textContent = bucket.label;
      column.appendChild(bars);
      column.appendChild(label);
      chart.appendChild(column);
    });
    document.getElementById('movementPeriodCaption').textContent =
      'Data transaksi aktual · ' + window.WMS.formatDate(filters.range.startKey) + ' – ' +
      window.WMS.formatDate(filters.range.endKey);
    document.getElementById('movementInTotal').textContent = window.WMS.formatQty(sumMovementQty(movements, 'IN'));
    document.getElementById('movementOutTotal').textContent = window.WMS.formatQty(sumMovementQty(movements, 'OUT'));
    var net = movements.reduce(function (sum, movement) {
      return sum + window.WMS.getMovementQty(movement);
    }, 0);
    document.getElementById('movementNetTotal').textContent = (net > 0 ? '+' : '') + window.WMS.formatQty(net);
  }

  function renderMovementLeaders(db, movements) {
    function renderLeaderList(containerId, type) {
      var container = document.getElementById(containerId);
      container.innerHTML = '';
      var totals = {};
      movements.forEach(function (movement) {
        if (window.WMS.getMovementType(movement) !== type) return;
        var material = window.WMS.getMaterialById(db.materials, movement.materialId);
        if (!material) return;
        if (!totals[material.id]) totals[material.id] = { material: material, qty: 0 };
        totals[material.id].qty += Math.abs(window.WMS.getMovementQty(movement));
      });
      var leaders = Object.keys(totals).map(function (id) { return totals[id]; })
        .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
      if (!leaders.length) {
        var empty = document.createElement('p');
        empty.className = 'empty-message';
        empty.textContent = 'Tidak ada transaksi pada periode ini.';
        container.appendChild(empty);
        return;
      }
      leaders.forEach(function (item) {
        var line = document.createElement('p');
        line.textContent = item.material.code + ' · ' + item.material.name + ': ' +
          window.WMS.formatQty(item.qty) + ' ' + (item.material.uom || '');
        container.appendChild(line);
      });
    }
    renderLeaderList('topIncomingMaterials', 'IN');
    renderLeaderList('topOutgoingMaterials', 'OUT');
  }

  function renderCategoryChart(rows) {
    var chart = document.getElementById('categoryChart');
    chart.innerHTML = '';
    var categories = {};
    rows.forEach(function (row) {
      var category = row.material.category || 'Lainnya';
      categories[category] = (categories[category] || 0) + 1;
    });
    var entries = Object.keys(categories).map(function (name) {
      return { name: name, items: categories[name] };
    }).sort(function (a, b) { return b.items - a.items; });
    var max = Math.max(1, ...entries.map(function (entry) { return entry.items; }));
    if (!entries.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-message';
      empty.textContent = 'Belum ada data kategori.';
      chart.appendChild(empty);
      return;
    }
    entries.forEach(function (entry, index) {
      var item = document.createElement('div');
      item.className = 'category-item';
      var top = document.createElement('div');
      top.className = 'category-item-top';
      var title = document.createElement('strong');
      title.textContent = entry.name;
      var value = document.createElement('span');
      value.textContent = entry.items + ' material';
      var track = document.createElement('div');
      track.className = 'progress-track';
      var fill = document.createElement('span');
      fill.className = 'progress-fill progress-color-' + (index % 5);
      fill.style.width = (entry.items / max * 100) + '%';
      top.appendChild(title);
      top.appendChild(value);
      track.appendChild(fill);
      item.appendChild(top);
      item.appendChild(track);
      chart.appendChild(item);
    });
  }

  function renderStockRangeChart(rows, filters) {
    var chart = document.getElementById('stockRangeChart');
    chart.innerHTML = '';
    var filtered = rows.filter(function (row) { return matchesMaterialFilter(row.material, filters); });
    if (!filtered.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-message';
      empty.textContent = 'Tidak ada material yang sesuai dengan filter.';
      chart.appendChild(empty);
      return;
    }
    filtered.sort(function (a, b) {
      var order = { 'OUT OF STOCK': 0, 'BELOW MINIMUM': 1, 'ABOVE MAXIMUM': 2, 'PARAMETER INCOMPLETE': 3, 'NORMAL': 4 };
      return order[a.status] - order[b.status] || a.material.name.localeCompare(b.material.name);
    });
    filtered.forEach(function (item) {
      var maximum = Number(item.maximum);
      var minimum = Number(item.minimum);
      var scale = Math.max(item.stock, Number.isFinite(maximum) ? maximum : 0, Number.isFinite(minimum) ? minimum : 0, 1);
      var row = document.createElement('div');
      row.className = 'stock-range-item';
      var heading = document.createElement('div');
      heading.className = 'stock-range-heading';
      var name = document.createElement('strong');
      name.textContent = (item.material.code || '') + ' · ' + (item.material.name || '');
      var status = document.createElement('span');
      status.className = 'status-badge ' + window.WMS.statusClass(item.status);
      status.textContent = item.status;
      heading.appendChild(name);
      heading.appendChild(status);
      var track = document.createElement('div');
      track.className = 'stock-range-track';
      var fill = document.createElement('span');
      fill.className = 'stock-range-current ' + window.WMS.statusClass(item.status);
      fill.style.width = Math.min(100, item.stock / scale * 100) + '%';
      fill.title = 'Stok aktual: ' + window.WMS.formatQty(item.stock);
      track.appendChild(fill);
      if (Number.isFinite(minimum) && item.minimum !== null && item.minimum !== undefined && item.minimum !== '') {
        var minMarker = document.createElement('i');
        minMarker.className = 'stock-range-marker stock-range-min';
        minMarker.style.left = Math.min(100, minimum / scale * 100) + '%';
        minMarker.title = 'Minimum: ' + window.WMS.formatQty(minimum);
        track.appendChild(minMarker);
      }
      if (Number.isFinite(maximum) && item.maximum !== null && item.maximum !== undefined && item.maximum !== '') {
        var maxMarker = document.createElement('i');
        maxMarker.className = 'stock-range-marker stock-range-max';
        maxMarker.style.left = Math.min(100, maximum / scale * 100) + '%';
        maxMarker.title = 'Maximum: ' + window.WMS.formatQty(maximum);
        track.appendChild(maxMarker);
      }
      var minDifference = Number.isFinite(minimum) && item.minimum !== null && item.minimum !== undefined && item.minimum !== ''
        ? item.stock - minimum
        : null;
      var maxDifference = Number.isFinite(maximum) && item.maximum !== null && item.maximum !== undefined && item.maximum !== ''
        ? item.stock - maximum
        : null;
      function signedQty(value) {
        return (value > 0 ? '+' : '') + window.WMS.formatQty(value);
      }
      var details = document.createElement('div');
      details.className = 'stock-range-details';
      details.textContent = 'Aktual ' + window.WMS.formatQty(item.stock) + ' ' + (item.material.uom || '') +
        ' · Min ' + (item.minimum === null || item.minimum === undefined || item.minimum === '' ? 'belum diatur' : window.WMS.formatQty(item.minimum)) +
        ' · Maks ' + (item.maximum === null || item.maximum === undefined || item.maximum === '' ? 'belum diatur' : window.WMS.formatQty(item.maximum)) +
        ' · Selisih aktual–min ' + (minDifference === null ? '—' : signedQty(minDifference)) +
        ' · Selisih aktual–maks ' + (maxDifference === null ? '—' : signedQty(maxDifference));
      row.appendChild(heading);
      row.appendChild(track);
      row.appendChild(details);
      chart.appendChild(row);
    });
  }

  function renderStatusSummary(rows) {
    var container = document.getElementById('inventoryStatusSummary');
    container.innerHTML = '';
    var statuses = [
      { label: 'Normal', count: rows.filter(function (row) { return row.status === 'NORMAL'; }).length, className: 'status-safe' },
      { label: 'Di bawah minimum', count: rows.filter(function (row) { return row.status === 'BELOW MINIMUM'; }).length, className: 'status-low' },
      { label: 'Stockout (stok 0)', count: rows.filter(function (row) { return row.stock <= 0; }).length, className: 'status-out' },
      { label: 'Di atas maksimum', count: rows.filter(function (row) { return row.status === 'ABOVE MAXIMUM'; }).length, className: 'status-over' },
      { label: 'Parameter belum lengkap', count: rows.filter(function (row) { return row.status === 'PARAMETER INCOMPLETE'; }).length, className: 'status-incomplete' }
    ];
    statuses.forEach(function (item) {
      var line = document.createElement('div');
      line.className = 'inventory-status-line';
      var badge = document.createElement('span');
      badge.className = 'status-badge ' + item.className;
      badge.textContent = item.label;
      var count = document.createElement('strong');
      count.textContent = window.WMS.formatQty(item.count);
      line.appendChild(badge);
      line.appendChild(count);
      container.appendChild(line);
    });
  }

  function getRecommendation(item, db) {
    var material = item.material;
    if (item.stock <= 0) {
      var stockoutHistory = (db.movements || []).filter(function (movement) {
        return movement.materialId === material.id && Number(movement.stockAfter) === 0;
      }).length;
      return {
        issue: 'STOCKOUT',
        priority: 'HIGH',
        delta: 'Stok 0',
        text: 'Periksa jadwal produksi, evaluasi pengadaan dan ketersediaan supplier. Riwayat stockout tercatat: ' +
          window.WMS.formatQty(stockoutHistory) + ' movement.'
      };
    }
    if (item.status === 'BELOW MINIMUM') {
      var usage = (db.movements || []).filter(function (movement) {
        return movement.materialId === material.id && window.WMS.getMovementType(movement) === 'OUT';
      }).reduce(function (sum, movement) {
        return sum + Math.abs(window.WMS.getMovementQty(movement));
      }, 0);
      return {
        issue: 'BELOW MINIMUM',
        priority: 'MEDIUM',
        delta: 'Kurang ' + window.WMS.formatQty(Number(item.minimum) - item.stock) + ' ' + (material.uom || ''),
        text: 'Evaluasi kebutuhan material dan jadwal pengadaan. Riwayat barang keluar tercatat: ' +
          window.WMS.formatQty(usage) + ' ' + (material.uom || '') + '.'
      };
    }
    if (item.status === 'ABOVE MAXIMUM') {
      return {
        issue: 'OVERSTOCK',
        priority: 'MEDIUM',
        delta: 'Lebih ' + window.WMS.formatQty(item.stock - Number(item.maximum)) + ' ' + (material.uom || ''),
        text: 'Evaluasi pembelian berikutnya, optimalkan pemakaian dan kapasitas penyimpanan. Gunakan FIFO jika tanggal penerimaan dapat ditelusuri; FEFO memerlukan data kedaluwarsa.'
      };
    }
    if (item.status === 'PARAMETER INCOMPLETE') {
      return {
        issue: 'PARAMETER INCOMPLETE',
        priority: 'MEDIUM',
        delta: '—',
        text: 'Lengkapi Minimum Stock dan Maximum Stock pada master agar klasifikasi persediaan dapat dihitung.'
      };
    }
    return {
      issue: 'NORMAL',
      priority: 'LOW',
      delta: 'Dalam rentang',
      text: 'Tidak perlu peringatan pengadaan; lanjutkan pemantauan rutin.'
    };
  }

  function renderRecommendations(rows, db) {
    var body = document.getElementById('priorityStockBody');
    body.innerHTML = '';
    var priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    var recommendations = rows.map(function (item) {
      return { item: item, recommendation: getRecommendation(item, db) };
    }).sort(function (a, b) {
      return priorityOrder[a.recommendation.priority] - priorityOrder[b.recommendation.priority] ||
        a.item.material.name.localeCompare(b.item.material.name);
    });
    if (!recommendations.length) {
      addEmptyRow(body, 6, 'Belum ada material untuk dianalisis.');
      return;
    }
    recommendations.forEach(function (entry) {
      var item = entry.item;
      var rec = entry.recommendation;
      var row = document.createElement('tr');
      var priorityCell = addCell(row, '');
      var priority = document.createElement('span');
      priority.className = 'status-badge ' + (rec.priority === 'HIGH' ? 'status-out' : rec.priority === 'MEDIUM' ? 'status-low' : 'status-safe');
      priority.textContent = rec.priority;
      priorityCell.appendChild(priority);
      var materialCell = addCell(row, '');
      var materialName = document.createElement('strong');
      materialName.textContent = (item.material.code || '') + ' · ' + (item.material.name || '');
      var category = document.createElement('small');
      category.className = 'recommendation-subtext';
      category.textContent = item.material.category || 'Lainnya';
      materialCell.appendChild(materialName);
      materialCell.appendChild(category);
      addCell(row, window.WMS.formatQty(item.stock) + ' ' + (item.material.uom || '') + ' / ' +
        (item.minimum === null || item.minimum === undefined || item.minimum === '' ? '—' : window.WMS.formatQty(item.minimum)) + ' / ' +
        (item.maximum === null || item.maximum === undefined || item.maximum === '' ? '—' : window.WMS.formatQty(item.maximum)));
      appendStatus(row, rec.issue);
      addCell(row, rec.delta);
      addCell(row, rec.text);
      body.appendChild(row);
    });
  }

  function renderActivity(db, movements) {
    var body = document.getElementById('recentActivityBody');
    body.innerHTML = '';
    if (!movements.length) {
      addEmptyRow(body, 5, 'Tidak ada movement pada periode dan filter terpilih.');
      return;
    }
    movements.slice(0, 10).forEach(function (movement) {
      var material = window.WMS.getMaterialById(db.materials, movement.materialId);
      var type = window.WMS.getMovementType(movement);
      var qty = window.WMS.getMovementQty(movement);
      var row = document.createElement('tr');
      addCell(row, window.WMS.formatDateTime(movement.createdAt || movement.date));
      addCell(row, movement.referenceNo || type);
      addCell(row, material ? material.name : 'Bahan dihapus');
      addCell(row, (qty > 0 ? '+' : '') + window.WMS.formatQty(qty) + ' ' + (material ? material.uom : ''));
      var typeCell = addCell(row, '');
      var badge = document.createElement('span');
      badge.className = 'status-badge ' + (type === 'IN' ? 'status-safe' : type === 'OUT' ? 'status-low' : 'status-adjustment');
      badge.textContent = type;
      typeCell.appendChild(badge);
      body.appendChild(row);
    });
  }

  function render() {
    var db = window.WMS.getDb();
    if (!db) return;
    updateFilterOptions(db);
    var filters = selectedFilters(db);
    var rows = getMaterialRows(db);
    var movements = getFilteredMovements(db, filters);
    renderStats(db, rows, movements, filters);
    renderMovementChart(db, filters, movements);
    renderMovementLeaders(db, movements);
    renderCategoryChart(rows);
    renderStockRangeChart(rows, filters);
    renderStatusSummary(rows);
    renderRecommendations(rows, db);
    renderActivity(db, movements);
  }

  function bindFilters() {
    ['dashboardPeriodFilter', 'dashboardMaterialFilter', 'dashboardCategoryFilter'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', render);
    });
  }

  window.WMS.dashboardModule = {
    init: function () {
      bindFilters();
      render();
    },
    render: render
  };
})();
