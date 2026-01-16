/**
 * Section Detector
 *
 * Detects and marks section boundaries in a timeline.
 * Converts SongModel sections into TimelineSectionBoundary events.
 */

import type { Section, SectionBoundary } from "../types";

/**
 * Section boundary detection options
 */
export interface SectionDetectorOptions {
  includeSectionEnds?: boolean; // Whether to mark both start and end (default: true)
  generateEventIds?: boolean; // Whether to generate UUIDs for events (default: true)
}

/**
 * Default options for section detection
 */
const DEFAULT_OPTIONS: Required<SectionDetectorOptions> = {
  includeSectionEnds: true,
  generateEventIds: true,
};

/**
 * Section Detector
 *
 * Detects section boundaries from SongModel sections.
 */
export class SectionDetector {
  private readonly options: Required<SectionDetectorOptions>;

  constructor(options: SectionDetectorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Detect section boundaries from sections
   *
   * Converts Section[] into SectionBoundary[] events.
   */
  detectBoundaries(sections: Section[]): SectionBoundary[] {
    const boundaries: SectionBoundary[] = [];

    for (const section of sections) {
      // Add section start boundary
      boundaries.push({
        time: section.startTime,
        sectionId: section.sectionId,
        sectionName: section.name,
        type: "start",
        eventId: this.options.generateEventIds
          ? crypto.randomUUID()
          : `section-${section.sectionId}-start`,
      });

      // Add section end boundary if enabled
      if (this.options.includeSectionEnds) {
        const endTime = section.startTime + section.duration;
        boundaries.push({
          time: endTime,
          sectionId: section.sectionId,
          sectionName: section.name,
          type: "end",
          eventId: this.options.generateEventIds
            ? crypto.randomUUID()
            : `section-${section.sectionId}-end`,
        });
      }
    }

    // Sort boundaries by time
    boundaries.sort((a, b) => a.time - b.time);

    return boundaries;
  }

  /**
   * Get section at a given time
   *
   * Returns the section active at the specified time, or null if no section.
   */
  getSectionAtTime(sections: Section[], time: number): Section | null {
    for (const section of sections) {
      if (time >= section.startTime && time < section.startTime + section.duration) {
        return section;
      }
    }
    return null;
  }

  /**
   * Get all section boundaries between two times
   *
   * Returns all section boundaries that occur within the time range [startTime, endTime].
   */
  getBoundariesInRange(sections: Section[], startTime: number, endTime: number): SectionBoundary[] {
    const boundaries = this.detectBoundaries(sections);
    return boundaries.filter((b) => b.time >= startTime && b.time <= endTime);
  }

  /**
   * Validate sections don't overlap
   *
   * Returns true if sections are properly ordered without overlaps.
   */
  validateSections(sections: Section[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sortedSections = [...sections].sort((a, b) => a.startTime - b.startTime);

    for (let i = 0; i < sortedSections.length; i++) {
      const current = sortedSections[i];

      // Check for negative start time
      if (current.startTime < 0) {
        errors.push(`Section "${current.name}" has negative start time: ${current.startTime}`);
      }

      // Check for negative or zero duration
      if (current.duration <= 0) {
        errors.push(`Section "${current.name}" has invalid duration: ${current.duration}`);
      }

      // Check for overlap with next section
      if (i < sortedSections.length - 1) {
        const next = sortedSections[i + 1];
        const currentEnd = current.startTime + current.duration;

        if (currentEnd > next.startTime) {
          errors.push(
            `Section "${current.name}" overlaps with "${next.name}": ` +
              `${current.startTime}+${current.duration}=${currentEnd} > ${next.startTime}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Merge overlapping sections
   *
   * Detects and resolves overlapping sections by merging them.
   * The later section's time is adjusted to start after the earlier section ends.
   */
  mergeOverlappingSections(sections: Section[]): Section[] {
    const sortedSections = [...sections].sort((a, b) => a.startTime - b.startTime);
    const merged: Section[] = [];

    for (const section of sortedSections) {
      if (merged.length === 0) {
        merged.push({ ...section });
        continue;
      }

      const lastSection = merged[merged.length - 1];
      const lastEnd = lastSection.startTime + lastSection.duration;

      if (section.startTime < lastEnd) {
        // Overlap detected: adjust section start time
        const adjustedSection: Section = {
          ...section,
          startTime: lastEnd,
        };
        merged.push(adjustedSection);
      } else {
        merged.push({ ...section });
      }
    }

    return merged;
  }
}
