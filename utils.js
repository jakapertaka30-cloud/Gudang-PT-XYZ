(function () {
  function formatDate(value) {
    if (!value) return '--';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatDateTime(value) {
    if (!value) return '--';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatQty(value) {
    var amount = Number(value || 0);
    return amount.toLocaleString('id-ID');
  }

  function formatMoney(value) {
    var amount = Number(value || 0);
    return 'Rp ' + amount.toLocaleString('id-ID');
  }

  function todayLocalDate() {
    var now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function timestampForDate(value) {
    var parts = (value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) {
      throw new Error('Tanggal transaksi tidak valid.');
    }
    var now = new Date();
    return new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
  }

  function localDateKey(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function notify(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.remove();
    }, 2200);
  }

  function safeText(value) {
    return (value === null || value === undefined || value === '') ? '—' : String(value);
  }

  function getMaterialById(materials, materialId) {
    return (materials || []).find(function (item) {
      return item.id === materialId;
    });
  }

  function getSupplierById(suppliers, supplierId) {
    return (suppliers || []).find(function (item) {
      return item.id === supplierId;
    });
  }

  function getLocationById(locations, locationId) {
    return (locations || []).find(function (item) {
      return item.id === locationId;
    });
  }

  function getDb() {
    if (!window.WMS || !window.WMS.ensureDb) {
      return null;
    }
    return window.WMS.ensureDb();
  }

  function getStockStatus(stock, minimum, maximum) {
    var quantity = Number(stock);
    var min = Number(minimum);
    var max = Number(maximum);
    var parametersComplete = minimum !== null && minimum !== undefined && String(minimum).trim() !== '' &&
      maximum !== null && maximum !== undefined && String(maximum).trim() !== '' &&
      Number.isFinite(min) && min >= 0 && Number.isFinite(max) && max >= min;
    if (!parametersComplete) return 'PARAMETER INCOMPLETE';
    if (quantity <= 0) return 'OUT OF STOCK';
    if (quantity < min) return 'BELOW MINIMUM';
    if (quantity > max) return 'ABOVE MAXIMUM';
    return 'NORMAL';
  }

  function statusClass(status) {
    if (status === 'OUT OF STOCK') return 'status-out';
    if (status === 'BELOW MINIMUM') return 'status-low';
    if (status === 'ABOVE MAXIMUM') return 'status-over';
    if (status === 'PARAMETER INCOMPLETE') return 'status-incomplete';
    return 'status-safe';
  }

  function getMovementType(movement) {
    var type = String(movement.type || '').toUpperCase();
    if (type === 'IN' || type === 'RECEIVE' || type === 'RECEIVING' || type === 'PUTAWAY') return 'IN';
    if (type === 'OUT' || type === 'ISSUE' || type === 'ISSUING') return 'OUT';
    if (type === 'ADJUSTMENT' || type === 'OPNAME') return 'ADJUSTMENT';
    return type || 'ADJUSTMENT';
  }

  function getMovementQty(movement) {
    var quantity = Number(movement.qty || 0);
    var type = getMovementType(movement);
    if (type === 'OUT') return -Math.abs(quantity);
    if (type === 'IN') return Math.abs(quantity);
    return quantity;
  }

  window.WMS = window.WMS || {};
  window.WMS.formatDate = formatDate;
  window.WMS.formatDateTime = formatDateTime;
  window.WMS.formatQty = formatQty;
  window.WMS.formatMoney = formatMoney;
  window.WMS.todayLocalDate = todayLocalDate;
  window.WMS.timestampForDate = timestampForDate;
  window.WMS.localDateKey = localDateKey;
  window.WMS.notify = notify;
  window.WMS.safeText = safeText;
  window.WMS.getMaterialById = getMaterialById;
  window.WMS.getSupplierById = getSupplierById;
  window.WMS.getLocationById = getLocationById;
  window.WMS.getDb = getDb;
  window.WMS.getStockStatus = getStockStatus;
  window.WMS.statusClass = statusClass;
  window.WMS.getMovementType = getMovementType;
  window.WMS.getMovementQty = getMovementQty;
})();
