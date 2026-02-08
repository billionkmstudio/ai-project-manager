// Firebase 配置
// 請到 Firebase Console (https://console.firebase.google.com/) 建立專案並取得配置資訊
const firebaseConfig = {
     apiKey: "AIzaSyCc7b2XY5kR2AY9B5i0Lq-q0w5NUr-HH_M",
    authDomain: "my-ai-project-hub-92761.firebaseapp.com",
    projectId: "my-ai-project-hub-92761",
    storageBucket: "my-ai-project-hub-92761.firebasestorage.app",
     messagingSenderId: "272233264722",
    appId: "1:272233264722:web:8f9077dc1a89f347b3d18b",
    measurementId: "G-FVHPKT9XN8"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 初始化服務
const auth = firebase.auth();
const db = firebase.firestore();

// Google 登入提供者
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});
