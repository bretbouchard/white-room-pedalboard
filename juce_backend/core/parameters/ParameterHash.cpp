/*
  ==============================================================================

    ParameterHash.cpp
    Created: January 15, 2026
    Author:  Bret Bouchard

    Deterministic parameter hashing system.

    Ensures consistent parameter identification across plugin instances
    and sessions for reliable preset management and automation.

  ==============================================================================
*/

#include "core/parameters/ParameterHash.h"
#include <cstring>

namespace schill {
namespace core {

//==============================================================================
// Hash Implementation
//==============================================================================

// Already implemented as inline functions in header
// This file exists for future expansion if needed

//==============================================================================
// Utility Functions
//==============================================================================

bool ParameterHash::validateParameterId(const char* parameterId) {
    if (!parameterId || strlen(parameterId) == 0) {
        return false;
    }

    // Check for valid characters (alphanumeric and underscore)
    for (const char* p = parameterId; *p != '\0'; ++p) {
        bool valid = (*p >= 'a' && *p <= 'z') ||
                     (*p >= 'A' && *p <= 'Z') ||
                     (*p >= '0' && *p <= '9') ||
                     (*p == '_');

        if (!valid) {
            return false;
        }
    }

    return true;
}

//==============================================================================
// Hash Collision Detection
//==============================================================================

struct HashEntry {
    uint32_t hash;
    const char* parameterId;
};

class ParameterHashTable {
public:
    ParameterHashTable(int tableSize = 1024)
        : tableSize_(tableSize)
    {
        table_.resize(tableSize);
    }

    bool insert(uint32_t hash, const char* parameterId) {
        int index = ParameterHash::hashToIndex(hash, tableSize_);

        // Check for collision
        if (table_[index].hash != 0 && table_[index].hash != hash) {
            // Hash collision detected!
            return false;
        }

        table_[index].hash = hash;
        table_[index].parameterId = parameterId;
        return true;
    }

    const char* lookup(uint32_t hash) const {
        int index = ParameterHash::hashToIndex(hash, tableSize_);
        if (table_[index].hash == hash) {
            return table_[index].parameterId;
        }
        return nullptr;
    }

private:
    int tableSize_;
    std::vector<HashEntry> table_;
};

} // namespace core
} // namespace schill
