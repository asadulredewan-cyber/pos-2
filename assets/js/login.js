import { auth, db } from "../../firebase/config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// DOM Elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const statusBox = document.getElementById("status");

// 🔥 FIX: Clear inputs after browser autofill with a slight delay
window.addEventListener('load', () => {
    // তাৎক্ষণিক খালি করা
    emailInput.value = "";
    passwordInput.value = ""; 
    
    // ব্রাউজারের অটোফিল হবার পর আবার খালি করার জন্য সামান্য ডিলে
    setTimeout(() => {
        emailInput.value = "";
        passwordInput.value = "";
    }, 50); // 50 milliseconds delay
});


function showStatus(text, isError = false) {
    statusBox.innerText = text;
    statusBox.style.color = isError ? "red" : "green";
}

loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showStatus("Email & Password দিন", true);
        return;
    }

    showStatus("Logging in...");

    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Load Firestore user doc
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            showStatus("User profile পাওয়া যায়নি", true);
            return;
        }

        const data = snap.data();
        const role = data.role;
        
        // 🔥 FIX: shopId/shopid কেস সেনসিটিভিটি এবং active_shop সেটিং
        // ডাটাবেসে shopId বা shopid (বড় হাতের বা ছোট হাতের) যেটিই থাকুক, তার ভ্যালু নেবে
        const userShopId = data.shopId || data.shopid; 
        const shops = data.shops || [];

        // LocalStorage এ পুরো ডাটা সেভ
        localStorage.setItem("pos_user", JSON.stringify(data));

        // REDIRECT BASED ON ROLE
        if (role === "seller") {
            showStatus("Seller Login Success!");
            // সেলারের জন্য নির্দিষ্ট দোকান সেট করা
            if(userShopId) localStorage.setItem("active_shop", userShopId);
            window.location.href = "dashboard.html"; // সেলারও ড্যাশবোর্ডে যাবে
        }
        else if (role === "manager") {
            showStatus("Manager Login Success!");
            // ম্যানেজারের জন্য প্রথম দোকান বা userShopId সেট করা
            const defaultShop = shops.length > 0 ? shops[0] : userShopId;
            if(defaultShop) localStorage.setItem("active_shop", defaultShop);
            window.location.href = "dashboard.html";
        }
        else if (role === "admin") {
            showStatus("Admin Login Success!");
            // অ্যাডমিনের জন্য ডিফল্ট 'all' সেট করা
            localStorage.setItem("active_shop", "all");
            window.location.href = "dashboard.html";
        }
        else {
            showStatus("Unknown role!", true);
        }

    } catch (err) {
        console.error(err);
        showStatus("Login ব্যর্থ: " + err.message, true);
    }
});