import { useEffect, useMemo, useState, useCallback, useRef, type CSSProperties } from "react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bike, MapPin, Phone, MessageCircle,
  Instagram, Menu, Moon, Sun, X, Shield, Wrench, CreditCard, Award,
  ChevronUp, Plus, Clock, CheckCircle, Lock, Zap, Sparkles
} from "lucide-react";
import { INITIAL_CYCLES } from "@shared/catalogue";
import type { CycleRange, CycleRecord } from "@shared/shop";
import { useTheme } from "@/contexts/ThemeContext";

/* ── Constants ──────────────────────────────────────────────────────────── */
const PHONE = "+91 72005 49950";
const PHONE_LINK = "tel:+917200549950";
const WHATSAPP_LINK = "https://wa.me/917200549950?text=Hi%20Anand%20Cycles%2C%20I%20would%20like%20to%20enquire%20about%20a%20cycle.";
const INSTAGRAM_LINK = "https://www.instagram.com/explore/search/keyword/?q=anand%20cycles%20rajapalayam";
const SHOP_PHOTO = "https://content.jdmagicbox.com/comp/virudhunagar/g2/9999p4562.4562.131224130218.r4g2/catalogue/the-anand-cycle-stores-rajapalayam-virudhunagar-bicycle-dealers-td2yzcf7uc-250.jpg";
const LATEST_SLUGS = new Set(["roadeo-gider-ss", "roadeo-draugr-21sp", "roadeo-draugr-ss", "roadeo-ryken-ss", "roadeo-ryken-21sp", "hardstyle", "hardstyle-pro", "yuvolt", "ninety-one-z5", "ninety-one-wolverine-x", "ninety-one-zx-new-edition", "ninety-one-samurai-x", "ninety-one-samurai-x-nsi", "ninety-one-meraki-s1-alloy", "ninety-one-nx1", "ninety-one-nx2", "ninety-one-rx1", "ninety-one-meraki-scooter", "ninety-one-fx1", "ninety-one-vx"]);
const TOWN_IMAGE = "/manus-storage/rajapalayam-town_a8d1e2d7.jpg";
const TOWN_SOURCE = "https://www.justdial.com/Virudhunagar/The-Anand-Cycle-Stores-Opposite-South-Police-Station-Rajapalayam/9999P4562-4562-131224130218-R4G2_BZDET";
const DIRECTIONS = "https://www.google.com/maps/search/?api=1&query=Anand+Cycle+Stores%2C+No.+749%2C+Tenkasi+Road%2C+Rajapalayam+626117";

const fallbackCycles: CycleRecord[] = INITIAL_CYCLES.map((cycle, index) => ({ ...cycle, id: index + 1, ownerAdded: false }));
const filters: Array<{ label: string; value: CycleRange | "All" | "Latest" }> = [
  { label: "All cycles", value: "All" },
  { label: "Latest", value: "Latest" },
  { label: "Roadeo", value: "Roadeo" },
  { label: "Junior roadsters", value: "Junior Roadsters" },
  { label: "Senior roadsters", value: "Senior Roadsters" },
  { label: "Ninety One E-bikes", value: "Ninety One E-Bikes" },
  { label: "Ninety One EV", value: "Ninety One EV" },
  { label: "Indian bicycles", value: "Indian Bicycles" },
  { label: "Indian e-bikes", value: "Indian E-Bikes" },
];

