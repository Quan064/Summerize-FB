document.addEventListener("DOMContentLoaded", () => {
    // Khi popup được mở, gửi message "popupOpened" đến background để bắt đầu lấy tin nhắn
    chrome.runtime.sendMessage({ type: "popupOpened" }, async (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error receiving response:", chrome.runtime.lastError);
        } else {
            let messages = response || [];
            let summaryList = document.getElementById("summaryList");
            summaryList.innerHTML = "<li>Loading...</li>";
            
            // Gọi hàm tóm tắt tin nhắn sử dụng API AI (ví dụ với Gemini API)
            let summary = await summarizeMessages(messages);
            summaryList.innerHTML = `<li>${summary}</li>`;
        };
    });
});

// Hàm gọi API Gemini để tóm tắt nội dung tin nhắn
async function summarizeMessages(messages) {
    messages = `Mục tiêu: Nêu chủ đề gần đây nhất của đoạn tin nhắn sau:
Lưu ý: Hãy "chỉ" đưa chủ đề và không đưa thêm bất kì thứ gì như "Chủ đề là ..."
Lưu ý: Các tin nhắn được phân cách nhau bởi dấu xuống dòng
Lưu ý: Cấu trúc của tin nhắn gồm "<Thời gian/ Có thể không có> <Tên người gửi> <Phần tin nhắn chính/ Có thể không có> Enter"
Lưu ý: <Tên người gửi> có thể ở dạng "<Tên người gửi> đã trả lời <Ai đó> Tin nhắn gốc:\\n<Tin nhắn cũ của Ai đó>"
Lưu ý: Nếu <Phần tin nhắn chính> không có, nghĩa là nó là hình ảnh hoặc emoji

Đoạn tin nhắn:
${messages.join("\n")}
`;

    const API_KEY = "AIzaSyDWzCBbPjy_yB63k_bXy5PjgVJ9CBk4Ecs";
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`, {
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
  