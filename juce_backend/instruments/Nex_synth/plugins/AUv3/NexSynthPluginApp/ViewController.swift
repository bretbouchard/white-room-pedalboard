//
//  ViewController.swift
//  NexSynthPluginApp
//
//  Main view controller for host container app
//

import UIKit
import AVFoundation

class ViewController: UIViewController {

    private var audioEngine: AVAudioEngine!
    private var audioUnit: AVAudioUnit?

    override func viewDidLoad() {
        super.viewDidLoad()

        setupUI()
        setupAudio()
    }

    private func setupUI() {
        view.backgroundColor = .black

        // Title label
        let titleLabel = UILabel()
        titleLabel.text = "NexSynth FM Synthesizer"
        titleLabel.textColor = .white
        titleLabel.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        // Description label
        let descLabel = UILabel()
        descLabel.text = "This app hosts the NexSynth AUv3 extension.\n\nUse this app in GarageBand, AUM, or other AUv3 hosts."
        descLabel.textColor = .gray
        descLabel.font = UIFont.systemFont(ofSize: 14)
        descLabel.textAlignment = .center
        descLabel.numberOfLines = 0
        descLabel.translatesAutoresizingMaskIntoConstraints = false

        // Instructions label
        let instructionsLabel = UILabel()
        instructionsLabel.text = "To use NexSynth:\n\n1. Open GarageBand or another AUv3 host\n2. Create a new track\n3. Select 'Instrument' → 'AU Instruments' → 'White Room' → 'NexSynth'\n4. Start making music!"
        instructionsLabel.textColor = .lightGray
        instructionsLabel.font = UIFont.systemFont(ofSize: 12)
        instructionsLabel.textAlignment = .left
        instructionsLabel.numberOfLines = 0
        instructionsLabel.translatesAutoresizingMaskIntoConstraints = false

        // Add subviews
        view.addSubview(titleLabel)
        view.addSubview(descLabel)
        view.addSubview(instructionsLabel)

        // Layout
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 40),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            descLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 20),
            descLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            descLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            instructionsLabel.topAnchor.constraint(equalTo: descLabel.bottomAnchor, constant: 40),
            instructionsLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            instructionsLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        ])
    }

    private func setupAudio() {
        audioEngine = AVAudioEngine()

        // Load AUv3 component
        let componentDescription = AudioComponentDescription(
            componentType: kAudioUnitType_MusicDevice,
            componentSubType: 0x6e657873 /* "nexs" */,
            componentManufacturer: 0x5748524d /* "WHRM" */,
            componentFlags: 0,
            componentFlagsMask: 0
        )

        do {
            audioUnit = try AVAudioUnit(componentDescription: componentDescription)
            if let audioUnit = audioUnit {
                audioEngine.attach(audioUnit)
                audioEngine.connect(audioUnit, to: audioEngine.mainMixerNode, format: nil)

                // Start audio engine
                try audioEngine.start()
            }
        } catch {
            print("Failed to load NexSynth AUv3: \(error)")
        }
    }
}
