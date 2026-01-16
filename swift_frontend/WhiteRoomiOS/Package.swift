// swift-tools-version:5.7
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SwiftFrontendShared",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .tvOS(.v15)
    ],
    products: [
        .library(
            name: "SwiftFrontendShared",
            targets: ["SwiftFrontendShared"]),
    ],
    dependencies: [
        // Add external dependencies here
    ],
    targets: [
        .target(
            name: "SwiftFrontendShared",
            dependencies: [],
            path: "../SwiftFrontendShared",
            resources: [
                // Add any resource files here
            ]
        ),
        .testTarget(
            name: "SwiftFrontendSharedTests",
            dependencies: ["SwiftFrontendShared"],
            path: "../SwiftFrontendSharedTests"
        ),
    ]
)
