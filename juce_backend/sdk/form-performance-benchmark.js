/**
 * Performance Benchmark for Form Engine
 * Tests musical form generation, structural analysis, and form transformations
 */

// Mock Rational class for testing
class MockRational {
  constructor(numerator = 1, denominator = 1) {
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toNumber() {
    return this.numerator / this.denominator;
  }

  equals(other) {
    return this.numerator === other.numerator && this.denominator === other.denominator;
  }

  add(other) {
    return new MockRational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  mul(scalar) {
    if (typeof scalar === 'number') {
      return new MockRational(this.numerator * scalar, this.denominator);
    }
    return new MockRational(this.numerator * scalar.numerator, this.denominator * scalar.denominator);
  }

  div(divisor) {
    if (typeof divisor === 'number') {
      return new MockRational(this.numerator, this.denominator * divisor);
    }
    return new MockRational(this.numerator * divisor.denominator, this.denominator * divisor.numerator);
  }

  gt(other) {
    return this.toNumber() > other.toNumber();
  }

  lt(other) {
    return this.toNumber() < other.toNumber();
  }

  gte(other) {
    return this.toNumber() >= other.toNumber();
  }

  lte(other) {
    return this.toNumber() <= other.toNumber();
  }

  toString() {
    return `${this.numerator}/${this.denominator}`;
  }
}

// Mock implementation for testing
const mockFormEngine = {
  // Form templates
  FORM_TEMPLATES: {
    binary: {
      id: 'binary_form',
      name: 'Binary Form',
      type: 'binary',
      structure: [
        { name: 'A', type: 'theme', relativeDuration: 0.5, optional: false, repeatable: true, flexible: true },
        { name: 'B', type: 'theme', relativeDuration: 0.5, optional: false, repeatable: true, flexible: true }
      ],
      constraints: {
        minDuration: new MockRational(16, 1),
        maxDuration: new MockRational(128, 1),
        requiredSections: ['A', 'B'],
        optionalSections: [],
        maxDepth: 2
      }
    },
    ternary: {
      id: 'ternary_form',
      name: 'Ternary Form',
      type: 'ternary',
      structure: [
        { name: 'A', type: 'theme', relativeDuration: 0.4, optional: false, repeatable: true, flexible: true },
        { name: 'B', type: 'episode', relativeDuration: 0.2, optional: false, repeatable: false, flexible: true },
        { name: 'A\'', type: 'theme', relativeDuration: 0.4, optional: false, repeatable: true, flexible: true }
      ],
      constraints: {
        minDuration: new MockRational(24, 1),
        maxDuration: new MockRational(256, 1),
        requiredSections: ['A', 'B', 'A\''],
        optionalSections: [],
        maxDepth: 2
      }
    },
    sonata: {
      id: 'sonata_form',
      name: 'Sonata Form',
      type: 'sonata',
      structure: [
        { name: 'Exposition', type: 'exposition', relativeDuration: 0.4, optional: false, repeatable: true, flexible: true },
        { name: 'Development', type: 'development', relativeDuration: 0.3, optional: false, repeatable: false, flexible: true },
        { name: 'Recapitulation', type: 'recapitulation', relativeDuration: 0.3, optional: false, repeatable: false, flexible: true }
      ],
      constraints: {
        minDuration: new MockRational(64, 1),
        maxDuration: new MockRational(512, 1),
        requiredSections: ['Exposition', 'Development', 'Recapitulation'],
        optionalSections: ['Introduction', 'Coda'],
        maxDepth: 3
      }
    },
    rondo: {
      id: 'rondo_form',
      name: 'Rondo Form',
      type: 'rondo',
      structure: [
        { name: 'A', type: 'refrain', relativeDuration: 0.3, optional: false, repeatable: true, flexible: true },
        { name: 'B', type: 'episode', relativeDuration: 0.2, optional: false, repeatable: false, flexible: true },
        { name: 'A', type: 'refrain', relativeDuration: 0.15, optional: false, repeatable: true, flexible: false },
        { name: 'C', type: 'episode', relativeDuration: 0.15, optional: false, repeatable: false, flexible: true },
        { name: 'A', type: 'refrain', relativeDuration: 0.2, optional: false, repeatable: true, flexible: false }
      ],
      constraints: {
        minDuration: new MockRational(48, 1),
        maxDuration: new MockRational(384, 1),
        requiredSections: ['A', 'B', 'A', 'C', 'A'],
        optionalSections: ['Introduction', 'Coda'],
        maxDepth: 2
      }
    },
    arch: {
      id: 'arch_form',
      name: 'Arch Form',
      type: 'arch',
      structure: [
        { name: 'A', type: 'theme', relativeDuration: 0.15, optional: false, repeatable: false, flexible: true },
        { name: 'B', type: 'theme', relativeDuration: 0.2, optional: false, repeatable: false, flexible: true },
        { name: 'C', type: 'episode', relativeDuration: 0.3, optional: false, repeatable: false, flexible: true },
        { name: 'B\'', type: 'theme', relativeDuration: 0.2, optional: false, repeatable: false, flexible: false },
        { name: 'A\'', type: 'theme', relativeDuration: 0.15, optional: false, repeatable: false, flexible: false }
      ],
      constraints: {
        minDuration: new MockRational(48, 1),
        maxDuration: new MockRational(256, 1),
        requiredSections: ['A', 'B', 'C', 'B\'', 'A\''],
        optionalSections: [],
        maxDepth: 2
      }
    },
    theme_variations: {
      id: 'theme_variations',
      name: 'Theme and Variations',
      type: 'theme_variations',
      structure: [
        { name: 'Theme', type: 'theme', relativeDuration: 0.2, optional: false, repeatable: true, flexible: true },
        { name: 'Var1', type: 'variation', relativeDuration: 0.2, optional: true, repeatable: false, flexible: true },
        { name: 'Var2', type: 'variation', relativeDuration: 0.2, optional: true, repeatable: false, flexible: true },
        { name: 'Var3', type: 'variation', relativeDuration: 0.2, optional: true, repeatable: false, flexible: true },
        { name: 'Var4', type: 'variation', relativeDuration: 0.2, optional: true, repeatable: false, flexible: true }
      ],
      constraints: {
        minDuration: new MockRational(32, 1),
        maxDuration: new MockRational(256, 1),
        requiredSections: ['Theme'],
        optionalSections: ['Var1', 'Var2', 'Var3', 'Var4', 'Coda'],
        maxDepth: 2
      }
    }
  },

  generateForm: function(formType, constraints = {}, themes = ['primary', 'secondary']) {
    const startTime = performance.now();

    const template = typeof formType === 'string' ? this.FORM_TEMPLATES[formType] : formType;
    if (!template) {
      throw new Error(`Unknown form type: ${formType}`);
    }

    const defaultConstraints = {
      duration: new MockRational(64, 1),
      complexity: 'moderate',
      developmentalIntensity: 0.5,
      contrastLevel: 0.5,
      formalClarity: 0.8,
      symmetricalPreference: 0.6,
      variationAmount: 0.3,
      contemporaryElements: false
    };

    const finalConstraints = { ...defaultConstraints, ...constraints };
    const duration = constraints.duration || template.constraints.minDuration;

    // Generate sections
    const sections = [];
    template.structure.forEach((sectionTemplate, index) => {
      const sectionDuration = duration.mul(new MockRational(Math.floor(sectionTemplate.relativeDuration * 1000), 1000));
      const sectionType = this.determineSectionType(sectionTemplate, index, template);

      const section = {
        id: `section_${index}`,
        name: sectionTemplate.name,
        type: sectionType,
        duration: sectionDuration,
        priority: this.calculateSectionPriority(sectionTemplate, template),
        character: this.generateSectionCharacter(sectionTemplate, index, template, finalConstraints),
        materials: this.generateSectionMaterials(sectionTemplate, themes, finalConstraints),
        structure: {
          subsections: this.generateSubsections(sectionTemplate, sectionDuration, finalConstraints),
          cadenceType: this.determineCadenceType(sectionTemplate, index, template),
          harmonicGoal: this.determineHarmonicGoal(sectionTemplate, index, template, finalConstraints),
          dominantPreparation: this.needsDominantPreparation(sectionTemplate, index, template)
        },
        relationships: {
          precedes: [],
          follows: [],
          parallels: [],
          contrasts: []
        }
      };

      sections.push(section);
    });

    // Set up relationships
    this.setupSectionRelationships(sections);

    // Create form
    const form = {
      id: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${template.name} - ${new Date().toISOString().slice(0, 10)}`,
      type: template.type,
      scale: this.determineScale(duration),
      sections,
      duration,
      architecture: this.calculateArchitecture(sections, finalConstraints),
      analysis: {
        tonalPlan: this.generateTonalPlan(template.type, finalConstraints),
        thematicMaterial: this.generateThematicMaterial(themes, template, finalConstraints),
        formalFunctions: this.analyzeFormalFunctions(sections),
        structuralConnections: this.analyzeStructuralConnections(sections)
      },
      parameters: {
        repeatStrategy: finalConstraints.variationAmount > 0.7 ? 'varied' :
                        finalConstraints.variationAmount > 0.3 ? 'ornamented' : 'exact',
        developmentIntensity: finalConstraints.developmentalIntensity,
        contrastLevel: finalConstraints.contrastLevel,
        returnEmphasis: this.calculateReturnEmphasis(template, finalConstraints)
      }
    };

    const executionTime = performance.now() - startTime;
    if (executionTime > 100) {
      console.warn(`Form generation took ${executionTime.toFixed(2)}ms`);
    }

    return form;
  },

  analyzeForm: function(form) {
    const startTime = performance.now();

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
      effectiveness
    };

    const recommendations = this.generateRecommendations(form, metrics);
    const predictions = {
      audienceExpectation: this.calculateAudienceExpectation(form),
      memorability: this.calculateMemorability(form, metrics),
      emotionalImpact: this.calculateEmotionalImpact(form, metrics),
      structuralInterest: this.calculateStructuralInterest(form, metrics)
    };

    const result = {
      form,
      metrics,
      recommendations,
      predictions
    };

    const executionTime = performance.now() - startTime;
    if (executionTime > 50) {
      console.warn(`Form analysis took ${executionTime.toFixed(2)}ms`);
    }

    return result;
  },

  transformForm: function(form, transformation, parameters = {}) {
    let transformedSections = [...form.sections];
    let transformedDuration = form.duration;

    switch (transformation) {
      case 'expand':
        const expansionFactor = parameters.factor || 1.5;
        transformedSections = this.expandForm(form.sections, expansionFactor);
        transformedDuration = form.duration.mul(new MockRational(Math.floor(expansionFactor * 1000), 1000));
        break;

      case 'contract':
        const contractionFactor = parameters.factor || 0.7;
        transformedSections = this.contractForm(form.sections, contractionFactor);
        transformedDuration = form.duration.mul(new MockRational(Math.floor(contractionFactor * 1000), 1000));
        break;

      case 'develop':
        const developmentIntensity = parameters.intensity || 0.6;
        transformedSections = this.developForm(form.sections, developmentIntensity);
        break;

      case 'simplify':
        const simplificationIntensity = parameters.intensity || 0.5;
        transformedSections = this.simplifyForm(form.sections, simplificationIntensity);
        break;

      case 'contemporize':
        const contemporaryElements = parameters.elements || ['chromaticism', 'metric_modulation'];
        transformedSections = this.contemporizeForm(form.sections, contemporaryElements);
        break;
    }

    return {
      ...form,
      id: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${form.name} - ${transformation}`,
      sections: transformedSections,
      duration: transformedDuration,
      architecture: this.calculateArchitecture(transformedSections, {
        complexity: 'moderate',
        developmentalIntensity: 0.5,
        contrastLevel: 0.5,
        formalClarity: 0.8,
        symmetricalPreference: 0.6,
        variationAmount: 0.3
      })
    };
  },

  suggestForm: function(themes, duration, complexity = 'moderate') {
    const suggestions = [];

    Object.values(this.FORM_TEMPLATES).forEach(template => {
      const suitability = this.calculateFormSuitability(template, themes, duration, complexity);
      const reasons = this.generateFormReasons(template, themes, duration, complexity);

      if (suitability > 0.3) {
        suggestions.push({
          form: template,
          suitability,
          reasons
        });
      }
    });

    return suggestions.sort((a, b) => b.suitability - a.suitability);
  },

  // Helper methods
  determineSectionType: function(sectionTemplate, index, template) {
    const typeMapping = {
      'exposition': 'exposition',
      'development': 'development',
      'recapitulation': 'recapitulation',
      'theme': 'theme',
      'episode': 'episode',
      'refrain': 'refrain',
      'variation': 'variation'
    };

    if (template.type === 'sonata') {
      if (index === 0) return 'exposition';
      if (index === 1) return 'development';
      if (index === 2) return 'recapitulation';
    }

    return typeMapping[sectionTemplate.type] || 'theme';
  },

  calculateSectionPriority: function(template, formTemplate) {
    let priority = 0.5;
    if (!template.optional) priority += 0.2;
    const importantTypes = ['exposition', 'recapitulation', 'theme', 'refrain'];
    if (importantTypes.includes(template.type)) priority += 0.2;
    if (formTemplate.type === 'rondo' && template.type === 'episode') priority -= 0.1;
    return Math.max(0, Math.min(1, priority));
  },

  generateSectionCharacter: function(template, index, formTemplate, constraints) {
    const baseCharacter = {
      stability: 0.5,
      intensity: 0.5,
      complexity: 0.5,
      momentum: 0.5
    };

    switch (template.type) {
      case 'theme':
        baseCharacter.stability += 0.2;
        baseCharacter.intensity += 0.1;
        break;
      case 'development':
        baseCharacter.complexity += 0.3;
        baseCharacter.momentum += 0.3;
        baseCharacter.stability -= 0.2;
        break;
      case 'recapitulation':
        baseCharacter.stability += 0.3;
        baseCharacter.intensity += 0.1;
        break;
    }

    const developmentIntensity = constraints.developmentalIntensity || 0.5;
    const contrastLevel = constraints.contrastLevel || 0.5;

    baseCharacter.complexity += developmentIntensity * 0.3;
    baseCharacter.stability -= developmentIntensity * 0.1;
    baseCharacter.intensity += contrastLevel * 0.2;

    Object.keys(baseCharacter).forEach(key => {
      baseCharacter[key] = Math.max(0, Math.min(1, baseCharacter[key]));
    });

    return baseCharacter;
  },

  generateSectionMaterials: function(template, themes, constraints) {
    return {
      themes: template.type === 'variation' ? themes.slice(0, 1) : themes,
      motifs: themes.map(theme => `${theme}_motif_1`),
      textures: template.type === 'development' ? ['polyphonic', 'complex'] : ['homophonic', 'clear'],
      orchestrations: template.type === 'recapitulation' ? ['full_orchestra'] : ['chamber_ensemble']
    };
  },

  generateSubsections: function(template, duration, constraints) {
    const subsections = [];
    if (!template.flexible || duration.toNumber() < 8) return subsections;

    const numSubsections = Math.min(4, Math.max(2, Math.floor(duration.toNumber() / 16)));
    const subsectionDuration = duration.div(numSubsections);

    for (let i = 0; i < numSubsections; i++) {
      const subsection = {
        id: `subsection_${i}`,
        name: `${template.name} Part ${i + 1}`,
        duration: subsectionDuration,
        character: this.generateSubsectionCharacter(i, numSubsections),
        content: {
          melody: [`melody_${i}`],
          harmony: [`harmony_${i}`],
          rhythm: [`rhythm_${i}`],
          texture: 'homophonic'
        },
        transitions: {
          in: i === 0 ? 'gradual' : 'bridge',
          out: i === numSubsections - 1 ? 'bridge' : 'gradual'
        }
      };
      subsections.push(subsection);
    }

    return subsections;
  },

  generateSubsectionCharacter: function(index, total) {
    const position = index / Math.max(1, total - 1);
    return {
      stability: 0.5 + (0.3 * Math.cos(position * Math.PI * 2)),
      intensity: 0.5 + (0.3 * position),
      complexity: 0.5 + (0.2 * Math.sin(position * Math.PI)),
      momentum: 0.5 + (0.2 * position)
    };
  },

  determineCadenceType: function(template, index, formTemplate) {
    if (index === formTemplate.structure.length - 1) return 'perfect';
    if (formTemplate.type === 'sonata' && template.type === 'exposition') return 'imperfect';
    if (formTemplate.type === 'rondo' && template.type === 'episode') return 'deceptive';
    return 'half';
  },

  determineHarmonicGoal: function(template, index, formTemplate, constraints) {
    const keys = ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb', 'Ab'];
    if (formTemplate.type === 'sonata') {
      if (index === 0) return 'G';
      if (index === 2) return 'C';
    }
    if (formTemplate.type === 'binary') {
      if (index === 0) return 'G';
      if (index === 1) return 'C';
    }
    return keys[index % keys.length];
  },

  needsDominantPreparation: function(template, index, formTemplate) {
    if (formTemplate.type === 'sonata' && index === 1) return true;
    return index > 0;
  },

  setupSectionRelationships: function(sections) {
    sections.forEach((section, index) => {
      if (index > 0) {
        section.relationships.follows.push(sections[index - 1].id);
        sections[index - 1].relationships.precedes.push(section.id);
      }
      if (index < sections.length - 1) {
        section.relationships.precedes.push(sections[index + 1].id);
        sections[index + 1].relationships.follows.push(section.id);
      }
    });
  },

  generateTonalPlan: function(formType, constraints) {
    const primary = 'C';
    let secondary, relative, dominant;

    switch (formType) {
      case 'sonata':
        dominant = 'G';
        secondary = 'G';
        relative = 'Am';
        break;
      case 'binary':
        dominant = 'G';
        secondary = 'G';
        break;
      case 'ternary':
        relative = 'Am';
        secondary = 'Am';
        break;
      default:
        dominant = 'G';
    }

    return {
      primary,
      secondary,
      relative,
      dominant,
      modulationStrategy: constraints.contemporaryElements ? 'chromatic' : 'prepared',
      keyRelationships: []
    };
  },

  generateThematicMaterial: function(themes, template, constraints) {
    return themes.map((theme, index) => ({
      id: theme,
      name: `Theme ${index + 1}`,
      type: index === 0 ? 'primary' : 'secondary',
      characteristics: {
        intervallic: [2, 3, 4, 5],
        rhythmic: [1, 2, 3, 4],
        contour: index % 2 === 0 ? 'ascending' : 'descending',
        register: index === 0 ? 'high' : 'medium'
      },
      transformations: [],
      usage: []
    }));
  },

  analyzeFormalFunctions: function(sections) {
    return sections.map(section => ({
      id: `${section.id}_function`,
      sectionId: section.id,
      function: this.determineFormalFunction(section),
      strength: section.character.stability
    }));
  },

  determineFormalFunction: function(section) {
    if (section.type === 'exposition') return 'tonic';
    if (section.type === 'development') return 'development';
    if (section.type === 'recapitulation') return 'recapitulation';
    if (section.type === 'transition') return 'transition';
    return 'tonic';
  },

  analyzeStructuralConnections: function(sections) {
    const connections = [];
    sections.forEach((section, index) => {
      if (index < sections.length - 1) {
        const nextSection = sections[index + 1];
        connections.push({
          from: section.id,
          to: nextSection.id,
          type: 'bridge',
          strength: 0.7,
          preparation: 0.6
        });
      }
    });
    return connections;
  },

  calculateArchitecture: function(sections, constraints) {
    const symmetry = this.calculateSymmetryMetric(sections, constraints.symmetricalPreference || 0.6);
    const balance = this.calculateBalanceMetric(sections);
    const coherence = this.calculateCoherenceMetric(sections);
    const contrast = constraints.contrastLevel || 0.5;

    return { symmetry, balance, coherence, contrast };
  },

  calculateSymmetryMetric: function(sections, preference) {
    if (sections.length < 2) return 1;
    let symmetryScore = 0;
    const comparisons = Math.floor(sections.length / 2);

    for (let i = 0; i < comparisons; i++) {
      const left = sections[i];
      const right = sections[sections.length - 1 - i];

      const typeMatch = left.type === right.type ? 1 : 0;
      const characterMatch = 1 - (
        Math.abs(left.character.stability - right.character.stability) +
        Math.abs(left.character.intensity - right.character.intensity)
      ) / 2;

      symmetryScore += (typeMatch + characterMatch) / 2;
    }

    return Math.max(0, Math.min(1, symmetryScore / comparisons * preference + (1 - preference) * 0.5));
  },

  calculateBalanceMetric: function(sections) {
    if (sections.length < 2) return 1;
    const totalDuration = sections.reduce((sum, section) => sum + section.duration.toNumber(), 0);
    const halfwayPoint = totalDuration / 2;

    let accumulatedDuration = 0;
    const firstHalfSections = [];
    const secondHalfSections = [];

    sections.forEach(section => {
      accumulatedDuration += section.duration.toNumber();
      if (accumulatedDuration <= halfwayPoint) {
        firstHalfSections.push(section);
      } else {
        secondHalfSections.push(section);
      }
    });

    const firstHalfIntensity = firstHalfSections.reduce((sum, s) => sum + s.character.intensity, 0) / Math.max(1, firstHalfSections.length);
    const secondHalfIntensity = secondHalfSections.reduce((sum, s) => sum + s.character.intensity, 0) / Math.max(1, secondHalfSections.length);

    return 1 - Math.abs(firstHalfIntensity - secondHalfIntensity);
  },

  calculateCoherenceMetric: function(sections) {
    if (sections.length < 2) return 1;
    let coherenceScore = 0;
    let comparisonCount = 0;

    sections.forEach((section, index) => {
      if (index > 0) {
        const prevSection = sections[index - 1];
        const materialOverlap = section.materials.themes.filter(theme =>
          prevSection.materials.themes.includes(theme)
        ).length / Math.max(1, section.materials.themes.length);

        const characterContinuity = 1 - (
          Math.abs(section.character.complexity - prevSection.character.complexity) +
          Math.abs(section.character.momentum - prevSection.character.momentum)
        ) / 2;

        coherenceScore += (materialOverlap + characterContinuity) / 2;
        comparisonCount++;
      }
    });

    return coherenceScore / Math.max(1, comparisonCount);
  },

  determineScale: function(duration) {
    const durationValue = duration.toNumber();
    if (durationValue < 32) return 'micro';
    if (durationValue < 64) return 'small';
    if (durationValue < 128) return 'medium';
    if (durationValue < 256) return 'large';
    return 'macro';
  },

  calculateReturnEmphasis: function(template, constraints) {
    if (template.type === 'rondo' || template.type === 'sonata' || template.type === 'arch') {
      return 0.8;
    }
    return 0.5;
  },

  expandForm: function(sections, factor) {
    return sections.map(section => ({
      ...section,
      duration: section.duration.mul(new MockRational(Math.floor(factor * 1000), 1000)),
      structure: {
        ...section.structure,
        subsections: section.structure.subsections.map(subsection => ({
          ...subsection,
          duration: subsection.duration.mul(new MockRational(Math.floor(factor * 1000), 1000))
        }))
      }
    }));
  },

  contractForm: function(sections, factor) {
    return sections.map(section => ({
      ...section,
      duration: section.duration.mul(new MockRational(Math.floor(factor * 1000), 1000)),
      structure: {
        ...section.structure,
        subsections: section.structure.subsections.map(subsection => ({
          ...subsection,
          duration: subsection.duration.mul(new MockRational(Math.floor(factor * 1000), 1000))
        }))
      }
    }));
  },

  developForm: function(sections, intensity) {
    return sections.map(section => ({
      ...section,
      character: {
        ...section.character,
        complexity: Math.min(1, section.character.complexity + intensity * 0.3),
        momentum: Math.min(1, section.character.momentum + intensity * 0.2),
        stability: Math.max(0, section.character.stability - intensity * 0.2)
      }
    }));
  },

  simplifyForm: function(sections, intensity) {
    return sections.map(section => ({
      ...section,
      character: {
        ...section.character,
        complexity: Math.max(0, section.character.complexity - intensity * 0.3),
        momentum: Math.max(0, section.character.momentum - intensity * 0.2),
        stability: Math.min(1, section.character.stability + intensity * 0.2)
      }
    }));
  },

  contemporizeForm: function(sections, elements) {
    return sections.map(section => ({
      ...section,
      character: elements.includes('chromaticism') ? {
        ...section.character,
        complexity: Math.min(1, section.character.complexity + 0.2)
      } : section.character,
      materials: {
        ...section.materials,
        textures: elements.includes('polyrhythm') ?
          [...section.materials.textures, 'polyrhythmic'] :
          section.materials.textures
      }
    }));
  },

  calculateSymmetry: function(form) {
    return this.calculateSymmetryMetric(form.sections, 0.6);
  },

  calculateBalance: function(form) {
    return this.calculateBalanceMetric(form.sections);
  },

  calculateCoherence: function(form) {
    return this.calculateCoherenceMetric(form.sections);
  },

  calculateOriginality: function(form) {
    const commonForms = ['binary', 'ternary', 'sonata', 'rondo'];
    const isCommonForm = commonForms.includes(form.type);
    const baseOriginality = isCommonForm ? 0.3 : 0.7;
    return Math.min(1, baseOriginality + form.architecture.complexity * 0.3);
  },

  calculateEffectiveness: function(form) {
    return (form.architecture.balance + form.architecture.coherence + form.architecture.symmetry) / 3;
  },

  generateRecommendations: function(form, metrics) {
    const recommendations = [];

    if (metrics.balance < 0.6) {
      recommendations.push({
        type: 'structural',
        priority: 'high',
        description: 'Form lacks proper balance',
        suggestion: 'Consider adjusting section durations or intensities',
        impact: 0.3
      });
    }

    if (metrics.coherence < 0.5) {
      recommendations.push({
        type: 'thematic',
        priority: 'medium',
        description: 'Thematic material lacks coherence',
        suggestion: 'Increase thematic development and material continuity',
        impact: 0.2
      });
    }

    return recommendations;
  },

  calculateAudienceExpectation: function(form) {
    const commonForms = ['sonata', 'binary', 'ternary', 'rondo'];
    return commonForms.includes(form.type) ? 0.8 : 0.5;
  },

  calculateMemorability: function(form, metrics) {
    return (metrics.balance + metrics.coherence + metrics.symmetry) / 3;
  },

  calculateEmotionalImpact: function(form, metrics) {
    return (form.architecture.contrast + metrics.effectiveness) / 2;
  },

  calculateStructuralInterest: function(form, metrics) {
    return (metrics.originality + form.architecture.complexity) / 2;
  },

  calculateFormSuitability: function(template, themes, duration, complexity) {
    let suitability = 0.5;

    if (duration.toNumber() >= template.constraints.minDuration.toNumber() &&
        duration.toNumber() <= template.constraints.maxDuration.toNumber()) {
      suitability += 0.3;
    }

    const requiredThemeCount = template.type === 'theme_variations' ? 1 : 2;
    if (themes.length >= requiredThemeCount) {
      suitability += 0.2;
    }

    if (complexity === 'simple' && ['binary', 'ternary'].includes(template.type)) {
      suitability += 0.2;
    } else if (complexity === 'complex' && ['sonata', 'rondo'].includes(template.type)) {
      suitability += 0.2;
    }

    return Math.max(0, Math.min(1, suitability));
  },

  generateFormReasons: function(template, themes, duration, complexity) {
    const reasons = [];

    if (duration.toNumber() >= template.constraints.minDuration.toNumber() &&
        duration.toNumber() <= template.constraints.maxDuration.toNumber()) {
      reasons.push('Duration fits well with this form');
    }

    if (themes.length >= 2) {
      reasons.push('Sufficient thematic material for contrast');
    }

    if (template.type === 'sonata' && complexity === 'complex') {
      reasons.push('Complex form matches sophisticated material');
    }

    if (template.type === 'binary' && complexity === 'simple') {
      reasons.push('Simple form provides clear structure');
    }

    return reasons;
  }
};

// Performance measurement utilities
class FormPerformanceBenchmark {
  constructor() {
    this.metrics = [];
  }

  async measureOperation(name, operation, dataSize = 1) {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    const result = await operation();

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();

    const executionTime = endTime - startTime;
    const memoryUsage = endMemory - startMemory;
    const throughput = dataSize / (executionTime / 1000);

    const metrics = {
      operation: name,
      executionTime,
      memoryUsage,
      dataSize,
      throughput,
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    return { result, metrics };
  }

  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  printSummary() {
    console.log('\n=== Form Engine Performance Benchmark Summary ===');

    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation].push(metric);
      return acc;
    }, {});

    Object.keys(grouped).forEach(operation => {
      const operationMetrics = grouped[operation];
      const avgTime = operationMetrics.reduce((sum, m) => sum + m.executionTime, 0) / operationMetrics.length;
      const minTime = Math.min(...operationMetrics.map(m => m.executionTime));
      const maxTime = Math.max(...operationMetrics.map(m => m.executionTime));
      const avgThroughput = operationMetrics.reduce((sum, m) => sum + m.throughput, 0) / operationMetrics.length;
      const totalMemory = operationMetrics.reduce((sum, m) => sum + m.memoryUsage, 0);

      console.log(`\n${operation}:`);
      console.log(`  Samples: ${operationMetrics.length}`);
      console.log(`  Avg Time: ${avgTime.toFixed(3)}ms`);
      console.log(`  Min Time: ${minTime.toFixed(3)}ms`);
      console.log(`  Max Time: ${maxTime.toFixed(3)}ms`);
      console.log(`  Avg Throughput: ${avgThroughput.toFixed(0)} forms/sec`);
      console.log(`  Total Memory: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
    });

    // Performance requirements validation
    console.log('\n=== Performance Requirements Validation ===');

    const generationOps = this.metrics.filter(m => m.operation.startsWith('form-generation-'));
    if (generationOps.length > 0) {
      const avgGenTime = generationOps.reduce((sum, m) => sum + m.executionTime, 0) / generationOps.length;
      console.log(`Form Generation (${generationOps.length} samples): ${avgGenTime.toFixed(3)}ms average`);
      console.log(`Target: <100ms | Status: ${avgGenTime < 100 ? '✅ PASS' : '❌ FAIL'}`);
    }

    const analysisOps = this.metrics.filter(m => m.operation.startsWith('form-analysis-'));
    if (analysisOps.length > 0) {
      const avgAnalysisTime = analysisOps.reduce((sum, m) => sum + m.executionTime, 0) / analysisOps.length;
      console.log(`Form Analysis (${analysisOps.length} samples): ${avgAnalysisTime.toFixed(3)}ms average`);
      console.log(`Target: <50ms | Status: ${avgAnalysisTime < 50 ? '✅ PASS' : '❌ FAIL'}`);
    }

    const transformationOps = this.metrics.filter(m => m.operation.startsWith('form-transformation-'));
    if (transformationOps.length > 0) {
      const avgTransformTime = transformationOps.reduce((sum, m) => sum + m.executionTime, 0) / transformationOps.length;
      console.log(`Form Transformation (${transformationOps.length} samples): ${avgTransformTime.toFixed(3)}ms average`);
      console.log(`Target: <75ms | Status: ${avgTransformTime < 75 ? '✅ PASS' : '❌ FAIL'}`);
    }

    const suggestionOps = this.metrics.filter(m => m.operation.startsWith('form-suggestion-'));
    if (suggestionOps.length > 0) {
      const avgSuggestionTime = suggestionOps.reduce((sum, m) => sum + m.executionTime, 0) / suggestionOps.length;
      console.log(`Form Suggestion (${suggestionOps.length} samples): ${avgSuggestionTime.toFixed(3)}ms average`);
      console.log(`Target: <25ms | Status: ${avgSuggestionTime < 25 ? '✅ PASS' : '❌ FAIL'}`);
    }

    // Memory efficiency
    const avgMemoryPerOp = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length;
    console.log(`Average memory per operation: ${(avgMemoryPerOp / 1024).toFixed(2)}KB`);
    console.log(`Target: <512KB | Status: ${avgMemoryPerOp < 512 * 1024 ? '✅ PASS' : '❌ FAIL'}`);
  }
}

// Main benchmark execution
async function runFormBenchmarks() {
  console.log('📐 Starting Form Engine Performance Benchmarks...\n');

  const benchmark = new FormPerformanceBenchmark();

  // Test 1: Form Generation Performance
  console.log('Test 1: Form Generation');
  const formTypes = ['binary', 'ternary', 'sonata', 'rondo', 'arch', 'theme_variations'];
  const durations = [32, 64, 128, 256];
  const complexities = ['simple', 'moderate', 'complex'];

  for (const formType of formTypes) {
    for (const duration of durations) {
      for (const complexity of complexities) {
        const { result, metrics } = await benchmark.measureOperation(
          `form-generation-${formType}-${duration}-${complexity}`,
          () => mockFormEngine.generateForm(
            formType,
            {
              duration: new MockRational(duration, 1),
              complexity,
              developmentalIntensity: complexity === 'complex' ? 0.8 : 0.3,
              contrastLevel: complexity === 'complex' ? 0.7 : 0.3,
              symmetricalPreference: formType === 'arch' ? 0.9 : 0.5
            },
            ['primary', 'secondary']
          ),
          duration
        );

        console.log(`  ${formType} (${duration}, ${complexity}): ${metrics.executionTime.toFixed(3)}ms, ${result.sections.length} sections`);
      }
    }
  }

  // Test 2: Form Analysis Performance
  console.log('\nTest 2: Form Analysis');
  const analysisComplexities = [
    { sections: 2, subsections: 0, name: 'simple' },
    { sections: 3, subsections: 4, name: 'moderate' },
    { sections: 5, subsections: 8, name: 'complex' },
    { sections: 7, subsections: 12, name: 'very_complex' }
  ];

  for (const complexity of analysisComplexities) {
    // Create test form with specified complexity
    const testForm = mockFormEngine.generateForm('sonata', {
      duration: new MockRational(128, 1),
      complexity: complexity.name
    }, ['primary', 'secondary', 'developmental']);

    const { result, metrics } = await benchmark.measureOperation(
      `form-analysis-${complexity.name}`,
      () => mockFormEngine.analyzeForm(testForm),
      complexity.sections
    );

    console.log(`  ${complexity.name} (${complexity.sections} sections): ${metrics.executionTime.toFixed(3)}ms, ${result.recommendations.length} recommendations`);
  }

  // Test 3: Form Transformation Performance
  console.log('\nTest 3: Form Transformation');
  const transformations = ['expand', 'contract', 'develop', 'simplify', 'contemporize'];
  const baseForm = mockFormEngine.generateForm('sonata', {
    duration: new MockRational(96, 1),
    complexity: 'moderate'
  }, ['primary', 'secondary']);

  for (const transformation of transformations) {
    const { result, metrics } = await benchmark.measureOperation(
      `form-transformation-${transformation}`,
      () => mockFormEngine.transformForm(
        baseForm,
        transformation,
        {
          factor: transformation === 'expand' ? 1.5 : transformation === 'contract' ? 0.7 : undefined,
          intensity: transformation === 'develop' ? 0.7 : transformation === 'simplify' ? 0.5 : undefined,
          elements: transformation === 'contemporize' ? ['chromaticism', 'polyrhythm'] : undefined
        }
      ),
      baseForm.sections.length
    );

    console.log(`  ${transformation}: ${metrics.executionTime.toFixed(3)}ms, ${result.sections.length} sections`);
  }

  // Test 4: Form Suggestion Performance
  console.log('\nTest 4: Form Suggestion');
  const suggestionScenarios = [
    { themes: ['primary'], duration: 32, complexity: 'simple', name: 'minimal' },
    { themes: ['primary', 'secondary'], duration: 64, complexity: 'moderate', name: 'standard' },
    { themes: ['primary', 'secondary', 'developmental'], duration: 128, complexity: 'complex', name: 'sophisticated' },
    { themes: ['primary', 'secondary', 'developmental', 'transitional'], duration: 256, complexity: 'complex', name: 'extensive' }
  ];

  for (const scenario of suggestionScenarios) {
    const { result, metrics } = await benchmark.measureOperation(
      `form-suggestion-${scenario.name}`,
      () => mockFormEngine.suggestForm(
        scenario.themes,
        new MockRational(scenario.duration, 1),
        scenario.complexity
      ),
      scenario.themes.length
    );

    console.log(`  ${scenario.name} (${scenario.themes.length} themes): ${metrics.executionTime.toFixed(3)}ms, ${result.length} suggestions`);
  }

  // Test 5: Complex Workflow Performance
  console.log('\nTest 5: Complex Form Workflow');
  const workflowSizes = [32, 64, 128, 256];

  for (const size of workflowSizes) {
    const { result, metrics } = await benchmark.measureOperation(
      `form-workflow-${size}`,
      async () => {
        // Generate form
        const form = mockFormEngine.generateForm('sonata', {
          duration: new MockRational(size, 1),
          complexity: size > 128 ? 'complex' : 'moderate'
        }, ['primary', 'secondary']);

        // Analyze form
        const analysis = mockFormEngine.analyzeForm(form);

        // Transform form
        const transformed = mockFormEngine.transformForm(form, 'develop', {
          intensity: 0.6
        });

        // Analyze transformed form
        const transformedAnalysis = mockFormEngine.analyzeForm(transformed);

        // Get suggestions
        const suggestions = mockFormEngine.suggestForm(
          ['primary', 'secondary'],
          new MockRational(size, 1),
          'moderate'
        );

        return {
          originalSections: form.sections.length,
          originalComplexity: form.architecture.complexity,
          originalBalance: form.architecture.balance,
          analysisRecommendations: analysis.recommendations.length,
          transformedSections: transformed.sections.length,
          transformedComplexity: transformed.architecture.complexity,
          suggestionsCount: suggestions.length,
          workflowEfficiency: (analysis.metrics.effectiveness + transformedAnalysis.metrics.effectiveness) / 2
        };
      },
      size
    );

    console.log(`  Workflow (${size}): ${metrics.executionTime.toFixed(3)}ms, ${result.originalSections} sections, efficiency: ${result.workflowEfficiency.toFixed(3)}`);
  }

  // Test 6: Memory Stress Test
  console.log('\nTest 6: Memory Stress Test (100 forms)');
  const initialMemory = benchmark.getMemoryUsage();

  for (let i = 0; i < 100; i++) {
    const formType = formTypes[i % formTypes.length];
    const complexity = complexities[i % complexities.length];

    mockFormEngine.generateForm(
      formType,
      {
        duration: new MockRational(64 + (i % 64), 1),
        complexity,
        developmentalIntensity: 0.5 + (i % 50) / 100,
        contrastLevel: 0.3 + (i % 50) / 100
      },
      [`theme_${i % 5}`, `secondary_${i % 3}`]
    );
  }

  const finalMemory = benchmark.getMemoryUsage();
  const memoryIncrease = finalMemory - initialMemory;

  console.log(`  Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Per Form: ${(memoryIncrease / 100 / 1024).toFixed(2)}KB`);

  // Test 7: Real-time Performance Test
  console.log('\nTest 7: Real-time Performance Requirements');
  const realTimeSizes = [16, 24, 32, 48]; // Small forms for real-time use
  const realTimeOperations = [];

  for (const size of realTimeSizes) {
    for (const complexity of ['simple', 'moderate']) {
      const { metrics } = await benchmark.measureOperation(
        `realtime-form-${size}-${complexity}`,
        () => {
          const form = mockFormEngine.generateForm('binary', {
            duration: new MockRational(size, 1),
            complexity
          }, ['primary']);

          return mockFormEngine.analyzeForm(form);
        },
        size
      );

      realTimeOperations.push(metrics);
    }
  }

  const avgRealTime = realTimeOperations.reduce((sum, m) => sum + m.executionTime, 0) / realTimeOperations.length;
  const maxRealTime = Math.max(...realTimeOperations.map(m => m.executionTime));

  console.log(`  Real-time Operations Average: ${avgRealTime.toFixed(3)}ms`);
  console.log(`  Real-time Operations Max: ${maxRealTime.toFixed(3)}ms`);
  console.log(`  Target: <40ms | Status: ${maxRealTime < 40 ? '✅ PASS' : '❌ FAIL'}`);

  // Print comprehensive summary
  benchmark.printSummary();

  console.log('\n✅ Form Engine performance benchmarks completed!');
}

// Run the benchmarks
runFormBenchmarks().catch(console.error);