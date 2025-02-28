let num_mess = 0;
let API_KEY;
const old_HTML = document.querySelector(".popup-container").innerHTML;

window.onload = function() {
    chrome.storage.local.get(["API_KEY"], function(result) {
        API_KEY = result.API_KEY;

        if (API_KEY == undefined) {
            document.querySelector(".popup-container").innerHTML = `
                <p style="margin: 0px;">Take API key in this link: </p>
                <a href="https://aistudio.google.com/apikey">https://aistudio.google.com/apikey</a>
                <div style="margin-top: 10px;" class="input-container">
                    <input style="padding: 8px;" type="text" id="searchInput" placeholder='Paste API key here (Enter)' font-size=12px>
                </div>
            `;

            document.getElementById("searchInput").addEventListener("keydown", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();

                    API_KEY = document.getElementById("searchInput").value;
                    chrome.storage.local.set({ "API_KEY": API_KEY });
                    document.querySelector(".popup-container").innerHTML = old_HTML;
                    window.onload();
                }
            });
        }
        else {
            const getInfo = (url) => {
                chrome.runtime.sendMessage({ type: "getInfo", url: url }, async (response) => {
                    const new_messages = [{
                        avatar: response.avatar,
                        name: response.name,
                        url: url
                    }];

                    Request_(new_messages);
                });
            };

            chrome.runtime.sendMessage({ type: "checkUnread" }, async (response) => {
                response.forEach((url) => { getInfo(url); });
                if (!response.length && !num_mess) {
                    document.querySelector(".chat-list").innerHTML = '<div class="chat-item"> <div class="chat-info", style="font-size: medium;">No unread messages</div> </div>';
                };
            });

            document.getElementById("searchInput").addEventListener("keydown", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();

                    const url = document.getElementById("searchInput").value;
                    getInfo(url);
                    document.getElementById("searchInput").value = "";
                }
            });
        }
    });
};


function Request_(messages) {
    let urls = [];
    messages.forEach(chat => {urls.push(chat.url)});

    // Khi popup được mở, gửi message "popupOpened" đến background để bắt đầu lấy tin nhắn
    chrome.runtime.sendMessage({ type: "popupOpened", urls: urls }, async (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error receiving response:", chrome.runtime.lastError);
        } else {
            for (let i = 0; i < urls.length; i++) {
                document.querySelectorAll(".message")[num_mess-1].innerText = await summarizeMessages(response[i]);
            };
        };
    });

    let chatList = document.querySelector(".chat-list");
    if (!num_mess) {chatList.innerHTML = "";}
    messages.forEach(chat => {
        let chatItem = document.createElement("div");
        chatItem.classList.add("chat-item");
        chatItem.innerHTML = `
            <img src="${chat.avatar}" alt="avatar">
            <div class="chat-info">
                <div class="name">${chat.name}</div>
                <div class="message">Loading...</div>
            </div>
        `;

        chatItem.addEventListener("click", () => {
            chrome.tabs.create({ url: chat.url, active: false });
        });

        chatItem.addEventListener("mouseenter", () => {
            chatItem.style.backgroundColor = "#4d4d4d";
          });

        chatItem.addEventListener("mouseleave", () => {
            chatItem.style.backgroundColor = "#313335";
        });

        chatList.appendChild(chatItem);
        num_mess++;
    });
}

// Hàm gọi API Gemini để tóm tắt nội dung tin nhắn
async function summarizeMessages(messages) {
    messages = `Mục tiêu: Nêu chủ đề dưới cùng nhất của đoạn tin nhắn sau:
Lưu ý: Hãy "chỉ" đưa chủ đề và không đưa thêm bất kì thứ gì như "Chủ đề là ..."
Lưu ý: Các tin nhắn được phân cách nhau bởi dấu xuống dòng
Lưu ý: Cấu trúc của tin nhắn gồm "<Thời gian/ Có thể không có> <Tên người gửi> <Phần tin nhắn chính/ Có thể không có> Enter"
Lưu ý: <Tên người gửi> có thể ở dạng "<Tên người gửi> đã trả lời <Ai đó> Tin nhắn gốc:\\n<Tin nhắn cũ của Ai đó>"
Lưu ý: Nếu <Phần tin nhắn chính> không có, nghĩa là nó là hình ảnh hoặc emoji

Đoạn tin nhắn:
${messages.join("\n")}
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-8b:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: messages }] }] })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể tóm tắt.";
    } catch (error) {
        console.error("Error summarizing messages:", error);
        return "Lỗi tóm tắt.";
    }
}
  