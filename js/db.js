/**
 * db.js - Database Manager using localStorage (Updated with Login & Register)
 * Simulates SQLite tables: PENGGUNA, PRODUK, PERMINTAAN
 */

const DB_KEY = 'datapeminjaman_db';
const SESSION_KEY = 'datapeminjaman_session_user';

// Default mock data to seed if localStorage is empty
const defaultData = {
    pengguna: [
        { ID: 1, NAMA: 'Budi Santoso', EMAIL: 'budi@email.com', PASSWORD: 'password123', TYPE: 'Klien' },
        { ID: 2, NAMA: 'Siti Aminah', EMAIL: 'siti@email.com', PASSWORD: 'password123', TYPE: 'Klien' },
        { ID: 3, NAMA: 'Andi Wijaya', EMAIL: 'andi@email.com', PASSWORD: 'password123', TYPE: 'Admin' },
        { ID: 4, NAMA: 'Dewi Lestari', EMAIL: 'dewi@email.com', PASSWORD: 'password123', TYPE: 'Klien' }
    ],
    produk: [
        { ID: 1, NAMA: 'Laptop Asus ROG', STOK: 5, DESKRIPSI: 'Laptop gaming Core i7, RAM 16GB, RTX 3060' },
        { ID: 2, NAMA: 'Proyektor Epson EB-X400', STOK: 3, DESKRIPSI: 'Proyektor 3300 lumens, resolusi XGA' },
        { ID: 3, NAMA: 'Kamera Canon EOS 1500D', STOK: 2, DESKRIPSI: 'Kamera DSLR 24.1 MP dengan lensa kit 18-55mm' },
        { ID: 4, NAMA: 'Speaker Portable JBL', STOK: 7, DESKRIPSI: 'Speaker Bluetooth tahan air, bass mantap' },
        { ID: 5, NAMA: 'Wireless Presenter Logitech', STOK: 10, DESKRIPSI: 'Pointer laser merah untuk presentasi' }
    ],
    permintaan: [
        { ID_PERMINTAAN: 1, ID_PRODUK: 1, ID_PENGGUNA: 1, IS_PINJAM: true, STOK_PINJAM: 1 },
        { ID_PERMINTAAN: 2, ID_PRODUK: 2, ID_PENGGUNA: 2, IS_PINJAM: false, STOK_PINJAM: 1 }
    ]
};

// Initialize DB
function initDB() {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(defaultData));
    } else {
        // Upgrade database if existing users don't have PASSWORD field
        const data = JSON.parse(localStorage.getItem(DB_KEY));
        let updated = false;
        data.pengguna.forEach(u => {
            if (!u.PASSWORD) {
                u.PASSWORD = 'password123';
                updated = true;
            }
        });
        if (updated) {
            localStorage.setItem(DB_KEY, JSON.stringify(data));
        }
    }
}

// Helper to get raw data
function getRawData() {
    initDB();
    try {
        return JSON.parse(localStorage.getItem(DB_KEY));
    } catch (e) {
        console.error("Corrupted DB, resetting to default", e);
        localStorage.setItem(DB_KEY, JSON.stringify(defaultData));
        return defaultData;
    }
}

// Helper to save raw data
function saveRawData(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    // Trigger standard custom storage event so other tabs/frames can react
    window.dispatchEvent(new Event('storage'));
}

