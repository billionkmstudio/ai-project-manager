let currentUser = null;
let projects = [];
let currentProjectId = null;
let uploadedFiles = [];
let currentFilter = 'all';
let searchQuery = '';

// 檢查用戶認證狀態
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('userName').textContent = user.displayName || user.email;
        await loadProjects();
    } else {
        // 未登入，重定向到登入頁
        window.location.href = 'login.html';
    }
});

// 登出
async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('登出錯誤:', error);
        alert('登出失敗');
    }
}

// 從 Firestore 載入專案
async function loadProjects() {
    try {
        const snapshot = await db.collection('projects')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdDate', 'desc')
            .get();

        projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('載入專案數量:', projects.length);
        renderProjects();
        updateStats();
    } catch (error) {
        console.error('載入專案錯誤:', error);
        console.error('錯誤代碼:', error.code);
        console.error('錯誤訊息:', error.message);
        
        // 如果是索引錯誤，顯示友善訊息
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
            document.getElementById('projectsContainer').innerHTML = `
                <div class="no-projects">
                    <h2>需要建立 Firestore 索引</h2>
                    <p>請執行以下命令：</p>
                    <pre style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left;">firebase deploy --only firestore:indexes</pre>
                    <p style="margin-top: 15px;">或點擊 Console 中的錯誤訊息連結自動建立索引</p>
                </div>
            `;
        } else if (error.code === 'permission-denied') {
            document.getElementById('projectsContainer').innerHTML = `
                <div class="no-projects">
                    <h2>權限錯誤</h2>
                    <p>請執行以下命令部署 Firestore 規則：</p>
                    <pre style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left;">firebase deploy --only firestore:rules</pre>
                </div>
            `;
        } else {
            document.getElementById('projectsContainer').innerHTML = `
                <div class="no-projects">
                    <h2>載入失敗</h2>
                    <p>錯誤：${error.message}</p>
                    <p style="margin-top: 10px;">請檢查瀏覽器 Console 查看詳細錯誤</p>
                    <button onclick="location.reload()" class="btn" style="margin-top: 15px; max-width: 200px;">重新載入</button>
                </div>
            `;
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 設置檔案上傳區域
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => document.getElementById('fileInput').click());
        
        // 拖放功能
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFileSelect({ target: { files: e.dataTransfer.files } });
        });
    }
});

function openNewProjectModal() {
    currentProjectId = null;
    document.getElementById('modalTitle').textContent = '新增 AI 專案';
    document.getElementById('projectForm').reset();
    uploadedFiles = [];
    document.getElementById('uploadedFiles').innerHTML = '';
    document.getElementById('projectModal').classList.add('active');
}

function closeModal() {
    document.getElementById('projectModal').classList.remove('active');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedFiles.push({
                name: file.name,
                type: file.type,
                content: e.target.result
            });
            displayUploadedFiles();
        };
        reader.readAsText(file);
    });
}

function displayUploadedFiles() {
    const container = document.getElementById('uploadedFiles');
    container.innerHTML = uploadedFiles.map((file, index) => `
        <div class="uploaded-file-item">
            <span>📄 ${file.name}</span>
            <button type="button" class="file-remove" onclick="removeFile(${index})">移除</button>
        </div>
    `).join('');
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    displayUploadedFiles();
}

async function saveProject(event) {
    event.preventDefault();
    
    const projectData = {
        name: document.getElementById('projectName').value,
        category: document.getElementById('projectCategory').value,
        description: document.getElementById('projectDescription').value,
        prompt: document.getElementById('projectPrompt').value,
        files: uploadedFiles,
        userId: currentUser.uid,
        updatedDate: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (currentProjectId) {
            // 更新現有專案
            await db.collection('projects').doc(currentProjectId).update(projectData);
        } else {
            // 新增專案
            projectData.createdDate = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('projects').add(projectData);
        }

        closeModal();
        await loadProjects();
        uploadedFiles = [];
    } catch (error) {
        console.error('儲存專案錯誤:', error);
        alert('儲存失敗，請重試');
    }
}

