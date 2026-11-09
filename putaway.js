(function () {
  function renderOptions() {
    var db = window.WMS.getDb();
    if (!db) return;

    var materialSelect = document.getElementById('putawayMaterial');
    var locationSelect = document.getElementById('putawayLocation');
    if (!materialSelect || !locationSelect) return;

    var selectedMaterial = materialSelect.value;
    var selectedLocation = locationSelect.value;
    materialSelect.innerHTML = '';
    locationSelect.innerHTML = '';
    [
      [materialSelect, 'Pilih material', db.materials || [], function (material) { return material.name; }],
      [locationSelect, 'Pilih lokasi', db.locations || [], function (location) { return location.name + ' (' + location.zone + ')'; }]
    ].forEach(function (config) {
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = config[1];
      config[0].appendChild(placeholder);
      config[2].forEach(function (record) {
        var option = document.createElement('option');
        option.value = record.id;
        option.textContent = config[3](record);
        config[0].appendChild(option);
      });
    });
    if ((db.materials || []).some(function (item) { return item.id === selectedMaterial; })) materialSelect.value = selectedMaterial;
    if ((db.locations || []).some(function (item) { return item.id === selectedLocation; })) locationSelect.value = selectedLocation;
  }

  function renderTable() {
    var db = window.WMS.getDb();
    if (!db) return;
    var tableBody = document.getElementById('putawayTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    (db.putaways || []).slice(0, 10).forEach(function (record) {
      var material = window.WMS.getMaterialById(db.materials, record.materialId);
      var location = window.WMS.getLocationById(db.locations, record.locationId);
      var row = document.createElement('tr');
      [
        window.WMS.formatDate(record.createdAt),
        material ? material.name : '-',
        location ? location.name : '-',
        window.WMS.formatQty(record.qty || 0)
      ].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
  }

  function bindForm() {
    var form = document.getElementById('putawayForm');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var materialId = document.getElementById('putawayMaterial').value;
      var locationId = document.getElementById('putawayLocation').value;
      var qty = Number(document.getElementById('putawayQty').value || 0);
      var remarks = document.getElementById('putawayRemarks').value.trim();

      if (!materialId || !locationId || !Number.isFinite(qty) || qty <= 0) {
        window.WMS.notify('Choose material, location, and valid quantity', 'error');
        return;
      }

      var material = window.WMS.getMaterialById(db.materials, materialId);
      db.putaways.unshift({
        id: window.WMS.makeId('pa'),
        materialId: materialId,
        locationId: locationId,
        qty: qty,
        remarks: remarks,
        createdAt: new Date().toISOString()
      });

      var existingStock = (db.stock || []).find(function (row) {
        return row.materialId === materialId && row.locationId === locationId;
      });
      if (existingStock) {
        existingStock.qty = Number(existingStock.qty || 0) + qty;
      } else {
        db.stock.push({
          id: window.WMS.makeId('stock'),
          materialId: materialId,
          locationId: locationId,
          qty: qty,
          lotNo: 'PUTAWAY-' + String(Date.now()).slice(-6),
          lastUpdated: new Date().toISOString(),
          status: window.WMS.setStockStatus(qty, Number(material ? material.reorderLevel : 0))
        });
      }

      window.WMS.recordMovement(db, 'Putaway', materialId, locationId, qty, 'PUTAWAY', remarks || 'Putaway');
      window.WMS.addActivity(db, 'Putaway', 'Putaway ' + qty + ' ' + (material ? material.uom : '') + ' to ' + (window.WMS.getLocationById(db.locations, locationId) || {}).name);
      window.WMS.app.commitDb(db, 'Putaway saved', function () {
        form.reset();
        renderOptions();
        renderTable();
      });
    });
  }

  window.WMS.putawayModule = {
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
