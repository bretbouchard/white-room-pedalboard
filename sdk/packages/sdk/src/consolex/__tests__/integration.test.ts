/**
 * ConsoleX Integration Tests
 *
 * Tests for ConsoleX profile loading, application, and integration
 * with performance switching.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateConsoleXProfile,
  createSoloPianoConsoleXProfile,
  createSATBConsoleXProfile,
  createAmbientTechnoConsoleXProfile,
  ConsoleXProfileRegistry,
  createConsoleXProfileRegistryWithPresets,
  ConsoleXProfileApplier,
  createConsoleXProfileApplier,
  getDefaultConsoleXProfileId
} from '../index.js';

describe('ConsoleX Profile Validation', () => {
  it('should validate a valid solo piano profile', () => {
    const profile = createSoloPianoConsoleXProfile();
    const result = validateConsoleXProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate a valid SATB profile', () => {
    const profile = createSATBConsoleXProfile();
    const result = validateConsoleXProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate a valid ambient techno profile', () => {
    const profile = createAmbientTechnoConsoleXProfile();
    const result = validateConsoleXProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject profile with missing ID', () => {
    const profile = createSoloPianoConsoleXProfile();
    delete (profile as any).id;

    const result = validateConsoleXProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid id');
  });

  it('should reject profile with invalid gain', () => {
    const profile = createSoloPianoConsoleXProfile();
    profile.masterBus.gain = 5.0; // Invalid: > 2

    const result = validateConsoleXProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('gain'))).toBe(true);
  });

  it('should reject profile with invalid CPU usage', () => {
    const profile = createSoloPianoConsoleXProfile();
    profile.performance.targetCpuUsage = 150; // Invalid: > 100

    const result = validateConsoleXProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('targetCpuUsage'))).toBe(true);
  });
});

describe('ConsoleX Profile Registry', () => {
  let registry: ConsoleXProfileRegistry;

  beforeEach(() => {
    registry = createConsoleXProfileRegistryWithPresets();
  });

  it('should initialize with three preset profiles', () => {
    const profiles = registry.listProfiles();

    expect(profiles).toHaveLength(3);
    expect(profiles.find(p => p.id === 'consolex-solo-piano')).toBeDefined();
    expect(profiles.find(p => p.id === 'consolex-satb')).toBeDefined();
    expect(profiles.find(p => p.id === 'consolex-ambient-techno')).toBeDefined();
  });

  it('should get solo piano profile by ID', () => {
    const result = registry.getProfile('consolex-solo-piano');

    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
    expect(result.profile?.name).toBe('Solo Piano ConsoleX');
    expect(result.profile?.performance.targetCpuUsage).toBe(30);
  });

  it('should get SATB profile by ID', () => {
    const result = registry.getProfile('consolex-satb');

    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
    expect(result.profile?.name).toBe('SATB Choir ConsoleX');
    expect(result.profile?.performance.targetCpuUsage).toBe(50);
  });

  it('should get ambient techno profile by ID', () => {
    const result = registry.getProfile('consolex-ambient-techno');

    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
    expect(result.profile?.name).toBe('Ambient Techno ConsoleX');
    expect(result.profile?.performance.targetCpuUsage).toBe(70);
  });

  it('should return error for non-existent profile', () => {
    const result = registry.getProfile('non-existent');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('should add a custom profile', () => {
    const customProfile = createSoloPianoConsoleXProfile();
    customProfile.id = 'custom-profile';
    customProfile.name = 'Custom Profile';

    const result = registry.addProfile(customProfile);

    expect(result.success).toBe(true);
    expect(result.profile?.id).toBe('custom-profile');

    const profiles = registry.listProfiles();
    expect(profiles.find(p => p.id === 'custom-profile')).toBeDefined();
  });

  it('should reject duplicate profile IDs', () => {
    const profile = createSoloPianoConsoleXProfile();

    const result = registry.addProfile(profile);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ALREADY_EXISTS');
  });

  it('should check if profile exists', () => {
    expect(registry.hasProfile('consolex-solo-piano')).toBe(true);
    expect(registry.hasProfile('non-existent')).toBe(false);
  });
});

describe('ConsoleX Profile Applier', () => {
  let applier: ConsoleXProfileApplier;

  beforeEach(() => {
    const registry = createConsoleXProfileRegistryWithPresets();
    applier = createConsoleXProfileApplier(registry);
  });

  it('should apply solo piano profile', async () => {
    const result = await applier.applyProfile('consolex-solo-piano');

    expect(result.success).toBe(true);
    expect(result.appliedProfile).toBeDefined();
    expect(result.appliedProfile?.id).toBe('consolex-solo-piano');
    expect(result.appliedProfile?.performance.targetCpuUsage).toBe(30);
  });

  it('should apply SATB profile', async () => {
    const result = await applier.applyProfile('consolex-satb');

    expect(result.success).toBe(true);
    expect(result.appliedProfile).toBeDefined();
    expect(result.appliedProfile?.id).toBe('consolex-satb');
    expect(result.appliedProfile?.performance.targetCpuUsage).toBe(50);
  });

  it('should apply ambient techno profile', async () => {
    const result = await applier.applyProfile('consolex-ambient-techno');

    expect(result.success).toBe(true);
    expect(result.appliedProfile).toBeDefined();
    expect(result.appliedProfile?.id).toBe('consolex-ambient-techno');
    expect(result.appliedProfile?.performance.targetCpuUsage).toBe(70);
  });

  it('should return error for non-existent profile', async () => {
    const result = await applier.applyProfile('non-existent');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('should get current profile after applying', async () => {
    await applier.applyProfile('consolex-satb');

    const result = await applier.getCurrentProfile();

    expect(result.success).toBe(true);
    expect(result.profileId).toBe('consolex-satb');
    expect(result.profile).toBeDefined();
    expect(result.profile?.name).toBe('SATB Choir ConsoleX');
  });

  it('should return error when getting current profile before applying', async () => {
    const result = await applier.getCurrentProfile();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  it('should reset to default profile', async () => {
    await applier.applyProfile('consolex-ambient-techno');
    await applier.resetToDefault();

    const result = await applier.getCurrentProfile();

    expect(result.success).toBe(true);
    expect(result.profileId).toBe('consolex-solo-piano');
  });

  it('should switch between multiple profiles', async () => {
    // Start with piano
    await applier.applyProfile('consolex-solo-piano');
    let current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(30);

    // Switch to SATB
    await applier.applyProfile('consolex-satb');
    current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(50);

    // Switch to techno
    await applier.applyProfile('consolex-ambient-techno');
    current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(70);
  });
});

describe('ConsoleX Profile Presets', () => {
  it('should create solo piano profile with correct settings', () => {
    const profile = createSoloPianoConsoleXProfile();

    expect(profile.id).toBe('consolex-solo-piano');
    expect(profile.name).toBe('Solo Piano ConsoleX');
    expect(profile.performance.targetCpuUsage).toBe(30);
    expect(profile.performance.maxVoices).toBe(64);
    expect(profile.voiceBusses).toHaveLength(2);
    expect(profile.mixBusses).toHaveLength(1);
  });

  it('should create SATB profile with correct settings', () => {
    const profile = createSATBConsoleXProfile();

    expect(profile.id).toBe('consolex-satb');
    expect(profile.name).toBe('SATB Choir ConsoleX');
    expect(profile.performance.targetCpuUsage).toBe(50);
    expect(profile.performance.maxVoices).toBe(32);
    expect(profile.voiceBusses).toHaveLength(4); // Soprano, Alto, Tenor, Bass
    expect(profile.mixBusses).toHaveLength(2); // Reverb, Chorus
  });

  it('should create ambient techno profile with correct settings', () => {
    const profile = createAmbientTechnoConsoleXProfile();

    expect(profile.id).toBe('consolex-ambient-techno');
    expect(profile.name).toBe('Ambient Techno ConsoleX');
    expect(profile.performance.targetCpuUsage).toBe(70);
    expect(profile.performance.maxVoices).toBe(16);
    expect(profile.voiceBusses).toHaveLength(5); // Lead, Pad, Bass, Texture, Drums
    expect(profile.mixBusses).toHaveLength(2); // Reverb, Delay
  });
});

describe('ConsoleX Default Profile IDs', () => {
  it('should return piano profile ID for solo piano', () => {
    const profileId = getDefaultConsoleXProfileId('Solo Piano');
    expect(profileId).toBe('consolex-solo-piano');
  });

  it('should return SATB profile ID for SATB', () => {
    const profileId = getDefaultConsoleXProfileId('SATB');
    expect(profileId).toBe('consolex-satb');
  });

  it('should return techno profile ID for ambient techno', () => {
    const profileId = getDefaultConsoleXProfileId('Ambient Techno');
    expect(profileId).toBe('consolex-ambient-techno');
  });

  it('should default to piano for unknown performance names', () => {
    const profileId = getDefaultConsoleXProfileId('Unknown Performance');
    expect(profileId).toBe('consolex-solo-piano');
  });

  it('should handle case-insensitive matching', () => {
    expect(getDefaultConsoleXProfileId('piano')).toBe('consolex-solo-piano');
    expect(getDefaultConsoleXProfileId('PIANO')).toBe('consolex-solo-piano');
    expect(getDefaultConsoleXProfileId('choir')).toBe('consolex-satb');
    expect(getDefaultConsoleXProfileId('techno')).toBe('consolex-ambient-techno');
  });
});

describe('ConsoleX Profile Integration Scenarios', () => {
  it('should simulate Piano -> Techno switch', async () => {
    const registry = createConsoleXProfileRegistryWithPresets();
    const applier = createConsoleXProfileApplier(registry);

    // Start with Piano
    await applier.applyProfile('consolex-solo-piano');
    let current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(30);
    expect(current.profile?.performance.maxVoices).toBe(64);
    expect(current.profile?.mixBusses).toHaveLength(1); // Reverb only

    // Switch to Techno
    await applier.applyProfile('consolex-ambient-techno');
    current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(70);
    expect(current.profile?.performance.maxVoices).toBe(16);
    expect(current.profile?.mixBusses).toHaveLength(2); // Reverb + Delay
  });

  it('should simulate Piano -> SATB switch', async () => {
    const registry = createConsoleXProfileRegistryWithPresets();
    const applier = createConsoleXProfileApplier(registry);

    // Start with Piano
    await applier.applyProfile('consolex-solo-piano');
    let current = await applier.getCurrentProfile();
    expect(current.profile?.voiceBusses).toHaveLength(2); // Melody + Accompaniment

    // Switch to SATB
    await applier.applyProfile('consolex-satb');
    current = await applier.getCurrentProfile();
    expect(current.profile?.voiceBusses).toHaveLength(4); // Soprano, Alto, Tenor, Bass
    expect(current.profile?.mixBusses).toHaveLength(2); // Reverb + Chorus
  });

  it('should simulate full cycle: Piano -> SATB -> Techno -> Piano', async () => {
    const registry = createConsoleXProfileRegistryWithPresets();
    const applier = createConsoleXProfileApplier(registry);

    // Piano
    await applier.applyProfile('consolex-solo-piano');
    let current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(30);

    // SATB
    await applier.applyProfile('consolex-satb');
    current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(50);

    // Techno
    await applier.applyProfile('consolex-ambient-techno');
    current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(70);

    // Back to Piano
    await applier.applyProfile('consolex-solo-piano');
    current = await applier.getCurrentProfile();
    expect(current.profile?.performance.targetCpuUsage).toBe(30);
  });
});
