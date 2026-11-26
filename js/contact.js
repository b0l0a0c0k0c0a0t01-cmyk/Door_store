const contactForm = document.getElementById("contactForm");
const contactStatus = document.getElementById("contactStatus");
const contactSubmitBtn = document.getElementById("contactSubmitBtn");

function setContactStatus(msg, isError = false) {
  contactStatus.textContent = msg;
  contactStatus.style.color = isError ? "#ef4444" : "#22c55e";
}

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const accessKey = (formData.get("access_key") || "").toString().trim();

  if (!accessKey || accessKey === "YOUR_WEB3FORMS_ACCESS_KEY") {
    setContactStatus("يرجى وضع مفتاح Web3Forms Access Key الصحيح في النموذج أولاً.", true);
    return;
  }

  contactSubmitBtn.disabled = true;
  contactSubmitBtn.textContent = "جاري الإرسال...";
  setContactStatus("جاري إرسال رسالتك...");

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setContactStatus("تم إرسال رسالتك بنجاح إلى البريد الإلكتروني.");
      contactForm.reset();
    } else {
      throw new Error(data.message || "تعذر إرسال الرسالة.");
    }
  } catch (err) {
    setContactStatus(`حدث خطأ: ${err.message}`, true);
  } finally {
    contactSubmitBtn.disabled = false;
    contactSubmitBtn.textContent = "إرسال الرسالة";
  }
});
