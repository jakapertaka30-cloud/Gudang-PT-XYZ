(function () {
  var DB_KEY = 'wms_mattress_db';

  function makeId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function seedMaterials() {
    return [
      {
        id: 'mat-fabric-topper',
        code: 'MAT-FAB-001',
        name: 'Kain Topper',
        category: 'Kain',
        uom: 'm',
        reorderLevel: 20,
        description: 'Kain untuk bagian topper kasur'
      },
      {
        id: 'mat-fabric-bottom',
        code: 'MAT-FAB-002',
        name: 'Kain Bottom',
        category: 'Kain',
        uom: 'm',
        reorderLevel: 20,
        description: 'Kain untuk bagian bawah kasur'
      },
      {
        id: 'mat-fabric-side',
        code: 'MAT-FAB-003',
        name: 'Kain Side',
        category: 'Kain',
        uom: 'm',
        reorderLevel: 20,
        description: 'Kain untuk sisi kasur'
      },
      {
        id: 'mat-foam-d17',
        code: 'MAT-FOM-017',
        name: 'Busa Density 17',
        category: 'Busa',
        uom: 'pcs',
        reorderLevel: 20,
        description: 'Busa dengan density 17'
      },
      {
        id: 'mat-foam-d18',
        code: 'MAT-FOM-018',
        name: 'Busa D18',
        category: 'Busa',
        uom: 'pcs',
        reorderLevel: 20,
        description: 'Busa dengan density 18'
      },
      {
        id: 'mat-foam-d25',
        code: 'MAT-FOM-025',
        name: 'Busa D25',
        category: 'Busa',
        uom: 'pcs',
        reorderLevel: 20,
        description: 'Busa dengan density 25'
      },
      {
        id: 'mat-wire-18',
        code: 'MAT-WIR-018',
        name: 'Kawat diameter 1.8mm',
        category: 'Kawat',
        uom: 'kg',
        reorderLevel: 10,
        description: 'Kawat berdiameter 1.8 mm'
      },
      {
        id: 'mat-wire-20',
        code: 'MAT-WIR-020',
        name: 'Kawat Dia 2.0mm',
        category: 'Kawat',
        uom: 'kg',
        reorderLevel: 10,
        description: 'Kawat berdiameter 2.0 mm'
      },
      {
        id: 'mat-wire-22',
        code: 'MAT-WIR-022',
        name: 'Kawat Dia 2.2mm',
        category: 'Kawat',
        uom: 'kg',
        reorderLevel: 10,
        description: 'Kawat berdiameter 2.2 mm'
      },
      {
        id: 'mat-thread-black',
        code: 'MAT-THR-BLK',
        name: 'Benang Hitam',
        category: 'Benang',
        uom: 'roll',
        reorderLevel: 10,
        description: 'Benang warna hitam'
      },
      {
        id: 'mat-thread-white',
        code: 'MAT-THR-WHT',
        name: 'Benang Putih',
        category: 'Benang',
        uom: 'roll',
        reorderLevel: 10,
        description: 'Benang warna putih'
      },
      {
        id: 'mat-webbing-black',
        code: 'MAT-WEB-BLK',
        name: 'Pita webbing Hitam',
        category: 'Webbing',
        uom: 'm',
        reorderLevel: 20,
        description: 'Pita webbing warna hitam'
      },
      {
        id: 'mat-webbing-navy',
        code: 'MAT-WEB-NVY',
        name: 'Pita webbing Navy',
        category: 'Webbing',
        uom: 'm',
        reorderLevel: 20,
        description: 'Pita webbing warna navy'
      },
      {
        id: 'mat-cotton-sheet',
        code: 'MAT-COT-001',
        name: 'Cotton Sheet',
        category: 'Cotton',
        uom: 'lembar',
        reorderLevel: 10,
        description: 'Lembaran cotton untuk produksi kasur'
      }
    ];
  }

  function seedSuppliers() {
    return [
      {
        id: 'sup-1',
        name: 'Sinar Foam Indonesia',
        contact: 'Andi Wijaya',
        phone: '0812345001',
        email: 'andi@sinarfoam.id'
      },
      {
        id: 'sup-2',
        name: 'Batik Tekstil',
        contact: 'Dewi Lestari',
        phone: '0812345002',
        email: 'dewi@batiktekstil.co'
      },
      {
        id: 'sup-3',
        name: 'Makmur Spring',
        contact: 'Rizal Fadli',
        phone: '0812345003',
        email: 'rizal@makmurspring.id'
      }
    ];
  }

  function seedLocations() {
    return [
      { id: 'loc-rm-101', name: 'RM-101', zone: 'Raw Material', rack: 'A1' },
      { id: 'loc-rm-102', name: 'RM-102', zone: 'Raw Material', rack: 'A2' },
      { id: 'loc-fg-201', name: 'FG-201', zone: 'Finished Goods', rack: 'B1' }
    ];
  }

  function seedStock() {
    return [
      { id: 'stock-1', materialId: 'mat-foam-d17', locationId: 'loc-rm-101', qty: 60, lotNo: 'BF-2025-01', lastUpdated: new Date().toISOString(), status: 'Available' },
      { id: 'stock-2', materialId: 'mat-fabric-topper', locationId: 'loc-rm-102', qty: 12, lotNo: 'KN-2025-02', lastUpdated: new Date().toISOString(), status: 'Low' },
      { id: 'stock-3', materialId: 'mat-webbing-black', locationId: 'loc-rm-101', qty: 25, lotNo: 'WB-2025-01', lastUpdated: new Date().toISOString(), status: 'Available' }
    ];
  }

  function seedActivities() {
    return [
      { id: 'act-1', action: 'Receiving', description: 'Menerima Busa Density 17 dari Sinar Foam Indonesia', createdAt: new Date().toISOString() },
      { id: 'act-2', action: 'QC', description: 'Pemeriksaan Kain Topper lulus', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'act-3', action: 'Putaway', description: 'Memindahkan Pita webbing Hitam ke RM-101', createdAt: new Date(Date.now() - 7200000).toISOString() }
    ];
  }

  function buildDemoDb() {
    return {
      materials: seedMaterials(),
      suppliers: seedSuppliers(),
      locations: seedLocations(),
      receipts: [
        { id: 'rcpt-1', receiptNo: 'RCPT-1001', supplierId: 'sup-1', materialId: 'mat-foam-d17', qty: 60, unitCost: 150000, lotNo: 'BF-2025-01', notes: 'Stok awal', date: new Date().toISOString() },
        { id: 'rcpt-2', receiptNo: 'RCPT-1002', supplierId: 'sup-2', materialId: 'mat-fabric-topper', qty: 20, unitCost: 85000, lotNo: 'KN-2025-02', notes: 'Stok awal kain topper', date: new Date(Date.now() - 86400000).toISOString() }
      ],
      receiptItems: [
        { id: 'ri-1', receiptId: 'rcpt-1', materialId: 'mat-foam-d17', qty: 60, unitCost: 150000, lotNo: 'BF-2025-01' },
        { id: 'ri-2', receiptId: 'rcpt-2', materialId: 'mat-fabric-topper', qty: 20, unitCost: 85000, lotNo: 'KN-2025-02' }
      ],
      qc: [
        { id: 'qc-1', materialId: 'mat-fabric-topper', status: 'Pass', inspector: 'QA Team', remarks: 'Tidak ditemukan cacat pada sampel', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'qc-2', materialId: 'mat-foam-d17', status: 'Pass', inspector: 'QA Team', remarks: 'Density sesuai standar', createdAt: new Date(Date.now() - 10800000).toISOString() }
      ],
      putaways: [
        { id: 'pa-1', materialId: 'mat-webbing-black', locationId: 'loc-rm-101', qty: 25, remarks: 'Stok webbing produksi', createdAt: new Date(Date.now() - 7200000).toISOString() }
      ],
      issues: [
        { id: 'iss-1', materialId: 'mat-fabric-topper', locationId: 'loc-rm-102', qty: 8, purpose: 'Produksi', issuedTo: 'Tim Produksi', createdAt: new Date(Date.now() - 43200000).toISOString() }
      ],
      stock: seedStock(),
      movements: [
        { id: 'mv-1', type: 'IN', materialId: 'mat-foam-d17', locationId: 'loc-rm-101', qty: 60, stockBefore: 0, stockAfter: 60, referenceNo: 'RCPT-1001', createdAt: new Date().toISOString(), remarks: 'Penerimaan stok awal' },
        { id: 'mv-2', type: 'IN', materialId: 'mat-fabric-topper', locationId: 'loc-rm-102', qty: 20, stockBefore: 0, stockAfter: 20, referenceNo: 'RCPT-1002', createdAt: new Date(Date.now() - 86400000).toISOString(), remarks: 'Penerimaan stok awal kain topper' },
        { id: 'mv-3', type: 'OUT', materialId: 'mat-fabric-topper', locationId: 'loc-rm-102', qty: -8, stockBefore: 20, stockAfter: 12, referenceNo: 'ISS-1001', createdAt: new Date(Date.now() - 43200000).toISOString(), remarks: 'Pemakaian produksi' },
        { id: 'mv-4', type: 'IN', materialId: 'mat-webbing-black', locationId: 'loc-rm-101', qty: 25, stockBefore: 0, stockAfter: 25, referenceNo: 'PA-1001', createdAt: new Date(Date.now() - 7200000).toISOString(), remarks: 'Stok webbing produksi' }
      ],
      opnames: [
        { id: 'op-1', materialId: 'mat-foam-d17', locationId: 'loc-rm-101', countedQty: 60, systemQty: 60, variance: 0, notes: 'Tidak ada selisih', createdAt: new Date().toISOString() }
      ],
      activities: seedActivities(),
      settings: {
        companyName: 'Mattress Manufacturing',
        timezone: 'Asia/Jakarta'
      }
    };
  }

  function buildEmptyDb() {
    return normalizeDb({});
  }

  function normalizeDb(rawDb) {
    var db = rawDb || {};
    return {
      schemaVersion: 2,
      materials: Array.isArray(db.materials) ? db.materials : [],
      suppliers: Array.isArray(db.suppliers) ? db.suppliers : [],
      locations: Array.isArray(db.locations) ? db.locations : [],
      receipts: Array.isArray(db.receipts) ? db.receipts : [],
      receiptItems: Array.isArray(db.receiptItems) ? db.receiptItems : [],
      qc: Array.isArray(db.qc) ? db.qc : [],
      putaways: Array.isArray(db.putaways) ? db.putaways : [],
      issues: Array.isArray(db.issues) ? db.issues : [],
      stock: Array.isArray(db.stock) ? db.stock : [],
      movements: Array.isArray(db.movements) ? db.movements : [],
      opnames: Array.isArray(db.opnames) ? db.opnames : [],
      activities: Array.isArray(db.activities) ? db.activities : [],
      kpiHistory: Array.isArray(db.kpiHistory) ? db.kpiHistory : [],
      decisionLogs: Array.isArray(db.decisionLogs) ? db.decisionLogs : [],
      correctiveActions: Array.isArray(db.correctiveActions) ? db.correctiveActions : [],
      performanceSettings: db.performanceSettings && typeof db.performanceSettings === 'object'
        ? db.performanceSettings
        : {},
      settings: db.settings || {}
    };
  }

  function loadDb() {
    var raw;
    try {
      raw = localStorage.getItem(DB_KEY);
    } catch (error) {
      console.error('Unable to read localStorage database', error);
      throw new Error('Data lokal tidak dapat dibaca. Data lama tidak diubah.');
    }
    if (raw === null) return null;

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error('Unable to parse localStorage database', error);
      throw new Error('Data lokal tidak valid. Reset dibatalkan agar data tersimpan tidak tertimpa.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Format data lokal tidak valid. Reset dibatalkan agar data tersimpan tidak tertimpa.');
    }
    var normalized = normalizeDb(parsed);
    if (parsed.schemaVersion !== normalized.schemaVersion) {
      saveDb(normalized);
    }
    return normalized;
  }

  function saveDb(db, options) {
    var normalized = normalizeDb(db);
    localStorage.setItem(DB_KEY, JSON.stringify(normalized));
    if (!(options && options.skipRemote) && typeof window.WMS.remoteSaveDb === 'function') {
      return window.WMS.remoteSaveDb(normalized);
    }
    return normalized;
  }

  function ensureDb() {
    var currentDb = loadDb();
    if (!currentDb) {
      var seeded = buildDemoDb();
      saveDb(seeded);
      return seeded;
    }
    return currentDb;
  }

  function getMaterialStock(db, materialId) {
    return (db.stock || []).reduce(function (sum, row) {
      return row.materialId === materialId ? sum + Number(row.qty || 0) : sum;
    }, 0);
  }

  function createStockMovement(db, movement) {
    var material = (db.materials || []).find(function (item) {
      return item.id === movement.materialId;
    });
    if (!material) {
      throw new Error('Bahan baku tidak ditemukan.');
    }

    var before = getMaterialStock(db, material.id);
    var delta = Number(movement.qty || 0);
    if (!Number.isFinite(delta)) {
      throw new Error('Jumlah stok tidak valid.');
    }
    if (before + delta < 0) {
      throw new Error('Stok tidak mencukupi. Stok tersedia: ' + before + '.');
    }

    var timestamp = movement.date ? new Date(movement.date).toISOString() : new Date().toISOString();
    var stockRows = db.stock || (db.stock = []);
    if (delta > 0) {
      var target = stockRows.find(function (row) {
        return row.materialId === material.id;
      });
      if (!target) {
        target = {
          id: makeId('stock'),
          materialId: material.id,
          locationId: movement.locationId || ((db.locations || [])[0] || {}).id || 'warehouse-main',
          qty: 0,
          lotNo: movement.lotNo || 'N/A'
        };
        stockRows.push(target);
      }
      target.qty = Number(target.qty || 0) + delta;
      target.lastUpdated = timestamp;
      target.status = setStockStatus(target.qty, material.reorderLevel, material.maxStock);
    } else if (delta < 0) {
      var remaining = Math.abs(delta);
      stockRows.filter(function (row) {
        return row.materialId === material.id;
      }).forEach(function (row) {
        var reduction = Math.min(Number(row.qty || 0), remaining);
        row.qty = Number(row.qty || 0) - reduction;
        row.lastUpdated = timestamp;
        row.status = setStockStatus(row.qty, material.reorderLevel, material.maxStock);
        remaining -= reduction;
      });
    }

    var stockAfter = before + delta;
    db.movements = db.movements || [];
    db.movements.unshift({
      id: makeId('mv'),
      type: movement.type,
      materialId: material.id,
      locationId: movement.locationId || null,
      qty: delta,
      stockBefore: before,
      stockAfter: stockAfter,
      referenceNo: movement.referenceNo || '-',
      createdAt: timestamp,
      remarks: movement.remarks || ''
    });
    return { stockBefore: before, stockAfter: stockAfter, material: material };
  }

  function addActivity(db, action, description) {
    db.activities = db.activities || [];
    db.activities.unshift({
      id: makeId('act'),
      action: action,
      description: description,
      createdAt: new Date().toISOString()
    });
    if (db.activities.length > 12) {
      db.activities = db.activities.slice(0, 12);
    }
  }

  function recordMovement(db, type, materialId, locationId, qty, referenceNo, remarks) {
    db.movements = db.movements || [];
    db.movements.unshift({
      id: makeId('mv'),
      type: type,
      materialId: materialId,
      locationId: locationId,
      qty: qty,
      referenceNo: referenceNo || '-',
      createdAt: new Date().toISOString(),
      remarks: remarks || ''
    });
  }

  function setStockStatus(stockQty, reorderLevel, maxStock) {
    return window.WMS.getStockStatus(stockQty, reorderLevel, maxStock);
  }

  function updateStock(db, materialId, locationId, qtyDelta, options) {
    options = options || {};
    var stockRows = db.stock || [];
    var match = stockRows.find(function (row) {
      return row.materialId === materialId && row.locationId === locationId;
    });

    if (match) {
      match.qty = Math.max(0, Number(match.qty || 0) + Number(qtyDelta || 0));
      match.lastUpdated = new Date().toISOString();
      match.status = setStockStatus(match.qty, options.reorderLevel, options.maxStock);
      if (match.qty <= 0) {
        match.qty = 0;
      }
    } else if (Number(qtyDelta || 0) > 0) {
      stockRows.push({
        id: makeId('stock'),
        materialId: materialId,
        locationId: locationId,
        qty: Number(qtyDelta || 0),
        lotNo: options.lotNo || 'N/A',
        lastUpdated: new Date().toISOString(),
        status: setStockStatus(Number(qtyDelta || 0), options.reorderLevel, options.maxStock)
      });
    }

    db.stock = stockRows;
    recordMovement(db, options.type || 'Adjustment', materialId, locationId, Number(qtyDelta || 0), options.referenceNo || '-', options.remarks || '');
  }

  window.WMS = window.WMS || {};
  window.WMS.DB_KEY = DB_KEY;
  window.WMS.makeId = makeId;
  window.WMS.buildDemoDb = buildDemoDb;
  window.WMS.buildEmptyDb = buildEmptyDb;
  window.WMS.normalizeDb = normalizeDb;
  window.WMS.ensureDb = ensureDb;
  window.WMS.loadDb = loadDb;
  window.WMS.saveDb = saveDb;
  window.WMS.addActivity = addActivity;
  window.WMS.recordMovement = recordMovement;
  window.WMS.updateStock = updateStock;
  window.WMS.getMaterialStock = getMaterialStock;
  window.WMS.createStockMovement = createStockMovement;
  window.WMS.setStockStatus = setStockStatus;
})();
