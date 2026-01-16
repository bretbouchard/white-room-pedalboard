/**
 * Book IV: Form System Implementation
 *
 * Implements Schillinger's form theory using ratio trees, nested periodicity,
 * section reuse, and formal symmetry.
 *
 * Key concepts:
 * - Ratio trees: Hierarchical A:B:C... proportions
 * - Nested periodicity: Multi-level formal structures
 * - Section reuse: Repetition with transformation
 * - Formal symmetry: Palindromic, mirror, rotational forms
 * - Cadence constraints: Section boundaries and closures
 */

import {
  type FormSystem,
  type FormalSection,
  type RatioTreeNode,
  type SymmetryRule,
} from "../../types";

/**
 * Form analysis result
 */
export interface FormAnalysis {
  sections: FormalSection[];
  hierarchy: RatioTreeNode;
  depth: number;
  totalDuration: number;
}

/**
 * FormSystem class - Book IV implementation
 */
export class FormSystemImpl implements FormSystem {
  readonly systemId: string;
  readonly systemType = "form" as const;
  ratioTree: RatioTreeNode;
  sectionDefinitions: FormalSection[];
  symmetryRules: SymmetryRule[];
  cadenceConstraints: string[]; // Section IDs requiring cadence
  nestingDepth: number; // Maximum nesting level

  // Internal map for efficient lookup
  private sectionMap: Map<string, FormalSection>;

  constructor(data: FormSystem) {
    this.systemId = data.systemId;
    this.ratioTree = data.ratioTree;
    this.sectionDefinitions = data.sectionDefinitions;
    this.sectionMap = new Map(data.sectionDefinitions.map((s) => [s.sectionId, s]));
    this.symmetryRules = data.symmetryRules;
    this.cadenceConstraints = data.cadenceConstraints;
    this.nestingDepth = data.nestingDepth;
  }

  /**
   * Generate form structure from ratio tree
   *
   * @param totalDuration - Total duration in beats
   * @returns Formal sections with durations
   */
  generateForm(totalDuration: number): FormAnalysis {
    const sections: FormalSection[] = [];
    const { hierarchy, depth } = this.buildHierarchy(this.ratioTree);

    // Flatten hierarchy into sections
    this.flattenHierarchy(hierarchy, sections, 0, totalDuration, 1);

    return {
      sections,
      hierarchy,
      depth,
      totalDuration,
    };
  }

  /**
   * Build hierarchical structure from ratio tree
   *
   * @param node - Ratio tree node
   * @returns Hierarchy with depth
   */
  private buildHierarchy(node: RatioTreeNode): { hierarchy: RatioTreeNode; depth: number } {
    let maxDepth = 0;

    const traverse = (n: RatioTreeNode, currentDepth: number): RatioTreeNode => {
      maxDepth = Math.max(maxDepth, currentDepth);

      const processedNode: RatioTreeNode = {
        nodeId: n.nodeId,
        ratio: n.ratio,
        children: [],
      };

      if (n.children && n.children.length > 0) {
        processedNode.children = n.children.map((child) => traverse(child, currentDepth + 1));
      }

      return processedNode;
    };

    const hierarchy = traverse(node, 0);

    return { hierarchy, depth: maxDepth };
  }

  /**
   * Flatten hierarchy into linear sections
   *
   * @param node - Current hierarchy node
   * @param sections - Accumulated sections
   * @param offset - Time offset
   * @param remainingDuration - Remaining duration
   * @param level - Current nesting level (1-based)
   * @returns Next offset
   */
  private flattenHierarchy(
    node: RatioTreeNode,
    sections: FormalSection[],
    offset: number,
    remainingDuration: number,
    level: number
  ): number {
    // If leaf node or exceeded max depth, create section
    if (!node.children || node.children.length === 0 || level > this.nestingDepth) {
      const sectionId = node.nodeId;
      const definition = this.sectionMap.get(sectionId);

      if (definition) {
        // Apply symmetry transformations
        const transformed = this.applySymmetry(definition, offset);

        sections.push({
          ...transformed,
          startTime: offset,
          duration: remainingDuration,
        });

        return offset + remainingDuration;
      } else {
        // Create default section if not defined
        sections.push({
          sectionId,
          startTime: offset,
          duration: remainingDuration,
          content: {
            type: "placeholder",
          },
          requiresCadence: this.cadenceConstraints.includes(sectionId),
        });

        return offset + remainingDuration;
      }
    }

    // Distribute duration among children based on ratios
    const totalRatio = node.children.reduce((sum, child) => sum + child.ratio, 0);
    let currentOffset = offset;

    for (const child of node.children) {
      const childDuration = (child.ratio / totalRatio) * remainingDuration;
      currentOffset = this.flattenHierarchy(
        child,
        sections,
        currentOffset,
        childDuration,
        level + 1
      );
    }

    return currentOffset;
  }

