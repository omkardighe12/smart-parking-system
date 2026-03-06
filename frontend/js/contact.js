document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");
  const formMsg = document.getElementById("formMsg");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim()
    };

    // Loading state
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;
    formMsg.style.display = "none";

    try {
      const API = window.APP_API_BASE || "http://localhost:5000/api";
      const res = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      formMsg.style.display = "block";
      if (data.success) {
        formMsg.className = "success";
        formMsg.textContent = data.message;
        form.reset();
      } else {
        formMsg.className = "error";
        formMsg.textContent = data.message || "Something went wrong. Please try again.";
      }
    } catch (err) {
      formMsg.style.display = "block";
      formMsg.className = "error";
      formMsg.textContent = "Network error — please check your connection and try again.";
    } finally {
      submitBtn.textContent = "Send Message 🚀";
      submitBtn.disabled = false;
    }
  });
});

