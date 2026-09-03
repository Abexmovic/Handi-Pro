const SUPABASE_URL = "https://abtqoesfhwwudxkqliko.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mDgx7Vfk4o9d3g04EuMJ5Q_8FYVnLl1";

// 1. Initialize Supabase Client
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Slider state variables
let currentSlideIndex = 0;
let autoSlideInterval = null;

// 2. Fetch & Render Verified Providers in Slider Track
async function loadVerifiedProviders() {
  const grid = document.getElementById("verifiedProvidersGrid");
  if (!grid) return;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/providers?is_verified=eq.true&select=*`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );

    const providers = await response.json();
    if (!response.ok)
      throw new Error(providers.message || "Failed to load providers");

    grid.innerHTML = "";

    if (!Array.isArray(providers) || providers.length === 0) {
      grid.innerHTML = "<p>No verified professionals found yet.</p>";
      return;
    }

    providers.forEach((pro) => {
      const card = document.createElement("div");
      card.className = "provider-card";

      const heroImage =
        pro.image_url ||
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=800&auto=format&fit=crop";
      const cleanPhone = pro.phone ? pro.phone.replace(/[^0-9+]/g, "") : "";
      const categoryText = (pro.category || "General Service").toUpperCase();

      card.innerHTML = `
                <div style="position: relative;">
                    <img src="${heroImage}" alt="${pro.full_name}" style="width: 100%; height: 200px; object-fit: cover; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                    <span style="position: absolute; top: 12px; right: 12px; background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                        ✓ Verified
                    </span>
                </div>
                
                <div style="padding: 16px; background: #ffffff; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                    <span style="display: inline-block; background: #e0e7ff; color: #3b82f6; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px;">
                        ${categoryText}
                    </span>
                    
                    <h3 style="margin: 4px 0; font-size: 18px; color: #1e293b;">${pro.full_name || "Anonymous Provider"}</h3>
                    
                    <p style="margin: 0 0 12px 0; color: #64748b; font-size: 13px;">
                        📍 ${pro.location || "Location Not Specified"}
                    </p>
                    
                    <p style="color: #475569; font-size: 14px; line-height: 1.4; margin-bottom: 16px; min-height: 40px;">
                        ${pro.bio || "No bio provided."}
                    </p>
                    
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <a href="tel:${cleanPhone}" style="flex: 1; text-align: center; background: #2563eb; color: white; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            📞 Call Now
                        </a>
                        <a href="https://wa.me/${cleanPhone}" target="_blank" style="flex: 1; text-align: center; background: #22c55e; color: white; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            💬 WhatsApp
                        </a>
                    </div>
                </div>
            `;

      grid.appendChild(card);
    });

    setupSliderControls(providers.length);
  } catch (err) {
    console.error("Error loading verified providers:", err);
  }
}

// 3. Slider Control Functions
function setupSliderControls(totalCards) {
  const track = document.getElementById("verifiedProvidersGrid");
  const prevBtn = document.getElementById("slidePrev");
  const nextBtn = document.getElementById("slideNext");
  const container = document.getElementById("sliderContainer");

  if (!track || !prevBtn || !nextBtn || totalCards === 0) return;

  function moveSlider(direction = "next") {
    const card = track.querySelector(".provider-card");
    if (!card) return;

    const cardWidth = card.getBoundingClientRect().width + 20;
    const visibleCards = Math.round(container.clientWidth / cardWidth) || 1;
    const maxIndex = Math.max(0, totalCards - visibleCards);

    if (direction === "next") {
      currentSlideIndex =
        currentSlideIndex >= maxIndex ? 0 : currentSlideIndex + 1;
    } else {
      currentSlideIndex =
        currentSlideIndex <= 0 ? maxIndex : currentSlideIndex - 1;
    }

    track.style.transform = `translateX(-${currentSlideIndex * cardWidth}px)`;
  }

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideInterval = setInterval(() => moveSlider("next"), 3500);
  }

  function stopAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
  }

  nextBtn.onclick = () => {
    moveSlider("next");
    startAutoSlide();
  };

  prevBtn.onclick = () => {
    moveSlider("prev");
    startAutoSlide();
  };

  container.onmouseenter = stopAutoSlide;
  container.onmouseleave = startAutoSlide;

  startAutoSlide();
}

// 4. Image Upload Function
async function uploadImage(file) {
  if (!file || !supabaseClient) return null;

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabaseClient.storage
      .from("provider-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase Storage Error:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from("provider-images")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Unexpected upload error:", err);
    return null;
  }
}

// 5. Form Initialization
document.addEventListener("DOMContentLoaded", () => {
  loadVerifiedProviders();

  const regForm = document.getElementById("proRegisterForm");
  if (regForm) {
    regForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const submitBtn = regForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Uploading & Submitting...";
      }

      try {
        const imageInput =
          document.getElementById("profileImage") ||
          regForm.querySelector('input[type="file"]');
        let imageUrl = null;

        if (imageInput && imageInput.files.length > 0) {
          imageUrl = await uploadImage(imageInput.files[0]);
        }

        const formData = {
          full_name:
            document.getElementById("fullName")?.value ||
            document.getElementById("full_name")?.value ||
            "",
          email: document.getElementById("email")?.value || "",
          phone: document.getElementById("phone")?.value || "",
          category: document.getElementById("category")?.value || "",
          experience: document.getElementById("experience")?.value || "",
          location: document.getElementById("location")?.value || "",
          bio: document.getElementById("bio")?.value || "",
          image_url: imageUrl,
          is_verified: true,
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/providers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errRes = await response.json();
          throw new Error(errRes.message || "Failed to submit");
        }

        alert("Registration submitted successfully!");
        regForm.reset();
        loadVerifiedProviders();
      } catch (err) {
        console.error("Submission Error:", err);
        alert("Submission failed: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "Submit Application";
        }
      }
    });
  }
});
