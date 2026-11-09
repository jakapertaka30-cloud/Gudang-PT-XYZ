(function () {
  function renderOptions() {
    var db = window.WMS.getDb();
    if (!db) return;
    var select = document.getElementById('qcMaterial');
    if (!select) return;
    var selected = select.value;
    select.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Pilih material';
    select.appendChild(placeholder);
    (db.materials || []).forEach(function (material) {
      var option = document.createElement('option');
      option.value = material.id;
      option.textContent = material.name;
      select.appendChild(option);
    });
    if ((db.materials || []).some(function (material) { return material.id === selected; })) select.value = selected;
  }

  function renderTable() {
    var db = window.WMS.getDb();
    if (!db) return;
    var tableBody = document.getElementById('qcTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    (db.qc || []).slice(0, 10).forEach(function (record) {
      var material = window.WMS.getMaterialById(db.materials, record.materialId);
      var row = document.createElement('tr');
      [
        window.WMS.formatDate(record.createdAt),
        material ? material.name : '-',
        record.status || 'Pass',
        record.inspector || '-',
        record.remarks || '-'
      ].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
  }

  function bindForm() {
    var form = document.getElementById('qcForm');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var materialId = document.getElementById('qcMaterial').value;
      var status = document.getElementById('qcStatus').value;
      var inspector = document.getElementById('qcInspector').value.trim();
      var remarks = document.getElementById('qcRemarks').value.trim();

      if (!materialId) {
        window.WMS.notify('Select a material for QC', 'error');
        return;
      }

      db.qc.unshift({
        id: window.WMS.makeId('qc'),
        materialId: materialId,
        status: status,
        inspector: inspector || 'QA Team',
        remarks: remarks,
        createdAt: new Date().toISOString()
      });

      window.WMS.addActivity(db, 'QC', 'Recorded QC status ' + status + ' for ' + (window.WMS.getMaterialById(db.materials, materialId) || {}).name);
      window.WMS.app.commitDb(db, 'QC saved', function () {
        form.reset();
        renderOptions();
        renderTable();
      });
    });
  }

  window.WMS.qcModule = {
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
