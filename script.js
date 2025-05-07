document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("memberModal");
    const modalName = document.getElementById("memberName");
    const modalDesc = document.getElementById("memberDescription");
    const closeBtn = document.getElementById("modalClose");
  
    const descriptions = {
      member1: {
        name: "John Kenneth Caibigan",
        description: "Lead Developer – Oversees backend and system integration."
      },
      member2: {
        name: "Jade Chavez",
        description: "UI/UX Designer – Designs clean and accessible user interfaces."
      },
      member3: {
        name: "Craig Owenn Doctor",
        description: "System Analyst – Handles technical documentation and planning."
      }
    };
  
    document.querySelectorAll(".team-avatar").forEach(avatar => {
      avatar.addEventListener("click", () => {
        const key = avatar.getAttribute("data-member");
        modalName.textContent = descriptions[key].name;
        modalDesc.textContent = descriptions[key].description;
        modal.classList.remove("hidden");
      });
    });
  
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  });
  
  function openVideoModal() {
    document.getElementById("videoModal").classList.remove("hidden");
  }
  
  function closeVideoModal() {
    document.getElementById("videoModal").classList.add("hidden");
  }
  