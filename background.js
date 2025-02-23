// Hàm lấy tin nhắn chưa đọc bằng cách chạy content script trong tab Messenger
async function checkUnreadMessages() {
    let tabs = await chrome.tabs.query({ url: "https://www.facebook.com/messages/*" });
    if (tabs.length === 0) {
        // Nếu chưa có tab Messenger mở, mở ẩn tab đó
        return new Promise((resolve) => {
            chrome.tabs.create({ url: "https://www.facebook.com/messages", active: false }, (newTab) => {
                // Đợi trang load xong (6 giây) rồi mới lấy tin nhắn
                setTimeout(() => { resolve(extractMessages(newTab.id)); }, 6000);
            });
        });
    } else {
        return extractMessages(tabs[0].id);
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
            // const xpath = '//div[@class="html-div xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x4uap5 x18d9i69 xkhd6sd x78zum5 xh8yej3"]';
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
        // Yêu cầu lấy tin nhắn từ popup
        checkUnreadMessages().then(messages => {
            sendResponse(messages);
        });
        return true;
    }
});
