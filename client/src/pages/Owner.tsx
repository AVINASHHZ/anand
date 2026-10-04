import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Bike, LogOut, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { CycleRecord } from "@shared/shop";

type Session = { authenticated: boolean; role: "owner" | "customer" | null };
type ShopConfig = { ownerLoginReady: boolean; ownerGoogleLoginReady: boolean };

const emptyDraft = { model: "", make: "Hercules", range: "Roadeo", wheelSize: "", detail: "", imageUrl: "" };

export default function Owner() {
  const [session, setSession] = useState<Session | null>(null);
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [username, setUsername] = useState("anand");
  const [passkey, setPasskey] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadName, setUploadName] = useState("");

  const loadSession = useCallback(async () => {
    let sessionData: Session = { authenticated: false, role: null };
    let configData: ShopConfig = { ownerLoginReady: true, ownerGoogleLoginReady: false };

    try {
      const [sessionRes, configRes] = await Promise.all([
        fetch("/api/shop/session", { cache: "no-store" }).catch(() => null),
        fetch("/api/shop/config", { cache: "no-store" }).catch(() => null),
      ]);

      if (sessionRes && sessionRes.ok) {
        try { sessionData = await sessionRes.json(); } catch {}
      }
      if (configRes && configRes.ok) {
        try { configData = await configRes.json(); } catch {}
      }

      setSession(sessionData);
      setConfig(configData);

      if (sessionData.role === "owner") {
        try {
          const productResult = await fetch("/api/shop/products", { cache: "no-store" });
          if (productResult.ok) setCycles(await productResult.json() as CycleRecord[]);
        } catch {}
      }
    } catch {
      setSession(sessionData);
      setConfig(configData);
    }
  }, []);

  useEffect(() => {
    loadSession().catch(() => {
      setSession({ authenticated: false, role: null });
      setConfig({ ownerLoginReady: true, ownerGoogleLoginReady: false });
    });
  }, [loadSession]);

  function notice(text: string, isError = false) { setMessage(text); setError(isError); }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      event.target.value = "";
      notice("Upload a PNG or JPEG image only.", true);
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      event.target.value = "";
      notice("That image is too large. Please choose a PNG or JPEG under 6 MB.", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === "string" ? reader.result : "";
      setDraft((current) => ({ ...current, imageUrl }));
      setUploadName(file.name);
      notice(`${file.name} is ready to upload.`);
    };
    reader.onerror = () => notice("The image could not be read. Please try another PNG or JPEG.", true);
    reader.readAsDataURL(file);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); notice("");
    try {
      const response = await fetch("/api/shop/owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, passkey }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Owner sign-in could not be completed.");
      setPasskey("");
      await loadSession();
      notice("Owner access granted.");
    } catch (cause) { notice(cause instanceof Error ? cause.message : "Owner sign-in could not be completed.", true); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/shop/logout", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: "{}" });
      setSession({ authenticated: false, role: null }); setCycles([]); notice("You have signed out.");
    } finally { setBusy(false); }
  }

  async function addCycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); notice("");
    try {
      const response = await fetch("/api/shop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(draft),
      });
      const data = await response.json() as CycleRecord | { error?: string };
      if (!response.ok) throw new Error("error" in data ? data.error || "Cycle could not be saved." : "Cycle could not be saved.");
      setDraft(emptyDraft);
      setUploadName("");
      notice(`${"model" in data ? data.model : "Cycle"} added to the catalogue.`);
      await loadSession();
    } catch (cause) { notice(cause instanceof Error ? cause.message : "Cycle could not be saved.", true); }
    finally { setBusy(false); }
  }

  async function removeCycle(cycle: CycleRecord) {
    if (!window.confirm(`Remove ${cycle.model} from the public catalogue?`)) return;
    setBusy(true); notice("");
    try {
      const response = await fetch(`/api/shop/products/${cycle.id}`, { method: "DELETE", credentials: "same-origin" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Cycle could not be removed.");
      setCycles((items) => items.filter((item) => item.id !== cycle.id));
      notice(`${cycle.model} removed from the catalogue.`);
    } catch (cause) { notice(cause instanceof Error ? cause.message : "Cycle could not be removed.", true); }
    finally { setBusy(false); }
  }

  if (!session || !config) return <main className="owner-loading">Loading owner access…</main>;
  if (session.role === "customer") return <main className="owner-login-wrap"><section className="owner-login-card"><Bike size={28} /><p className="auth-eyebrow">SHOP OWNER ACCESS</p><h1>This area is for the shop owner.</h1><p>Customer sign-in does not grant permission to change cycle listings.</p><a className="button button-dark" href="/">Return to the public catalogue</a><button className="owner-secondary" onClick={signOut}>Sign out</button></section></main>;

  if (session.role !== "owner") {
    const ownerGoogleRedirect = `/api/shop/google/owner/redirect?origin=${encodeURIComponent(window.location.origin)}`;
    const ownerIssue = new URLSearchParams(window.location.search).get("issue");
    return (
      <main className="owner-login-wrap">
        <a className="auth-back" href="/"><ArrowLeft size={16} /> Back to the shop</a>
        <section className="owner-login-card">
          <div className="owner-shield"><ShieldCheck size={22} /></div>
          <p className="auth-eyebrow">PRIVATE SHOP ACCESS · OWNER ONLY</p>
          <h1>Owner sign in.</h1>
          <p>Catalogue controls are available only to the verified shop owner.</p>
          {ownerIssue === "google-owner-denied" && <p className="form-message error-message">That Google account is not authorised for owner access.</p>}
          {ownerIssue === "google-owner-config" && <p className="form-message error-message">Owner Google access is not configured yet.</p>}
          {ownerIssue === "google-config" && <p className="form-message error-message">Google OAuth is missing a valid Client ID or Client Secret in the protected runtime.</p>}
          {ownerIssue === "google-exchange" && <p className="form-message error-message">Google rejected the callback. Confirm the exact redirect URI in Google Cloud.</p>}
          {ownerIssue === "google-state" && <p className="form-message error-message">The sign-in session expired or was opened in another tab. Start again here.</p>}
          {ownerIssue === "google-identity" && <p className="form-message error-message">Google returned an unverified or invalid identity.</p>}
          {ownerIssue === "google-nonce" && <p className="form-message error-message">The Google security check failed. Start sign-in again.</p>}
          {ownerIssue === "google-unavailable" && <p className="form-message error-message">Google sign-in is temporarily unavailable. Check the OAuth client settings.</p>}
          {config.ownerGoogleLoginReady && <a className="google-button owner-google-button" href={ownerGoogleRedirect}><span className="google-g">G</span>Continue with owner Google <ArrowUpRight size={16} /></a>}
          {config.ownerGoogleLoginReady && config.ownerLoginReady && <div className="auth-separator"><span>OR USE PRIVATE PASSKEY</span></div>}
          {config.ownerLoginReady ? <form onSubmit={signIn} className="owner-login-form">
            <label>Owner username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required maxLength={128} /></label>
            <label>Passkey<input type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} autoComplete="current-password" required maxLength={512} /></label>
            <button className="button button-dark button-wide" type="submit" disabled={busy}>{busy ? "Checking…" : "Open owner panel"}</button>
          </form> : <div className="setup-notice"><ShieldCheck size={18} /><p>Owner access is not configured yet. The username and passkey must be added through the project’s protected setup card; they are never stored in this page.</p></div>}
          {message && <p className={`form-message${error ? " error-message" : ""}`} role="status">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="owner-dashboard">
      <header className="owner-topbar"><a href="/" className="owner-back"><ArrowLeft size={16} /> Anand Cycles</a><span className="owner-live"><i /> OWNER ACCESS</span><button onClick={signOut} className="owner-logout" disabled={busy}><LogOut size={16} /> Sign out</button></header>
      <div className="owner-main">
        <div className="owner-title-row"><div><p className="auth-eyebrow">PRIVATE CATALOGUE DESK</p><h1>Manage the <em>cycles.</em></h1><p className="owner-intro">Add the latest Indian cycle models, update details, or remove listings. Changes go to the public catalogue and stay saved in the shop database.</p></div><div className="owner-count"><b>{cycles.length}</b><span>LISTED CYCLES</span></div></div>
        {message && <p className={`form-message owner-notice${error ? " error-message" : ""}`} role="status">{message}</p>}
        <section className="owner-add-panel"><div className="owner-panel-heading"><span className="owner-panel-icon"><Plus size={18} /></span><div><h2>Add a cycle</h2><p>No price is collected or displayed here.</p></div></div>
          <form onSubmit={addCycle} className="owner-add-form">
            <label>Model name<input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} required maxLength={160} placeholder="e.g. Hercules Roadeo" /></label>
            <label>Make<select value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })}><option>Hercules</option><option>BSA / Hercules</option><option>Ninety One</option><option>Hero</option><option>Firefox</option><option>Montra</option><option>Tata Stryder</option><option>Cradiac</option><option>Leader</option><option>EMotorad</option><option>Other</option></select></label>
            <label>Range<select value={draft.range} onChange={(e) => setDraft({ ...draft, range: e.target.value })}><option>Roadeo</option><option>Junior Roadsters</option><option>Senior Roadsters</option><option>Ninety One E-Bikes</option><option>Ninety One EV</option><option>Indian Bicycles</option><option>Indian E-Bikes</option><option>Other</option></select></label>
            <label>Wheel size<input value={draft.wheelSize} onChange={(e) => setDraft({ ...draft, wheelSize: e.target.value })} maxLength={96} placeholder="Optional" /></label>
            <label className="owner-field-wide">Short details<input value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} maxLength={1200} placeholder="Optional catalogue detail" /></label>
            <label className="owner-field-wide">Cycle photo (PNG or JPEG)<input key={uploadName || "empty-upload"} type="file" accept="image/png,image/jpeg" onChange={handleImageUpload} required={!draft.imageUrl} /><span className="owner-upload-help">{uploadName || "PNG or JPEG, maximum 6 MB"}</span></label>
            <label className="owner-field-wide">Or use an image URL<input value={draft.imageUrl.startsWith("data:") ? "" : draft.imageUrl} onChange={(e) => { setUploadName(""); setDraft({ ...draft, imageUrl: e.target.value }); }} maxLength={2048} placeholder="Optional HTTPS image URL" required={!draft.imageUrl} /></label>
            {draft.imageUrl && <div className="owner-upload-preview"><img src={draft.imageUrl} alt="Selected cycle preview" /><span>Photo ready</span></div>}
            <button className="button button-dark owner-add-submit" type="submit" disabled={busy}><Plus size={16} /> {busy ? "Saving…" : "Add to catalogue"}</button>
          </form>
        </section>
        <section className="owner-list-section"><div className="owner-list-heading"><div><p className="auth-eyebrow">PUBLIC LISTINGS</p><h2>Cycle list</h2></div><span>{cycles.length} total</span></div>
          <div className="owner-cycle-list">{cycles.map((cycle) => <article className="owner-cycle-row" key={cycle.id}><div className="owner-cycle-image">{cycle.imageUrl ? <img src={cycle.imageUrl} alt="" /> : <Bike size={22} />}</div><div className="owner-cycle-name"><b>{cycle.model}</b><span>{cycle.make} · {cycle.range}{cycle.wheelSize ? ` · ${cycle.wheelSize}` : ""}</span></div><span className="owner-origin-tag">{cycle.ownerAdded ? "OWNER ADDED" : "BROCHURE"}</span><button className="owner-delete" onClick={() => removeCycle(cycle)} disabled={busy} aria-label={`Delete ${cycle.model}`}><Trash2 size={16} /><span>Delete</span></button></article>)}</div>
        </section>
        <p className="owner-security-note"><ShieldCheck size={15} /> Only this owner session can change listings. Every public price remains “Price on enquiry.”</p>
      </div>
    </main>
  );
}
