// DOM Views
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');

// Selectors inside Dashboard
const catalogGrid = document.getElementById('catalog-grid');
const historyList = document.getElementById('history-list');
const searchInput = document.getElementById('search-input');
const sessionUserName = document.getElementById('session-user-name');

// Modal Elements
const borrowModal = document.getElementById('borrow-modal');
const modalProdName = document.getElementById('modal-product-name');
const modalProdStock = document.getElementById('modal-product-stock');
const modalUserName = document.getElementById('modal-user-name');
const borrowQtyInput = document.getElementById('borrow-qty');
const qtyWarning = document.getElementById('qty-warning');
const btnSubmitBorrow = document.getElementById('btn-submit-borrow');

// Auth Form Inputs
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

// Active State
let loggedInUser = null;
let activeProductId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    
    // Global storage event listener for real-time synchronization
    window.addEventListener('storage', () => {
        checkSession();
    });
});

// Check Session & Route View
function checkSession() {
    loggedInUser = dbUser.getCurrentSession();
    
    // Validate session and role
    if (loggedInUser && loggedInUser.TYPE === 'Klien') {
        authView.style.display = 'none';
        dashboardView.style.display = 'block';
        sessionUserName.textContent = loggedInUser.NAMA;
        
        renderCatalog();
        renderHistory();
    } else {
        // If logged in as admin, ignore client session
        authView.style.display = 'flex';
        dashboardView.style.display = 'none';
        loggedInUser = null;
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
        dbUser.login(email, pass, 'Klien');
        
        // Reset form
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        checkSession();
    } catch (err) {
        alert("Gagal masuk: " + err.message);
    }
}

// Form Submission: Register
function handleRegisterSubmit(e) {
    e.preventDefault();
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    
    try {
        dbUser.register(nama, email, pass, 'Klien');
        
        // Reset form
        document.getElementById('reg-nama').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        
        checkSession();
    } catch (err) {
        alert("Gagal mendaftar: " + err.message);
    }
}

// Logout handler
function handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar dari portal Klien?")) {
        dbUser.logout();
        checkSession();
    }
}

// Render catalog items
function renderCatalog() {
    if (!loggedInUser) return;
    
    catalogGrid.innerHTML = '';
    const query = searchInput.value.toLowerCase();
    const products = dbProduct.getAll().filter(p => p.NAMA.toLowerCase().includes(query));
    
    if (products.length === 0) {
        catalogGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-box-open"></i>
                <p>Tidak ada produk yang cocok dengan pencarian Anda.</p>
            </div>
        `;
        return;
    }
    
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'glass-panel glass-card product-card';
        
        let stockBadgeClass = 'badge-success';
        if (p.STOK === 0) stockBadgeClass = 'badge-danger';
        else if (p.STOK <= 3) stockBadgeClass = 'badge-warning';
        
        const isOutOfStock = p.STOK <= 0;
        
        card.innerHTML = `
            <div class="product-info">
                <h3>${p.NAMA}</h3>
                <p class="product-desc">${p.DESKRIPSI || 'Tidak ada deskripsi.'}</p>
            </div>
            <div class="product-meta">
                <div class="product-stock">
                    <span class="stock-num ${p.STOK === 0 ? 'text-danger' : ''}">${p.STOK}</span>
                    <span class="stock-label">Stok Tersedia</span>
                </div>
                <div>
                    <button class="btn btn-secondary" ${isOutOfStock ? 'disabled' : ''} onclick="openBorrowModal(${p.ID})">
                        <i class="fa-solid fa-hand-holding"></i> ${isOutOfStock ? 'Stok Habis' : 'Pinjam'}
                    </button>
                </div>
            </div>
        `;
        catalogGrid.appendChild(card);
    });
}

// Render history list for active user
function renderHistory() {
    if (!loggedInUser) return;
    
    historyList.innerHTML = '';
    const requests = dbRequest.getAll().filter(r => r.ID_PENGGUNA == loggedInUser.ID);
    
    if (requests.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-history"></i>
                <p>Belum ada riwayat peminjaman untuk akun Anda.</p>
            </div>
        `;
        return;
    }
    
    // Sort: Borrowed first, then newest requests
    requests.sort((a, b) => {
        if (a.IS_PINJAM && !b.IS_PINJAM) return -1;
        if (!a.IS_PINJAM && b.IS_PINJAM) return 1;
        return b.ID_PERMINTAAN - a.ID_PERMINTAAN;
    });
    
    requests.forEach(r => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const statusBadge = r.IS_PINJAM 
            ? `<span class="badge badge-warning"><i class="fa-solid fa-hourglass-half"></i> Dipinjam</span>` 
            : `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Selesai</span>`;
            
        const actionBtn = r.IS_PINJAM 
            ? `<button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="returnProduct(${r.ID_PERMINTAAN})">
                <i class="fa-solid fa-arrow-rotate-left"></i> Kembalikan
               </button>` 
            : '';
            
        item.innerHTML = `
            <div class="history-detail">
                <h4>${r.PRODUK_NAMA}</h4>
                <div class="history-sub">
                    <span>Jumlah: <strong>${r.STOK_PINJAM} unit</strong></span>
                    <span>•</span>
                    <span>ID: #${r.ID_PERMINTAAN}</span>
                </div>
            </div>
            <div class="history-action">
                ${statusBadge}
                ${actionBtn}
            </div>
        `;
        historyList.appendChild(item);
    });
}

// Modal open/close
function openBorrowModal(productId) {
    if (!loggedInUser) return;
    
    const prod = dbProduct.getById(productId);
    
    if (!prod) return;
    
    activeProductId = productId;
    modalProdName.value = prod.NAMA;
    modalProdStock.value = prod.STOK;
    modalUserName.value = loggedInUser.NAMA;
    
    borrowQtyInput.value = 1;
    borrowQtyInput.max = prod.STOK;
    
    qtyWarning.style.display = 'none';
    btnSubmitBorrow.disabled = false;
    
    borrowModal.classList.add('active');
}

function closeBorrowModal() {
    borrowModal.classList.remove('active');
    activeProductId = null;
}

// Modal Qty Input Validation
function validateQtyInput() {
    const qty = parseInt(borrowQtyInput.value);
    const maxStock = parseInt(modalProdStock.value);
    
    if (isNaN(qty) || qty <= 0) {
        qtyWarning.textContent = "Jumlah pinjam minimal 1";
        qtyWarning.style.display = 'block';
        btnSubmitBorrow.disabled = true;
    } else if (qty > maxStock) {
        qtyWarning.textContent = `Jumlah melebihi stok yang tersedia (${maxStock})`;
        qtyWarning.style.display = 'block';
        btnSubmitBorrow.disabled = true;
    } else {
        qtyWarning.style.display = 'none';
        btnSubmitBorrow.disabled = false;
    }
}

// Submit Borrow transaction
function submitBorrow() {
    const qty = parseInt(borrowQtyInput.value);
    
    try {
        dbRequest.borrow(loggedInUser.ID, activeProductId, qty);
        closeBorrowModal();
        renderCatalog();
        renderHistory();
        
        alert("Peminjaman berhasil diajukan!");
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// Return product transaction from client
function returnProduct(requestId) {
    if (confirm("Apakah Anda yakin ingin mengembalikan barang ini?")) {
        try {
            dbRequest.return(requestId);
            renderCatalog();
            renderHistory();
            alert("Barang berhasil dikembalikan!");
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
}