  /**
   * Apply symmetry transformations to section
   *
   * @param section - Section definition
   * @param offset - Time offset
   * @returns Transformed section
   */
  private applySymmetry(
    section: FormalSection,
    _offset: number
  ): Omit<FormalSection, "startTime" | "duration"> {
    let transformed = { ...section };

    for (const rule of this.symmetryRules) {
      if (rule.axis === section.sectionId) {
        switch (rule.type) {
          case "palindromic":
            // Reverse content (placeholder - would need content-specific logic)
            transformed = {
              ...transformed,
              content: this.reverseContent(transformed.content),
            };
            break;

          case "mirror":
            // Mirror around center (placeholder)
            transformed = {
              ...transformed,
              content: this.mirrorContent(transformed.content),
            };
            break;

          case "rotational":
            // Rotate content (placeholder - amount not in current type definition)
            transformed = {
              ...transformed,
              content: this.rotateContent(transformed.content, 1),
            };
            break;
        }
      }
    }

    return transformed;
  }

  /**
   * Reverse content (placeholder for content-specific logic)
   *
   * @param content - Section content
   * @returns Reversed content
   */
  private reverseContent(content: any): any {
    // Placeholder: would reverse based on content type
    return content;
  }

  /**
   * Mirror content (placeholder for content-specific logic)
   *
   * @param content - Section content
   * @returns Mirrored content
   */
  private mirrorContent(content: any): any {
    // Placeholder: would mirror based on content type
    return content;
  }

  /**
   * Rotate content (placeholder for content-specific logic)
   *
   * @param content - Section content
   * @param amount - Rotation amount
   * @returns Rotated content
   */
  private rotateContent(content: any, _amount: number): any {
    // Placeholder: would rotate based on content type
    return content;
  }

  /**
   * Validate form system
   *
   * @returns Validation result
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check ratio tree
    this.validateRatioTree(this.ratioTree, errors);

    // Check nesting depth
    if (this.nestingDepth < 1 || this.nestingDepth > 10) {
      errors.push(`Nesting depth ${this.nestingDepth} out of range (1-10)`);
    }

    // Check section definitions
    for (const section of this.sectionDefinitions) {
      const sectionId = section.sectionId;
      if (!sectionId || sectionId.trim() === "") {
        errors.push(`Section has empty ID`);
      }
    }

    // Check symmetry rules
    for (const rule of this.symmetryRules) {
      if (!rule.ruleId || rule.ruleId.trim() === "") {
        errors.push("Symmetry rule has empty ID");
      }

      if (!rule.axis || rule.axis.trim() === "") {
        errors.push(`Symmetry rule ${rule.ruleId} has empty axis`);
      }

      const validTypes = ["mirror", "rotational", "palindromic"];
      if (!validTypes.includes(rule.type)) {
        errors.push(`Symmetry rule ${rule.ruleId} has invalid type "${rule.type}"`);
      }
    }

    // Check cadence constraints
    for (const sectionId of this.cadenceConstraints) {
      if (!this.sectionMap.has(sectionId)) {
        errors.push(`Cadence constraint references undefined section "${sectionId}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ratio tree recursively
   *
   * @param node - Ratio tree node
   * @param errors - Accumulated errors
   */
  private validateRatioTree(node: RatioTreeNode, errors: string[]): void {
    // Check node ID
    if (!node.nodeId || node.nodeId.trim() === "") {
      errors.push("Ratio tree node has empty ID");
    }

    // Check ratio
    if (node.ratio <= 0) {
      errors.push(`Ratio tree node "${node.nodeId}" has invalid ratio ${node.ratio}`);
    }

    // Check children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        this.validateRatioTree(child, errors);
      }
    }
  }

  /**
   * Get section definition
   *
   * @param sectionId - Section ID
   * @returns Section definition or undefined
   */
  getSection(sectionId: string): FormalSection | undefined {
    return this.sectionMap.get(sectionId);
  }

  /**
   * Get all section IDs
   *
   * @returns Array of section IDs
   */
  getSectionIds(): string[] {
    return this.sectionDefinitions.map((s) => s.sectionId);
  }
}

/**
 * Create a FormSystem with defaults
 *
 * @param overrides - Properties to override
 * @returns New FormSystemImpl instance
 */
export function createFormSystem(overrides?: Partial<FormSystem>): FormSystemImpl {
  const systemId = overrides?.systemId || generateUUID();

  const defaults: FormSystem = {
    systemId,
    systemType: "form",
    ratioTree: {
      nodeId: "root",
      ratio: 1,
      children: [
        {
          nodeId: "section-A",
          ratio: 1,
          children: [],
        },
        {
          nodeId: "section-B",
          ratio: 1,
          children: [],
        },
      ],
    },
    sectionDefinitions: [],
    symmetryRules: [],
    cadenceConstraints: [],
    nestingDepth: 3,
  };

  const data = { ...defaults, ...overrides, systemId };
  return new FormSystemImpl(data);
}

/**
 * Helper function to generate UUID
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
