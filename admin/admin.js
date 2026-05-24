// DOM Views
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const adminUserName = document.getElementById('admin-user-name');

// View switching state
let currentView = 'dashboard';

// DOM Elements
const views = document.querySelectorAll('.admin-view');
const menuItems = document.querySelectorAll('.sidebar-item');

// Dashboard Widgets
const widgetTotalProduk = document.getElementById('widget-total-produk');
const widgetTotalPengguna = document.getElementById('widget-total-pengguna');
const widgetPinjamAktif = document.getElementById('widget-pinjam-aktif');
const widgetStokKritis = document.getElementById('widget-stok-kritis');
const dashboardActiveLoansTable = document.getElementById('dashboard-active-loans-table');

// Tables
const usersTableBody = document.getElementById('users-table-body');
const productsTableBody = document.getElementById('products-table-body');
const loansTableBody = document.getElementById('loans-table-body');

// Modals
const userModal = document.getElementById('user-modal');
const userModalTitle = document.getElementById('user-modal-title');
const userModalId = document.getElementById('user-modal-id');
const userModalNama = document.getElementById('user-modal-nama');
const userModalEmail = document.getElementById('user-modal-email');
const userModalPassword = document.getElementById('user-modal-password');
const userModalType = document.getElementById('user-modal-type');

const productModal = document.getElementById('product-modal');
const productModalTitle = document.getElementById('product-modal-title');
const productModalId = document.getElementById('product-modal-id');
const productModalNama = document.getElementById('product-modal-nama');
const productModalStok = document.getElementById('product-modal-stok');
const productModalDeskripsi = document.getElementById('product-modal-deskripsi');

// Auth Form Inputs
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

// Active State
let loggedInAdmin = null;

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    
    // Storage sync listener
    window.addEventListener('storage', () => {
        checkSession();
    });
});

// Check Session & Route View
function checkSession() {
    loggedInAdmin = dbUser.getCurrentSession();
    
    if (loggedInAdmin && loggedInAdmin.TYPE === 'Admin') {
        authView.style.display = 'none';
        dashboardView.style.display = 'flex';
        adminUserName.textContent = loggedInAdmin.NAMA;
        
        refreshAllData();
    } else {
        authView.style.display = 'flex';
        dashboardView.style.display = 'none';
        loggedInAdmin = null;
    }
}

// Toggle Tab Login / Register
function toggleAuthTab(tab) {
    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    }
}

// Form Submission: Login
function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    try {
        dbUser.login(email, pass, 'Admin');
        
        // Reset form
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        checkSession();
    } catch (err) {
        alert("Gagal masuk admin: " + err.message);
    }
}

// Form Submission: Register
function handleRegisterSubmit(e) {
    e.preventDefault();
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    
    try {
        dbUser.register(nama, email, pass, 'Admin');
        
        // Reset form
        document.getElementById('reg-nama').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        
        checkSession();
    } catch (err) {
        alert("Gagal mendaftar admin: " + err.message);
    }
}

// Logout handler
function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar dari panel Admin?")) {
        dbUser.logout();
        checkSession();
    }
}

// View switcher
function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    menuItems.forEach(m => m.classList.remove('active'));
    
    document.getElementById(`view-${viewId}`).classList.add('active');
    document.getElementById(`menu-${viewId}`).classList.add('active');
    currentView = viewId;
    
    // Refresh table content on switch
    refreshAllData();
}

// Global data refresh
function refreshAllData() {
    if (!loggedInAdmin) return;
    renderDashboardWidgets();
    renderDashboardActiveLoans();
    renderUsersTable();
    renderProductsTable();
    renderLoansTable();
}

// --- 1. DASHBOARD VIEW ---
function renderDashboardWidgets() {
    const products = dbProduct.getAll();
    const users = dbUser.getAll();
    const loans = dbRequest.getAll();
    
    const totalProd = products.length;
    const totalUsers = users.length;
    const activeLoans = loans.filter(l => l.IS_PINJAM).length;
    const criticalStok = products.filter(p => p.STOK <= 3).length;
    
    widgetTotalProduk.textContent = totalProd;
    widgetTotalPengguna.textContent = totalUsers;
    widgetPinjamAktif.textContent = activeLoans;
    widgetStokKritis.textContent = criticalStok;
}

