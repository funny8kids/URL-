// popup.js 控制开关状态

document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggleSwitch');

    // 读取存储状态
    chrome.storage.local.get(['enabled'], (result) => {
        toggleSwitch.checked = result.enabled !== false;
    });

    // 用户更改开关时保存设置
    toggleSwitch.addEventListener('change', () => {
        chrome.storage.local.set({ enabled: toggleSwitch.checked });
    });
});
