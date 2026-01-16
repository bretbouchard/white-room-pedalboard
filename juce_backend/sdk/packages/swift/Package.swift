// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "SchillingerSDK",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .watchOS(.v8),
        .tvOS(.v15)
    ],
    products: [
        .library(
            name: "SchillingerSDK",
            targets: ["SchillingerSDK"]
        ),
    ],
    dependencies: [
        // Add dependencies here if needed
    ],
    targets: [
        .target(
            name: "SchillingerSDK",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "SchillingerSDKTests",
            dependencies: ["SchillingerSDK"],
            path: "Tests"
        ),
    ]
)