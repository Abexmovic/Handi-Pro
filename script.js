const SUPABASE_URL = "https://abtqoesfhwwudxkqliko.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mDgx7Vfk4o9d3g04EuMJ5Q_8FYVnLl1";

// 1. Initialize Supabase Client
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Initial verified artisans registered on the website
const DEFAULT_REGISTERED_ARTISANS = [
  {
    id: "default-solar",
    full_name: "David Tech Solutions",
    category: "solar",
    trade: "Solar Installation",
    location: "Lekki, Lagos",
    bio: "Specialized in residential inverter setup, solar panel mounting, and battery maintenance.",
    phone: "+2348000000000",
    image_url: "./Images/ChatGPT Image Aug 9, 2026, 08_42_31 AM.png",
    is_verified: true,
  },
  {
    id: "default-electrical",
    full_name: "Sam Electrical Services",
    category: "electrical",
    trade: "Electrical",
    location: "Ikeja, Lagos",
    bio: "Full house wiring, fault tracing, distribution board upgrades, and industrial maintenance.",
    phone: "+2348000000001",
    image_url: "./Images/ChatGPT Image Aug 9, 2026, 08_42_31 AM.png",
    is_verified: true,
  },
];

// Master store strictly containing verified registered artisans on the website
let allRegisteredArtisans = [...DEFAULT_REGISTERED_ARTISANS];

// Slider state variables
let currentSlideIndex = 0;
let autoSlideInterval = null;

