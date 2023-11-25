// modal.js

// 显示模态框
function showModal(message) {
    const modalText = document.getElementById("modalText");
    modalText.innerHTML = message;

    const modal = document.getElementById("myModal");
    modal.style.display = "block";
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById("myModal");
    modal.style.display = "none";
}

async function initModal() {
    await fetch('/assets/modal.html')
        .then(response => response.text())
        .then(html => {
            // 插入 HTML 内容到页面中
            document.body.insertAdjacentHTML('beforeend', html);
        })
        .catch(error => {
            console.error('Failed to fetch modal.html:', error);
        });
}