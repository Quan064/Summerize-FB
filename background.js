// Danh sách các tab đã tạo mà chưa active
let createdTabs = new Set();

// Hàm lấy tin nhắn chưa đọc bằng cách chạy content script trong tab Messenger
async function checkUnreadMessages(url) {
    let tabs = await chrome.tabs.query({ url: url });
    if (tabs.length === 0) {
        // Nếu chưa có tab Messenger mở, mở tab ẩn
        return new Promise((resolve) => {
            chrome.tabs.create({ url: url, active: false }, (newTab) => {
                createdTabs.add(newTab.id); // Lưu ID của tab vừa tạo
                setTimeout(async () => { 
                    let messages = await extractMessages(newTab.id);
                    // Kiểm tra nếu tab vẫn tồn tại và chưa active thì đóng nó
                    chrome.tabs.get(newTab.id, (tab) => {
                        if (tab && !tab.active) {
                            chrome.tabs.remove(newTab.id);
                        }
                    });
                    // chrome.scripting.executeScript({
                    //     target: { tabId: newTab.id },
                    //     func: () => {
                    //         let target = document.querySelector("#\:r1f\: > div > div > div > div > div > div:nth-child(2) > div > div:nth-child(1)");
                    //         let button = document.querySelector("#\:r1f\: > div > div > div > div > div > div:nth-child(2) > div > div:nth-child(1) > div > div > div > div > div.html-div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x6s0dn4.x1hgdm3.x78zum5.x1q0g3np.x84fkku.x67bb7w.x10l6tqk.x1jl3hli.x1qvwoe0.x1vzd84k.xjm9jq1.x6ikm8r.x10wlt62.x1i1rx1s");

                    //         if (target && button) {
                    //             let rect = target.getBoundingClientRect();
                    //             let event = new MouseEvent("mousemove", {
                    //                 bubbles: true,
                    //                 clientX: rect.left + 5, // Giả lập vị trí trong phần tử
                    //                 clientY: rect.top + 5
                    //             });
                    //             target.dispatchEvent(event); // Giả lập hover

                    //             setTimeout(() => { button.click(); }, 500); // Đợi một chút rồi click
                    //         }
                    //     }
                    // });
                    resolve(messages);
                }, 6000);
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
        let promises = request.urls.map(url => checkUnreadMessages(url));
        Promise.all(promises).then(results => {
            sendResponse(results); // Gửi phản hồi sau khi tất cả hoàn tất
        });
        return true; // Giữ kết nối để gửi phản hồi bất đồng bộ
    }
});