// Helper to escape HTML and prevent injection
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 2. Fetch & Sync Verified Providers from Supabase
async function loadVerifiedProviders() {
  let dbVerified = [];
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("providers")
        .select("*")
        .eq("is_verified", true);
      if (!error && Array.isArray(data)) {
        dbVerified = data;
      }
    }

    if (dbVerified.length === 0) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/providers?is_verified=eq.true&select=*`,
        {
          method: "GET",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json)) {
          dbVerified = json;
        }
      }
    }
  } catch (err) {
    console.warn("Supabase check notice:", err.message);
  }

  // Merge newly verified artisans into allRegisteredArtisans
  if (dbVerified && dbVerified.length > 0) {
    dbVerified.forEach((pro) => {
      const exists = allRegisteredArtisans.some(
        (a) =>
          a.full_name?.toLowerCase().trim() ===
            pro.full_name?.toLowerCase().trim() ||
          (a.phone &&
            pro.phone &&
            a.phone.replace(/\D/g, "") === pro.phone.replace(/\D/g, ""))
      );
      if (!exists) {
        allRegisteredArtisans.push({
          ...pro,
          is_verified: true,
        });
      }
    });
  }

  // Only render full list if user is not currently in an active search
  const serviceInput = document.getElementById("searchInput");
  const locationInput = document.getElementById("locationInput");
  const isSearchActive =
    (serviceInput && serviceInput.value.trim().length > 0) ||
    (locationInput && locationInput.value.trim().length > 0);

  if (!isSearchActive) {
    renderArtisansList(allRegisteredArtisans);
  }
}

// 3. Render Artisan Cards into Slider Track (Flex Display)
function renderArtisansList(list) {
  const track = document.getElementById("verifiedProvidersGrid");
  if (!track) return;

  track.innerHTML = "";
  currentSlideIndex = 0;
  track.style.transform = "translateX(0px)";

  if (!list || list.length === 0) {
    track.innerHTML = `
      <div style="padding: 30px; text-align: center; width: 100%; color: #64748b;">
        <p style="font-size: 1.1rem; margin-bottom: 10px;">No registered artisans found.</p>
        <button onclick="resetSearch()" class="btn btn-primary" style="margin-top: 8px;">Show All Verified Artisans</button>
      </div>
    `;
    return;
  }

  list.forEach((pro) => {
    const card = document.createElement("article");
    card.className = "provider-card";
    card.setAttribute("data-category", (pro.category || "other").toLowerCase());

    const heroImage =
      pro.image_url || "./Images/ChatGPT Image Aug 9, 2026, 08_42_31 AM.png";
    const cleanPhone = pro.phone ? pro.phone.replace(/[^0-9+]/g, "") : "";
    const categoryText = (
      pro.trade ||
      pro.category ||
      "General Service"
    ).toUpperCase();

    card.innerHTML = `
      <div class="card-image">
          <img src="${heroImage}" alt="${escapeHtml(pro.full_name || "Artisan")}" class="profile-img-placeholder">
          <span class="badge verified"><i class="fa-solid fa-circle-check"></i> Verified</span>
      </div>
      <div class="card-body">
          <span class="trade-tag">${escapeHtml(categoryText)}</span>
          <h3>${escapeHtml(pro.full_name || "Anonymous Provider")}</h3>
          <p class="location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(pro.location || "Location Not Specified")}</p>
          <p class="bio">${escapeHtml(pro.bio || "No bio provided.")}</p>
          <div class="card-actions">
              <a href="tel:${cleanPhone}" class="btn btn-call"><i class="fa-solid fa-phone"></i> Call Now</a>
              <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
          </div>
      </div>
    `;

    track.appendChild(card);
  });

  // Re-initialize slider controls so icons slide the rendered cards
  setupSliderControls();
}

// 4. Proximity & Neighborhood Clusters for Nearest Location Matching
const LOCATION_CLUSTERS = [
  // Lekki Peninsula / Lagos Island
  {
    name: "Lekki Axis",
    zones: [
      "lekki",
      "ajah",
      "victoria island",
      "vi",
      "ikoyi",
      "chevron",
      "sangotedo",
      "marina",
      "oniru",
      "jakande",
      "epe",
      "osapa",
      "ikate",
      "agungi",
    ],
  },
  // Ikeja / Mainland Central
  {
    name: "Ikeja Axis",
    zones: [
      "ikeja",
      "maryland",
      "ogba",
      "allen",
      "opebi",
      "alausa",
      "magodo",
      "berger",
      "ojodu",
      "anthony",
      "kudirat abiola",
      "agege",
    ],
  },
  // Mainland South / University corridor
  {
    name: "Mainland South",
    zones: [
      "yaba",
      "surulere",
      "akoka",
      "ebute metta",
      "gbagada",
      "bariga",
      "somolu",
      "fadeyi",
      "ojuelegba",
      "palmgrove",
    ],
  },
  // West Lagos
  {
    name: "Lagos West",
    zones: [
      "festac",
      "amuwo",
      "satellite",
      "mile 2",
      "ojo",
      "alaba",
      "okomaiko",
      "iyana ipaja",
      "egbeda",
      "ipaja",
    ],
  },
  // North / East Lagos
  {
    name: "Lagos East",
    zones: ["ikorodu", "ketu", "mile 12", "ojota", "owode"],
  },
  // Lagos State general
  {
    name: "Lagos State",
    zones: ["lagos", "eko"],
  },
  // Abuja FCT
  {
    name: "Abuja",
    zones: [
      "abuja",
      "garki",
      "wuse",
      "maitama",
      "asokoro",
      "kubwa",
      "jabi",
      "gwarinpa",
      "apo",
      "lugbe",
    ],
  },
  // Port Harcourt
  {
    name: "Port Harcourt",
    zones: ["port harcourt", "ph", "gra", "diobu", "rumuokoro", "trans amadi"],
  },
  // Ibadan
  {
    name: "Ibadan",
    zones: ["ibadan", "bodija", "dugbe", "ring road", "iwo road", "ui"],
  },
  // Ogun
  {
    name: "Ogun",
    zones: ["abeokuta", "ota", "mowe", "ibafo", "sagamu"],
  },
];

// Calculate proximity score between artisan location and search input (0-100)
function getProximityScore(providerLoc, searchLoc) {
  if (!searchLoc) return 100;
  if (!providerLoc) return 0;

  const prov = providerLoc.toLowerCase().trim();
  const search = searchLoc.toLowerCase().trim();

  // Exact match
  if (prov === search) return 100;

  // Substring match
  if (prov.includes(search) || search.includes(prov)) return 90;

  // Token word match
  const searchWords = search.split(/[\s,/-]+/).filter((w) => w.length > 2);
  const provWords = prov.split(/[\s,/-]+/).filter((w) => w.length > 2);
  for (const sw of searchWords) {
    if (provWords.some((pw) => pw === sw || pw.includes(sw) || sw.includes(pw))) {
      return 85;
    }
  }

  // Same neighborhood cluster (e.g. user typed Ajah, artisan is in Lekki)
  for (const cluster of LOCATION_CLUSTERS) {
    const searchInCluster = cluster.zones.some(
      (z) => search.includes(z) || searchWords.includes(z)
    );
    const provInCluster = cluster.zones.some(
      (z) => prov.includes(z) || provWords.includes(z)
    );
    if (searchInCluster && provInCluster) {
      return 70; // Nearest neighboring area
    }
  }

  // Same metropolitan area / state (e.g. both in Lagos)
  const isProvLagos =
    prov.includes("lagos") ||
    LOCATION_CLUSTERS.slice(0, 6).some((c) =>
      c.zones.some((z) => prov.includes(z))
    );
  const isSearchLagos =
    search.includes("lagos") ||
    LOCATION_CLUSTERS.slice(0, 6).some((c) =>
      c.zones.some((z) => search.includes(z))
    );
  if (isProvLagos && isSearchLagos) {
    return 50; // Same city/state
  }

  // Character similarity fallback
  let matches = 0;
  for (const char of search) {
    if (prov.includes(char)) matches++;
  }
  return 10 + Math.round((matches / Math.max(search.length, 1)) * 20);
}

// Check if an artisan provides the requested service
function matchesService(artisan, serviceQuery) {
  if (!serviceQuery) return true;
  const q = serviceQuery.toLowerCase().trim();
  const name = (artisan.full_name || "").toLowerCase();
  const cat = (artisan.category || "").toLowerCase();
  const trade = (artisan.trade || "").toLowerCase();
  const bio = (artisan.bio || "").toLowerCase();

  if (
    name.includes(q) ||
    cat.includes(q) ||
    trade.includes(q) ||
    bio.includes(q)
  ) {
    return true;
  }

  // Common service keyword aliases
  const serviceMap = {
    solar: ["solar", "inverter", "battery", "panel", "clean energy"],
    electrical: [
      "electric",
      "wiring",
      "wire",
      "light",
      "power",
      "switch",
      "generator",
      "appliances",
    ],
    plumbing: [
      "plumb",
      "pipe",
      "leak",
      "drain",
      "water",
      "tap",
      "sink",
      "toilet",
    ],
    carpentry: [
      "carpent",
      "wood",
      "furniture",
      "roof",
      "cabinet",
      "wardrobe",
      "door",
    ],
    gardener: [
      "garden",
      "gardener",
      "gardening",
      "lawn",
      "mow",
      "flower",
      "tree",
      "landscape",
      "grass",
      "plants",
      "horticulture",
      "trim",
    ],
    cleaning: [
      "clean",
      "cleaning",
      "maid",
      "janitor",
      "housekeep",
      "fumigation",
      "wash",
      "scrub",
      "dust",
      "house cleaning",
    ],
    painter: [
      "paint",
      "painter",
      "painting",
      "screed",
      "wall",
      "coating",
      "primer",
      "brush",
      "roller",
      "paintwork",
    ],
  };

  for (const [key, aliases] of Object.entries(serviceMap)) {
    const isTarget = aliases.some((a) => q.includes(a)) || q === key;
    if (isTarget) {
      if (
        cat.includes(key) ||
        trade.includes(key) ||
        aliases.some((a) => bio.includes(a) || name.includes(a))
      ) {
        return true;
      }
    }
  }

  return false;
}

// 5. Functional Search: Matches Service & Location (with Nearest Location Fallback)
function filterServices() {
  const serviceInput = document.getElementById("searchInput");
  const locationInput = document.getElementById("locationInput");
  const serviceVal = (serviceInput ? serviceInput.value : "").trim();
  const locationVal = (locationInput ? locationInput.value : "").trim();

  const notice = document.getElementById("searchNotice");

  if (!serviceVal && !locationVal) {
    resetSearch();
    return;
  }

  // 1. Strictly filter from registered artisans by service
  let serviceMatches = allRegisteredArtisans.filter((artisan) =>
    matchesService(artisan, serviceVal)
  );

  let isServiceFallback = false;
  if (serviceMatches.length === 0) {
    isServiceFallback = true;
    // If no artisan matches this specific service, consider all registered artisans
    serviceMatches = [...allRegisteredArtisans];
  }

  // 2. Location matching with nearest location detection
  let finalResults = [];
  let isNearestMatch = false;
  let nearestLocationName = "";

  if (locationVal) {
    const scored = serviceMatches.map((artisan) => ({
      artisan,
      score: getProximityScore(artisan.location, locationVal),
    }));

    // Check for direct / exact location matches (score >= 80)
    const exactMatches = scored.filter((item) => item.score >= 80);

    if (exactMatches.length > 0) {
      finalResults = exactMatches.map((item) => item.artisan);
    } else {
      // No artisan in the exact location: return registered artisan with closest location
      isNearestMatch = true;
      scored.sort((a, b) => b.score - a.score);
      finalResults = scored.map((item) => item.artisan);
      if (finalResults.length > 0) {
        nearestLocationName = finalResults[0].location || "nearby area";
      }
    }
  } else {
    finalResults = serviceMatches;
  }

  // Render the matching registered artisan cards
  renderArtisansList(finalResults);

  // Surface status banner explaining match / nearest match
  if (notice) {
    notice.style.display = "flex";
    if (isServiceFallback && locationVal) {
      notice.innerHTML = `<span>⚠️ No registered artisan found for service "<strong>${escapeHtml(serviceVal)}</strong>". Showing closest registered artisans in <strong>${escapeHtml(nearestLocationName || locationVal)}</strong>:</span> <button onclick="resetSearch()">View All</button>`;
    } else if (isNearestMatch) {
      notice.innerHTML = `<span>📍 No registered artisan found directly in "<strong>${escapeHtml(locationVal)}</strong>". Showing the closest registered artisan(s) in <strong>${escapeHtml(nearestLocationName)}</strong>:</span> <button onclick="resetSearch()">View All</button>`;
    } else {
      const parts = [];
      if (serviceVal) parts.push(`service "<strong>${escapeHtml(serviceVal)}</strong>"`);
      if (locationVal) parts.push(`location "<strong>${escapeHtml(locationVal)}</strong>"`);
      notice.innerHTML = `<span>✓ Found <strong>${finalResults.length}</strong> registered artisan(s) matching ${parts.join(" in ")}:</span> <button onclick="resetSearch()">View All</button>`;
    }
  }

  // Smooth scroll to the verified professionals section
  const providersSection = document.getElementById("providers");
  if (providersSection) {
    providersSection.scrollIntoView({ behavior: "smooth" });
  }
}

// Reset search and restore all registered artisans
function resetSearch() {
  const serviceInput = document.getElementById("searchInput");
  const locationInput = document.getElementById("locationInput");
  const notice = document.getElementById("searchNotice");

  if (serviceInput) serviceInput.value = "";
  if (locationInput) locationInput.value = "";
  if (notice) notice.style.display = "none";

  renderArtisansList(allRegisteredArtisans);

  const providersSection = document.getElementById("providers");
  if (providersSection) {
    providersSection.scrollIntoView({ behavior: "smooth" });
  }
}

// Filter by Popular Category cards
function filterByCategory(category) {
  const serviceInput = document.getElementById("searchInput");
  if (serviceInput) {
    serviceInput.value = category;
  }
  filterServices();
}

// 6. Slider Controls (Smooth Sliding and Arrow Clicks)
function setupSliderControls() {
  const track = document.getElementById("verifiedProvidersGrid");
  const prevBtn = document.getElementById("slidePrev");
  const nextBtn = document.getElementById("slideNext");
  const container = document.getElementById("sliderContainer");

  if (!track || !prevBtn || !nextBtn || !container) return;

  const cards = track.querySelectorAll(".provider-card");
  if (!cards || cards.length === 0) return;

  function moveSlider(direction = "next") {
    const currentCards = track.querySelectorAll(".provider-card");
    if (!currentCards || currentCards.length === 0) return;

    const firstCard = currentCards[0];
    const cardRect = firstCard.getBoundingClientRect();
    const cardWidth = cardRect.width > 0 ? cardRect.width + 20 : 360; // width + gap
    const containerWidth = container.clientWidth;
    const visibleCards = Math.max(1, Math.floor(containerWidth / cardWidth));
    const maxIndex = Math.max(0, currentCards.length - visibleCards);

    if (maxIndex > 0) {
      if (direction === "next") {
        currentSlideIndex =
          currentSlideIndex >= maxIndex ? 0 : currentSlideIndex + 1;
      } else {
        currentSlideIndex =
          currentSlideIndex <= 0 ? maxIndex : currentSlideIndex - 1;
      }
    } else {
      // If cards fit within container, cycle through them so icons visibly slide
      const loopMax = currentCards.length - 1;
      if (loopMax > 0) {
        if (direction === "next") {
          currentSlideIndex =
            currentSlideIndex >= loopMax ? 0 : currentSlideIndex + 1;
        } else {
          currentSlideIndex =
            currentSlideIndex <= 0 ? loopMax : currentSlideIndex - 1;
        }
      }
    }

    track.style.transform = `translateX(-${currentSlideIndex * cardWidth}px)`;
  }

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideInterval = setInterval(() => moveSlider("next"), 4000);
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

// 7. Image Upload for Pro Registration
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

// 8. Initialization & Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  loadVerifiedProviders();

  // Enter key trigger on search and location inputs
  document.getElementById("searchInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      filterServices();
    }
  });

  document.getElementById("locationInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      filterServices();
    }
  });

  // Mobile navigation hamburger toggle
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // Supabase Realtime: updates site when admin verifies a provider
  if (supabaseClient) {
    try {
      supabaseClient
        .channel("public:providers")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "providers" },
          () => {
            loadVerifiedProviders();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime error:", e);
    }
  }

  // Periodic sync check every 10 seconds
  setInterval(loadVerifiedProviders, 10000);

  // Registration Form handler
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
          phone:
            document.getElementById("phoneNumber")?.value ||
            document.getElementById("phone")?.value ||
            "",
          category: document.getElementById("category")?.value || "",
          location: document.getElementById("location")?.value || "",
          bio: document.getElementById("bio")?.value || "",
          image_url: imageUrl,
          is_verified: false, // Requires admin verification in Supabase before appearing on the website
        };

        let submitted = false;
        if (supabaseClient) {
          const { error } = await supabaseClient
            .from("providers")
            .insert([formData]);
          if (!error) submitted = true;
        }

        if (!submitted) {
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
        }

        alert(
          "Registration submitted successfully! Your profile will appear on the website once verified by the admin."
        );
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