function renderProjects() {
    const container = document.getElementById('projectsContainer');
    
    let filteredProjects = projects;
    
    // 分類篩選
    if (currentFilter !== 'all') {
        filteredProjects = filteredProjects.filter(p => p.category === currentFilter);
    }
    
    // 搜尋篩選
    if (searchQuery) {
        filteredProjects = filteredProjects.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.prompt && p.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }

    if (filteredProjects.length === 0) {
        container.innerHTML = `
            <div class="no-projects">
                <h2>找不到專案</h2>
                <p>試試調整篩選條件或新增專案</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredProjects.map(project => {
        const createdDate = project.createdDate?.toDate ? 
            project.createdDate.toDate() : 
            new Date();
        
        return `
            <div class="project-card" onclick="viewProject('${project.id}')">
                <div class="project-header">
                    <div>
                        <div class="project-title">${escapeHtml(project.name)}</div>
                        <div class="project-date">📅 ${createdDate.toLocaleDateString('zh-HK')}</div>
                    </div>
                    <span class="project-category">${escapeHtml(project.category)}</span>
                </div>
                <div class="project-description">${escapeHtml(project.description || '無描述')}</div>
                ${project.files && project.files.length > 0 ? `
                    <div class="project-files">
                        ${project.files.map(file => `
                            <span class="file-badge">📄 ${escapeHtml(file.name)}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function viewProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const createdDate = project.createdDate?.toDate ? 
        project.createdDate.toDate() : 
        new Date();

    const content = `
        <h2>${escapeHtml(project.name)}</h2>
        <p style="color: #6c757d; margin: 10px 0;">
            <span class="project-category">${escapeHtml(project.category)}</span>
            <span style="margin-left: 15px;">📅 ${createdDate.toLocaleDateString('zh-HK')}</span>
        </p>
        
        <div style="margin: 25px 0;">
            <h3 style="margin-bottom: 10px;">📝 專案描述</h3>
            <p style="line-height: 1.6; color: #495057;">${escapeHtml(project.description || '無描述')}</p>
        </div>

        ${project.prompt ? `
            <div style="margin: 25px 0;">
                <h3 style="margin-bottom: 10px;">💬 AI 提示詞</h3>
                <p style="background: #f8f9fa; padding: 15px; border-radius: 8px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(project.prompt)}</p>
            </div>
        ` : ''}

        ${project.files && project.files.length > 0 ? `
            <div style="margin: 25px 0;">
                <h3 style="margin-bottom: 15px;">📎 專案檔案</h3>
                ${project.files.map((file, index) => `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong>📄 ${escapeHtml(file.name)}</strong>
                            <button onclick="downloadFile('${projectId}', ${index})" class="btn btn-small btn-secondary" style="width: auto;">下載</button>
                        </div>
                        <pre style="background: white; padding: 15px; border-radius: 6px; overflow-x: auto; max-height: 300px; font-size: 0.9em; border: 1px solid #e9ecef;"><code>${escapeHtml(file.content)}</code></pre>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="action-buttons">
            <button onclick="editProject('${projectId}')" class="btn btn-small">✏️ 編輯</button>
            <button onclick="deleteProject('${projectId}')" class="btn btn-small btn-danger">🗑️ 刪除</button>
        </div>
    `;

    document.getElementById('viewContent').innerHTML = content;
    document.getElementById('viewModal').classList.add('active');
}

function editProject(projectId) {
    closeViewModal();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    currentProjectId = projectId;
    document.getElementById('modalTitle').textContent = '編輯專案';
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectCategory').value = project.category;
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectPrompt').value = project.prompt || '';
    uploadedFiles = project.files || [];
    displayUploadedFiles();
    document.getElementById('projectModal').classList.add('active');
}

async function deleteProject(projectId) {
    if (!confirm('確定要刪除這個專案嗎？此操作無法復原。')) return;
    
    try {
        await db.collection('projects').doc(projectId).delete();
        closeViewModal();
        await loadProjects();
    } catch (error) {
        console.error('刪除專案錯誤:', error);
        alert('刪除失敗，請重試');
    }
}

function downloadFile(projectId, fileIndex) {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.files[fileIndex]) return;

    const file = project.files[fileIndex];
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
}

function filterByCategory(category) {
    currentFilter = category;
    
    // 更新分類按鈕狀態
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    renderProjects();
}

function filterProjects() {
    searchQuery = document.getElementById('searchBox').value;
    renderProjects();
}

function updateStats() {
    // 更新總專案數
    document.getElementById('totalProjects').textContent = projects.length;
    
    // 更新各分類數量
    document.getElementById('count-all').textContent = projects.length;
    
    const categories = ['網頁開發', '內容創作', '數據分析', '自動化工具', '其他'];
    categories.forEach(category => {
        const count = projects.filter(p => p.category === category).length;
        const element = document.getElementById(`count-${category}`);
        if (element) {
            element.textContent = count;
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 點擊 modal 背景關閉
document.getElementById('projectModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.getElementById('viewModal').addEventListener('click', function(e) {
    if (e.target === this) closeViewModal();
});
