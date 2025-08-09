class NBLanding extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "nb-landing",
      title: "Neon Blood · Ops Hub",
      template: "modules/neon-blood-landing/templates/landing.html",
      popOut: true,
      resizable: true,
      width: 860,
      height: 640
    });
  }

  _readConfig() {
    const raw = game.settings.get("neon-blood-landing", "configJSON");
    try { return JSON.parse(raw); }
    catch(e) { ui.notifications.error("Neon Blood Landing settings are invalid JSON. Reverting to defaults."); return NBLanding.defaults(); }
  }

  static defaults() {
    return {
      accessCode: "ELYSIUM",
      openOnLogin: true,
      worldName: game.world?.title || game.world?.id || "New Elysium — Neon Wastes",
      heat: 0,
      cred: 0,
      links: {
        foundry: game?.data?.url || location.origin,
        discord: "https://discord.gg/your-invite",
        rules: "about:blank",
        jobs: "about:blank",
        heat: "about:blank",
        dossiers: "about:blank",
        privacy: "about:blank",
        credits: "about:blank"
      },
      nextJob: { title: "Proof of Life: Aegis Intercept", whenISO: "2025-08-15T20:00:00-07:00", count: 3 }
    };
  }

  getData() {
    const cfg = this._readConfig();
    const nowISO = new Date().toISOString();
    return {
      cfg,
      year: new Date().getFullYear(),
      relative: this._relativeTime(cfg?.nextJob?.whenISO || nowISO)
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    const openLink = async (key) => {
      const url = this._link(key);
      if (!url) return;
      if (url.startsWith("uuid:")) {
        const doc = await fromUuid(url.slice(5));
        if (!doc) return ui.notifications.warn("Target not found");
        if (doc.sheet) return doc.sheet.render(true);
        return doc.render?.(true);
      }
      if (url.startsWith("foundry://")) {
        const [, type, id] = url.match(/^foundry:\/\/(\w+)\/(.+)$/) || [];
        if (type === "journal") {
          const j = game.journal?.get(id);
          if (j) return j.sheet.render(true);
        }
        if (type === "scene") {
          if (id === "ACTIVE") {
            const s = game.scenes?.active;
            if (s) { await s.view(); return; }
          } else {
            const s = game.scenes?.get(id);
            if (s) { await s.view(); return; }
          }
        }
        return ui.notifications.warn("Deep link not recognized");
      }
      if (/^https?:/.test(url)) return window.open(url, "_blank", "noopener");
      ui.notifications.info("Link ready: " + url);
    };

    html.find("[data-link]").on("click", ev => openLink(ev.currentTarget.dataset.link));

    const gate = html.find("#nb-gate");
    const input = html.find("#nb-code");
    const unlock = () => {
      const cfg = this._readConfig();
      const code = String(input.val() || "").trim().toUpperCase();
      const ok = code && code === String(cfg.accessCode || "").toUpperCase();
      if (!ok) return ui.notifications.warn("Access denied. Check the code.");
      gate.addClass("nb-unlocked");
      this._setEnabledLinks(true, html[0]);
      return true;
    };

    html.find("#nb-unlock").on("click", () => unlock());
    html.find("#nb-remember").on("click", async () => { if (unlock()) await game.settings.set("neon-blood-landing", "remember", true); });

    if (game.settings.get("neon-blood-landing", "remember")) {
      gate.addClass("nb-unlocked");
      this._setEnabledLinks(true, html[0]);
    }

    html.find("#nb-ping").on("click", async ev => {
      const tgt = ev.currentTarget; tgt.textContent = "Pinging...";
      try {
        const ok = true;
        html.find("#nb-status").text(ok ? "Server Online" : "Server Offline").attr("data-state", ok ? "ok" : "down");
        html.find("#nb-online").text(Math.floor(Math.random()*5));
      } catch {
        html.find("#nb-status").text("Server Offline").attr("data-state", "down");
      } finally { tgt.textContent = "Ping Server"; }
    });
  }

  _setEnabledLinks(on, root) { root.querySelectorAll("[data-link]").forEach(a => a.classList.toggle("nb-disabled", !on)); }
  _link(key) { return this._readConfig().links?.[key] || ""; }

  _relativeTime(iso) {
    const d = new Date(iso); const now = new Date();
    const diff = (d - now) / 1000; const steps = [[60,"second"],[60,"minute"],[24,"hour"],[7,"day"],[4.35,"week"],[12,"month"],[Infinity,"year"]];
    let val = diff, unit = "second"; for (const [s,u] of steps) { if (Math.abs(val) < s) { unit = u; break; } val /= s; }
    return new Intl.RelativeTimeFormat(game.i18n.lang, { numeric: "auto" }).format(Math.round(val), unit);
  }
}

Hooks.once("init", () => {
  game.settings.register("neon-blood-landing", "configJSON", {
    name: "Landing Config (JSON)",
    hint: "Edit as JSON. Use uuid:... or foundry://... for deep links.",
    scope: "world",
    config: true,
    type: String,
    default: JSON.stringify(NBLanding.defaults(), null, 2)
  });

  game.settings.register("neon-blood-landing", "remember", {
    name: "Remember unlock for all",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

Hooks.on("ready", () => {
  const cfg = new NBLanding()._readConfig();
  if (cfg.openOnLogin) new NBLanding().render(true);
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokenCtl = controls.find(c => c.name === "token") || controls[0];
  if (!tokenCtl) return;
  tokenCtl.tools.unshift({
    name: "nb-landing",
    title: "Neon Blood Landing",
    icon: "fas fa-bolt",
    button: true,
    onClick: () => new NBLanding().render(true)
  });
});