// --- PENGGUNA (USERS) CRUD & AUTH ---
const dbUser = {
    getAll: () => getRawData().pengguna,
    getById: (id) => getRawData().pengguna.find(u => u.ID == id),
    add: (user) => {
        const data = getRawData();
        const newId = data.pengguna.reduce((max, u) => u.ID > max ? u.ID : max, 0) + 1;
        const newUser = {
            ID: newId,
            NAMA: user.nama || 'Tanpa Nama',
            EMAIL: user.email || '',
            PASSWORD: user.password || 'password123',
            TYPE: user.type || 'Klien'
        };
        data.pengguna.push(newUser);
        saveRawData(data);
        return newUser;
    },
    update: (id, updatedFields) => {
        const data = getRawData();
        const index = data.pengguna.findIndex(u => u.ID == id);
        if (index !== -1) {
            data.pengguna[index] = {
                ...data.pengguna[index],
                NAMA: updatedFields.nama !== undefined ? updatedFields.nama : data.pengguna[index].NAMA,
                EMAIL: updatedFields.email !== undefined ? updatedFields.email : data.pengguna[index].EMAIL,
                PASSWORD: updatedFields.password !== undefined ? updatedFields.password : data.pengguna[index].PASSWORD,
                TYPE: updatedFields.type !== undefined ? updatedFields.type : data.pengguna[index].TYPE
            };
            saveRawData(data);
            return data.pengguna[index];
        }
        return null;
    },
    delete: (id) => {
        const data = getRawData();
        // Check if user has active borrowings
        const hasActive = data.permintaan.some(p => p.ID_PENGGUNA == id && p.IS_PINJAM == true);
        if (hasActive) {
            throw new Error("Tidak dapat menghapus pengguna karena sedang meminjam barang.");
        }
        data.pengguna = data.pengguna.filter(u => u.ID != id);
        saveRawData(data);
        return true;
    },

    // Authentication helpers
    login: (email, password, expectedType) => {
        const users = dbUser.getAll();
        const found = users.find(u => u.EMAIL.toLowerCase().trim() === email.toLowerCase().trim());
        
        if (!found) {
            throw new Error("Email tidak terdaftar.");
        }
        if (found.PASSWORD !== password) {
            throw new Error("Password salah.");
        }
        if (found.TYPE !== expectedType) {
            throw new Error(`Akses ditolak. Akun Anda terdaftar sebagai ${found.TYPE}, bukan ${expectedType}.`);
        }
        
        // Save session in sessionStorage
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(found));
        return found;
    },

    register: (nama, email, password, type) => {
        const users = dbUser.getAll();
        const exists = users.some(u => u.EMAIL.toLowerCase().trim() === email.toLowerCase().trim());
        
        if (exists) {
            throw new Error("Email sudah terdaftar. Gunakan email lain.");
        }
        
        const newUser = dbUser.add({ nama, email, password, type });
        // Auto-login after registration
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
        return newUser;
    },

    logout: () => {
        sessionStorage.removeItem(SESSION_KEY);
    },

    getCurrentSession: () => {
        try {
            const userStr = sessionStorage.getItem(SESSION_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }
};

// --- PRODUK (PRODUCTS) CRUD ---
const dbProduct = {
    getAll: () => getRawData().produk,
    getById: (id) => getRawData().produk.find(p => p.ID == id),
    add: (prod) => {
        const data = getRawData();
        const newId = data.produk.reduce((max, p) => p.ID > max ? p.ID : max, 0) + 1;
        const newProduct = {
            ID: newId,
            NAMA: prod.nama || 'Produk Baru',
            STOK: parseInt(prod.stok) || 0,
            DESKRIPSI: prod.deskripsi || ''
        };
        data.produk.push(newProduct);
        saveRawData(data);
        return newProduct;
    },
    update: (id, updatedFields) => {
        const data = getRawData();
        const index = data.produk.findIndex(p => p.ID == id);
        if (index !== -1) {
            data.produk[index] = {
                ...data.produk[index],
                NAMA: updatedFields.nama !== undefined ? updatedFields.nama : data.produk[index].NAMA,
                STOK: updatedFields.stok !== undefined ? parseInt(updatedFields.stok) : data.produk[index].STOK,
                DESKRIPSI: updatedFields.deskripsi !== undefined ? updatedFields.deskripsi : data.produk[index].DESKRIPSI
            };
            saveRawData(data);
            return data.produk[index];
        }
        return null;
    },
    delete: (id) => {
        const data = getRawData();
        // Check if product is currently borrowed
        const isBorrowed = data.permintaan.some(p => p.ID_PRODUK == id && p.IS_PINJAM == true);
        if (isBorrowed) {
            throw new Error("Tidak dapat menghapus produk karena sedang dipinjam.");
        }
        data.produk = data.produk.filter(p => p.ID != id);
        saveRawData(data);
        return true;
    }
};

// --- PERMINTAAN (BORROW REQUESTS) ---
const dbRequest = {
    getAll: () => {
        const data = getRawData();
        // Populate associations for easy UI display
        return data.permintaan.map(req => {
            const product = data.produk.find(p => p.ID == req.ID_PRODUK) || { NAMA: 'Produk Terhapus' };
            const user = data.pengguna.find(u => u.ID == req.ID_PENGGUNA) || { NAMA: 'Pengguna Terhapus' };
            return {
                ...req,
                PRODUK_NAMA: product.NAMA,
                PENGGUNA_NAMA: user.NAMA
            };
        });
    },
    
    // Core transaction: Borrow an item
    borrow: (userId, productId, qty) => {
        const data = getRawData();
        const product = data.produk.find(p => p.ID == productId);
        const user = data.pengguna.find(u => u.ID == userId);
        
        if (!product) throw new Error("Produk tidak ditemukan.");
        if (!user) throw new Error("Pengguna tidak ditemukan.");
        if (qty <= 0) throw new Error("Jumlah peminjaman harus lebih dari 0.");
        if (product.STOK < qty) throw new Error(`Stok tidak mencukupi. Tersedia: ${product.STOK}`);
        
        // Deduct stock
        product.STOK -= qty;
        
        // Create borrow request
        const newReqId = data.permintaan.reduce((max, r) => r.ID_PERMINTAAN > max ? r.ID_PERMINTAAN : max, 0) + 1;
        const newReq = {
            ID_PERMINTAAN: newReqId,
            ID_PRODUK: parseInt(productId),
            ID_PENGGUNA: parseInt(userId),
            IS_PINJAM: true,
            STOK_PINJAM: parseInt(qty)
        };
        
        data.permintaan.push(newReq);
        saveRawData(data);
        return newReq;
    },
    
    // Core transaction: Return an item
    return: (requestId) => {
        const data = getRawData();
        const req = data.permintaan.find(r => r.ID_PERMINTAAN == requestId);
        
        if (!req) throw new Error("Data peminjaman tidak ditemukan.");
        if (!req.IS_PINJAM) throw new Error("Barang sudah dikembalikan sebelumnya.");
        
        const product = data.produk.find(p => p.ID == req.ID_PRODUK);
        if (product) {
            // Restore stock
            product.STOK += req.STOK_PINJAM;
        }
        
        // Update borrow status
        req.IS_PINJAM = false;
        
        saveRawData(data);
        return req;
    }
};

// --- DATA UTILITY & INTEGRATION ---
const dbUtil = {
    reset: () => {
        localStorage.setItem(DB_KEY, JSON.stringify(defaultData));
        window.dispatchEvent(new Event('storage'));
    },
    
    importJSON: (jsonStr) => {
        try {
            const data = JSON.parse(jsonStr);
            if (!data.pengguna || !data.produk || !data.permintaan) {
                throw new Error("Format JSON tidak valid. Harus memiliki properti 'pengguna', 'produk', dan 'permintaan'.");
            }
            saveRawData(data);
            return true;
        } catch (e) {
            throw new Error("Gagal mengurai JSON: " + e.message);
        }
    },
    
    exportJSON: () => {
        const data = getRawData();
        return JSON.stringify(data, null, 2);
    },
    
    exportSQL: () => {
        const data = getRawData();
        let sql = `-- SQL Dump generated from browser localStorage\n`;
        sql += `-- Generated on ${new Date().toISOString()}\n\n`;
        
        sql += `DELETE FROM PERMINTAAN;\n`;
        sql += `DELETE FROM PRODUK;\n`;
        sql += `DELETE FROM PENGGUNA;\n\n`;
        
        // Pengguna (OMIT PASSWORD column to match original SQLite schema!)
        data.pengguna.forEach(u => {
            const name = u.NAMA.replace(/'/g, "''");
            const email = u.EMAIL ? `'${u.EMAIL.replace(/'/g, "''")}'` : 'NULL';
            const type = u.TYPE.replace(/'/g, "''");
            sql += `INSERT INTO PENGGUNA (ID, NAMA, EMAIL, TYPE) VALUES (${u.ID}, '${name}', ${email}, '${type}');\n`;
        });
        
        sql += `\n`;
        
        // Produk
        data.produk.forEach(p => {
            const name = p.NAMA.replace(/'/g, "''");
            const desc = p.DESKRIPSI ? `'${p.DESKRIPSI.replace(/'/g, "''")}'` : 'NULL';
            sql += `INSERT INTO PRODUK (ID, NAMA, STOK, DESKRIPSI) VALUES (${p.ID}, '${name}', ${p.STOK}, ${desc});\n`;
        });
        
        sql += `\n`;
        
        // Permintaan
        data.permintaan.forEach(r => {
            const isPinjam = r.IS_PINJAM ? 1 : 0;
            sql += `INSERT INTO PERMINTAAN (ID_PERMINTAAN, ID_PRODUK, ID_PENGGUNA, IS_PINJAM, STOK_PINJAM) VALUES (${r.ID_PERMINTAAN}, ${r.ID_PRODUK}, ${r.ID_PENGGUNA}, ${isPinjam}, ${r.STOK_PINJAM});\n`;
        });
        
        return sql;
    }
};

// Export to window object for global script access
window.dbUser = dbUser;
window.dbProduct = dbProduct;
window.dbRequest = dbRequest;
window.dbUtil = dbUtil;

// Run initial check
initDB();
