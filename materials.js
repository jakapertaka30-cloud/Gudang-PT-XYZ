(function () {
  function render() {
    var db = window.WMS.getDb();
    if (!db) return;

    var tableBody = document.getElementById('materialsTableBody');
    if (!tableBody) return;

    var materials = db.materials || [];
    var searchInput = document.getElementById('materialSearch');
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var filteredMaterials = materials.filter(function (material) {
      return !query ||
        (material.code || '').toLowerCase().includes(query) ||
        (material.name || '').toLowerCase().includes(query) ||
        (material.category || '').toLowerCase().includes(query);
    });

    document.getElementById('materialCount').textContent = materials.length;
    tableBody.innerHTML = '';

    if (!filteredMaterials.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 9;
      emptyCell.className = 'empty-state';
      emptyCell.textContent = query ? 'Bahan baku tidak ditemukan.' : 'Belum ada bahan baku.';
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
      return;
    }

    filteredMaterials.forEach(function (material) {
      var row = document.createElement('tr');
      var currentStock = window.WMS.getMaterialStock(db, material.id);
      var minimum = material.reorderLevel;
      var maximum = material.maxStock;
      var status = window.WMS.getStockStatus(currentStock, minimum, maximum);
      var values = [
        material.code || '-',
        material.name || '-',
        material.category || '-',
        material.uom || '-',
        minimum === null || minimum === undefined || minimum === '' ? '—' : window.WMS.formatQty(minimum),
        maximum === null || maximum === undefined || maximum === '' ? '—' : window.WMS.formatQty(maximum),
        window.WMS.formatQty(currentStock),
        status
      ];
      values.forEach(function (value, index) {
        var cell = document.createElement('td');
        cell.textContent = value;
        if (index === 2 || index === 7) {
          var category = document.createElement('span');
          category.className = index === 2 ? 'category-pill' : 'status-badge ' + window.WMS.statusClass(status);
          category.textContent = index === 2 ? value : status;
          cell.textContent = '';
          cell.appendChild(category);
        }
        row.appendChild(cell);
      });

      var actionCell = document.createElement('td');
      var actions = document.createElement('div');
      actions.className = 'table-actions';
      var editButton = document.createElement('button');
      editButton.className = 'table-btn';
      editButton.type = 'button';
      editButton.dataset.action = 'edit-material';
      editButton.dataset.id = material.id;
      editButton.textContent = 'Edit';
      var deleteButton = document.createElement('button');
      deleteButton.className = 'danger-btn table-delete-btn';
      deleteButton.type = 'button';
      deleteButton.dataset.action = 'delete-material';
      deleteButton.dataset.id = material.id;
      deleteButton.textContent = 'Hapus';
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll('[data-action="edit-material"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var materialId = button.dataset.id;
        var material = materials.find(function (item) {
          return item.id === materialId;
        });
        if (!material) return;

        document.getElementById('materialId').value = material.id;
        document.getElementById('materialCode').value = material.code || '';
        document.getElementById('materialName').value = material.name || '';
        var categorySelect = document.getElementById('materialCategory');
        var categoryValue = material.category || 'Lainnya';
        if (!Array.from(categorySelect.options).some(function (option) {
          return option.value === categoryValue;
        })) {
          var legacyCategory = document.createElement('option');
          legacyCategory.value = categoryValue;
          legacyCategory.textContent = categoryValue;
          categorySelect.appendChild(legacyCategory);
        }
        categorySelect.value = categoryValue;
        document.getElementById('materialUom').value = material.uom || 'pcs';
        document.getElementById('materialReorder').value = material.reorderLevel === null || material.reorderLevel === undefined ? 0 : material.reorderLevel;
        document.getElementById('materialMaximum').value = material.maxStock === null || material.maxStock === undefined ? '' : material.maxStock;
        document.getElementById('materialDescription').value = material.description || '';
        document.getElementById('materialFormHeading').textContent = 'Perbarui bahan baku';
        document.getElementById('saveMaterialBtn').textContent = 'Simpan perubahan';
        document.getElementById('cancelMaterialEdit').classList.remove('hidden');
        document.getElementById('materialCode').focus();
      });
    });

    tableBody.querySelectorAll('[data-action="delete-material"]').forEach(function (button) {
      button.addEventListener('click', function () {
        var materialId = button.dataset.id;
        var shouldDelete = window.confirm('Hapus data bahan baku ini?');
        if (!shouldDelete) return;

        db.materials = materials.filter(function (item) {
          return item.id !== materialId;
        });
        window.WMS.addActivity(db, 'Delete', 'Menghapus bahan baku dari data master');
        window.WMS.app.commitDb(db, 'Bahan baku berhasil dihapus.');
      });
    });
  }

  function resetForm(form) {
    form.reset();
    document.getElementById('materialId').value = '';
    document.getElementById('materialFormHeading').textContent = 'Tambah bahan baku';
    document.getElementById('saveMaterialBtn').textContent = 'Simpan bahan';
    document.getElementById('cancelMaterialEdit').classList.add('hidden');
  }

  function bindForm() {
    var form = document.getElementById('materialForm');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var db = window.WMS.getDb();
      var materialId = document.getElementById('materialId').value;
      var payload = {
        code: document.getElementById('materialCode').value.trim(),
        name: document.getElementById('materialName').value.trim(),
        category: document.getElementById('materialCategory').value,
        uom: document.getElementById('materialUom').value,
        reorderLevel: Number(document.getElementById('materialReorder').value),
        maxStock: document.getElementById('materialMaximum').value.trim() === ''
          ? null
          : Number(document.getElementById('materialMaximum').value),
        description: document.getElementById('materialDescription').value.trim()
      };

      if (!payload.code || !payload.name || !Number.isFinite(payload.reorderLevel) || payload.reorderLevel < 0 ||
        (payload.maxStock !== null && (!Number.isFinite(payload.maxStock) || payload.maxStock < payload.reorderLevel))) {
        window.WMS.notify('Kode, nama, minimum, dan maximum stock harus diisi dengan nilai yang valid; maximum tidak boleh di bawah minimum.', 'error');
        return;
      }
      var duplicateCode = (db.materials || []).some(function (item) {
        var existingCode = String(item.code || '').trim().toLowerCase();
        return existingCode === payload.code.toLowerCase() && item.id !== materialId;
      });
      if (duplicateCode) {
        window.WMS.notify('Kode bahan sudah digunakan', 'error');
        return;
      }

      if (materialId) {
        var existing = (db.materials || []).find(function (item) {
          return item.id === materialId;
        });
        if (existing) {
          Object.assign(existing, payload);
          window.WMS.addActivity(db, 'Update', 'Memperbarui bahan ' + payload.name);
        }
      } else {
        var newMaterial = Object.assign({
          id: window.WMS.makeId('mat')
        }, payload);
        db.materials.push(newMaterial);
        window.WMS.addActivity(db, 'Create', 'Menambahkan bahan ' + payload.name);
      }

      window.WMS.app.commitDb(
        db,
        materialId ? 'Bahan baku berhasil diperbarui.' : 'Bahan baku berhasil disimpan.',
        function () { resetForm(form); }
      );
    });

    document.getElementById('cancelMaterialEdit').addEventListener('click', function () {
      resetForm(form);
    });

    document.getElementById('materialSearch').addEventListener('input', render);
  }

  window.WMS.materialsModule = {
    init: function () {
      bindForm();
      render();
    },
    render: render
  };
})();
