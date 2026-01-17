//
//  BiPhaseViewController.swift
//  BiPhasePluginExtension
//
//  View controller for BiPhase effect AUv3
//

import UIKit
import SwiftUI

class BiPhaseViewController: UIViewController {
    //==========================================================================
    // Properties
    //==========================================================================

    private var hostingController: UIHostingController<BiPhaseEffectView>?
    private var viewModel: BiPhaseViewModel?

    //==========================================================================
    // Lifecycle
    //==========================================================================

    override func viewDidLoad() {
        super.viewDidLoad()

        // Create view model
        let viewModel = BiPhaseViewModel()
        self.viewModel = viewModel

        // Create SwiftUI view
        let effectView = BiPhaseEffectView()
        let hostingController = UIHostingController(rootView: effectView)
        self.hostingController = hostingController

        // Add to view hierarchy
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        hostingController.didMove(toParent: self)

        // Set background color
        view.backgroundColor = UIColor.systemGroupedBackground
    }
}
