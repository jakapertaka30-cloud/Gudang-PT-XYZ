(function () {
  function render() {
    var db = window.WMS.getDb();
    if (!db) return;

    var tableBody = document.getElementById('suppliersTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    (db.suppliers || []).forEach(function (supplier) {
      var row = document.createElement('tr');
      [supplier.name, supplier.contact, supplier.phone, supplier.email].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value || '-';
        row.appendChild(cell);
      });
      var actionsCell = document.createElement('td');
      var actions = document.createElement('div');
      actions.className = 'table-actions';
      [['edit-supplier', 'Edit', 'table-btn'], ['delete-supplier', 'Delete', 'danger-btn']].forEach(function (item) {
        var button = document.createElement('button');
        button.className = item[2];
        button.type = 'button';
        button.dataset.action = item[0];
        button.dataset.id = supplier.id;
        button.textContent = item[1];
        actions.appendChild(button);
      });
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll('[data-action="edit-supplier"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var supplierId = button.getAttribute('data-id');
        var supplier = (db.suppliers || []).find(function (item) {
          return item.id === supplierId;
        });
        if (!supplier) return;

        document.getElementById('supplierId').value = supplier.id;
        document.getElementById('supplierName').value = supplier.name || '';
        document.getElementById('supplierContact').value = supplier.contact || '';
        document.getElementById('supplierPhone').value = supplier.phone || '';
        document.getElementById('supplierEmail').value = supplier.email || '';
        document.getElementById('cancelSupplierEdit').classList.remove('hidden');
      });
    });

    tableBody.querySelectorAll('[data-action="delete-supplier"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var supplierId = button.getAttribute('data-id');
        var shouldDelete = window.confirm('Delete supplier record?');
        if (!shouldDelete) return;

        var db = window.WMS.getDb();
        db.suppliers = (db.suppliers || []).filter(function (item) {
          return item.id !== supplierId;
        });
        window.WMS.addActivity(db, 'Delete', 'Deleted supplier record');
        window.WMS.app.commitDb(db, 'Supplier deleted');
      });
    });
  }

  function bindForm() {
    var form = document.getElementById('supplierForm');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var supplierId = document.getElementById('supplierId').value;
      var successMessage;
      var payload = {
        name: document.getElementById('supplierName').value.trim(),
        contact: document.getElementById('supplierContact').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        email: document.getElementById('supplierEmail').value.trim()
      };

      if (!payload.name) {
        window.WMS.notify('Supplier name is required', 'error');
        return;
      }

      if (supplierId) {
        var existing = (db.suppliers || []).find(function (item) {
          return item.id === supplierId;
        });
        if (existing) {
          Object.assign(existing, payload);
          window.WMS.addActivity(db, 'Update', 'Updated supplier ' + payload.name);
          successMessage = 'Supplier updated';
        }
      } else {
        db.suppliers.push(Object.assign({ id: window.WMS.makeId('sup') }, payload));
        window.WMS.addActivity(db, 'Create', 'Added supplier ' + payload.name);
        successMessage = 'Supplier saved';
      }

      window.WMS.app.commitDb(db, successMessage, function () {
        form.reset();
        document.getElementById('supplierId').value = '';
        document.getElementById('cancelSupplierEdit').classList.add('hidden');
      });
    });

    document.getElementById('cancelSupplierEdit').addEventListener('click', function () {
      form.reset();
      document.getElementById('supplierId').value = '';
      document.getElementById('cancelSupplierEdit').classList.add('hidden');
    });
  }

  window.WMS.suppliersModule = {
    init: function () {
      bindForm();
      render();
    },
    render: render
  };
})();
