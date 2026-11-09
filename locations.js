(function () {
  function render() {
    var db = window.WMS.getDb();
    if (!db) return;

    var tableBody = document.getElementById('locationsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    (db.locations || []).forEach(function (location) {
      var row = document.createElement('tr');
      [location.name, location.zone, location.rack].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = value || '-';
        row.appendChild(cell);
      });
      var actionsCell = document.createElement('td');
      var actions = document.createElement('div');
      actions.className = 'table-actions';
      [['edit-location', 'Edit', 'table-btn'], ['delete-location', 'Delete', 'danger-btn']].forEach(function (item) {
        var button = document.createElement('button');
        button.className = item[2];
        button.type = 'button';
        button.dataset.action = item[0];
        button.dataset.id = location.id;
        button.textContent = item[1];
        actions.appendChild(button);
      });
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll('[data-action="edit-location"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var locationId = button.getAttribute('data-id');
        var location = (db.locations || []).find(function (item) {
          return item.id === locationId;
        });
        if (!location) return;

        document.getElementById('locationId').value = location.id;
        document.getElementById('locationName').value = location.name || '';
        document.getElementById('locationZone').value = location.zone || '';
        document.getElementById('locationRack').value = location.rack || '';
        document.getElementById('cancelLocationEdit').classList.remove('hidden');
      });
    });

    tableBody.querySelectorAll('[data-action="delete-location"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var locationId = button.getAttribute('data-id');
        var shouldDelete = window.confirm('Delete location?');
        if (!shouldDelete) return;

        var db = window.WMS.getDb();
        db.locations = (db.locations || []).filter(function (item) {
          return item.id !== locationId;
        });
        window.WMS.addActivity(db, 'Delete', 'Deleted location record');
        window.WMS.app.commitDb(db, 'Location deleted');
      });
    });
  }

  function bindForm() {
    var form = document.getElementById('locationForm');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var locationId = document.getElementById('locationId').value;
      var successMessage;
      var payload = {
        name: document.getElementById('locationName').value.trim(),
        zone: document.getElementById('locationZone').value.trim(),
        rack: document.getElementById('locationRack').value.trim()
      };

      if (!payload.name || !payload.zone) {
        window.WMS.notify('Location name and zone are required', 'error');
        return;
      }

      if (locationId) {
        var existing = (db.locations || []).find(function (item) {
          return item.id === locationId;
        });
        if (existing) {
          Object.assign(existing, payload);
          window.WMS.addActivity(db, 'Update', 'Updated location ' + payload.name);
          successMessage = 'Location updated';
        }
      } else {
        db.locations.push(Object.assign({ id: window.WMS.makeId('loc') }, payload));
        window.WMS.addActivity(db, 'Create', 'Added location ' + payload.name);
        successMessage = 'Location saved';
      }

      window.WMS.app.commitDb(db, successMessage, function () {
        form.reset();
        document.getElementById('locationId').value = '';
        document.getElementById('cancelLocationEdit').classList.add('hidden');
      });
    });

    document.getElementById('cancelLocationEdit').addEventListener('click', function () {
      form.reset();
      document.getElementById('locationId').value = '';
      document.getElementById('cancelLocationEdit').classList.add('hidden');
    });
  }

  window.WMS.locationsModule = {
    init: function () {
      bindForm();
      render();
    },
    render: render
  };
})();
