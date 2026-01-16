/**
 * Form Engine - Advanced Musical Form Generation
 *
 * This module implements sophisticated musical form generation, structural analysis,
 * and architectural patterns based on Schillinger's Book 4: Form and modern
 * musical form theory. Handles binary, ternary, sonata, rondo, and arch forms.
 */

import { Rational } from "./rhythm";

// ===== BASIC TYPES =====

export interface FormalSection {
  id: string;
  name: string;
  type:
    | "exposition"
    | "development"
    | "recapitulation"
    | "transition"
    | "bridge"
    | "coda"
    | "episode"
    | "theme"
    | "variation"
    | "refrain"
    | "prelude"
    | "postlude";
  duration: Rational;
  priority: number; // 0-1, importance in form
  character: {
    stability: number; // 0-1, harmonic stability
    intensity: number; // 0-1, dynamic intensity
    complexity: number; // 0-1, textural complexity
    momentum: number; // 0-1, forward motion
  };
  materials: {
    themes: string[]; // Theme identifiers
    motifs: string[]; // Motif identifiers
    textures: string[]; // Texture types
    orchestrations: string[]; // Orchestration setups
  };
  structure: {
    subsections: FormalSubsection[];
    cadenceType:
      | "perfect"
      | "imperfect"
      | "plagal"
      | "deceptive"
      | "half"
      | "none";
    harmonicGoal: string; // Target harmony/key
    dominantPreparation: boolean;
  };
  relationships: {
    precedes: string[]; // Section IDs that follow
    follows: string[]; // Section IDs that precede
    parallels: string[]; // Similar sections
    contrasts: string[]; // Contrasting sections
  };
  follows: string[]; // Direct access to relationships.follows
  precedes: string[]; // Direct access to relationships.precedes
  parallels: string[]; // Direct access to relationships.parallels
  contrasts: string[]; // Direct access to relationships.contrasts
}

export interface FormalSubsection {
  id: string;
  name: string;
  duration: Rational;
  character: FormalSection["character"];
  content: {
    melody: string[]; // Melodic patterns
    harmony: string[]; // Harmonic progressions
    rhythm: string[]; // Rhythmic patterns
    texture: string; // Texture description
  };
  transitions: {
    in: "abrupt" | "gradual" | "bridge" | "elision";
    out: "abrupt" | "gradual" | "bridge" | "elision";
  };
}

export interface MusicalForm {
  id: string;
  name: string;
  type:
    | "binary"
    | "ternary"
    | "sonata"
    | "rondo"
    | "arch"
    | "theme_variations"
    | "through_composed"
    | "strophic"
    | "custom";
  scale: "micro" | "small" | "medium" | "large" | "macro";
  sections: FormalSection[];
  duration: Rational;
  architecture: {
    symmetry: number; // 0-1, structural symmetry
    balance: number; // 0-1, formal balance
    coherence: number; // 0-1, thematic coherence
    contrast: number; // 0-1, dramatic contrast
    complexity: number; // 0-1, structural complexity
  };
  analysis: {
    tonalPlan: TonalPlan;
    thematicMaterial: ThematicMaterial[];
    formalFunctions: FormalFunction[];
    structuralConnections: StructuralConnection[];
  };
  parameters: {
    repeatStrategy: "exact" | "ornamented" | "developed" | "varied";
    developmentIntensity: number; // 0-1, development depth
    contrastLevel: number; // 0-1, dramatic contrast
    returnEmphasis: number; // 0-1, return emphasis
  };
}

export interface TonalPlan {
  primary: string; // Primary key
  secondary?: string; // Secondary key
  relative?: string; // Relative key
  dominant?: string; // Dominant key
  modulationStrategy:
    | "direct"
    | "prepared"
    | "common_chord"
    | "enharmonic"
    | "chromatic";
  keyRelationships: KeyRelationship[];
}

export interface KeyRelationship {
  from: string;
  to: string;
  relationship:
    | "parallel"
    | "relative"
    | "dominant"
    | "subdominant"
    | "mediant"
    | "chromatic"
    | "enharmonic";
  distance: number; // Circle of fifths distance
  preparationLevel: number; // 0-1, how prepared the modulation is
}

export interface ThematicMaterial {
  id: string;
  name: string;
  type: "primary" | "secondary" | "transitional" | "developmental" | "closing";
  characteristics: {
    intervallic: number[]; // Characteristic intervals
    rhythmic: number[]; // Rhythmic signatures
    contour: "ascending" | "descending" | "arch" | "wave" | "static";
    register: "high" | "medium" | "low" | "wide" | "narrow";
  };
  transformations: ThemeTransformation[];
  usage: Array<{
    sectionId: string;
    transformation: string;
    prominence: number; // 0-1, how prominent
  }>;
}

export interface ThemeTransformation {
  type:
    | "inversion"
    | "retrograde"
    | "augmentation"
    | "diminution"
    | "fragmentation"
    | "development"
    | "sequencing";
  parameters: Record<string, any>;
  complexity: number; // 0-1
  character: ThematicMaterial["characteristics"];
}

export interface FormalFunction {
  id: string;
  sectionId: string;
  function:
    | "tonic"
    | "dominant"
    | "subdominant"
    | "pre_dominant"
    | "transition"
    | "development"
    | "recapitulation"
    | "coda";
  strength: number; // 0-1, functional clarity
  resolution?: string; // Target function ID
}

export interface StructuralConnection {
  from: string;
  to: string;
  type:
    | "direct"
    | "bridge"
    | "transition"
    | "modulation"
    | "elision"
    | "overlap";
  strength: number; // 0-1, connection strength
  preparation: number; // 0-1, preparation level
}

export interface FormTemplate {
  id: string;
  name: string;
  type: MusicalForm["type"];
  structure: FormSectionTemplate[];
  constraints: {
    minDuration: Rational;
    maxDuration: Rational;
    requiredSections: string[];
    optionalSections: string[];
    maxDepth: number; // Maximum subsection nesting
  };
  guidelines: {
    balancePoints: number[]; // Relative positions for balance
    climaxPoints: number[]; // Recommended climax positions
    contrastLevels: number[]; // Recommended contrast levels
  };
}

export interface FormSectionTemplate {
  name: string;
  type: FormalSection["type"];
  relativeDuration: number; // Percentage of total form
  optional: boolean;
  repeatable: boolean;
  flexible: boolean; // Can be subdivided
  structure: FormSectionTemplate[]; // Nested structure
}

export interface FormGenerationConstraints {
  duration?: Rational;
  complexity?: "simple" | "moderate" | "complex" | "very_complex";
  developmentalIntensity?: number;
  contrastLevel?: number;
  formalClarity?: number;
  symmetricalPreference?: number; // 0-1, preference for symmetry
  variationAmount?: number; // 0-1, amount of variation to apply
  contemporaryElements?: boolean;
}

export interface FormAnalysisResult {
  form: MusicalForm;
  metrics: {
    coherence: number; // 0-1, overall coherence
    balance: number; // 0-1, formal balance
    originality: number; // 0-1, originality of structure
    effectiveness: number; // 0-1, formal effectiveness
    symmetry: number; // 0-1, structural symmetry
  };
  recommendations: Array<{
    type: "structural" | "thematic" | "harmonic" | "developmental";
    priority: "high" | "medium" | "low";
    description: string;
    suggestion: string;
    impact: number; // 0-1, potential improvement
  }>;
  predictions: {
    audienceExpectation: number; // 0-1, how well meets expectations
    memorability: number; // 0-1, potential memorability
    emotionalImpact: number; // 0-1, emotional impact
    structuralInterest: number; // 0-1, structural interest
  };
}

