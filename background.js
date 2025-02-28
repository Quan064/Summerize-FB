// Danh sách các tab đã tạo mà chưa active
let createdTabs = new Set();

// Hàm lấy tin nhắn chưa đọc bằng cách chạy content script trong tab Messenger
async function checkUnreadMessages(url, func) {
    let tabs = await chrome.tabs.query({ url: url });
    if (tabs.length === 0) {
        // Nếu chưa có tab Messenger mở, mở tab ẩn
        return new Promise((resolve) => {
            chrome.tabs.create({ url: url, active: false }, (newTab) => {
                createdTabs.add(newTab.id); // Lưu ID của tab vừa tạo
                setTimeout(async () => { 
                    let messages = await func(newTab.id);
                    // Kiểm tra nếu tab vẫn tồn tại và chưa active thì đóng nó
                    chrome.tabs.get(newTab.id, (tab) => {
                        if (tab && !tab.active) {
                            chrome.tabs.remove(newTab.id);
                        }
                    });
                    resolve(messages);
                }, 6000);
            });
        });
    } else {
        return func(tabs[0].id);
    }
}

// Hàm thực thi content script để trích xuất tin nhắn
async function extractMessages(tabId) {
    let results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            let messages = [];
            // Chọn selector phù hợp với cấu trúc DOM của Messenger (cần điều chỉnh nếu cần)
            const xpath = '(//div[@class="x78zum5 xdt5ytf x1iyjqo2 x2lah0s xl56j7k x121v3j4"])[1]/div/div/div/div';
            let result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            let msg = result.iterateNext();
            while ((msg = result.iterateNext())) {
                messages.push(msg.innerText);
            };
            return messages;
        }
    });
    return results[0].result;
}

// Lắng nghe tin nhắn từ popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "popupOpened") {
        let promises = request.urls.map(url => checkUnreadMessages(url, extractMessages));
        Promise.all(promises).then(results => {
            sendResponse(results); // Gửi phản hồi sau khi tất cả hoàn tất
        });
        return true; // Giữ kết nối để gửi phản hồi bất đồng bộ
    };
    if (request.type === "getInfo") {
        checkUnreadMessages(request.url, getInfo).then(Info => {
            sendResponse(Info);
        });
        return true;
    }
    if (request.type === "checkUnread") {
        checkUnreadMessages("https://www.facebook.com/messages", checkUnreadLinks).then(urls => {
            sendResponse(urls);
        });
        return true;
    }
});

async function getInfo(tabId) {
    let results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            let info = {};
            info.avatar = document.evaluate('//*/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div[2]/div/div/div/div[1]/div/div/div/div/div/div[1]/div[1]/div/div/div[1]/div/div/div/*/div[1]/div/div[1]//img', document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null).iterateNext().src;
            info.name = document.evaluate('//*/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div[2]/div/div/div/div[1]/div/div/div/div/div/div[1]/div[1]/div/div/div[1]/div/div/div//div[1]/div/div[2]/div/div[1]/h2', document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null).iterateNext().innerText;
            return info;
        }
    });
    return results[0].result;
}

async function checkUnreadLinks(tabId) {
    let results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            let urls = [];
            const xpath = '//*/div/div/div/div/div/div[2]/div/div/div/div/div/div/div[1]/div/div/div/a/div[1]/div/div[3]/div/div//span/../../../../../../..';
            let result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            let a;
            while ((a = result.iterateNext())) {
                urls.push(a.href);
            };
            return urls;
        }
    });
    return results[0].result;
}