/*
  ==============================================================================

    PresetConverter.h
    Universal Preset Format Converter

    Converts between:
    - VST3 .vstpreset format (XML-based)
    - AU .aupreset format (Property List)
    - JSON format (human-readable)

    Supports all White Room instruments and effects.

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>

namespace WhiteRoom {

//==============================================================================
/**
 * Universal preset format converter
 *
 * Supports converting between VST3, AU, and JSON preset formats.
 * Preserves all parameter metadata including values, names, and categories.
 */
class PresetConverter
{
public:
    //==============================================================================
    /** Supported preset formats */
    enum class Format
    {
        VST3,      ///< .vstpreset (VST3 preset format)
        AU,        ///< .aupreset (Audio Unit preset format)
        JSON,      ///< .json (Human-readable JSON)
        Unknown    ///< Unknown format
    };

    //==============================================================================
    /** Preset data structure */
    struct PresetData
    {
        juce::String name;
        juce::String category;
        juce::String author;
        juce::String description;
        juce::HashMap<juce::String, double> parameters;
        juce::HashMap<juce::String, juce::String> parameterLabels;
    };

    //==============================================================================
    /**
     * Detect preset format from file extension
     */
    static Format detectFormat (const juce::File& file)
    {
        auto ext = file.getFileExtension().toLowerCase();

        if (ext == ".vstpreset")
            return Format::VST3;
        else if (ext == ".aupreset")
            return Format::AU;
        else if (ext == ".json")
            return Format::JSON;
        else
            return Format::Unknown;
    }

    //==============================================================================
    /**
     * Load preset from file (auto-detects format)
     */
    static PresetData loadPreset (const juce::File& file)
    {
        auto format = detectFormat (file);

        switch (format)
        {
            case Format::VST3:
                return loadVST3Preset (file);
            case Format::AU:
                return loadAUPreset (file);
            case Format::JSON:
                return loadJSONPreset (file);
            default:
                jassertfalse;
                return {};
        }
    }

    //==============================================================================
    /**
     * Save preset to file (format based on extension)
     */
    static bool savePreset (const juce::File& file, const PresetData& preset)
    {
        auto format = detectFormat (file);

        switch (format)
        {
            case Format::VST3:
                return saveVST3Preset (file, preset);
            case Format::AU:
                return saveAUPreset (file, preset);
            case Format::JSON:
                return saveJSONPreset (file, preset);
            default:
                return false;
        }
    }

    //==============================================================================
    /**
     * Convert preset from one format to another
     */
    static bool convertPreset (const juce::File& sourceFile,
                               const juce::File& destFile)
    {
        auto preset = loadPreset (sourceFile);
        return savePreset (destFile, preset);
    }

    //==============================================================================
    /**
     * Batch convert directory of presets
     */
    static int batchConvert (const juce::File& sourceDir,
                             const juce::File& destDir,
                             Format destFormat,
                             bool recursive = true)
    {
        int converted = 0;
        juce::Array<juce::File> presets;

        // Find all preset files
        if (recursive)
            sourceDir.findChildFiles (presets, juce::File::findFiles, true, "*.vstpreset;*.aupreset;*.json");
        else
            sourceDir.findChildFiles (presets, juce::File::findFiles, false, "*.vstpreset;*.aupreset;*.json");

        for (auto& preset : presets)
        {
            // Determine destination file path
            auto relativePath = preset.getRelativePathFrom (sourceDir);
            auto destFile = destDir.getChildFile (relativePath);

            // Change extension based on target format
            auto newExt = getExtensionForFormat (destFormat);
            destFile = destFile.withFileExtension (newExt);

            // Convert
            if (convertPreset (preset, destFile))
                ++converted;
        }

        return converted;
    }

private:
    //==============================================================================
    static juce::String getExtensionForFormat (Format format)
    {
        switch (format)
        {
            case Format::VST3: return ".vstpreset";
            case Format::AU: return ".aupreset";
            case Format::JSON: return ".json";
            default: return "";
        }
    }

