# Packaging

Build the ShieldBuntu `.deb` for Ubuntu 24.04.

## Layout

```
packaging/
├── systemd/
│   └── shieldbuntu.service     # systemd unit, runs as root
├── debian/
│   ├── nfpm.yaml               # .deb manifest for nfpm
│   ├── build.sh                # one-shot build script
│   ├── postinst                # enable service after install
│   └── prerm                   # stop service before removal
└── dist/                       # build outputs (gitignored)
```

## Prerequisites

- [nfpm](https://nfpm.goreleaser.com/install/) (`go install` or download release binary)
- Python build deps: `uv build` capability
- Node build deps: `pnpm install && pnpm build`

## Build

```bash
just build               # or: bash packaging/debian/build.sh
ls packaging/dist/       # shieldbuntu_0.2.0_amd64.deb
```

## Install on target

```bash
sudo apt install ./shieldbuntu_0.2.0_amd64.deb
sudo systemctl enable --now shieldbuntu
xdg-open http://127.0.0.1:8765
```

## Notes

- The systemd unit runs as **root** (intentionally — see [ADR-0001](../docs/adr/0001-architecture.md)).
- We don't apply aggressive systemd hardening (`ProtectSystem=full`, etc.) because the daemon's *job* is to modify system configs.
- The web UI binds to `127.0.0.1` only — never exposed externally.
- Auth is PAM-based; users log in as a local sudoer.