const FAQ_DATA = [
  { q: "How do I know which cycle size is right for me?", a: "Visit Anand Cycles on Tenkasi Road — we'll help you pick the right frame size based on your height and riding style. You can also WhatsApp us your height and we'll recommend options." },
  { q: "Do you offer EMI or instalment payments?", a: "Yes, we offer easy EMI options and exchange deals on select models. WhatsApp or call the shop for current EMI plans and eligibility." },
  { q: "Can I see the cycle before buying?", a: "Absolutely! All listed models can be seen and test-ridden at our Rajapalayam shop. Stock varies — call or WhatsApp first to confirm availability." },
  { q: "Do you provide free assembly and service?", a: "Every cycle purchased from Anand Cycles comes with free assembly and a first service. We also stock genuine spares for all brands we sell." },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function isShopOpen(): { open: boolean; text: string } {
  const now = new Date();
  const hours = now.getHours();
  const day = now.getDay();
  // Shop hours: Mon-Sat 9am-8pm, Sun 10am-2pm (approx)
  if (day === 0) {
    return hours >= 10 && hours < 14
      ? { open: true, text: "Open now · closes 2 PM" }
      : { open: false, text: "Closed · opens Mon 9 AM" };
  }
  return hours >= 9 && hours < 20
    ? { open: true, text: `Open now · closes 8 PM` }
    : { open: false, text: hours < 9 ? "Opens at 9 AM today" : "Closed · opens 9 AM tomorrow" };
}


/* ══════════════════════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════════════════════ */

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`brand-lockup${compact ? " brand-lockup-compact" : ""}`} href="/" aria-label="Anand Cycles home">
      <div className="brand-logo-ring">
        <img src="/logo-mark.svg" alt="Anand Cycles Logo" className="brand-mark" width={compact ? 36 : 44} height={compact ? 36 : 44} />
      </div>
      <span className="brand-type">
        <b>ANAND</b>
        <span className="brand-sub">CYCLES · RAJAPALAYAM</span>
      </span>
    </a>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      className={`theme-toggle ${isDark ? "is-dark" : "is-light"}`}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      <span className="theme-toggle-thumb" aria-hidden="true" />
      <span className={`theme-toggle-icon icon-sun ${!isDark ? "is-active" : ""}`}>
        <Sun size={14} />
      </span>
      <span className={`theme-toggle-icon icon-moon ${isDark ? "is-active" : ""}`}>
        <Moon size={14} />
      </span>
    </button>
  );
}

