//
//  ViewController.swift
//  BiPhasePluginApp
//
//  Container app for BiPhase AUv3 effect
//

import UIKit
import AVFoundation

class ViewController: UIViewController {
    //==========================================================================
    // Properties
    //==========================================================================

    private var audioEngine: AVAudioEngine?
    private var effectNode: AVAudioUnitEffect?
    private var playerNode: AVAudioPlayerNode?

    //==========================================================================
    // UI Components
    //==========================================================================

    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "BiPhase Effect"
        label.font = UIFont.systemFont(ofSize: 28, weight: .bold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private let subtitleLabel: UILabel = {
        let label = UILabel()
        label.text = "AUv3 Phaser Plugin\nOpen in GarageBand or AUM to use"
        label.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private let infoTextView: UITextView = {
        let textView = UITextView()
        textView.text = """
        BiPhase is a dual phaser effect plugin emulating the classic Mu-Tron Bi-Phase.

        Features:
        • Dual 6-stage phaser sections
        • Three routing modes (Parallel, Series, Independent)
        • Dual LFOs with selectable sweep sources
        • Feedback with polarity control
        • Stereo processing

        To use this plugin:
        1. Open GarageBand, AUM, or any AUv3-compatible host
        2. Add an Audio Unit effect
        3. Select BiPhase from the effects list
        """
        textView.font = UIFont.systemFont(ofSize: 14)
        textView.isEditable = false
        textView.isScrollEnabled = true
        textView.layer.cornerRadius = 10
        textView.layer.borderWidth = 1
        textView.layer.borderColor = UIColor.separator.cgColor
        textView.translatesAutoresizingMaskIntoConstraints = false
        return textView
    }()

    //==========================================================================
    // Lifecycle
    //==========================================================================

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    //==========================================================================
    // Setup
    //==========================================================================

    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "BiPhase"

        // Add subviews
        view.addSubview(titleLabel)
        view.addSubview(subtitleLabel)
        view.addSubview(infoTextView)

        // Layout constraints
        NSLayoutConstraint.activate([
            // Title label
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 40),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            // Subtitle label
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 20),
            subtitleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            subtitleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            // Info text view
            infoTextView.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 40),
            infoTextView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            infoTextView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            infoTextView.bottomAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
        ])
    }
}
