// 获取域名函数
function getDomainFromUrl(url) {
    try {
        let urlObj = new URL(url);
        let host = urlObj.hostname;
        if (host.startsWith('www.')) {
            host = host.substring(4);
        }
        return host;
    } catch (e) {
        return null;
    }
}

// 核心功能是否启用（使用chrome.storage获取设置）
async function isEnabled() {
    const result = await chrome.storage.local.get(['enabled']);
    return result.enabled !== false; // 默认启用
}

// 用于指定窗口标签归类
async function groupTabsInWindow(windowId) {
    if (!(await isEnabled())) return;

    let tabs = await chrome.tabs.query({windowId});
    let domainGroups = {};
    for (let tab of tabs) {
        if (tab.url && tab.url.startsWith('http')) {
            let domain = getDomainFromUrl(tab.url);
            if (domain) {
                if (!domainGroups[domain]) domainGroups[domain] = [];
                domainGroups[domain].push(tab.id);
            }
        }
    }
    for (let domain in domainGroups) {
        let tabIds = domainGroups[domain];
        if (tabIds.length === 0) continue;
        try {
            let groupId = await chrome.tabs.group({
                tabIds,
                createProperties: { windowId }
            });
            await chrome.tabGroups.update(groupId, { title: domain });
        } catch (e) {
            console.error(`分组失败: ${domain}`, e);
        }
    }
}

// 单个标签页归类
async function groupTabByDomain(tab) {
    if (!(await isEnabled())) return;

    if (!tab.url || !tab.url.startsWith('http')) return;
    let domain = getDomainFromUrl(tab.url);
    if (!domain) return;
    try {
        let groups = await chrome.tabGroups.query({ title: domain, windowId: tab.windowId });
        if (groups.length > 0) {
            await chrome.tabs.group({
                groupId: groups[0].id,
                tabIds: [tab.id]
            });
        } else {
            let newGroupId = await chrome.tabs.group({
                tabIds: [tab.id],
                createProperties: { windowId: tab.windowId }
            });
            await chrome.tabGroups.update(newGroupId, { title: domain });
        }
    } catch (e) {
        console.error("groupTab error:", e);
    }
}

// 启动和安装自动扫描
chrome.runtime.onStartup.addListener(() => {
    chrome.windows.getAll({}, (windows) => {
        windows.forEach(win => groupTabsInWindow(win.id));
    });
});
chrome.runtime.onInstalled.addListener(() => {
    chrome.windows.getAll({}, (windows) => {
        windows.forEach(win => groupTabsInWindow(win.id));
    });
});
chrome.tabs.onCreated.addListener((tab) => {
    groupTabByDomain(tab);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        groupTabByDomain(tab);
    }
});
