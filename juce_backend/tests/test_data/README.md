# UI Test Data

This directory contains test data for the UI test suite.

## Directory Structure

- `baseline_images/` - Reference images for visual regression testing
- `test_images/` - Current test run images for comparison
- `diff_images/` - Difference visualization images
- `themes/` - Test theme configuration files
- `preferences/` - Test preference files
- `accessibility/` - Accessibility test data and configurations

## Visual Regression Test Data

### Baseline Images
Baseline images are generated during the first test run and serve as the reference for future comparisons. These images should be committed to version control when stable.

### Test Images
Generated during each test run for comparison with baseline images. These files are temporary and should not be committed to version control.

### Difference Images
Generated when visual differences are detected between test and baseline images. Used for debugging visual regressions.

## Theme Test Data

Theme configuration files for testing different theme scenarios:
- `dark_theme.json` - Dark mode theme configuration
- `light_theme.json` - Light mode theme configuration
- `high_contrast.json` - High contrast theme configuration
- `custom_themes/` - Additional custom theme variations

## Preference Test Data

Test preference files for different scenarios:
- `default_preferences.json` - Default user preferences
- `migration_test.json` - Test data for preference migration
- `encrypted_preferences.json` - Encrypted preference test data

## Accessibility Test Data

Accessibility configuration and test data:
- `wcag_test_data.json` - WCAG compliance test scenarios
- `screen_reader_config.json` - Screen reader configuration tests
- `keyboard_nav_tests.json` - Keyboard navigation test scenarios

## Notes

- Files in this directory should be small and focused
- Large binary files should be avoided in version control
- Use descriptive naming conventions for clarity
- Update this README when adding new test data types