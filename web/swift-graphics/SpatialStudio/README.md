# SpatialStudio — Fresh-Start Swift 6 3D Graphics Project

**Replacing `FD_too0`'s flat 2D card faking with real 60/120fps Metal/SceneKit PBR 3D Dice, Axle-Lock Skewers & Transparent Bouncing FOBBs!**

## Why Spy Needed a Fresh Graphics Start
In `gravity-wizard/fd-too0`, `DieTile3DView.swift` used flat 2D `RoundedRectangle` stacks (`extrusionOffset`) that only drew the **single top face**, and `BoardSpriteOverlay.swift` spawned flat 2D circles. That meant:
1. You could not see the **3 simultaneous faces (`Top + South + East`)** of Twisted23's signature **3D-in-2D orthographic** parlour dice.
2. You could not see a real **Axle-Lock Skewer (`[1-6]`, `[2-5]`, `[3-4]`)** piercing opposite hubs in 3D space.
3. You could not render a physically refracting **transparent polycarbonate FOBB** with its sliding `1/2"` chrome steel ball-bearing + hex coupler (`#761035`) and soft black bounce nosecone.

## Architecture: Antigravity Remote (`A785`) vs Local MacBook Air SSH / Xcode

| Layer | Target | Runs on Antigravity Remote Linux VM? | Runs on MacBook Air / iPhone (Xcode 16)? |
| :--- | :--- | :---: | :---: |
| **Pure Math & Physics** | `SpatialGraphicsCore` | **Yes (`swift test` / CLI)** | **Yes (Native ARM64)** |
| **3D GPU PBR Graphics** | `SpatialStudioApp` (`SceneKit` + `Metal` + `SwiftUI`) | Headless CLI fallback (`#else`) | **Full 60/120fps Metal 3D Window!** |

### Why Split `SpatialGraphicsCore` from `SpatialStudioApp`?
- **Remote Antigravity Cloud VM (`ezm0ver3eggs-rempr0ject`)** runs sandboxed Debian 12 Linux: it excels at GitHub (`gh`), Google Workspace (`gsheets`/`gdrive`), web deployments, and pure-Swift math/solver engineering, **but Linux cannot execute Apple's proprietary `Metal` / `SceneKit` / `SwiftUI` GPU frameworks**.
- **Antigravity Desktop + SSH to MacBook Air (or `git pull` sync)**:
  - Open **Antigravity Desktop** directly on your MacBook Air (or SSH into your MacBook Air where Xcode's SDK lives) to iterate on live `Metal` / `SceneKit` shaders and Xcode Previews.
  - Meanwhile, any remote Antigravity cloud agent (`A785`) can push pure math, level seeds, physics solvers, and SceneKit Swift code straight to GitHub—and on your Mac you simply run:

```bash
git pull
open swift-graphics/SpatialStudio/Package.swift
# In Xcode: choose "SpatialStudioApp -> My Mac" and press Cmd + R!
```