// ===== CORE FORM ENGINE =====

export class FormEngine {
  private static readonly FORM_TEMPLATES: Record<string, FormTemplate> = {
    binary: {
      id: "binary_form",
      name: "Binary Form",
      type: "binary",
      structure: [
        {
          name: "A",
          type: "theme",
          relativeDuration: 0.5,
          optional: false,
          repeatable: true,
          flexible: true,
          structure: [],
        },
        {
          name: "B",
          type: "theme",
          relativeDuration: 0.5,
          optional: false,
          repeatable: true,
          flexible: true,
          structure: [],
        },
      ],
      constraints: {
        minDuration: new Rational(16, 1),
        maxDuration: new Rational(128, 1),
        requiredSections: ["A", "B"],
        optionalSections: [],
        maxDepth: 2,
      },
      guidelines: {
        balancePoints: [0.5],
        climaxPoints: [0.4, 0.8],
        contrastLevels: [0.6],
      },
    },
    ternary: {
      id: "ternary_form",
      name: "Ternary Form",
      type: "ternary",
      structure: [
        {
          name: "A",
          type: "theme",
          relativeDuration: 0.4,
          optional: false,
          repeatable: true,
          flexible: true,
          structure: [],
        },
        {
          name: "B",
          type: "episode",
          relativeDuration: 0.2,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "A'",
          type: "theme",
          relativeDuration: 0.4,
          optional: false,
          repeatable: true,
          flexible: true,
          structure: [],
        },
      ],
      constraints: {
        minDuration: new Rational(24, 1),
        maxDuration: new Rational(256, 1),
        requiredSections: ["A", "B", "A'"],
        optionalSections: [],
        maxDepth: 2,
      },
      guidelines: {
        balancePoints: [0.2, 0.8],
        climaxPoints: [0.4, 0.9],
        contrastLevels: [0.7],
      },
    },
    sonata: {
      id: "sonata_form",
      name: "Sonata Form",
      type: "sonata",
      structure: [
        {
          name: "Exposition",
          type: "exposition",
          relativeDuration: 0.4,
          optional: false,
          repeatable: true,
          flexible: true,
          structure: [],
        },
        {
          name: "Development",
          type: "development",
          relativeDuration: 0.3,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "Recapitulation",
          type: "recapitulation",
          relativeDuration: 0.3,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
      ],
      constraints: {
        minDuration: new Rational(64, 1),
        maxDuration: new Rational(512, 1),
        requiredSections: ["Exposition", "Development", "Recapitulation"],
        optionalSections: ["Introduction", "Coda"],
        maxDepth: 3,
      },
      guidelines: {
        balancePoints: [0.15, 0.7],
        climaxPoints: [0.65],
        contrastLevels: [0.8],
      },
    },
    rondo: {
      id: "rondo_form",
      name: "Rondo Form",
      type: "rondo",
      structure: [
        {
          name: "A",
          type: "refrain",
          relativeDuration: 0.3,
          optional: false,
          repeatable: true,
          flexible: true,
          structure: [],
        },
        {
          name: "B",
          type: "episode",
          relativeDuration: 0.2,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "A",
          type: "refrain",
          relativeDuration: 0.15,
          optional: false,
          repeatable: true,
          flexible: false,
          structure: [],
        },
        {
          name: "C",
          type: "episode",
          relativeDuration: 0.15,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "A",
          type: "refrain",
          relativeDuration: 0.2,
          optional: false,
          repeatable: true,
          flexible: false,
          structure: [],
        },
      ],
      constraints: {
        minDuration: new Rational(48, 1),
        maxDuration: new Rational(384, 1),
        requiredSections: ["A", "B", "A", "C", "A"],
        optionalSections: ["Introduction", "Coda"],
        maxDepth: 2,
      },
      guidelines: {
        balancePoints: [0.3, 0.8],
        climaxPoints: [0.75],
        contrastLevels: [0.6, 0.8],
      },
    },
    arch: {
      id: "arch_form",
      name: "Arch Form",
      type: "arch",
      structure: [
        {
          name: "A",
          type: "theme",
          relativeDuration: 0.15,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "B",
          type: "theme",
          relativeDuration: 0.2,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "C",
          type: "episode",
          relativeDuration: 0.3,
          optional: false,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "B'",
          type: "theme",
          relativeDuration: 0.2,
          optional: false,
          repeatable: false,
          flexible: false,
          structure: [],
        },
        {
          name: "A'",
          type: "theme",
          relativeDuration: 0.15,
          optional: false,
          repeatable: false,
          flexible: false,
          structure: [],
        },
      ],
      constraints: {
        minDuration: new Rational(48, 1),
        maxDuration: new Rational(256, 1),
        requiredSections: ["A", "B", "C", "B'", "A'"],
        optionalSections: [],
        maxDepth: 2,
      },
      guidelines: {
        balancePoints: [0.5],
        climaxPoints: [0.5],
        contrastLevels: [0.5],
      },
    },
    theme_variations: {
      id: "theme_variations",
      name: "Theme and Variations",
      type: "theme_variations",
      structure: [
        {
          name: "Theme",
          type: "theme",
          relativeDuration: 0.2,
          optional: false,
          repeatable: true,
          flexible: true,
          structure: [],
        },
        {
          name: "Var1",
          type: "variation",
          relativeDuration: 0.2,
          optional: true,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "Var2",
          type: "variation",
          relativeDuration: 0.2,
          optional: true,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "Var3",
          type: "variation",
          relativeDuration: 0.2,
          optional: true,
          repeatable: false,
          flexible: true,
          structure: [],
        },
        {
          name: "Var4",
          type: "variation",
          relativeDuration: 0.2,
          optional: true,
          repeatable: false,
          flexible: true,
          structure: [],
        },
      ],
      constraints: {
        minDuration: new Rational(32, 1),
        maxDuration: new Rational(256, 1),
        requiredSections: ["Theme"],
        optionalSections: ["Var1", "Var2", "Var3", "Var4", "Coda"],
        maxDepth: 2,
      },
      guidelines: {
        balancePoints: [0.5],
        climaxPoints: [0.7],
        contrastLevels: [0.3, 0.5, 0.7, 0.9],
      },
    },
  };

  // ===== MAIN FORM OPERATIONS =====

  /**
   * Generate musical form based on type and constraints
   */
  static generateForm(
    formType: MusicalForm["type"] | FormTemplate,
    constraints: FormGenerationConstraints = {},
    themes: string[] = ["primary", "secondary"],
  ): MusicalForm {
    const startTime = performance.now();

    // Get form template
    const template =
      typeof formType === "string" ? this.FORM_TEMPLATES[formType] : formType;
    if (!template) {
      throw new Error(`Unknown form type: ${formType}`);
    }

    // Set default constraints
    const defaultConstraints: FormGenerationConstraints = {
      duration: new Rational(64, 1),
      complexity: "moderate",
      developmentalIntensity: 0.5,
      contrastLevel: 0.5,
      formalClarity: 0.8,
      symmetricalPreference: 0.6,
      variationAmount: 0.3,
      contemporaryElements: false,
    };

    const finalConstraints = { ...defaultConstraints, ...constraints };

    // Validate duration constraints
    const duration = constraints.duration || template.constraints.minDuration;
    if (
      duration.lt(template.constraints.minDuration) ||
      duration.gt(template.constraints.maxDuration)
    ) {
      throw new Error(
        `Duration ${duration} is outside valid range for ${template.name}`,
      );
    }

    // Generate sections based on template
    const sections = this.generateSections(
      template,
      duration,
      themes,
      finalConstraints,
    );

    // Create tonal plan
    const tonalPlan = this.generateTonalPlan(template.type, finalConstraints);

    // Generate thematic material
    const thematicMaterial = this.generateThematicMaterial(
      themes,
      template,
      finalConstraints,
    );

    // Analyze formal functions
    const formalFunctions = this.analyzeFormalFunctions(sections, tonalPlan);

    // Calculate structural connections
    const structuralConnections = this.analyzeStructuralConnections(sections);

    // Calculate architectural metrics
    const architecture = this.calculateArchitecture(sections, finalConstraints);

    // Determine scale
    const scale = this.determineScale(duration);

    const form: MusicalForm = {
      id: this.generateId(),
      name: `${template.name} - ${new Date().toISOString().slice(0, 10)}`,
      type: template.type,
      scale,
      sections,
      duration,
      architecture,
      analysis: {
        tonalPlan,
        thematicMaterial,
        formalFunctions,
        structuralConnections,
      },
      parameters: {
        repeatStrategy:
          finalConstraints.variationAmount! > 0.7
            ? "varied"
            : finalConstraints.variationAmount! > 0.3
              ? "ornamented"
              : "exact",
        developmentIntensity: finalConstraints.developmentalIntensity!,
        contrastLevel: finalConstraints.contrastLevel!,
        returnEmphasis: this.calculateReturnEmphasis(
          template,
          finalConstraints,
        ),
      },
    };

    const executionTime = performance.now() - startTime;
    if (executionTime > 100) {
      console.warn(`Form generation took ${executionTime.toFixed(2)}ms`);
    }

    return form;
  }

  /**
   * Analyze existing musical form
   */
  static analyzeForm(form: MusicalForm): FormAnalysisResult {
    // Calculate architectural metrics
    const symmetry = this.calculateSymmetry(form);
    const balance = this.calculateBalance(form);
    const coherence = this.calculateCoherence(form);
    const originality = this.calculateOriginality(form);
    const effectiveness = this.calculateEffectiveness(form);

    const metrics = {
      symmetry,
      balance,
      coherence,
      originality,
      effectiveness,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(form, metrics);

    // Predict audience response
    const predictions = {
      audienceExpectation: this.calculateAudienceExpectation(form),
      memorability: this.calculateMemorability(form, metrics),
      emotionalImpact: this.calculateEmotionalImpact(form, metrics),
      structuralInterest: this.calculateStructuralInterest(form, metrics),
    };

    return {
      form,
      metrics,
      recommendations,
      predictions,
    };
  }

  /**
   * Transform existing form
   */
  static transformForm(
    form: MusicalForm,
    transformation:
      | "expand"
      | "contract"
      | "develop"
      | "simplify"
      | "contemporize",
    parameters: {
      factor?: number; // For expand/contract
      intensity?: number; // For develop/simplify
      elements?: string[]; // For contemporize
    } = {},
  ): MusicalForm {
    let transformedSections = [...form.sections];
    let transformedDuration = form.duration;

    switch (transformation) {
      case "expand":
        const expansionFactor = parameters.factor || 1.5;
        transformedSections = this.expandForm(form.sections, expansionFactor);
        transformedDuration = form.duration.mul(
          new Rational(Math.floor(expansionFactor * 1000), 1000),
        );
        break;

      case "contract":
        const contractionFactor = parameters.factor || 0.7;
        transformedSections = this.contractForm(
          form.sections,
          contractionFactor,
        );
        transformedDuration = form.duration.mul(
          new Rational(Math.floor(contractionFactor * 1000), 1000),
        );
        break;

      case "develop":
        const developmentIntensity = parameters.intensity || 0.6;
        transformedSections = this.developForm(
          form.sections,
          developmentIntensity,
        );
        break;

      case "simplify":
        const simplificationIntensity = parameters.intensity || 0.5;
        transformedSections = this.simplifyForm(
          form.sections,
          simplificationIntensity,
        );
        break;

      case "contemporize":
        const contemporaryElements = parameters.elements || [
          "chromaticism",
          "metric_modulation",
          "polyrhythm",
        ];
        transformedSections = this.contemporizeForm(
          form.sections,
          contemporaryElements,
        );
        break;
    }

    // Update form data
    const transformedForm: MusicalForm = {
      ...form,
      id: this.generateId(),
      name: `${form.name} - ${transformation}`,
      sections: transformedSections,
      duration: transformedDuration,
      architecture: this.calculateArchitecture(transformedSections, {
        complexity: "moderate",
        developmentalIntensity: 0.5,
        contrastLevel: 0.5,
        formalClarity: 0.8,
        symmetricalPreference: 0.6,
        variationAmount: 0.3,
      }),
    };

    // Reanalyze form
    transformedForm.analysis.formalFunctions = this.analyzeFormalFunctions(
      transformedSections,
      form.analysis.tonalPlan,
    );
    transformedForm.analysis.structuralConnections =
      this.analyzeStructuralConnections(transformedSections);

    return transformedForm;
  }

  /**
   * Create custom form template
   */
  static createFormTemplate(
    name: string,
    type: MusicalForm["type"] | "custom",
    structure: FormSectionTemplate[],
    constraints: Partial<FormTemplate["constraints"]> = {},
    guidelines: Partial<FormTemplate["guidelines"]> = {},
  ): FormTemplate {
    return {
      id: this.generateId(),
      name,
      type: type as MusicalForm["type"],
      structure,
      constraints: {
        minDuration: new Rational(16, 1),
        maxDuration: new Rational(256, 1),
        requiredSections: structure
          .filter((s) => !s.optional)
          .map((s) => s.name),
        optionalSections: structure
          .filter((s) => s.optional)
          .map((s) => s.name),
        maxDepth: 3,
        ...constraints,
      },
      guidelines: {
        balancePoints: [],
        climaxPoints: [],
        contrastLevels: [0.5],
        ...guidelines,
      },
    };
  }

  /**
   * Get available form templates
   */
  static getFormTemplates(): FormTemplate[] {
    return Object.values(this.FORM_TEMPLATES);
  }

  /**
   * Suggest form based on musical material
   */
  static suggestForm(
    themes: string[],
    duration: Rational,
    complexity: FormGenerationConstraints["complexity"] = "moderate",
  ): Array<{
    form: FormTemplate;
    suitability: number; // 0-1, how suitable this form is
    reasons: string[]; // Why this form is recommended
  }> {
    const suggestions: any[] = [];

    Object.values(this.FORM_TEMPLATES).forEach((template) => {
      const suitability = this.calculateFormSuitability(
        template,
        themes,
        duration,
        complexity,
      );
      const reasons = this.generateFormReasons(
        template,
        themes,
        duration,
        complexity,
      );

      if (suitability > 0.3) {
        suggestions.push({
          form: template,
          suitability,
          reasons,
        });
      }
    });

    return suggestions.sort((a, b) => b.suitability - a.suitability);
  }

  // ===== PRIVATE HELPER METHODS =====

  private static generateSections(
    template: FormTemplate,
    duration: Rational,
    themes: string[],
    constraints: FormGenerationConstraints,
  ): FormalSection[] {
    const sections: FormalSection[] = [];

    template.structure.forEach((sectionTemplate, index) => {
      const sectionDuration = duration.mul(
        new Rational(Math.floor(sectionTemplate.relativeDuration * 1000), 1000),
      );
      const sectionType = this.determineSectionType(
        sectionTemplate,
        index,
        template,
      );

      const relationships = {
        precedes: [] as string[],
        follows: [] as string[],
        parallels: [] as string[],
        contrasts: [] as string[],
      };

      const section: FormalSection = {
        id: `section_${index}`,
        name: sectionTemplate.name,
        type: sectionType,
        duration: sectionDuration,
        priority: this.calculateSectionPriority(sectionTemplate, template),
        character: this.generateSectionCharacter(
          sectionTemplate,
          index,
          template,
          constraints,
        ),
        materials: this.generateSectionMaterials(
          sectionTemplate,
          themes,
          constraints,
        ),
        structure: {
          subsections: this.generateSubsections(
            sectionTemplate,
            sectionDuration,
            constraints,
          ),
          cadenceType: this.determineCadenceType(
            sectionTemplate,
            index,
            template,
          ),
          harmonicGoal: this.determineHarmonicGoal(
            sectionTemplate,
            index,
            template,
            constraints,
          ),
          dominantPreparation: this.needsDominantPreparation(
            sectionTemplate,
            index,
            template,
          ),
        },
        relationships,
        follows: relationships.follows,
        precedes: relationships.precedes,
        parallels: relationships.parallels,
        contrasts: relationships.contrasts,
      };

      sections.push(section);
    });

    // Set up relationships between sections
    this.setupSectionRelationships(sections);

    return sections;
  }

  private static determineSectionType(
    template: FormSectionTemplate,
    index: number,
    formTemplate: FormTemplate,
  ): FormalSection["type"] {
    // Map template types to formal section types
    const typeMapping: Record<string, FormalSection["type"]> = {
      exposition: "exposition",
      development: "development",
      recapitulation: "recapitulation",
      theme: "theme",
      episode: "episode",
      refrain: "refrain",
      variation: "variation",
      transition: "transition",
      bridge: "bridge",
      coda: "coda",
    };

    // Special cases based on form type and position
    if (formTemplate.type === "sonata") {
      if (index === 0) return "exposition";
      if (index === 1) return "development";
      if (index === 2) return "recapitulation";
    }

    return typeMapping[template.type] || "theme";
  }

  private static calculateSectionPriority(
    template: FormSectionTemplate,
    formTemplate: FormTemplate,
  ): number {
    let priority = 0.5; // Base priority

    // Required sections have higher priority
    if (!template.optional) {
      priority += 0.2;
    }

    // Certain section types are more important
    const importantTypes = ["exposition", "recapitulation", "theme", "refrain"];
    if (importantTypes.includes(template.type)) {
      priority += 0.2;
    }

    // Middle sections in certain forms are often less important
    if (formTemplate.type === "rondo" && template.type === "episode") {
      priority -= 0.1;
    }

    return Math.max(0, Math.min(1, priority));
  }

  private static generateSectionCharacter(
    template: FormSectionTemplate,
    index: number,
    formTemplate: FormTemplate,
    constraints: FormGenerationConstraints,
  ): FormalSection["character"] {
    const baseCharacter = {
      stability: 0.5,
      intensity: 0.5,
      complexity: 0.5,
      momentum: 0.5,
    };

    // Adjust based on section type
    switch (template.type) {
      case "theme":
        baseCharacter.stability += 0.2;
        baseCharacter.intensity += 0.1;
        break;
      case "development":
        baseCharacter.complexity += 0.3;
        baseCharacter.momentum += 0.3;
        baseCharacter.stability -= 0.2;
        break;
      case "recapitulation":
        baseCharacter.stability += 0.3;
        baseCharacter.intensity += 0.1;
        break;
      case "episode":
        baseCharacter.complexity += 0.1;
        baseCharacter.stability -= 0.1;
        break;
    }

    // Apply overall constraints
    const developmentIntensity = constraints.developmentalIntensity || 0.5;
    const contrastLevel = constraints.contrastLevel || 0.5;

    baseCharacter.complexity += developmentIntensity * 0.3;
    baseCharacter.stability -= developmentIntensity * 0.1;
    baseCharacter.intensity += contrastLevel * 0.2;

    // Normalize
    Object.keys(baseCharacter).forEach((key) => {
      baseCharacter[key as keyof typeof baseCharacter] = Math.max(
        0,
        Math.min(1, baseCharacter[key as keyof typeof baseCharacter]),
      );
    });

    return baseCharacter;
  }

  private static generateSectionMaterials(
    template: FormSectionTemplate,
    themes: string[],
    constraints: FormGenerationConstraints,
  ): FormalSection["materials"] {
    return {
      themes: template.type === "variation" ? themes.slice(0, 1) : themes,
      motifs: themes.map((theme) => `${theme}_motif_1`),
      textures:
        template.type === "development"
          ? ["polyphonic", "complex"]
          : ["homophonic", "clear"],
      orchestrations:
        template.type === "recapitulation"
          ? ["full_orchestra"]
          : ["chamber_ensemble"],
    };
  }

  private static generateSubsections(
    template: FormSectionTemplate,
    duration: Rational,
    constraints: FormGenerationConstraints,
  ): FormalSubsection[] {
    const subsections: FormalSubsection[] = [];

    if (!template.flexible || duration.lt(new Rational(8, 1))) {
      return subsections;
    }

    // Create 2-4 subsections for flexible sections
    const numSubsections = Math.min(
      4,
      Math.max(2, Math.floor(duration.toNumber() / 16)),
    );
    const subsectionDuration = duration.div(new Rational(numSubsections, 1));

    for (let i = 0; i < numSubsections; i++) {
      const subsection: FormalSubsection = {
        id: `subsection_${i}`,
        name: `${template.name} Part ${i + 1}`,
        duration: subsectionDuration,
        character: this.generateSubsectionCharacter(i, numSubsections),
        content: {
          melody: [`melody_${i}`],
          harmony: [`harmony_${i}`],
          rhythm: [`rhythm_${i}`],
          texture: "homophonic",
        },
        transitions: {
          in: i === 0 ? "gradual" : "bridge",
          out: i === numSubsections - 1 ? "bridge" : "gradual",
        },
      };
      subsections.push(subsection);
    }

    return subsections;
  }

  private static generateSubsectionCharacter(
    index: number,
    total: number,
  ): FormalSection["character"] {
    const position = index / Math.max(1, total - 1);

    return {
      stability: 0.5 + 0.3 * Math.cos(position * Math.PI * 2),
      intensity: 0.5 + 0.3 * position,
      complexity: 0.5 + 0.2 * Math.sin(position * Math.PI),
      momentum: 0.5 + 0.2 * position,
    };
  }

  private static determineCadenceType(
    template: FormSectionTemplate,
    index: number,
    formTemplate: FormTemplate,
  ): FormalSection["structure"]["cadenceType"] {
    if (index === formTemplate.structure.length - 1) {
      return "perfect"; // Final section gets perfect cadence
    }

    if (formTemplate.type === "sonata" && template.type === "exposition") {
      return "imperfect"; // Exposition usually ends imperfectly
    }

    if (formTemplate.type === "rondo" && template.type === "episode") {
      return "deceptive"; // Rondo episodes often end deceptively
    }

    return "half"; // Default to half cadence
  }

  private static determineHarmonicGoal(
    template: FormSectionTemplate,
    index: number,
    formTemplate: FormTemplate,
    constraints: FormGenerationConstraints,
  ): string {
    const keys = ["C", "G", "D", "A", "F", "Bb", "Eb", "Ab"];

    if (formTemplate.type === "sonata") {
      if (index === 0) return "G"; // Exposition modulates to dominant
      if (index === 2) return "C"; // Recapitulation returns to tonic
    }

    if (formTemplate.type === "binary") {
      if (index === 0) return "G"; // First section moves to dominant
      if (index === 1) return "C"; // Second section returns to tonic
    }

    return keys[index % keys.length];
  }

  private static needsDominantPreparation(
    template: FormSectionTemplate,
    index: number,
    formTemplate: FormTemplate,
  ): boolean {
    if (formTemplate.type === "sonata" && index === 1) {
      return true; // Development needs dominant preparation
    }

    if (index > 0) {
      return true; // Most non-opening sections need dominant preparation
    }

    return false;
  }

  private static setupSectionRelationships(sections: FormalSection[]): void {
    sections.forEach((section, index) => {
      // Set up linear relationships
      if (index > 0) {
        section.relationships.follows.push(sections[index - 1].id);
        sections[index - 1].relationships.precedes.push(section.id);
      }

      if (index < sections.length - 1) {
        section.relationships.precedes.push(sections[index + 1].id);
        sections[index + 1].relationships.follows.push(section.id);
      }

      // Set up parallels and contrasts
      sections.forEach((otherSection, otherIndex) => {
        if (index !== otherIndex) {
          if (section.type === otherSection.type) {
            section.relationships.parallels.push(otherSection.id);
          } else if (
            this.areContrastingTypes(section.type, otherSection.type)
          ) {
            section.relationships.contrasts.push(otherSection.id);
          }
        }
      });

      // Sync direct access properties
      section.follows = section.relationships.follows;
      section.precedes = section.relationships.precedes;
      section.parallels = section.relationships.parallels;
      section.contrasts = section.relationships.contrasts;
    });
  }

  private static areContrastingTypes(
    type1: FormalSection["type"],
    type2: FormalSection["type"],
  ): boolean {
    const contrastingPairs = [
      ["theme", "episode"],
      ["exposition", "development"],
      ["stable", "unstable"],
      ["simple", "complex"],
    ];

    return contrastingPairs.some(
      (pair) =>
        (pair.includes(type1) && pair.includes(type2)) ||
        (pair.some((p) => type1.includes(p)) &&
          pair.some((p) => type2.includes(p))),
    );
  }

  private static generateTonalPlan(
    formType: MusicalForm["type"],
    constraints: FormGenerationConstraints,
  ): TonalPlan {
    const keys = ["C", "G", "D", "A", "F", "Bb", "Eb", "Ab", "Db", "B", "E"];
    const primary = keys[0]; // Default to C major

    let secondary: string | undefined;
    let relative: string | undefined;
    let dominant: string | undefined;

    switch (formType) {
      case "sonata":
        dominant = "G";
        secondary = "G";
        relative = "Am";
        break;
      case "binary":
        dominant = "G";
        secondary = "G";
        break;
      case "ternary":
        relative = "Am";
        secondary = "Am";
        break;
      default:
        dominant = "G";
    }

    return {
      primary,
      secondary,
      relative,
      dominant,
      modulationStrategy: constraints.contemporaryElements
        ? "chromatic"
        : "prepared",
      keyRelationships: this.generateKeyRelationships(
        primary,
        secondary,
        relative,
        dominant,
      ),
    };
  }

  private static generateKeyRelationships(
    primary: string,
    secondary?: string,
    relative?: string,
    dominant?: string,
  ): KeyRelationship[] {
    const relationships: KeyRelationship[] = [];
    const keys = [primary, secondary, relative, dominant].filter(
      Boolean,
    ) as string[];

    for (let i = 0; i < keys.length - 1; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        relationships.push({
          from: keys[i],
          to: keys[j],
          relationship: "dominant", // Simplified relationship calculation
          distance: Math.abs(i - j),
          preparationLevel: 0.7,
        });
      }
    }

    return relationships;
  }

  private static generateThematicMaterial(
    themes: string[],
    template: FormTemplate,
    constraints: FormGenerationConstraints,
  ): ThematicMaterial[] {
    return themes.map((theme, index) => ({
      id: theme,
      name: `Theme ${index + 1}`,
      type: index === 0 ? "primary" : "secondary",
      characteristics: {
        intervallic: [2, 3, 4, 5], // Characteristic intervals
        rhythmic: [1, 2, 3, 4], // Rhythmic signatures
        contour: index % 2 === 0 ? "ascending" : "descending",
        register: index === 0 ? "high" : "medium",
      },
      transformations: this.generateThemeTransformations(constraints),
      usage: [],
    }));
  }

  private static generateThemeTransformations(
    constraints: FormGenerationConstraints,
  ): ThemeTransformation[] {
    const baseTransformations: ThemeTransformation[] = [
      {
        type: "inversion",
        parameters: {},
        complexity: 0.3,
        character: {
          intervallic: [2, 3, 4, 5],
          rhythmic: [1, 2, 3, 4],
          contour: "descending",
          register: "high",
        },
      },
      {
        type: "retrograde",
        parameters: {},
        complexity: 0.2,
        character: {
          intervallic: [2, 3, 4, 5],
          rhythmic: [1, 2, 3, 4],
          contour: "ascending",
          register: "medium",
        },
      },
      {
        type: "augmentation",
        parameters: { factor: 2 },
        complexity: 0.4,
        character: {
          intervallic: [2, 3, 4, 5],
          rhythmic: [1, 2, 3, 4],
          contour: "wave",
          register: "low",
        },
      },
    ];

    if (
      constraints.developmentalIntensity &&
      constraints.developmentalIntensity > 0.6
    ) {
      baseTransformations.push({
        type: "development",
        parameters: { intensity: 0.8 },
        complexity: 0.7,
        character: {
          intervallic: [2, 3, 4, 5],
          rhythmic: [1, 2, 3, 4],
          contour: "wave",
          register: "wide",
        },
      });
    }

    return baseTransformations;
  }

  private static analyzeFormalFunctions(
    sections: FormalSection[],
    tonalPlan: TonalPlan,
  ): FormalFunction[] {
    return sections.map((section) => ({
      id: `${section.id}_function`,
      sectionId: section.id,
      function: this.determineFormalFunction(section, tonalPlan),
      strength: section.character.stability,
    }));
  }

  private static determineFormalFunction(
    section: FormalSection,
    tonalPlan: TonalPlan,
  ): FormalFunction["function"] {
    if (section.type === "exposition") return "tonic";
    if (section.type === "development") return "development";
    if (section.type === "recapitulation") return "recapitulation";
    if (section.type === "transition") return "transition";

    // Determine function based on harmonic goal
    if (section.structure.harmonicGoal === tonalPlan.dominant)
      return "dominant";
    if (section.structure.harmonicGoal === tonalPlan.primary) return "tonic";
    if (section.structure.harmonicGoal === tonalPlan.secondary)
      return "dominant";

    return "tonic";
  }

  private static analyzeStructuralConnections(
    sections: FormalSection[],
  ): StructuralConnection[] {
    const connections: StructuralConnection[] = [];

    sections.forEach((section, index) => {
      if (index < sections.length - 1) {
        const nextSection = sections[index + 1];
        connections.push({
          from: section.id,
          to: nextSection.id,
          type: section.structure.subsections.length > 0 ? "bridge" : "direct",
          strength: 0.7,
          preparation: 0.6,
        });
      }
    });

    return connections;
  }

  private static calculateArchitecture(
    sections: FormalSection[],
    constraints: FormGenerationConstraints,
  ): MusicalForm["architecture"] {
    // Calculate symmetry
    const symmetry = this.calculateSymmetryMetric(
      sections,
      constraints.symmetricalPreference || 0.6,
    );

    // Calculate balance
    const balance = this.calculateBalanceMetric(sections);

    // Calculate coherence
    const coherence = this.calculateCoherenceMetric(sections);

    // Calculate contrast
    const contrast = constraints.contrastLevel || 0.5;

    // Calculate complexity based on form type and sections
    const complexity = this.calculateComplexityMetric(sections, constraints);

    return {
      symmetry,
      balance,
      coherence,
      contrast,
      complexity,
    };
  }

  private static calculateSymmetryMetric(
    sections: FormalSection[],
    preference: number,
  ): number {
    if (sections.length < 2) return 1;

    let symmetryScore = 0;
    const comparisons = Math.floor(sections.length / 2);

    for (let i = 0; i < comparisons; i++) {
      const left = sections[i];
      const right = sections[sections.length - 1 - i];

      // Compare section types and characters
      const typeMatch = left.type === right.type ? 1 : 0;
      const characterMatch =
        1 -
        (Math.abs(left.character.stability - right.character.stability) +
          Math.abs(left.character.intensity - right.character.intensity)) /
          2;

      symmetryScore += (typeMatch + characterMatch) / 2;
    }

    return Math.max(
      0,
      Math.min(
        1,
        (symmetryScore / comparisons) * preference + (1 - preference) * 0.5,
      ),
    );
  }

  private static calculateBalanceMetric(sections: FormalSection[]): number {
    if (sections.length < 2) return 1;

    // Calculate balance based on duration distribution and intensity curve
    const totalDuration = sections.reduce(
      (sum, section) => sum + section.duration.toNumber(),
      0,
    );
    const halfwayPoint = totalDuration / 2;

    let accumulatedDuration = 0;
    const firstHalfSections: FormalSection[] = [];
    const secondHalfSections: FormalSection[] = [];

    sections.forEach((section) => {
      accumulatedDuration += section.duration.toNumber();
      if (accumulatedDuration <= halfwayPoint) {
        firstHalfSections.push(section);
      } else {
        secondHalfSections.push(section);
      }
    });

    // Compare intensity curves
    const firstHalfIntensity =
      firstHalfSections.reduce((sum, s) => sum + s.character.intensity, 0) /
      Math.max(1, firstHalfSections.length);
    const secondHalfIntensity =
      secondHalfSections.reduce((sum, s) => sum + s.character.intensity, 0) /
      Math.max(1, secondHalfSections.length);

    return 1 - Math.abs(firstHalfIntensity - secondHalfIntensity);
  }

  private static calculateCoherenceMetric(sections: FormalSection[]): number {
    if (sections.length < 2) return 1;

    let coherenceScore = 0;
    let comparisonCount = 0;

    sections.forEach((section, index) => {
      if (index > 0) {
        const prevSection = sections[index - 1];

        // Check material continuity
        const materialOverlap =
          section.materials.themes.filter((theme) =>
            prevSection.materials.themes.includes(theme),
          ).length / Math.max(1, section.materials.themes.length);

        // Check character continuity
        const characterContinuity =
          1 -
          (Math.abs(
            section.character.complexity - prevSection.character.complexity,
          ) +
            Math.abs(
              section.character.momentum - prevSection.character.momentum,
            )) /
            2;

        coherenceScore += (materialOverlap + characterContinuity) / 2;
        comparisonCount++;
      }
    });

    return coherenceScore / Math.max(1, comparisonCount);
  }

  private static calculateComplexityMetric(
    sections: FormalSection[],
    constraints: FormGenerationConstraints,
  ): number {
    // Base complexity on section count and character complexity
    const sectionCount = sections.length;
    const baseComplexity = Math.min(1, sectionCount / 10);

    // Average character complexity across sections
    const avgCharacterComplexity =
      sections.reduce((sum, section) => sum + section.character.complexity, 0) /
      Math.max(1, sections.length);

    // Consider subsections
    const subsectionCount = sections.reduce(
      (sum, section) => sum + section.structure.subsections.length,
      0,
    );
    const subsectionComplexity = Math.min(1, subsectionCount / 20);

    // Combine factors
    return (baseComplexity + avgCharacterComplexity + subsectionComplexity) / 3;
  }

  private static determineScale(duration: Rational): MusicalForm["scale"] {
    const durationValue = duration.toNumber();

    if (durationValue < 32) return "micro";
    if (durationValue < 64) return "small";
    if (durationValue < 128) return "medium";
    if (durationValue < 256) return "large";
    return "macro";
  }

  private static calculateReturnEmphasis(
    template: FormTemplate,
    constraints: FormGenerationConstraints,
  ): number {
    // Forms that emphasize return get higher scores
    if (
      template.type === "rondo" ||
      template.type === "sonata" ||
      template.type === "arch"
    ) {
      return 0.8;
    }

    return 0.5;
  }

  private static expandForm(
    sections: FormalSection[],
    factor: number,
  ): FormalSection[] {
    return sections.map((section) => ({
      ...section,
      duration: section.duration.mul(
        new Rational(Math.floor(factor * 1000), 1000),
      ),
      structure: {
        ...section.structure,
        subsections: section.structure.subsections.map((subsection) => ({
          ...subsection,
          duration: subsection.duration.mul(
            new Rational(Math.floor(factor * 1000), 1000),
          ),
        })),
      },
    }));
  }

  private static contractForm(
    sections: FormalSection[],
    factor: number,
  ): FormalSection[] {
    return sections.map((section) => ({
      ...section,
      duration: section.duration.mul(
        new Rational(Math.floor(factor * 1000), 1000),
      ),
      structure: {
        ...section.structure,
        subsections: section.structure.subsections.map((subsection) => ({
          ...subsection,
          duration: subsection.duration.mul(
            new Rational(Math.floor(factor * 1000), 1000),
          ),
        })),
      },
    }));
  }

  private static developForm(
    sections: FormalSection[],
    intensity: number,
  ): FormalSection[] {
    return sections.map((section) => ({
      ...section,
      character: {
        ...section.character,
        complexity: Math.min(1, section.character.complexity + intensity * 0.3),
        momentum: Math.min(1, section.character.momentum + intensity * 0.2),
        stability: Math.max(0, section.character.stability - intensity * 0.2),
      },
    }));
  }

  private static simplifyForm(
    sections: FormalSection[],
    intensity: number,
  ): FormalSection[] {
    return sections.map((section) => ({
      ...section,
      character: {
        ...section.character,
        complexity: Math.max(0, section.character.complexity - intensity * 0.3),
        momentum: Math.max(0, section.character.momentum - intensity * 0.2),
        stability: Math.min(1, section.character.stability + intensity * 0.2),
      },
    }));
  }

  private static contemporizeForm(
    sections: FormalSection[],
    elements: string[],
  ): FormalSection[] {
    return sections.map((section) => ({
      ...section,
      character: elements.includes("chromaticism")
        ? {
            ...section.character,
            complexity: Math.min(1, section.character.complexity + 0.2),
          }
        : section.character,
      materials: {
        ...section.materials,
        textures: elements.includes("polyrhythm")
          ? [...section.materials.textures, "polyrhythmic"]
          : section.materials.textures,
      },
    }));
  }

  private static calculateSymmetry(form: MusicalForm): number {
    return this.calculateSymmetryMetric(form.sections, 0.6);
  }

  private static calculateBalance(form: MusicalForm): number {
    return this.calculateBalanceMetric(form.sections);
  }

  private static calculateCoherence(form: MusicalForm): number {
    return this.calculateCoherenceMetric(form.sections);
  }

  private static calculateOriginality(form: MusicalForm): number {
    // Originality based on form type uniqueness and complexity
    const commonForms = ["binary", "ternary", "sonata", "rondo"];
    const isCommonForm = commonForms.includes(form.type);
    const baseOriginality = isCommonForm ? 0.3 : 0.7;

    return Math.min(1, baseOriginality + form.architecture.complexity * 0.3);
  }

  private static calculateEffectiveness(form: MusicalForm): number {
    // Effectiveness is combination of balance, coherence, and appropriateness
    return (
      (form.architecture.balance +
        form.architecture.coherence +
        form.architecture.symmetry) /
      3
    );
  }

  private static generateRecommendations(
    form: MusicalForm,
    metrics: FormAnalysisResult["metrics"],
  ): FormAnalysisResult["recommendations"] {
    const recommendations: FormAnalysisResult["recommendations"] = [];

    if (metrics.balance < 0.6) {
      recommendations.push({
        type: "structural",
        priority: "high",
        description: "Form lacks proper balance",
        suggestion: "Consider adjusting section durations or intensities",
        impact: 0.3,
      });
    }

    if (metrics.coherence < 0.5) {
      recommendations.push({
        type: "thematic",
        priority: "medium",
        description: "Thematic material lacks coherence",
        suggestion: "Increase thematic development and material continuity",
        impact: 0.2,
      });
    }

    if (metrics.originality < 0.4) {
      recommendations.push({
        type: "structural",
        priority: "low",
        description: "Form follows conventional patterns too closely",
        suggestion:
          "Consider adding contemporary elements or structural innovations",
        impact: 0.1,
      });
    }

    return recommendations;
  }

  private static calculateAudienceExpectation(form: MusicalForm): number {
    // Common forms meet expectations better
    const commonForms = ["sonata", "binary", "ternary", "rondo"];
    return commonForms.includes(form.type) ? 0.8 : 0.5;
  }

  private static calculateMemorability(
    form: MusicalForm,
    metrics: FormAnalysisResult["metrics"],
  ): number {
    // Memorability based on balance, coherence, and formal clarity
    return (metrics.balance + metrics.coherence + metrics.symmetry) / 3;
  }

  private static calculateEmotionalImpact(
    form: MusicalForm,
    metrics: FormAnalysisResult["metrics"],
  ): number {
    // Emotional impact based on contrast and effectiveness
    return (form.architecture.contrast + metrics.effectiveness) / 2;
  }

  private static calculateStructuralInterest(
    form: MusicalForm,
    metrics: FormAnalysisResult["metrics"],
  ): number {
    // Interest based on originality and complexity
    return (metrics.originality + form.architecture.complexity) / 2;
  }

  private static calculateFormSuitability(
    template: FormTemplate,
    themes: string[],
    duration: Rational,
    complexity: FormGenerationConstraints["complexity"],
  ): number {
    let suitability = 0.5;

    // Check duration compatibility
    if (
      duration.gte(template.constraints.minDuration) &&
      duration.lte(template.constraints.maxDuration)
    ) {
      suitability += 0.3;
    }

    // Check theme count compatibility
    const requiredThemeCount = template.type === "theme_variations" ? 1 : 2;
    if (themes.length >= requiredThemeCount) {
      suitability += 0.2;
    }

    // Check complexity compatibility
    if (
      complexity === "simple" &&
      ["binary", "ternary"].includes(template.type)
    ) {
      suitability += 0.2;
    } else if (
      complexity === "complex" &&
      ["sonata", "rondo"].includes(template.type)
    ) {
      suitability += 0.2;
    }

    return Math.max(0, Math.min(1, suitability));
  }

  private static generateFormReasons(
    template: FormTemplate,
    themes: string[],
    duration: Rational,
    complexity: FormGenerationConstraints["complexity"],
  ): string[] {
    const reasons = [];

    if (
      duration.gte(template.constraints.minDuration) &&
      duration.lte(template.constraints.maxDuration)
    ) {
      reasons.push("Duration fits well with this form");
    }

    if (themes.length >= 2) {
      reasons.push("Sufficient thematic material for contrast");
    }

    if (template.type === "sonata" && complexity === "complex") {
      reasons.push("Complex form matches sophisticated material");
    }

    if (template.type === "binary" && complexity === "simple") {
      reasons.push("Simple form provides clear structure");
    }

    return reasons;
  }

  private static generateId(): string {
    return `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===== HIGH-LEVEL FORM API =====

export class FormAPI {
  /**
   * Intelligent form generation with automatic optimization
   */
  static generateOptimalForm(
    themes: string[],
    duration: Rational,
    preferences: {
      complexity?: "simple" | "moderate" | "complex";
      style?: "classical" | "romantic" | "modern" | "contemporary";
      emotionalShape?: "arc" | "building" | "dramatic" | "sustained";
    } = {},
  ): {
    form: MusicalForm;
    alternatives: MusicalForm[];
    analysis: FormAnalysisResult;
    recommendations: string[];
  } {
    // Get form suggestions
    const suggestions = FormEngine.suggestForm(
      themes,
      duration,
      preferences.complexity,
    );
    const topSuggestion = suggestions[0];

    if (!topSuggestion) {
      throw new Error("No suitable form found for given parameters");
    }

    // Generate primary form
    const primaryForm = FormEngine.generateForm(
      topSuggestion.form,
      {
        duration,
        complexity: preferences.complexity || "moderate",
        contemporaryElements: preferences.style === "contemporary",
      },
      themes,
    );

    // Generate alternative forms
    const alternatives = suggestions.slice(1, 3).map((suggestion) =>
      FormEngine.generateForm(
        suggestion.form,
        {
          duration,
          complexity: preferences.complexity || "moderate",
          contemporaryElements: preferences.style === "contemporary",
        },
        themes,
      ),
    );

    // Analyze primary form
    const analysis = FormEngine.analyzeForm(primaryForm);

    // Generate recommendations
    const recommendations = [
      `Primary form ${topSuggestion.form.name} has ${topSuggestion.suitability.toFixed(1)}% suitability`,
      ...topSuggestion.reasons,
      `Consider emotional shape: ${preferences.emotionalShape || "arc"}`,
    ];

    return {
      form: primaryForm,
      alternatives,
      analysis,
      recommendations,
    };
  }

  /**
   * Create form from formal sections
   */
  static createFormFromSections(
    sections: FormalSection[],
    formType: MusicalForm["type"] = "custom",
  ): MusicalForm {
    const totalDuration = sections.reduce(
      (sum, section) => sum.add(section.duration),
      new Rational(0, 1),
    );

    return FormEngine.generateForm(
      FormEngine.createFormTemplate(
        "Custom Form",
        formType,
        sections.map((section, index) => ({
          name: section.name,
          type: section.type,
          relativeDuration:
            section.duration.toNumber() / totalDuration.toNumber(),
          optional: false,
          repeatable: true,
          flexible: section.structure.subsections.length > 0,
          structure: [],
        })),
      ),
      { duration: totalDuration },
    );
  }

  /**
   * Extract formal structure from musical data
   */
  static extractFormStructure(
    harmonicAnalysis: Array<{ time: number; key: string; function: string }>,
    thematicAnalysis: Array<{ theme: string; start: number; end: number }>,
    duration: Rational,
  ): MusicalForm {
    // This is a simplified extraction - in practice would use advanced analysis
    const sections: FormalSection[] = [];

    // Create sections based on harmonic analysis
    const harmonicSections = this.groupByHarmonicFunction(harmonicAnalysis);

    harmonicSections.forEach((harmonicSection, index) => {
      const sectionDuration = new Rational(harmonicSection.duration, 1);

      const relationships = {
        precedes: [] as string[],
        follows: [] as string[],
        parallels: [] as string[],
        contrasts: [] as string[],
      };

      const section: FormalSection = {
        id: `extracted_${index}`,
        name: `Section ${index + 1}`,
        type: this.inferSectionType(harmonicSection.function, index),
        duration: sectionDuration,
        priority: 0.5,
        character: {
          stability: this.calculateStability(harmonicSection.function),
          intensity: 0.5,
          complexity: 0.5,
          momentum: 0.5,
        },
        materials: {
          themes: this.findThemesInSection(
            thematicAnalysis,
            harmonicSection.start,
            harmonicSection.end,
          ),
          motifs: [],
          textures: ["homophonic"],
          orchestrations: ["standard"],
        },
        structure: {
          subsections: [],
          cadenceType: "imperfect",
          harmonicGoal: harmonicSection.key,
          dominantPreparation: false,
        },
        relationships,
        follows: relationships.follows,
        precedes: relationships.precedes,
        parallels: relationships.parallels,
        contrasts: relationships.contrasts,
      };

      sections.push(section);
    });

    return this.createFormFromSections(sections, "custom");
  }

  /**
   * Compare two forms for similarity
   */
  static compareForms(
    form1: MusicalForm,
    form2: MusicalForm,
  ): {
    structuralSimilarity: number; // 0-1
    thematicSimilarity: number; // 0-1
    overallSimilarity: number; // 0-1
    differences: string[];
    relationships: string[];
  } {
    const structuralSimilarity = this.calculateStructuralSimilarity(
      form1,
      form2,
    );
    const thematicSimilarity = this.calculateThematicSimilarity(form1, form2);
    const overallSimilarity = (structuralSimilarity + thematicSimilarity) / 2;

    const differences = this.findFormDifferences(form1, form2);
    const relationships = this.findFormRelationships(form1, form2);

    return {
      structuralSimilarity,
      thematicSimilarity,
      overallSimilarity,
      differences,
      relationships,
    };
  }

  /**
   * Generate form variations
   */
  static generateFormVariations(
    form: MusicalForm,
    count: number = 3,
    variationType:
      | "structural"
      | "thematic"
      | "developmental"
      | "combined" = "combined",
  ): MusicalForm[] {
    const variations: MusicalForm[] = [];

    for (let i = 0; i < count; i++) {
      let transformedForm = form;

      switch (variationType) {
        case "structural":
          transformedForm = FormEngine.transformForm(form, "develop", {
            intensity: 0.3 + i * 0.2,
          });
          break;
        case "thematic":
          transformedForm = FormEngine.transformForm(form, "contemporize", {
            elements: ["chromaticism", "modal_mixture"],
          });
          break;
        case "developmental":
          transformedForm = FormEngine.transformForm(form, "develop", {
            intensity: 0.5 + i * 0.15,
          });
          break;
        case "combined":
          transformedForm = FormEngine.transformForm(form, "develop", {
            intensity: 0.4 + i * 0.2,
          });
          transformedForm = FormEngine.transformForm(
            transformedForm,
            "contemporize",
            {
              elements: ["chromaticism"],
            },
          );
          break;
      }

      variations.push(transformedForm);
    }

    return variations;
  }

  // Private helper methods
  private static groupByHarmonicFunction(
    harmonicAnalysis: Array<{ time: number; key: string; function: string }>,
  ) {
    // Simplified grouping - in practice would use more sophisticated analysis
    return harmonicAnalysis.map((item, index) => ({
      ...item,
      start: item.time,
      end: harmonicAnalysis[index + 1]?.time || 100,
      duration: (harmonicAnalysis[index + 1]?.time || 100) - item.time,
      function: item.function,
    }));
  }

  private static inferSectionType(
    function_: string,
    index: number,
  ): FormalSection["type"] {
    switch (function_) {
      case "tonic":
        return "theme";
      case "dominant":
        return "transition";
      case "development":
        return "development";
      default:
        return "theme";
    }
  }

  private static calculateStability(function_: string): number {
    switch (function_) {
      case "tonic":
        return 0.9;
      case "dominant":
        return 0.4;
      case "subdominant":
        return 0.7;
      case "development":
        return 0.2;
      default:
        return 0.5;
    }
  }

  private static findThemesInSection(
    thematicAnalysis: Array<{ theme: string; start: number; end: number }>,
    sectionStart: number,
    sectionEnd: number,
  ): string[] {
    return thematicAnalysis
      .filter((theme) => theme.start >= sectionStart && theme.end <= sectionEnd)
      .map((theme) => theme.theme);
  }

  private static calculateStructuralSimilarity(
    form1: MusicalForm,
    form2: MusicalForm,
  ): number {
    if (form1.type !== form2.type) return 0.3;
    if (form1.sections.length !== form2.sections.length) return 0.5;

    return 0.8 + Math.random() * 0.2; // Simplified calculation
  }

  private static calculateThematicSimilarity(
    form1: MusicalForm,
    form2: MusicalForm,
  ): number {
    const themes1 = form1.analysis.thematicMaterial.map((t) => t.id);
    const themes2 = form2.analysis.thematicMaterial.map((t) => t.id);

    const commonThemes = themes1.filter((theme) => themes2.includes(theme));
    const totalThemes = new Set([...themes1, ...themes2]).size;

    return totalThemes > 0 ? commonThemes.length / totalThemes : 0;
  }

  private static findFormDifferences(
    form1: MusicalForm,
    form2: MusicalForm,
  ): string[] {
    const differences = [];

    if (form1.type !== form2.type) {
      differences.push(`Different form types: ${form1.type} vs ${form2.type}`);
    }

    if (Math.abs(form1.sections.length - form2.sections.length) > 1) {
      differences.push(
        `Different number of sections: ${form1.sections.length} vs ${form2.sections.length}`,
      );
    }

    if (Math.abs(form1.duration.toNumber() - form2.duration.toNumber()) > 8) {
      differences.push(
        `Different durations: ${form1.duration} vs ${form2.duration}`,
      );
    }

    return differences;
  }

  private static findFormRelationships(
    form1: MusicalForm,
    form2: MusicalForm,
  ): string[] {
    const relationships = [];

    if (form1.type === form2.type) {
      relationships.push(`Both use ${form1.type} form`);
    }

    const commonThemes = form1.analysis.thematicMaterial.filter((t1) =>
      form2.analysis.thematicMaterial.some((t2) => t1.id === t2.id),
    );

    if (commonThemes.length > 0) {
      relationships.push(`Share ${commonThemes.length} thematic elements`);
    }

    return relationships;
  }
}

// Export utility functions
export function getAvailableFormTemplates(): FormTemplate[] {
  return FormEngine.getFormTemplates();
}

export function suggestFormForMaterial(
  themes: string[],
  duration: Rational,
  complexity: FormGenerationConstraints["complexity"] = "moderate",
): Array<{ form: FormTemplate; suitability: number; reasons: string[] }> {
  return FormEngine.suggestForm(themes, duration, complexity);
}

// Re-export Rational for test file convenience
export { Rational } from "./rhythm";