function ShopHeader({ isModalOpen }: { isModalOpen?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 40);

      if (currentY > 160 && currentY > lastScrollY + 8) {
        setHidden(true);
      } else if (currentY < lastScrollY - 8 || currentY < 60) {
        setHidden(false);
      }
      lastScrollY = currentY;

      // Scrollspy
      const sections = ["cycles", "why", "visit"];
      const scrollPos = currentY + 180;
      let current = "";
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            current = sectionId;
          }
        }
      }
      setActiveSection(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header
        className={`floating-navbar${scrolled ? " is-scrolled" : ""}${hidden && !menuOpen ? " is-hidden" : ""}`}
      >
        <div className="navbar-container">
          <BrandMark />

          {/* Desktop Nav Links */}
          <nav className="desktop-nav" aria-label="Main navigation">
            <a
              href="/#cycles"
              className={activeSection === "cycles" ? "is-active" : ""}
              aria-current={activeSection === "cycles" ? "page" : undefined}
            >
              Cycle range
            </a>
            <a
              href="/#why"
              className={activeSection === "why" ? "is-active" : ""}
              aria-current={activeSection === "why" ? "page" : undefined}
            >
              Why us
            </a>
            <a
              href="/#visit"
              className={activeSection === "visit" ? "is-active" : ""}
              aria-current={activeSection === "visit" ? "page" : undefined}
            >
              Find the shop
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="header-actions">
            <span className="header-divider" aria-hidden="true" />
            <a className="header-login-ghost" href="/owner" aria-label="Owner login">
              <Lock size={14} className="icon-lock" />
              <span>Owner login</span>
            </a>
            <ThemeToggle />
            <a
              className="header-btn-wa"
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Anand Cycles"
            >
              <MessageCircle size={16} className="icon-wa" />
              <span>WhatsApp</span>
            </a>
            <a className="header-btn-call" href={PHONE_LINK} aria-label="Call Anand Cycles">
              <Phone size={15} className="icon-call" />
              <span>Call</span>
            </a>

            {/* Mobile Actions in Header bar */}
            <div className="mobile-header-actions">
              <a
                className="mobile-wa-icon"
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Anand Cycles"
              >
                <MessageCircle size={18} />
              </a>
              <ThemeToggle />
              <button
                className="menu-trigger-btn"
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Glass Overlay Drawer */}
      <div
        className={`mobile-glass-overlay${menuOpen ? " is-open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      >
        <div
          className="mobile-drawer-content"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Mobile Navigation"
        >
          <div className="mobile-drawer-header">
            <BrandMark />
            <button
              className="drawer-close-btn"
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="mobile-drawer-nav" aria-label="Mobile main navigation">
            <a
              href="/#cycles"
              className={activeSection === "cycles" ? "is-active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              <span>Cycle range</span>
              <ArrowRight size={18} />
            </a>
            <a
              href="/#why"
              className={activeSection === "why" ? "is-active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              <span>Why choose us</span>
              <ArrowRight size={18} />
            </a>
            <a
              href="/#visit"
              className={activeSection === "visit" ? "is-active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              <span>Find the shop</span>
              <ArrowRight size={18} />
            </a>
            <a href="/owner" className="mobile-owner-link" onClick={() => setMenuOpen(false)}>
              <Lock size={16} />
              <span>Owner login</span>
            </a>
          </nav>

          <div className="mobile-drawer-footer">
            <div className="mobile-drawer-theme">
              <span>Theme mode</span>
              <ThemeToggle />
            </div>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-btn-wa"
              onClick={() => setMenuOpen(false)}
            >
              <MessageCircle size={18} />
              <span>WhatsApp Enquiry</span>
            </a>
            <a href={PHONE_LINK} className="drawer-btn-call" onClick={() => setMenuOpen(false)}>
              <Phone size={18} />
              <span>Call Shop: {PHONE}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Fixed Mobile Bottom Bar (Call, WhatsApp, Directions) with auto-hide */}
      <div className={`mobile-bottom-bar${(hidden && !menuOpen) || isModalOpen ? " is-hidden" : ""}`} aria-label="Quick contact bar">
        <a href={PHONE_LINK} className="mobile-bar-call">
          <Phone size={16} className="icon-call" />
          <span>Call</span>
        </a>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-bar-wa"
        >
          <MessageCircle size={16} className="icon-wa" />
          <span>WhatsApp</span>
        </a>
        <a
          href={DIRECTIONS}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-bar-map"
        >
          <MapPin size={16} className="icon-map" />
          <span>Directions</span>
        </a>
      </div>
    </>
  );
}

function BrandMarquee() {
  const brands = [
    { name: "HERCULES", tagline: "Legacy & Strength", icon: Shield, badge: "AUTHORISED" },
    { name: "BSA", tagline: "Comfort & Family", icon: Award, badge: "POPULAR" },
    { name: "ROADEO", tagline: "MTB & Performance", icon: Zap, badge: "BESTSELLER" },
    { name: "NINETY ONE", tagline: "Electric & Modern", icon: Bike, badge: "E-BIKES" },
    { name: "HERO", tagline: "Indian Classic", icon: CheckCircle, badge: "ORIGINAL" },
    { name: "FIREFOX", tagline: "All-Terrain", icon: Sparkles, badge: "PREMIUM" },
    { name: "MONTRA", tagline: "Speed & Style", icon: Zap, badge: "SPORT" },
  ];

  const marqueeItems = [...brands, ...brands, ...brands, ...brands];
  const trackRef = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);
  const posRef = useRef(0);

  useEffect(() => {
    let animId: number;
    const track = trackRef.current;
    if (!track) return;

    const speed = 0.85;

    const step = () => {
      if (!isHovered.current && track) {
        posRef.current -= speed;
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0 && Math.abs(posRef.current) >= halfWidth) {
          posRef.current = 0;
        }
        track.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <section
      className="brand-strip-premium"
      aria-label="Authorised Bicycle Brands"
      onMouseEnter={() => (isHovered.current = true)}
      onMouseLeave={() => (isHovered.current = false)}
    >
      <div className="brand-strip-glow-line" />
      <div className="brand-marquee-wrapper">
        <div className="brand-marquee-track" ref={trackRef}>
          {marqueeItems.map((b, i) => {
            const IconComponent = b.icon;
            return (
              <div key={`brand-card-${i}`} className="brand-card">
                <div className="brand-card-icon-wrap">
                  <IconComponent size={15} />
                </div>
                <div className="brand-card-info">
                  <div className="brand-card-top">
                    <b className="brand-card-name">{b.name}</b>
                    <span className="brand-card-badge">{b.badge}</span>
                  </div>
                  <span className="brand-card-tag">{b.tagline}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CycleCard({ cycle, onSelect }: { cycle: CycleRecord; onSelect: (c: CycleRecord) => void }) {
  const isLatest = LATEST_SLUGS.has(cycle.slug);
  const brandName = cycle.make ? cycle.make.toUpperCase() : "HERCULES";
  const enquireWa = `https://wa.me/917200549950?text=${encodeURIComponent(`Hi Anand Cycles, I would like to enquire about the ${cycle.model}.`)}`;

  return (
    <article
      className="cycle-card reveal is-visible"
      onClick={() => onSelect(cycle)}
    >
      <div className="cycle-photo-wrap">
        {cycle.imageUrl ? (
          <img
            className="cycle-photo"
            src={cycle.imageUrl}
            alt={`${brandName} ${cycle.model} bicycle`}
            loading="lazy"
            width={300}
            height={225}
          />
        ) : (
          <div className="cycle-placeholder">
            <Bike size={32} strokeWidth={1.15} />
            <span>ANAND CYCLES</span>
          </div>
        )}
        <span className="card-brand-badge">{brandName}</span>
        {isLatest && <span className="card-tag-badge">LATEST</span>}
      </div>

      <div className="cycle-card-copy">
        <h3 className="card-model-title">{cycle.model}</h3>
        <p className="card-specs">
          {cycle.wheelSize || (cycle.range ? cycle.range : "Full Specs at shop")}
        </p>

        <div className="cycle-card-bottom">
          <span className="price-on-enquiry">Price on enquiry</span>
          <div className="cycle-card-actions" onClick={(e) => e.stopPropagation()}>
            <a
              className="card-btn-wa"
              href={enquireWa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp about ${cycle.model}`}
            >
              <MessageCircle size={14} />
              <span>Enquire</span>
            </a>
            <a
              className="card-btn-call"
              href={PHONE_LINK}
              aria-label={`Call about ${cycle.model}`}
            >
              <Phone size={14} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function CycleQuickViewModal({
  cycle,
  onClose,
}: {
  cycle: CycleRecord | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!cycle) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycle, onClose]);

  if (!cycle) return null;

  const brandName = cycle.make ? cycle.make.toUpperCase() : "HERCULES";
  const enquireWa = `https://wa.me/917200549950?text=${encodeURIComponent(`Hi Anand Cycles, I would like to enquire about the ${cycle.model}.`)}`;

  return (
    <div className="quickview-overlay" onClick={onClose} role="dialog" aria-label={`Details for ${cycle.model}`}>
      <div className="quickview-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="quickview-header">
          <span className="quickview-brand">{brandName} · {cycle.range}</span>
          <button className="quickview-close" type="button" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </div>

        <div className="quickview-body">
          <div className="quickview-image-wrap">
            {cycle.imageUrl ? (
              <img src={cycle.imageUrl} alt={cycle.model} className="quickview-image" />
            ) : (
              <div className="quickview-placeholder">
                <Bike size={56} strokeWidth={1} />
              </div>
            )}
          </div>

          <div className="quickview-info">
            <h2>{cycle.model}</h2>
            <span className="price-on-enquiry-lg">Price on enquiry</span>

            <div className="quickview-specs-list">
              {cycle.wheelSize && (
                <div className="spec-pill">
                  <b>Wheel Size:</b> {cycle.wheelSize}
                </div>
              )}
              <div className="spec-pill">
                <b>Dealer:</b> Anand Cycles (Tenkasi Road, Rajapalayam)
              </div>
              <div className="spec-pill">
                <b>Includes:</b> Free assembly &amp; first service
              </div>
            </div>

            {cycle.detail && <p className="quickview-detail-text">{cycle.detail}</p>}

            <div className="quickview-actions">
              <a href={enquireWa} target="_blank" rel="noopener noreferrer" className="qv-btn-wa">
                <MessageCircle size={18} />
                <span>WhatsApp Enquiry</span>
              </a>
              <a href={PHONE_LINK} className="qv-btn-call">
                <Phone size={18} />
                <span>Call Shop</span>
              </a>
              <a href={DIRECTIONS} target="_blank" rel="noopener noreferrer" className="qv-btn-map">
                <MapPin size={18} />
                <span>Directions</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhySection() {
  const features = [
    { icon: <Shield size={24} />, title: "Authorised Dealer", desc: "Genuine Hercules, BSA and Roadeo cycles. Every cycle comes with official warranty and documentation." },
    { icon: <Wrench size={24} />, title: "Free Assembly & Service", desc: "Professional assembly at purchase, plus your first service free. We stock genuine spare parts for every brand we sell." },
    { icon: <CreditCard size={24} />, title: "Easy EMI & Exchange", desc: "Affordable EMI options on select models. Bring your old cycle for a fair exchange deal on your next ride." },
    { icon: <Award size={24} />, title: "Trusted Since Years", desc: "Rajapalayam's trusted cycle shop on Tenkasi Road. Personal advice, honest prices, and after-sale support." },
  ];
  return (
    <section className="why-section reveal" id="why">
      <div className="container">
        <div className="section-label">Why choose Anand Cycles</div>
        <h2 className="section-title">Everything you need,<br /><em>under one roof.</em></h2>
        <div className="why-grid">
          {features.map((f, i) => (
            <div className="why-card" key={i}>
              <div className="why-card-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="faq-section reveal" id="faq">
      <div className="container">
        <div className="section-label">Common Questions</div>
        <h2 className="section-title">Frequently<br /><em>asked.</em></h2>
        <div className="faq-grid">
          {FAQ_DATA.map((item, i) => (
            <div className={`faq-item${openIdx === i ? " is-open" : ""}`} key={i}>
              <button className="faq-question" type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)}
                aria-expanded={openIdx === i}>
                {item.q}
                <Plus size={18} />
              </button>
              <div className="faq-answer"><p>{item.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   HOME PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [cycles, setCycles] = useState<CycleRecord[]>(fallbackCycles);
  const [filter, setFilter] = useState<CycleRange | "All" | "Latest">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(12);
  const [selectedCycle, setSelectedCycle] = useState<CycleRecord | null>(null);
  const [progress, setProgress] = useState(0);
  const shopStatus = useMemo(() => isShopOpen(), []);

  /* Load catalogue from API (with local storage fallback for static hosts) */
  useEffect(() => {
    let active = true;
    const loadCatalogue = async () => {
      try {
        const response = await fetch("/api/shop/products", { cache: "no-store" });
        if (response.ok) {
          const liveCycles = await response.json() as CycleRecord[];
          if (active && Array.isArray(liveCycles) && liveCycles.length > 0) {
            setCycles(liveCycles);
            return;
          }
        }
      } catch { /* static mode fallback */ }

      if (!active) return;
      const stored = localStorage.getItem("anand_custom_cycles");
      if (stored) {
        try {
          const customCycles = JSON.parse(stored);
          if (Array.isArray(customCycles) && customCycles.length > 0) {
            setCycles(customCycles);
            return;
          }
        } catch {}
      }
      setCycles(fallbackCycles);
    };
    loadCatalogue();
    const refreshOnFocus = () => { if (document.visibilityState === "visible") loadCatalogue(); };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => { active = false; window.removeEventListener("focus", refreshOnFocus); document.removeEventListener("visibilitychange", refreshOnFocus); };
  }, []);

  /* Scroll-triggered reveal & progress bar */
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }),
      { threshold: 0.06 }
    );
    items.forEach((item) => observer.observe(item));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, [filter, searchQuery, displayLimit]);

  const visibleCycles = useMemo(() => {
    let result = cycles;
    if (filter === "Latest") {
      result = result.filter((c) => LATEST_SLUGS.has(c.slug));
    } else if (filter !== "All") {
      result = result.filter((c) => c.range === filter || c.make.toUpperCase() === filter.toUpperCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.model.toLowerCase().includes(q) ||
          c.make.toLowerCase().includes(q) ||
          c.range.toLowerCase().includes(q) ||
          (c.wheelSize && c.wheelSize.toLowerCase().includes(q))
      );
    }
    return result;
  }, [cycles, filter, searchQuery]);

  const paginatedCycles = useMemo(
    () => visibleCycles.slice(0, displayLimit),
    [visibleCycles, displayLimit]
  );
  const hasMore = visibleCycles.length > displayLimit;

  const featured = cycles.find((c) => c.isFeatured) ?? cycles[0];
  const featuredIsRavager = featured?.slug === "ravager-ss";
  const counts = useMemo(() => ({
    roadeo: cycles.filter((c) => c.range === "Roadeo").length,
    junior: cycles.filter((c) => c.range === "Junior Roadsters").length,
    senior: cycles.filter((c) => c.range === "Senior Roadsters").length,
    eBikes: cycles.filter((c) => c.range === "Ninety One E-Bikes" || c.range === "Indian E-Bikes").length,
    ev: cycles.filter((c) => c.range === "Ninety One EV").length,
    indian: cycles.filter((c) => c.range === "Indian Bicycles").length,
  }), [cycles]);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  return (
    <div className="shop-shell">
      <div className="scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
      <ShopHeader isModalOpen={selectedCycle !== null} />

      <main id="main-content" className="main-atmosphere">
        {/* Ambient Depth Glow Layer */}
        <div className="ambient-glow-layer" aria-hidden="true">
          <div className="glow-bike" />
          <div className="glow-headline" />
          <div className="glow-corner" />
          <div className="glow-marquee" />
        </div>

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section className="hero-section reveal is-visible">
          <div className="hero-copy">
            <div className="badge badge-accent">
              <CheckCircle size={12} /> Authorised Hercules, BSA & Roadeo dealer
            </div>
            <h1>Cycles you can<br /><em>talk through</em><br />at the shop.</h1>
            <p className="hero-lede">Anand Cycles on Tenkasi Road stocks Hercules Roadeo, junior and senior roadsters, Ninety One e-bikes, and more. Browse the range, then call or WhatsApp for size, stock and price.</p>
            <div className="hero-actions">
              <a className="btn-primary" href="#cycles">Explore cycle range <ArrowDown size={15} /></a>
              <a className="btn-secondary" href="#visit">Find the shop <ArrowUpRight size={15} /></a>
            </div>
            <div className="trust-row">
              <span className="trust-item"><Shield size={14} /> Genuine dealer</span>
              <span className="trust-item"><Wrench size={14} /> Free assembly</span>
              <span className="trust-item"><CreditCard size={14} /> Easy EMI</span>
              <span className="trust-item"><Award size={14} /> Service & spares</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-catalogue-tag"><span>FEATURED</span><b>{featured?.model ?? "Roadeo Ravager SS"}</b></div>
            <div className="hero-vertical-label">ANAND CYCLES · RAJAPALAYAM</div>
            {featured?.imageUrl
              ? <img className="hero-cycle-image" src={featured.imageUrl} alt={featured.model} width={600} height={400} />
              : <div className="hero-cycle-fallback"><Bike size={72} strokeWidth={1} /></div>}
            <div className="hero-caption">
              <span>01</span>
              <div><b>{featured?.model ?? "Hercules Roadeo"}</b><small>{featuredIsRavager ? "27.5T / 29T · DUAL DISC" : "Ask at the shop for details"}</small></div>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Anand Cycles"><ArrowUpRight size={18} /></a>
            </div>
          </div>
        </section>

        {/* ── BRAND MARQUEE ──────────────────────────────────────── */}
        <BrandMarquee />

        {/* ── CYCLE RANGE ────────────────────────────────────────── */}
        <section className="catalogue-intro reveal" id="cycles">
          <div className="section-index"><span>02</span><span>CYCLE RANGE</span></div>
          <div className="catalogue-heading-row">
            <h2>Hercules &amp;<br /><em>BSA range.</em></h2>
            <p className="catalogue-intro-copy">Models from the current brochure, including the latest Roadeo MTBs and roadsters stocked for Rajapalayam. Price is always on enquiry — WhatsApp or call the shop.</p>
          </div>
          <div className="range-stats">
            <div><b>{counts.roadeo}</b><span>Roadeo / MTB</span></div><i />
            <div><b>{counts.junior}</b><span>Junior roadsters</span></div><i />
            <div><b>{counts.senior}</b><span>Senior roadsters</span></div><i />
            <div><b>{counts.eBikes}</b><span>E-bikes</span></div><i />
            <div><b>{counts.ev}</b><span>Ninety One EV</span></div><i />
            <div><b>{counts.indian}</b><span>Indian bicycles</span></div>
            <span className="catalogue-total">{cycles.length} models listed</span>
          </div>

          <div className="catalogue-toolbar">
            {/* Search Input Bar */}
            <div className="search-input-wrap">
              <input
                type="search"
                className="catalogue-search-input"
                placeholder="Search models, brands, specs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayLimit(12);
                }}
                aria-label="Search bicycle catalogue"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs" role="tablist" aria-label="Filter by range">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  className={`filter-tab${filter === item.value ? " is-active" : ""}`}
                  aria-selected={filter === item.value}
                  onClick={() => {
                    setFilter(item.value);
                    setDisplayLimit(12);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <p className="shared-range-note">
            Ask us what's available in Rajapalayam. Junior roadsters are the shared BSA / Hercules range. Confirm make in store.
          </p>

          {visibleCycles.length === 0 ? (
            <div className="empty-catalogue-state">
              <Bike size={48} strokeWidth={1} />
              <h3>No cycles found matching your search</h3>
              <p>Ask Anand Cycles on Tenkasi Road for current stock, size, or custom orders.</p>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <MessageCircle size={16} /> Ask us on WhatsApp
              </a>
            </div>
          ) : (
            <div className="cycle-grid">
              {paginatedCycles.map((cycle) => (
                <CycleCard key={cycle.id ?? cycle.slug} cycle={cycle} onSelect={setSelectedCycle} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="load-more-wrap">
              <button
                type="button"
                className="btn-load-more"
                onClick={() => setDisplayLimit((prev) => prev + 12)}
              >
                Show more cycles ({visibleCycles.length - displayLimit} remaining)
              </button>
            </div>
          )}
        </section>

        {/* Quick View Modal */}
        <CycleQuickViewModal cycle={selectedCycle} onClose={() => setSelectedCycle(null)} />

        {/* ── WHY CHOOSE US ──────────────────────────────────────── */}
        <WhySection />

        {/* ── CALLOUT STRIP ──────────────────────────────────────── */}
        <section className="callout-strip reveal">
          <span className="callout-number">ENQUIRE</span>
          <p>Need size, colour or today's price?<br /><em>WhatsApp or call us.</em></p>
          <div className="callout-actions">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="callout-phone callout-wa">
              <span><MessageCircle size={18} /> WhatsApp</span>
              <small>Chat with Anand Cycles <ArrowUpRight size={14} /></small>
            </a>
            <a href={PHONE_LINK} className="callout-phone">
              <span><Phone size={18} /> {PHONE}</span>
              <small>Tap to call Anand Cycles <ArrowUpRight size={14} /></small>
            </a>
          </div>
        </section>

        {/* ── FIND THE SHOP ──────────────────────────────────────── */}
        <section className="visit-section reveal" id="visit">
          <div className="visit-copy">
            <div className="section-index"><span>03</span><span>FIND THE SHOP</span></div>
            <p className="eyebrow">RIGHT HERE IN RAJAPALAYAM</p>
            <h2>Good advice.<br /><em>Close to home.</em></h2>
            <div className={`open-status ${shopStatus.open ? "is-open" : "is-closed"}`}>
              <span className="dot" />
              {shopStatus.text}
            </div>
            <p className="visit-text">Talk to the people at Anand Cycles about the right size, the version in stock and its current price. The online catalogue is a starting point; the shop can help with the details.</p>
            <div className="address-card"><MapPin size={20} /><div><b>Anand Cycle Stores</b><address>No. 749, Opposite South Police Station,<br />Tenkasi Road, Rajapalayam,<br />Virudhunagar 626117, Tamil Nadu</address></div></div>
            <div className="visit-actions">
              <a className="btn-primary" href={DIRECTIONS} target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={15} /></a>
              <a className="btn-secondary" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>
              <a className="btn-secondary" href={PHONE_LINK}><Phone size={15} /> Call</a>
            </div>
          </div>
          <figure className="place-photo-wrap">
            <img src={SHOP_PHOTO} alt="Anand Cycle Stores in Rajapalayam" loading="lazy" width={600} height={460}
              onError={(e) => { e.currentTarget.src = TOWN_IMAGE; }} />
            <div className="place-photo-label">
              <span>RAJAPALAYAM, TAMIL NADU</span>
              <span>ANAND CYCLES · TENKASI ROAD</span>
            </div>
            <figcaption>Anand Cycle Stores · No. 749 Tenkasi Road, Rajapalayam · <a href={TOWN_SOURCE} target="_blank" rel="noreferrer">Source</a></figcaption>
          </figure>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <FaqSection />

        {/* ── FINAL CTA ──────────────────────────────────────────── */}
        <section className="final-enquiry reveal">
          <div className="eyebrow"><span className="eyebrow-rule" /> MAKE THE NEXT CALL</div>
          <h2>Pick a model.<br /><em>We'll talk it through.</em></h2>
          <div className="final-enquiry-actions">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="button-paper"><MessageCircle size={16} /> WhatsApp enquiry <ArrowRight size={16} /></a>
            <a href={PHONE_LINK} className="button-paper-outline"><Phone size={16} /> Call {PHONE}</a>
          </div>
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-brand-col">
          <BrandMark compact />
          <span className="footer-tagline">Hercules · BSA · Roadeo · Rajapalayam</span>
        </div>

        <nav className="footer-nav" aria-label="Footer Navigation">
          <a href="/#cycles">Cycle range</a>
          <a href="/#why">Why choose us</a>
          <a href="/#visit">Find the shop</a>
          <a href="/owner">Owner access</a>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={14} className="icon-wa" />
            <span>WhatsApp</span>
          </a>
          <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" className="footer-link-social footer-link-instagram" aria-label="Instagram">
            <Instagram size={14} className="icon-insta" />
            <span>Instagram</span>
          </a>
          <a href={PHONE_LINK}>
            <Phone size={14} />
            <span>Call shop</span>
          </a>
        </nav>

        <div className="footer-hours-card">
          <div className="footer-hours-title">
            <Clock size={12} />
            <span>STORE HOURS</span>
          </div>
          <div className="footer-hours-content">
            <div className="hours-row">
              <span>Mon–Sat</span>
              <b>9 AM – 8 PM</b>
            </div>
            <div className="hours-row">
              <span>Sunday</span>
              <b>10 AM – 2 PM</b>
            </div>
          </div>
        </div>

        <div className="footer-bottom-block">
          <p className="footer-brochure-note">
            Catalogue details from the supplied brochure. Price on enquiry. Owner can add latest models after sign-in.
          </p>
          <div className="footer-legal-bar">
            <span className="footer-copyright">
              © {new Date().getFullYear()} Anand Cycle Stores, Rajapalayam. All rights reserved.
            </span>
            <button type="button" className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
              <ChevronUp size={14} /> Back to top
            </button>
          </div>
        </div>
      </footer>

      {/* ── WHATSAPP FAB ──────────────────────────────────────────── */}
      <a className="whatsapp-fab" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Anand Cycles for enquiries">
        <MessageCircle size={24} strokeWidth={1.75} />
        <span>Enquire on WhatsApp</span>
      </a>
    </div>
  );
}
