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

  static defaults() {
    return {
      heat: 0,
      cred: 0,
      nextJob: {
        title: "Proof of Life: Aegis Intercept",
        whenISO: "2025-08-15T20:00:00-07:00",
        count: 3,
        link: ""
      }
    };
  }

  _readConfig() {
    const raw = game.settings.get("neon-blood-landing", "configJSON");
    try { return JSON.parse(raw); }
    catch(e) {
      ui.notifications.error("Neon Blood Landing settings are invalid JSON. Reverting to defaults.");
      return NBLanding.defaults();
    }
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

    const openLink = async (url) => {
      if (!url) return;
      if (/^https?:/i.test(url)) return window.open(url, "_blank", "noopener");
      ui.notifications.info("Link ready: " + url);
    };

    const jobLink = this._readConfig().nextJob.link;
    if (jobLink) {
      html.find("#nb-job-link").on("click", () => openLink(jobLink));
    }

    // GM socket listener to update live
    game.socket.on("module.neon-blood-landing", data => {
      if (data.type === "updateConfig" && !game.user.isGM) {
        game.settings.set("neon-blood-landing", "configJSON", JSON.stringify(data.config));
        this.render();
      }
    });
  }

  _relativeTime(iso) {
    const d = new Date(iso); const now = new Date();
    const steps = [[60,"second"],[60,"minute"],[24,"hour"],[7,"day"],[4.35,"week"],[12,"month"],[Infinity,"year"]];
    let diff = (d - now)/1000, unit = "second";
    for (const [s,u] of steps) { if (Math.abs(diff) < s) { unit = u; break; } diff /= s; }
    return new Intl.RelativeTimeFormat(game.i18n.lang, { numeric: "auto" }).format(Math.round(diff), unit);
  }
}

Hooks.once("init", () => {
  game.settings.register("neon-blood-landing", "configJSON", {
    name: "Landing Config (JSON)",
    hint: "GM-only: Edit heat, cred, and nextJob here. Broadcasts to all players.",
    scope: "world",
    config: true,
    type: String,
    default: JSON.stringify(NBLanding.defaults(), null, 2),
    onChange: value => {
      if (game.user.isGM) {
        const parsed = JSON.parse(value);
        game.socket.emit("module.neon-blood-landing", { type: "updateConfig", config: parsed });
      }
    }
  });
});

Hooks.on("ready", () => {
  if (game.user.isGM) new NBLanding().render(true);
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
