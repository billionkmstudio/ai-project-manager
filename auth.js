// 顯示錯誤訊息
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

// 切換到註冊表單
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// 切換到登入表單
function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// Email 登入
async function emailLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showError('請填寫所有欄位');
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('登入成功:', userCredential.user);
        window.location.href = './index.html';
    } catch (error) {
        console.error('登入錯誤:', error);
        let errorMessage = '登入失敗';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = '找不到此帳號';
                break;
            case 'auth/wrong-password':
                errorMessage = '密碼錯誤';
                break;
            case 'auth/invalid-email':
                errorMessage = '電郵格式不正確';
                break;
            case 'auth/user-disabled':
                errorMessage = '此帳號已被停用';
                break;
            default:
                errorMessage = error.message;
        }
        
        showError(errorMessage);
    }
}

// Email 註冊
async function emailRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        showError('請填寫所有欄位');
        return;
    }

    if (password.length < 6) {
        showError('密碼必須至少 6 位');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // 更新用戶資料
        await userCredential.user.updateProfile({
            displayName: name
        });

        // 在 Firestore 建立用戶文件
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('註冊成功:', userCredential.user);
        window.location.href = './index.html';
    } catch (error) {
        console.error('註冊錯誤:', error);
        let errorMessage = '註冊失敗';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '此電郵已被使用';
                break;
            case 'auth/invalid-email':
                errorMessage = '電郵格式不正確';
                break;
            case 'auth/weak-password':
                errorMessage = '密碼強度不足';
                break;
            default:
                errorMessage = error.message;
        }
        
        showError(errorMessage);
    }
}

// Google 登入
async function googleLogin() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        // 檢查是否為新用戶
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // 新用戶，建立文件
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log('Google 登入成功:', user);
        // 使用絕對路徑或根路徑
        window.location.href = './index.html';
    } catch (error) {
        console.error('Google 登入錯誤:', error);
        
        // 如果是取消登入，不顯示錯誤
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            return;
        }
        
        let errorMessage = 'Google 登入失敗';
        
        switch (error.code) {
            case 'auth/popup-blocked':
                errorMessage = '彈出視窗被封鎖，請允許彈出視窗';
                break;
            case 'auth/unauthorized-domain':
                errorMessage = '此網域未經授權，請到 Firebase Console 新增授權網域';
                break;
            default:
                errorMessage = error.message;
        }
        
        showError(errorMessage);
    }
}

// 監聽認證狀態
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('login.html')) {
        // 已登入且在登入頁面，重定向到主頁
        window.location.href = 'index.html';
    }
});

// Enter 鍵登入
document.addEventListener('DOMContentLoaded', function() {
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerName = document.getElementById('registerName');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');

    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                emailLogin();
            }
        });
    }

    if (registerPassword) {
        registerPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                emailRegister();
            }
        });
    }
});