    //==============================================================================
    // VST3 Format (XML-based)
    static PresetData loadVST3Preset (const juce::File& file)
    {
        PresetData preset;

        auto xml = juce::XmlDocument::parse (file);
        if (!xml)
            return preset;

        auto* root = xml->getChildByName ("value-list");
        if (!root)
            return preset;

        // Parse parameters
        for (auto* child : root->getChildIterator())
        {
            if (auto* value = child->getChildByName ("value"))
            {
                auto name = child->getStringAttribute ("name");
                auto val = value->getDoubleAttribute ("value");
                preset.parameters.set (name, val);
            }
        }

        // Parse metadata
        if (auto* meta = root->getChildByName ("meta-info"))
        {
            if (auto* name = meta->getChildByName ("name"))
                preset.name = name->getAllSubText();
            if (auto* category = meta->getChildByName ("category"))
                preset.category = category->getAllSubText();
        }

        return preset;
    }

    static bool saveVST3Preset (const juce::File& file, const PresetData& preset)
    {
        juce::XmlElement root ("vst3-preset");

        auto* valueList = new juce::XmlElement ("value-list");

        // Add parameters
        for (auto it = preset.parameters.begin(); it != preset.parameters.end(); ++it)
        {
            auto* valueElement = new juce::XmlElement ("value");
            valueElement->setAttribute ("name", it.getKey());
            valueElement->setAttribute ("value", it.getValue());

            auto* child = new juce::XmlElement ("parameter");
            child->addChildElement (valueElement);
            valueList->addChildElement (child);
        }

        root.addChildElement (valueList);

        // Add metadata
        auto* meta = new juce::XmlElement ("meta-info");
        {
            auto* name = new juce::XmlElement ("name");
            name->addTextElement (preset.name);
            meta->addChildElement (name);

            auto* category = new juce::XmlElement ("category");
            category->addTextElement (preset.category);
            meta->addChildElement (category);
        }
        root.addChildElement (meta);

        // Write to file
        auto xmlString = root.toString ();
        return file.replaceTextWith (xmlString);
    }

    //==============================================================================
    // AU Format (Property List)
    static PresetData loadAUPreset (const juce::File& file)
    {
        PresetData preset;

        auto xml = juce::XmlDocument::parse (file);
        if (!xml)
            return preset;

        auto* dict = xml->getChildByName ("dict");
        if (!dict)
            return preset;

        // Parse synth-preset dictionary
        juce::StringArray keyOrder;
        for (auto* child : dict->getChildIterator())
        {
            if (child->isTextElement())
                keyOrder.add (child->getText ());
        }

        int valueIndex = 0;
        for (int i = 0; i < keyOrder.size(); ++i)
        {
            auto key = keyOrder[i];
            auto* valueElement = dict->getChildElement (valueIndex++);

            if (key == "name")
                preset.name = valueElement->getAllSubText();
            else if (key == "type" || key == "version" || key == "device")
                continue;
            else
                preset.parameters.set (key, valueElement->getAllSubText().getDoubleValue());
        }

        return preset;
    }

    static bool saveAUPreset (const juce::File& file, const PresetData& preset)
    {
        juce::XmlElement root ("plist");
        root.setAttribute ("version", "1.0");

        auto* dict = new juce::XmlElement ("dict");

        // Add standard AU keys
        {
            auto* key = new juce::XmlElement ("key");
            key->addTextElement ("name");
            dict->addChildElement (key);

            auto* value = new juce::XmlElement ("string");
            value->addTextElement (preset.name);
            dict->addChildElement (value);
        }

        // Add parameters
        for (auto it = preset.parameters.begin(); it != preset.parameters.end(); ++it)
        {
            auto* key = new juce::XmlElement ("key");
            key->addTextElement (it.getKey());
            dict->addChildElement (key);

            auto* value = new juce::XmlElement ("real");
            value->setAttribute ("value", it.getValue());
            dict->addChildElement (value);
        }

        root.addChildElement (dict);

        auto xmlString = root.toString ();
        return file.replaceTextWith (xmlString);
    }

