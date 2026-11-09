(function () {
  function addCell(row, value) {
    var cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function renderTable() {
    var db = window.WMS.getDb();
    var body = document.getElementById('movementTableBody');
    if (!db || !body) return;
    body.innerHTML = '';
    var movements = (db.movements || []).slice().sort(function (a, b) {
      return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });
    if (!movements.length) {
      var empty = document.createElement('tr');
      var emptyCell = addCell(empty, 'Belum ada pergerakan stok.');
      emptyCell.colSpan = 10;
      emptyCell.className = 'empty-state';
      body.appendChild(empty);
      return;
    }
    movements.forEach(function (movement) {
      var material = window.WMS.getMaterialById(db.materials, movement.materialId);
      var date = new Date(movement.createdAt || movement.date);
      var type = window.WMS.getMovementType(movement);
      var qty = window.WMS.getMovementQty(movement);
      var row = document.createElement('tr');
      addCell(row, window.WMS.formatDate(date));
      addCell(row, Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      addCell(row, movement.referenceNo || '—');
      var typeCell = addCell(row, '');
      var badge = document.createElement('span');
      badge.className = 'status-badge ' + (type === 'IN' ? 'status-safe' : type === 'OUT' ? 'status-low' : 'status-adjustment');
      badge.textContent = type;
      typeCell.appendChild(badge);
      addCell(row, material ? material.code : '—');
      addCell(row, material ? material.name : 'Bahan dihapus');
      addCell(row, (qty > 0 ? '+' : '') + window.WMS.formatQty(qty) + ' ' + (material ? material.uom : ''));
      addCell(row, movement.stockBefore === undefined ? '—' : window.WMS.formatQty(movement.stockBefore));
      addCell(row, movement.stockAfter === undefined ? '—' : window.WMS.formatQty(movement.stockAfter));
      addCell(row, movement.remarks || '—');
      body.appendChild(row);
    });
  }

  window.WMS.movementModule = {
    init: renderTable,
    render: renderTable
  };
})();
