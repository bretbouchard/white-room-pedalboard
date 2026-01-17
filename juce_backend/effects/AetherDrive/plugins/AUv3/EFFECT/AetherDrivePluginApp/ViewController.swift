//
//  ViewController.swift
//  AetherDrivePluginApp
//
//  Host view controller for AUv3 extension
//

import UIKit

class ViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set up UI
        view.backgroundColor = .systemBackground

        let label = UILabel()
        label.text = "Aether Drive\nAUv3 Effect Plugin"
        label.textAlignment = .center
        label.numberOfLines = 0
        label.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
}
