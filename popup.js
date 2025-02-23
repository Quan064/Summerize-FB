document.addEventListener("DOMContentLoaded", () => {
    let messages = [
        { avatar: "https://scontent.fsgn8-4.fna.fbcdn.net/v/t1.15752-9/462537963_991331293036646_6818074281671940407_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=b70caf&_nc_eui2=AeGOdlZqTk6-K_7kZUTgMEkmKN2OH0w6LY4o3Y4fTDotjg1fY17UXxOYfs-8p1NLp_fNfh9Ada839t8mebQL7EVT&_nc_ohc=ecZD9Wei2Z4Q7kNvgEXfiUk&_nc_oc=AdgWa1GVJnavQCqkCxqiXgZmw2GwOG61Ol0ppb9JxlfQ1e8PjZPUBDwLUIsSruTXQyaexclJITLdKC8aGR34BDYk&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.fsgn8-4.fna&oh=03_Q7cD1gHj9pz-W99XhyqsTrOLfot-eYL6wFWPifjKpgsjd5VBmA&oe=67E24525", name: "Em iu❤️🍓", url: "https://www.facebook.com/messages/t/8399740233487936" },
        { avatar: "https://scontent.fsgn8-4.fna.fbcdn.net/v/t1.15752-9/462650106_556580263874693_7872485036846904050_n.jpg?stp=dst-jpg_s100x100_tt6&_nc_cat=102&ccb=1-7&_nc_sid=b70caf&_nc_eui2=AeEaKMnHr1vCA11g1LdslTI2UpV7fVOgZ1hSlXt9U6BnWE2V2JY3udQ9lob3o5--eAXj09fwbb0Y3_Qe6vS3bm4x&_nc_ohc=-SvWJ0OlaJ8Q7kNvgFowo5d&_nc_oc=AdimdlpIcl84OkMm2AAsQ2JYF_xWfDUBYU534D6FmLIIHelzbEMHTcRC7IrpkUzHaamdqj4Sfeb2m1t8poV69fHY&_nc_zt=23&_nc_ht=scontent.fsgn8-4.fna&oh=03_Q7cD1gE6e6CpA126rlGjUOhiNanACKlXrmCXyIOWofNrCwE8WA&oe=67E23070", name: "Làng Gốm Nhị Tràng", url: "https://www.facebook.com/messages/t/8073160506112171" }
    ];
    let urls = [];
    messages.forEach(chat => {urls.push(chat.url)});

    // Khi popup được mở, gửi message "popupOpened" đến background để bắt đầu lấy tin nhắn
    chrome.runtime.sendMessage({ type: "popupOpened", urls: urls }, async (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error receiving response:", chrome.runtime.lastError);
        } else {
            for (let i = 0; i < urls.length; i++) {
                document.querySelectorAll(".message")[i].innerText = "await summarizeMessages(response[i])/////////////////////////////////////";
            };
        };
    });

    let chatList = document.querySelector(".chat-list");
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
        chatList.appendChild(chatItem);
    });
});

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
  