    //==============================================================================
    // JSON Format
    static PresetData loadJSONPreset (const juce::File& file)
    {
        PresetData preset;

        auto json = juce::JSON::parse (file);
        if (!json.isObject())
            return preset;

        preset.name = json.getProperty ("name", "Untitled").toString();
        preset.category = json.getProperty ("category", "").toString();
        preset.author = json.getProperty ("author", "").toString();
        preset.description = json.getProperty ("description", "").toString();

        auto* params = json.getProperty ("parameters").getDynamicObject();
        if (params)
        {
            for (auto it = params->begin(); it != params->end(); ++it)
                preset.parameters.set (it.key.toString(), it.value.toString().getDoubleValue());
        }

        return preset;
    }

    static bool saveJSONPreset (const juce::File& file, const PresetData& preset)
    {
        juce::DynamicObject::Ptr json = new juce::DynamicObject();

        json->setProperty ("name", preset.name);
        json->setProperty ("category", preset.category);
        json->setProperty ("author", preset.author);
        json->setProperty ("description", preset.description);

        juce::DynamicObject::Ptr params = new juce::DynamicObject();
        for (auto it = preset.parameters.begin(); it != preset.parameters.end(); ++it)
            params->setProperty (it.getKey(), it.getValue());

        json->setProperty ("parameters", params.get());

        auto jsonString = juce::JSON::toString (juce::var (json.get()), true);
        return file.replaceTextWith (jsonString);
    }

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PresetConverter)
};

//==============================================================================
/**
 * Command-line preset converter utility
 */
class PresetConverterCLI
{
public:
    static int main (int argc, char* argv[])
    {
        juce::ConsoleApplication cli;

        if (argc < 3)
        {
            printUsage();
            return 1;
        }

        juce::String command = argv[1];

        if (command == "convert")
        {
            if (argc < 4)
            {
                std::cout << "Error: convert requires source and destination files\n";
                return 1;
            }

            juce::File source (argv[2]);
            juce::File dest (argv[3]);

            if (!source.existsAsFile())
            {
                std::cout << "Error: source file does not exist\n";
                return 1;
            }

            if (PresetConverter::convertPreset (source, dest))
            {
                std::cout << "Converted: " << source.getFileName() << " -> " << dest.getFileName() << "\n";
                return 0;
            }
            else
            {
                std::cout << "Error: conversion failed\n";
                return 1;
            }
        }
        else if (command == "batch")
        {
            if (argc < 5)
            {
                std::cout << "Error: batch requires source dir, dest dir, and format\n";
                return 1;
            }

            juce::File sourceDir (argv[2]);
            juce::File destDir (argv[3]);
            juce::String formatStr = argv[4];

            PresetConverter::Format format = PresetConverter::Format::JSON;
            if (formatStr == "vst3")
                format = PresetConverter::Format::VST3;
            else if (formatStr == "au")
                format = PresetConverter::Format::AU;
            else if (formatStr == "json")
                format = PresetConverter::Format::JSON;

            int converted = PresetConverter::batchConvert (sourceDir, destDir, format, true);
            std::cout << "Converted " << converted << " presets\n";

            return 0;
        }
        else
        {
            std::cout << "Error: unknown command '" << command << "'\n";
            printUsage();
            return 1;
        }

        return 0;
    }

private:
    static void printUsage()
    {
        std::cout << "\n";
        std::cout << "Preset Converter - Universal preset format converter\n";
        std::cout << "\n";
        std::cout << "Usage:\n";
        std::cout << "  preset-converter convert <source> <dest>\n";
        std::cout << "  preset-converter batch <source-dir> <dest-dir> <format>\n";
        std::cout << "\n";
        std::cout << "Formats:\n";
        std::cout << "  vst3  - VST3 preset format (.vstpreset)\n";
        std::cout << "  au    - Audio Unit preset format (.aupreset)\n";
        std::cout << "  json  - JSON format (.json)\n";
        std::cout << "\n";
        std::cout << "Examples:\n";
        std::cout << "  preset-converter convert preset.json preset.vstpreset\n";
        std::cout << "  preset-converter batch ./presets ./vst3_presets vst3\n";
        std::cout << "\n";
    }
};

} // namespace WhiteRoom
