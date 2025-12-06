import { initLayout } from "./layout.js";
import { db } from "../../firebase/config.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 1. Initialize Layout
initLayout("Product List");

// Global Variables
let currentUser = JSON.parse(localStorage.getItem("pos_user")) || {};
const currentShopId = localStorage.getItem("active_shop");

const modal = document.getElementById("productModal");
const tableBody = document.getElementById("productTableBody");
const form = document.getElementById("productForm");
const btnAddProduct = document.getElementById("btnAddProduct");
let allProducts = [];

// ==========================
// 2. CHECK PERMISSION & LOAD
// ==========================
// সেলার হলে বাটন হাইড করা হবে
if (currentUser.role === "seller") {
    if(btnAddProduct) btnAddProduct.style.display = "none";
}
// assets/js/products.js এর loadProducts ফাংশন

async function loadProducts() {
    // ১. যদি কোনো দোকান সিলেক্ট না থাকে
    if (!currentShopId) {
        document.getElementById("loadingText").innerText = "দোকান সিলেক্ট করা নেই!";
        if(document.querySelector(".btn-add")) document.querySelector(".btn-add").style.display = "none";
        return;
    }

    // ২. যদি "All Shops" সিলেক্ট করা থাকে (Admin Only)
    if (currentShopId === "all") {
        document.getElementById("loadingText").innerText = "অনুগ্রহ করে একটি নির্দিষ্ট দোকান সিলেক্ট করুন ডাটা দেখার জন্য।";
        // 'নতুন পণ্য' বাটন লুকিয়ে ফেলা
        if(document.querySelector(".btn-add")) document.querySelector(".btn-add").style.display = "none";
        return;
    }

    // ৩. স্বাভাবিক ফ্লো (Specific Shop)
    // বাটন আবার ফিরিয়ে আনা (যদি সেলার না হয়)
    if(currentUser.role !== 'seller' && document.querySelector(".btn-add")) {
        document.querySelector(".btn-add").style.display = "block";
    }

    const q = query(collection(db, "products"), where("shopId", "==", currentShopId));

    try {
        const snapshot = await getDocs(q);
        allProducts = [];
        snapshot.forEach(doc => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        
        renderTable(allProducts);
        
        if (allProducts.length === 0) {
            document.getElementById("loadingText").innerText = "কোনো পণ্য পাওয়া যায়নি।";
        } else {
            document.getElementById("loadingText").style.display = "none";
        }

    } catch (error) {
        console.error(error);
        document.getElementById("loadingText").innerText = "ডাটা লোড করতে সমস্যা হয়েছে।";
    }
}
// ==========================
// 3. RENDER TABLE
// ==========================
function renderTable(products) {
    tableBody.innerHTML = "";
    products.forEach(p => {
        const img = p.image || "https://placehold.co/40";
        const unit = p.unit || "pcs"; // ডিফল্ট ইউনিট
        const barcode = p.barcode ? `<br><small style="color:#666; font-size:11px;"><i class="fas fa-barcode"></i> ${p.barcode}</small>` : "";
        
        // Low Stock Warning Color
        const lowStockLimit = p.lowAlert || 5;
        const stockStyle = p.stock <= lowStockLimit ? "color:red; font-weight:bold;" : "color:green;";

        // অ্যাকশন বাটন (সেলার ডিলিট/এডিট করতে পারবে না - অপশনাল লজিক)
        let actionButtons = `
            <button class="btn-action btn-edit" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-action btn-delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
        `;
        
        // যদি চান সেলার এডিটও করতে পারবে না, তবে নিচের লাইন আনকমেন্ট করুন
        if(currentUser.role === 'seller') actionButtons = '<span style="color:#aaa; font-size:12px;">No Access</span>';

        const row = `
            <tr>
                <td><img src="${img}" class="table-img"></td>
                <td>
                    ${p.name}
                    ${barcode}
                </td>
                <td>${p.category}</td>
                <td>${p.buyPrice}</td>
                <td>${p.sellPrice}</td>
                <td style="${stockStyle}">${p.stock} <span style="font-size:11px; color:#555;">${unit}</span></td>
                <td>${actionButtons}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// ==========================
// 4. ADD / EDIT LOGIC (Updated)
// ==========================
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.querySelector(".btn-save");
    const originalText = btn.innerText;
    btn.innerText = "Saving...";

    const id = document.getElementById("editProductId").value;
    
    // নতুন ফিল্ডগুলো ডাটা অবজেক্টে যোগ করা হলো
    const data = {
        name: document.getElementById("pName").value.trim(),
        barcode: document.getElementById("pBarcode").value.trim(), // New
        category: document.getElementById("pCategory").value,
        unit: document.getElementById("pUnit").value,             // New
        stock: Number(document.getElementById("pStock").value),
        lowAlert: Number(document.getElementById("pLowAlert").value), // New
        buyPrice: Number(document.getElementById("pCost").value),
        sellPrice: Number(document.getElementById("pPrice").value),
        image: document.getElementById("pImage").value.trim(),
        shopId: currentShopId
    };

    try {
        if (id) {
            await updateDoc(doc(db, "products", id), data);
            alert("আপডেট হয়েছে!");
        } else {
            await addDoc(collection(db, "products"), data);
            alert("নতুন পণ্য যোগ হয়েছে!");
        }
        closeProductModal();
        loadProducts();
    } catch (error) {
        console.error(error);
        alert("সমস্যা হয়েছে: " + error.message);
    }
    btn.innerText = originalText;
});

// ==========================
// 5. HELPER FUNCTIONS
// ==========================
window.openProductModal = () => {
    form.reset();
    document.getElementById("editProductId").value = "";
    // ডিফল্ট মান সেট করা
    document.getElementById("pUnit").value = "pcs";
    document.getElementById("pLowAlert").value = "5";
    
    document.getElementById("modalTitle").innerText = "নতুন পণ্য যোগ করুন";
    modal.style.display = "block";
};

window.closeProductModal = () => modal.style.display = "none";

window.editProduct = (id) => {
    const p = allProducts.find(x => x.id === id);
    if (p) {
        document.getElementById("editProductId").value = p.id;
        document.getElementById("pName").value = p.name;
        document.getElementById("pBarcode").value = p.barcode || ""; // New
        document.getElementById("pCategory").value = p.category;
        document.getElementById("pUnit").value = p.unit || "pcs";   // New
        document.getElementById("pStock").value = p.stock;
        document.getElementById("pLowAlert").value = p.lowAlert || 5; // New
        document.getElementById("pCost").value = p.buyPrice;
        document.getElementById("pPrice").value = p.sellPrice;
        document.getElementById("pImage").value = p.image || "";
        
        document.getElementById("modalTitle").innerText = "পণ্য আপডেট করুন";
        modal.style.display = "block";
    }
};

window.deleteProduct = async (id) => {
    // সেলারদের জন্য ডিলিট ব্লক করা (Optional Security)
    if(currentUser.role === 'seller') {
        alert("সেলার পণ্য ডিলিট করতে পারবে না!");
        return;
    }

    if (confirm("আপনি কি নিশ্চিত এই পণ্যটি ডিলিট করতে চান?")) {
        try {
            await deleteDoc(doc(db, "products", id));
            loadProducts();
        } catch (error) {
            alert("ডিলিট করা যায়নি!");
        }
    }
};

// Search (Name or Barcode)
document.getElementById("productSearchInput").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.barcode && p.barcode.toLowerCase().includes(term)) // বারকোড দিয়ে সার্চ
    );
    renderTable(filtered);
});

// Start
loadProducts();