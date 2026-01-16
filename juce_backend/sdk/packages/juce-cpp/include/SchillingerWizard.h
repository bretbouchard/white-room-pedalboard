/*
  ==============================================================================

    SchillingerWizard.h
    Created: 2 Dec 2025
    Author:  Schillinger System

    Progressive learning wizard system for Schillinger musical theory.
    Provides guided tutorials, skill assessments, and adaptive learning paths
    from beginner to expert levels.

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <functional>
#include <memory>

namespace Schillinger
{
    //==============================================================================
    /** User skill levels for adaptive learning */
    enum class SkillLevel : uint8_t
    {
        Beginner = 0,        // No prior musical theory knowledge
        Elementary = 1,      // Basic rhythm and harmony concepts
        Intermediate = 2,    // Understanding of basic Schillinger concepts
        Advanced = 3,        // Proficient with interference patterns
        Expert = 4,          // Mastery of Schillinger system
        Professional = 5     // Professional application and teaching
    };

    //==============================================================================
    /** Learning module categories */
    enum class ModuleCategory : uint8_t
    {
        Rhythm = 0,          // Rhythm generation and interference
        Harmony = 1,         // Harmony and chord progressions
        Melody = 2,          // Melody construction and contour
        Form = 3,            // Musical form and structure
        Orchestration = 4,   // Instrumentation and texture
        Composition = 5,     // Complete composition techniques
        Analysis = 6,        // Musical analysis and deconstruction
        Advanced = 7         // Professional techniques and applications
    };

    //==============================================================================
    /** Individual learning step within a module */
    struct LearningStep
    {
        int stepId = 0;
        juce::String title;
        juce::String description;
        juce::String content;           // Detailed educational content
        juce::StringArray objectives;   // Learning objectives
        juce::var interactiveContent;   // Interactive exercises/tools
        juce::String videoUrl;         // Optional video demonstration
        int estimatedMinutes = 15;     // Estimated completion time
        SkillLevel minSkillLevel = SkillLevel::Beginner;
        SkillLevel targetSkillLevel = SkillLevel::Beginner;
        juce::StringArray prerequisites; // Required steps to complete first

        /** Check if user has prerequisites for this step */
        bool hasPrerequisites(const juce::Array<int>& completedSteps) const
        {
            for (const auto& prereq : prerequisites)
            {
                int prereqId = prereq.getIntValue();
                if (!completedSteps.contains(prereqId))
                    return false;
            }
            return true;
        }

        /** Convert to JSON for serialization */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("stepId", stepId);
            json->setProperty("title", title);
            json->setProperty("description", description);
            json->setProperty("content", content);

            auto objectivesArray = new juce::Array<juce::var>();
            for (const auto& objective : objectives)
                objectivesArray->add(juce::var(objective));
            json->setProperty("objectives", juce::var(objectivesArray));

            json->setProperty("interactiveContent", interactiveContent);
            json->setProperty("videoUrl", videoUrl);
            json->setProperty("estimatedMinutes", estimatedMinutes);
            json->setProperty("minSkillLevel", static_cast<int>(minSkillLevel));
            json->setProperty("targetSkillLevel", static_cast<int>(targetSkillLevel));

            auto prereqArray = new juce::Array<juce::var>();
            for (const auto& prereq : prerequisites)
                prereqArray->add(juce::var(prereq));
            json->setProperty("prerequisites", juce::var(prereqArray));

            return juce::var(json);
        }

        /** Create from JSON */
        static LearningStep fromJson(const juce::var& json)
        {
            LearningStep step;
            step.stepId = json.getProperty("stepId", 0);
            step.title = json.getProperty("title", "");
            step.description = json.getProperty("description", "");
            step.content = json.getProperty("content", "");
            step.videoUrl = json.getProperty("videoUrl", "");
            step.estimatedMinutes = json.getProperty("estimatedMinutes", 15);
            step.minSkillLevel = static_cast<SkillLevel>(
                static_cast<int>(json.getProperty("minSkillLevel", 0))
            );
            step.targetSkillLevel = static_cast<SkillLevel>(
                static_cast<int>(json.getProperty("targetSkillLevel", 0))
            );

            if (json.hasProperty("objectives"))
            {
                auto objectivesArray = json["objectives"].getArray();
                if (objectivesArray != nullptr)
                {
                    for (const auto& objective : *objectivesArray)
                        step.objectives.add(objective.toString());
                }
            }

            if (json.hasProperty("prerequisites"))
            {
                auto prereqArray = json["prerequisites"].getArray();
                if (prereqArray != nullptr)
                {
                    for (const auto& prereq : *prereqArray)
                        step.prerequisites.add(prereq.toString());
                }
            }

            step.interactiveContent = json.getProperty("interactiveContent", juce::var());
            return step;
        }
    };

    //==============================================================================
    /** Complete learning module with multiple steps */
    struct LearningModule
    {
        int moduleId = 0;
        juce::String title;
        juce::String description;
        ModuleCategory category = ModuleCategory::Rhythm;
        SkillLevel minSkillLevel = SkillLevel::Beginner;
        SkillLevel targetSkillLevel = SkillLevel::Intermediate;
        juce::Array<LearningStep> steps;
        juce::String icon;              // Icon identifier for UI
        juce::String colorTheme;        // Color theme for visual consistency
        bool isCoreModule = false;      // Essential for progression
        int difficultyScore = 1;        // 1-10 difficulty rating

        /** Get total estimated completion time */
        int getTotalEstimatedMinutes() const
        {
            int total = 0;
            for (const auto& step : steps)
                total += step.estimatedMinutes;
            return total;
        }

        /** Get steps appropriate for user skill level */
        juce::Array<LearningStep> getStepsForSkillLevel(SkillLevel userLevel) const
        {
            juce::Array<LearningStep> appropriateSteps;
            for (const auto& step : steps)
            {
                if (step.minSkillLevel <= userLevel && step.targetSkillLevel >= userLevel)
                    appropriateSteps.add(step);
            }
            return appropriateSteps;
        }

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("moduleId", moduleId);
            json->setProperty("title", title);
            json->setProperty("description", description);
            json->setProperty("category", static_cast<int>(category));
            json->setProperty("minSkillLevel", static_cast<int>(minSkillLevel));
            json->setProperty("targetSkillLevel", static_cast<int>(targetSkillLevel));
            json->setProperty("icon", icon);
            json->setProperty("colorTheme", colorTheme);
            json->setProperty("isCoreModule", isCoreModule);
            json->setProperty("difficultyScore", difficultyScore);

            auto stepsArray = new juce::Array<juce::var>();
            for (const auto& step : steps)
                stepsArray->add(step.toJson());
            json->setProperty("steps", juce::var(stepsArray));

            return juce::var(json);
        }

        /** Create from JSON */
        static LearningModule fromJson(const juce::var& json)
        {
            LearningModule module;
            module.moduleId = json.getProperty("moduleId", 0);
            module.title = json.getProperty("title", "");
            module.description = json.getProperty("description", "");
            module.category = static_cast<ModuleCategory>(
                static_cast<int>(json.getProperty("category", 0))
            );
            module.minSkillLevel = static_cast<SkillLevel>(
                static_cast<int>(json.getProperty("minSkillLevel", 0))
            );
            module.targetSkillLevel = static_cast<SkillLevel>(
                static_cast<int>(json.getProperty("targetSkillLevel", 0))
            );
            module.icon = json.getProperty("icon", "");
            module.colorTheme = json.getProperty("colorTheme", "");
            module.isCoreModule = json.getProperty("isCoreModule", false);
            module.difficultyScore = json.getProperty("difficultyScore", 1);

            if (json.hasProperty("steps"))
            {
                auto stepsArray = json["steps"].getArray();
                if (stepsArray != nullptr)
                {
                    for (const auto& stepJson : *stepsArray)
                        module.steps.add(LearningStep::fromJson(stepJson));
                }
            }

            return module;
        }
    };

    //==============================================================================
    /** User progress tracking */
    struct UserProgress
    {
        juce::String userId;
        SkillLevel currentSkillLevel = SkillLevel::Beginner;
        juce::Array<int> completedSteps;     // Step IDs completed
        juce::Array<int> completedModules;   // Module IDs completed
        juce::Array<int> bookmarkedSteps;    // Step IDs bookmarked
        std::chrono::system_clock::time_point lastActivity;
        int totalStudyMinutes = 0;           // Cumulative study time
        double averageQuizScore = 0.0;       // Average quiz performance
        juce::StringArray achievements;      // Unlocked achievements
        juce::var preferences;               // User learning preferences

        /** Check if step is completed */
        bool isStepCompleted(int stepId) const
        {
            return completedSteps.contains(stepId);
        }

        /** Mark step as completed */
        void completeStep(int stepId)
        {
            if (!completedSteps.contains(stepId))
                completedSteps.add(stepId);
            lastActivity = std::chrono::system_clock::now();
        }

        /** Get completion percentage for a module */
        double getModuleCompletionPercentage(const LearningModule& module) const
        {
            if (module.steps.isEmpty())
                return 100.0;

            int completedInModule = 0;
            for (const auto& step : module.steps)
            {
                if (completedSteps.contains(step.stepId))
                    completedInModule++;
            }

            return static_cast<double>(completedInModule) / module.steps.size() * 100.0;
        }

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("userId", userId);
            json->setProperty("currentSkillLevel", static_cast<int>(currentSkillLevel));

            auto completedStepsArray = new juce::Array<juce::var>();
            for (int stepId : completedSteps)
                completedStepsArray->add(juce::var(stepId));
            json->setProperty("completedSteps", juce::var(completedStepsArray));

            auto completedModulesArray = new juce::Array<juce::var>();
            for (int moduleId : completedModules)
                completedModulesArray->add(juce::var(moduleId));
            json->setProperty("completedModules", juce::var(completedModulesArray));

            auto bookmarkedStepsArray = new juce::Array<juce::var>();
            for (int stepId : bookmarkedSteps)
                bookmarkedStepsArray->add(juce::var(stepId));
            json->setProperty("bookmarkedSteps", juce::var(bookmarkedStepsArray));

            json->setProperty("totalStudyMinutes", totalStudyMinutes);
            json->setProperty("averageQuizScore", averageQuizScore);
            json->setProperty("preferences", preferences);

            auto achievementsArray = new juce::Array<juce::var>();
            for (const auto& achievement : achievements)
                achievementsArray->add(juce::var(achievement));
            json->setProperty("achievements", juce::var(achievementsArray));

            return juce::var(json);
        }

        /** Create from JSON */
        static UserProgress fromJson(const juce::var& json)
        {
            UserProgress progress;
            progress.userId = json.getProperty("userId", "");
            progress.currentSkillLevel = static_cast<SkillLevel>(
                static_cast<int>(json.getProperty("currentSkillLevel", 0))
            );
            progress.totalStudyMinutes = json.getProperty("totalStudyMinutes", 0);
            progress.averageQuizScore = json.getProperty("averageQuizScore", 0.0);

            if (json.hasProperty("completedSteps"))
            {
                auto stepsArray = json["completedSteps"].getArray();
                if (stepsArray != nullptr)
                {
                    for (const auto& stepJson : *stepsArray)
                        progress.completedSteps.add(static_cast<int>(stepJson));
                }
            }

            if (json.hasProperty("completedModules"))
            {
                auto modulesArray = json["completedModules"].getArray();
                if (modulesArray != nullptr)
                {
                    for (const auto& moduleJson : *modulesArray)
                        progress.completedModules.add(static_cast<int>(moduleJson));
                }
            }

            if (json.hasProperty("bookmarkedSteps"))
            {
                auto bookmarkedArray = json["bookmarkedSteps"].getArray();
                if (bookmarkedArray != nullptr)
                {
                    for (const auto& bookmarkJson : *bookmarkedArray)
                        progress.bookmarkedSteps.add(static_cast<int>(bookmarkJson));
                }
            }

            if (json.hasProperty("achievements"))
            {
                auto achievementsArray = json["achievements"].getArray();
                if (achievementsArray != nullptr)
                {
                    for (const auto& achievementJson : *achievementsArray)
                        progress.achievements.add(achievementJson.toString());
                }
            }

            progress.preferences = json.getProperty("preferences", juce::var());
            return progress;
        }
    };

    //==============================================================================
    /** Skill assessment results */
    struct SkillAssessment
    {
        SkillLevel assessedLevel = SkillLevel::Beginner;
        juce::Array<juce::String> strengthAreas;     // Areas where user excels
        juce::Array<juce::String> improvementAreas; // Areas needing focus
        double overallScore = 0.0;                   // 0-100 assessment score
        juce::var detailedResults;                   // Detailed assessment data
        juce::StringArray recommendedModules;       // Suggested learning paths
        juce::String personalizedFeedback;          // Customized guidance

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("assessedLevel", static_cast<int>(assessedLevel));
            json->setProperty("overallScore", overallScore);
            json->setProperty("detailedResults", detailedResults);
            json->setProperty("personalizedFeedback", personalizedFeedback);

            auto strengthsArray = new juce::Array<juce::var>();
            for (const auto& strength : strengthAreas)
                strengthsArray->add(juce::var(strength));
            json->setProperty("strengthAreas", juce::var(strengthsArray));

            auto improvementsArray = new juce::Array<juce::var>();
            for (const auto& improvement : improvementAreas)
                improvementsArray->add(juce::var(improvement));
            json->setProperty("improvementAreas", juce::var(improvementsArray));

            auto recommendedArray = new juce::Array<juce::var>();
            for (const auto& recommended : recommendedModules)
                recommendedArray->add(juce::var(recommended));
            json->setProperty("recommendedModules", juce::var(recommendedArray));

            return juce::var(json);
        }
    };

    //==============================================================================
    /**
        Main Schillinger Wizard system for progressive learning and guidance.
        Provides adaptive learning paths, skill assessment, and personalized
        educational experiences.
    */
    class SchillingerWizard
    {
    public:
        //==============================================================================
        using ProgressCallback = std::function<void(const UserProgress&)>;
        using AssessmentCallback = std::function<void(const SkillAssessment&)>;
        using ModuleCallback = std::function<void(const LearningModule&)>;

        //==============================================================================
        /** Constructor */
        SchillingerWizard();

        /** Destructor */
        ~SchillingerWizard();

        //==============================================================================
        // User Management

        /** Set current user */
        void setUser(const juce::String& userId);

        /** Get current user progress */
        UserProgress getUserProgress() const;

        /** Update user progress */
        void updateUserProgress(const UserProgress& progress);

        /** Set progress change callback */
        void setProgressCallback(ProgressCallback callback);

        //==============================================================================
        // Skill Assessment

        /** Conduct skill assessment for user */
        void conductSkillAssessment(AssessmentCallback callback);

        /** Quick skill level estimation */
        SkillLevel quickSkillEstimate(const juce::StringArray& userAnswers);

        /** Create personalized learning path */
        juce::Array<LearningModule> createLearningPath(const SkillAssessment& assessment);

        //==============================================================================
        // Module Management

        /** Get all available learning modules */
        juce::Array<LearningModule> getAllModules() const;

        /** Get modules appropriate for user skill level */
        juce::Array<LearningModule> getModulesForSkillLevel(SkillLevel level) const;

        /** Get module by ID */
        LearningModule getModuleById(int moduleId) const;

        /** Get next recommended step for user */
        LearningStep getNextRecommendedStep(const UserProgress& progress) const;

        /** Complete a learning step */
        bool completeStep(int stepId, UserProgress& progress);

        /** Check if module prerequisites are met */
        bool canAccessModule(const LearningModule& module, const UserProgress& progress) const;

        //==============================================================================
        // Learning Path Generation

        /** Generate learning path to target skill level */
        juce::Array<LearningModule> generateLearningPath(
            SkillLevel currentLevel,
            SkillLevel targetLevel,
            const juce::StringArray& preferredCategories = {}
        );

        /** Generate focused learning path for specific category */
        juce::Array<LearningModule> generateFocusedPath(
            ModuleCategory category,
            SkillLevel currentLevel,
            SkillLevel targetLevel
        );

        /** Estimate time to reach target skill level */
        int estimateTimeToTarget(SkillLevel currentLevel, SkillLevel targetLevel) const;

        //==============================================================================
        // Interactive Features

        /** Start interactive tutorial for specific step */
        void startInteractiveTutorial(int stepId, std::function<void(bool)> completionCallback);

        /** Generate practice exercises for current skill level */
        juce::var generatePracticeExercises(SkillLevel level, ModuleCategory category);

        /** Provide hints and guidance during exercises */
        juce::String getHintForExercise(const juce::var& exercise, int difficultyLevel);

        //==============================================================================
        // Progress Analytics

        /** Get detailed progress analytics */
        juce::var getProgressAnalytics(const UserProgress& progress) const;

        /** Generate learning efficiency report */
        juce::String generateEfficiencyReport(const UserProgress& progress) const;

        /** Get personalized recommendations */
        juce::Array<juce::String> getPersonalizedRecommendations(const UserProgress& progress) const;

        //==============================================================================
        // Achievement System

        /** Check for new achievements */
        juce::StringArray checkAchievements(const UserProgress& progress);

        /** Award achievement to user */
        void awardAchievement(const juce::String& achievementId, UserProgress& progress);

        /** Get achievement details */
        juce::var getAchievementDetails(const juce::String& achievementId) const;

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SchillingerWizard)
    };

} // namespace Schillinger