function renderDashboardActiveLoans() {
    dashboardActiveLoansTable.innerHTML = '';
    const activeLoans = dbRequest.getAll().filter(l => l.IS_PINJAM);
    
    if (activeLoans.length === 0) {
        dashboardActiveLoansTable.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    <i class="fa-solid fa-face-smile" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
                    Tidak ada peminjaman aktif saat ini.
                </td>
            </tr>
        `;
        return;
    }
    
    activeLoans.sort((a,b) => b.ID_PERMINTAAN - a.ID_PERMINTAAN);
    
    activeLoans.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${l.ID_PERMINTAAN}</td>
            <td><strong>${l.PENGGUNA_NAMA}</strong></td>
            <td>${l.PRODUK_NAMA}</td>
            <td>${l.STOK_PINJAM} unit</td>
            <td><span class="badge badge-warning">Dipinjam</span></td>
            <td>
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="returnProduct(${l.ID_PERMINTAAN})">
                    <i class="fa-solid fa-arrow-rotate-left"></i> Kembalikan
                </button>
            </td>
        `;
        dashboardActiveLoansTable.appendChild(tr);
    });
}

// --- 2. USERS MANAGEMENT VIEW ---
function renderUsersTable() {
    if (currentView !== 'users') return;
    usersTableBody.innerHTML = '';
    
    const query = document.getElementById('user-search').value.toLowerCase();
    const filterRole = document.getElementById('user-role-filter').value;
    
    let users = dbUser.getAll();
    
    // Filter
    if (query) {
        users = users.filter(u => u.NAMA.toLowerCase().includes(query) || (u.EMAIL && u.EMAIL.toLowerCase().includes(query)));
    }
    if (filterRole) {
        users = users.filter(u => u.TYPE === filterRole);
    }
    
    if (users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Tidak ada pengguna ditemukan.</td></tr>`;
        return;
    }
    
    users.forEach(u => {
        const tr = document.createElement('tr');
        const roleBadge = u.TYPE === 'Admin' ? 'badge-primary' : 'badge-secondary';
        
        tr.innerHTML = `
            <td>${u.ID}</td>
            <td><strong>${u.NAMA}</strong></td>
            <td>${u.EMAIL || '<span style="color:var(--text-muted)">-</span>'}</td>
            <td><span class="badge ${roleBadge}">${u.TYPE}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-icon-edit" onclick="editUser(${u.ID})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-delete" onclick="deleteUser(${u.ID})" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
}

// USER CRUD Operations
function openUserModal(userId = null) {
    if (userId) {
        const u = dbUser.getById(userId);
        if (!u) return;
        userModalTitle.textContent = "Edit Pengguna";
        userModalId.value = u.ID;
        userModalNama.value = u.NAMA;
        userModalEmail.value = u.EMAIL;
        userModalPassword.value = u.PASSWORD || '';
        userModalType.value = u.TYPE;
    } else {
        userModalTitle.textContent = "Tambah Pengguna Baru";
        userModalId.value = '';
        userModalNama.value = '';
        userModalEmail.value = '';
        userModalPassword.value = '';
        userModalType.value = 'Klien';
    }
    userModal.classList.add('active');
}

function closeUserModal() {
    userModal.classList.remove('active');
}

function submitUserForm() {
    const id = userModalId.value;
    const data = {
        nama: userModalNama.value.trim(),
        email: userModalEmail.value.trim(),
        type: userModalType.value
    };
    
    const passwordVal = userModalPassword.value.trim();
    if (passwordVal) {
        data.password = passwordVal;
    }
    
    if (!data.nama) {
        alert("Nama lengkap tidak boleh kosong!");
        return;
    }
    
    try {
        if (id) {
            dbUser.update(id, data);
            alert("Pengguna berhasil diperbarui!");
        } else {
            // Set password to default if empty during user creation
            if (!data.password) data.password = 'password123';
            dbUser.add(data);
            alert("Pengguna baru berhasil ditambahkan!");
        }
        closeUserModal();
        refreshAllData();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

function editUser(id) {
    openUserModal(id);
}

function deleteUser(id) {
    if (confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
        try {
            dbUser.delete(id);
            alert("Pengguna berhasil dihapus!");
            refreshAllData();
        } catch (e) {
            alert("Gagal menghapus: " + e.message);
        }
    }
}

// --- 3. PRODUCTS MANAGEMENT VIEW ---
function renderProductsTable() {
    if (currentView !== 'products') return;
    productsTableBody.innerHTML = '';
    
    const query = document.getElementById('product-search').value.toLowerCase();
    const filterStock = document.getElementById('product-stock-filter').value;
    
    let products = dbProduct.getAll();
    
    // Filter
    if (query) {
        products = products.filter(p => p.NAMA.toLowerCase().includes(query));
    }
    if (filterStock) {
        if (filterStock === 'available') products = products.filter(p => p.STOK > 0);
        else if (filterStock === 'empty') products = products.filter(p => p.STOK === 0);
        else if (filterStock === 'critical') products = products.filter(p => p.STOK <= 3);
    }
    
    if (products.length === 0) {
        productsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Tidak ada produk ditemukan.</td></tr>`;
        return;
    }
    
    products.forEach(p => {
        const tr = document.createElement('tr');
        
        let stockClass = '';
        if (p.STOK === 0) stockClass = 'badge badge-danger';
        else if (p.STOK <= 3) stockClass = 'badge badge-warning';
        else stockClass = 'badge badge-success';
        
        tr.innerHTML = `
            <td>${p.ID}</td>
            <td><strong>${p.NAMA}</strong></td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.DESKRIPSI || '-'}</td>
            <td><span class="${stockClass}">${p.STOK} unit</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-icon-edit" onclick="editProduct(${p.ID})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-delete" onclick="deleteProduct(${p.ID})" title="Hapus"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        productsTableBody.appendChild(tr);
    });
}

// PRODUCT CRUD Operations
function openProductModal(productId = null) {
    if (productId) {
        const p = dbProduct.getById(productId);
        if (!p) return;
        productModalTitle.textContent = "Edit Produk Inventaris";
        productModalId.value = p.ID;
        productModalNama.value = p.NAMA;
        productModalStok.value = p.STOK;
        productModalDeskripsi.value = p.DESKRIPSI;
    } else {
        productModalTitle.textContent = "Tambah Produk Baru";
        productModalId.value = '';
        productModalNama.value = '';
        productModalStok.value = '0';
        productModalDeskripsi.value = '';
    }
    productModal.classList.add('active');
}

function closeProductModal() {
    productModal.classList.remove('active');
}

function submitProductForm() {
    const id = productModalId.value;
    const data = {
        nama: productModalNama.value.trim(),
        stok: parseInt(productModalStok.value),
        deskripsi: productModalDeskripsi.value.trim()
    };
    
    if (!data.nama) {
        alert("Nama produk tidak boleh kosong!");
        return;
    }
    if (isNaN(data.stok) || data.stok < 0) {
        alert("Stok barang harus berupa angka positif!");
        return;
    }
    
    try {
        if (id) {
            dbProduct.update(id, data);
            alert("Produk berhasil diperbarui!");
        } else {
            dbProduct.add(data);
            alert("Produk baru berhasil ditambahkan!");
        }
        closeProductModal();
        refreshAllData();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// Editing
function editProduct(id) {
    openProductModal(id);
}

function deleteProduct(id) {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
        try {
            dbProduct.delete(id);
            alert("Produk berhasil dihapus!");
            refreshAllData();
        } catch (e) {
            alert("Gagal menghapus: " + e.message);
        }
    }
}

// --- 4. LOAN TRANSACTIONS VIEW ---
function renderLoansTable() {
    if (currentView !== 'loans') return;
    loansTableBody.innerHTML = '';
    
    const query = document.getElementById('loan-search').value.toLowerCase();
    const filterStatus = document.getElementById('loan-status-filter').value;
    
    let loans = dbRequest.getAll();
    
    // Search filter
    if (query) {
        loans = loans.filter(l => 
            l.PRODUK_NAMA.toLowerCase().includes(query) || 
            l.PENGGUNA_NAMA.toLowerCase().includes(query)
        );
    }
    
    // Status filter
    if (filterStatus) {
        if (filterStatus === 'pinjam') loans = loans.filter(l => l.IS_PINJAM === true);
        else if (filterStatus === 'kembali') loans = loans.filter(l => l.IS_PINJAM === false);
    }
    
    if (loans.length === 0) {
        loansTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Tidak ada transaksi peminjaman ditemukan.</td></tr>`;
        return;
    }
    
    // Sort by loan ID descending (newest first)
    loans.sort((a,b) => b.ID_PERMINTAAN - a.ID_PERMINTAAN);
    
    loans.forEach(l => {
        const tr = document.createElement('tr');
        
        const statusBadge = l.IS_PINJAM 
            ? '<span class="badge badge-warning">Dipinjam</span>' 
            : '<span class="badge badge-success">Kembali (Selesai)</span>';
            
        const actionBtn = l.IS_PINJAM 
            ? `<button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="returnProduct(${l.ID_PERMINTAAN})">
                <i class="fa-solid fa-arrow-rotate-left"></i> Kembalikan
               </button>` 
            : '<span style="color:var(--text-muted)">-</span>';
            
        tr.innerHTML = `
            <td>#${l.ID_PERMINTAAN}</td>
            <td><strong>${l.PENGGUNA_NAMA}</strong></td>
            <td>${l.PRODUK_NAMA}</td>
            <td>${l.STOK_PINJAM} unit</td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        loansTableBody.appendChild(tr);
    });
}

function returnProduct(requestId) {
    if (confirm("Apakah Anda ingin memproses pengembalian barang untuk transaksi ini?")) {
        try {
            dbRequest.return(requestId);
            alert("Status barang berhasil diubah menjadi 'Sudah Dikembalikan'. Stok produk bertambah.");
            refreshAllData();
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
}

// --- 5. BACKUP & SQL INTEGRATION ---

// Download utility
function triggerDownload(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Export SQL dump
function exportDatabaseSQL() {
    try {
        const sqlDump = dbUtil.exportSQL();
        triggerDownload(sqlDump, 'datapeminjaman_dump.sql', 'text/sql');
    } catch (e) {
        alert("Gagal mengekspor SQL: " + e.message);
    }
}

// Export JSON backup
function exportDatabaseJSON() {
    try {
        const jsonBackup = dbUtil.exportJSON();
        triggerDownload(jsonBackup, 'datapeminjaman_backup.json', 'application/json');
    } catch (e) {
        alert("Gagal melakukan backup JSON: " + e.message);
    }
}

// Import JSON backup
function importDatabaseJSON() {
    const fileInput = document.getElementById('import-file-input');
    
    if (fileInput.files.length === 0) {
        alert("Silakan pilih file backup (.json) terlebih dahulu!");
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            dbUtil.importJSON(e.target.result);
            alert("Database local storage berhasil dipulihkan dari file backup!");
            fileInput.value = ''; // Reset file input
            refreshAllData();
        } catch (err) {
            alert("Gagal mengimpor file: " + err.message);
        }
    };
    
    reader.readAsText(file);
}

// Reset DB
function resetDatabaseToDefault() {
    if (confirm("PERINGATAN: Seluruh perubahan data Anda akan terhapus dan kembali seperti pengaturan awal pabrik (default). Apakah Anda yakin?")) {
        try {
            dbUtil.reset();
            alert("Database berhasil di-reset ke data default bawaan.");
            refreshAllData();
        } catch (e) {
            alert("Gagal mereset database: " + e.message);
        }
    }
}
