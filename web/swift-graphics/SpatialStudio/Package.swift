// swift-tools-version: 6.0
// SpatialStudio — Fresh-Start True 3D Metal/SceneKit Graphics Engine for Gravity Wizards & Twisted23
// Double-click Package.swift on macOS (Xcode 16+) -> Select "SpatialStudioApp" -> Press Cmd+R!

import PackageDescription

let package = Package(
    name: "SpatialStudio",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        // Pure cross-platform Swift math & physics core (compiles on Linux/Antigravity VM AND macOS/iOS!)
        .library(
            name: "SpatialGraphicsCore",
            targets: ["SpatialGraphicsCore"]
        ),
        // Hardware-accelerated Metal/SceneKit 3D Studio App for macOS & iOS/iPadOS
        .executable(
            name: "SpatialStudioApp",
            targets: ["SpatialStudioApp"]
        )
    ],
    targets: [
        .target(
            name: "SpatialGraphicsCore",
            path: "Sources/SpatialGraphicsCore"
        ),
        .executableTarget(
            name: "SpatialStudioApp",
            dependencies: ["SpatialGraphicsCore"],
            path: "Sources/SpatialStudioApp"
        ),
        .testTarget(
            name: "SpatialGraphicsCoreTests",
            dependencies: ["SpatialGraphicsCore"],
            path: "Tests/SpatialGraphicsCoreTests"
        )
    ]
)
