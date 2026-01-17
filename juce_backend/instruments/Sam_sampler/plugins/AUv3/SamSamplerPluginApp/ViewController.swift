//
//  ViewController.swift
//  SamSamplerPluginApp
//
//  Main view controller for host app
//

import UIKit
import AVFoundation

class ViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        // Setup UI
        setupUI()
    }

    private func setupUI() {
        // Title label
        let titleLabel = UILabel()
        titleLabel.text = "Sam Sampler"
        titleLabel.font = .systemFont(ofSize: 32, weight: .bold)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        // Subtitle label
        let subtitleLabel = UILabel()
        subtitleLabel.text = "AUv3 Instrument Plugin"
        subtitleLabel.font = .systemFont(ofSize: 18, weight: .regular)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.textAlignment = .center
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        // Info label
        let infoLabel = UILabel()
        infoLabel.text = "This app hosts the Sam Sampler AUv3 extension.\n\nTo use the plugin:\n1. Open a compatible AUv3 host app (GarageBand, AUM, etc.)\n2. Add a new instrument track\n3. Select Sam Sampler from the instrument list\n4. Load your SF2 SoundFont files and start playing"
        infoLabel.font = .systemFont(ofSize: 14, weight: .regular)
        infoLabel.textColor = .label
        infoLabel.textAlignment = .left
        infoLabel.numberOfLines = 0
        infoLabel.translatesAutoresizingMaskIntoConstraints = false

        // Stack view
        let stackView = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel, infoLabel])
        stackView.axis = .vertical
        stackView.spacing = 20
        stackView.alignment = .fill
        stackView.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(stackView)

        NSLayoutConstraint.activate([
            stackView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
            stackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40)
        ])
    }
}
