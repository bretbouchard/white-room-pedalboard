/*
  AUFactory.swift - AUv3 Component Factory

  Factory function for creating LocalGal AUv3 instances.
*/

import AVFoundation

@objc(LocalGalAudioUnitFactory)
class LocalGalAudioUnitFactory: NSObject {
    static func createAudioUnit(componentDescription: AudioComponentDescription) throws -> AUAudioUnit {
        return try LocalGalAudioUnit(
            componentDescription: componentDescription,
            options: []
        )
    }
}
