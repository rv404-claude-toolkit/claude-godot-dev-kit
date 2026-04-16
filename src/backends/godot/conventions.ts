// Godot Backend — Convention Analysis
// Analyzes parsed GDScript files to extract project-wide coding conventions.

import { ParsedScript, ProjectConventions } from './types.js';


/**
 * Analyze an array of already-parsed GDScript files to extract project conventions.
 *
 * This function does NOT read files from disk — it takes ParsedScript[] as input.
 * The backend index.ts is responsible for reading files and calling the parser
 * before passing results here.
 *
 * Extracts:
 * - Naming style (snake_case, PascalCase, or mixed)
 * - Signal naming patterns (common prefixes/suffixes)
 * - Export naming patterns
 * - Most common base classes
 * - Indent style (always tabs for Godot)
 * - Average methods and signals per file
 */
export function analyzeConventions(scripts: ParsedScript[]): ProjectConventions {
  if (scripts.length === 0) {
    return {
      namingStyle: 'snake_case',
      signalNamingPattern: '',
      exportNamingPattern: '',
      commonBaseClasses: [],
      indentStyle: 'tabs',
      avgMethodsPerFile: 0,
      avgSignalsPerFile: 0,
    };
  }

  // --- Naming style analysis ---
  const namingStyle = analyzeNamingStyle(scripts);

  // --- Signal naming patterns ---
  const signalNamingPattern = analyzeSignalPatterns(scripts);

  // --- Export naming patterns ---
  const exportNamingPattern = analyzeExportPatterns(scripts);

  // --- Common base classes ---
  const commonBaseClasses = analyzeBaseClasses(scripts);

  // --- Averages ---
  const totalMethods = scripts.reduce((sum, s) => sum + s.methods.length, 0);
  const totalSignals = scripts.reduce((sum, s) => sum + s.signals.length, 0);
  const avgMethodsPerFile = Math.round((totalMethods / scripts.length) * 10) / 10;
  const avgSignalsPerFile = Math.round((totalSignals / scripts.length) * 10) / 10;

  return {
    namingStyle,
    signalNamingPattern,
    exportNamingPattern,
    commonBaseClasses,
    indentStyle: 'tabs', // Always tabs for Godot
    avgMethodsPerFile,
    avgSignalsPerFile,
  };
}


// ---------------------------------------------------------------------------
// Naming style detection
// ---------------------------------------------------------------------------

const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]*$/;

/**
 * Determine the dominant naming style across all method and variable names.
 */
function analyzeNamingStyle(scripts: ParsedScript[]): 'snake_case' | 'PascalCase' | 'mixed' {
  let snakeCount = 0;
  let pascalCount = 0;
  let otherCount = 0;

  for (const script of scripts) {
    // Check method names (skip overrides starting with _)
    for (const method of script.methods) {
      const name = method.name;
      if (name.startsWith('_')) continue; // Skip built-in overrides
      classifyName(name);
    }

    // Check regular variable names
    for (const v of script.regularVars) {
      classifyName(v.name);
    }

    // Check export variable names
    for (const exp of script.exports) {
      classifyName(exp.name);
    }
  }

  function classifyName(name: string): void {
    if (SNAKE_CASE_RE.test(name)) {
      snakeCount++;
    } else if (PASCAL_CASE_RE.test(name)) {
      pascalCount++;
    } else {
      otherCount++;
    }
  }

  const total = snakeCount + pascalCount + otherCount;
  if (total === 0) return 'snake_case'; // Default for Godot

  // If 80%+ of names match one style, use that style
  if (snakeCount / total >= 0.8) return 'snake_case';
  if (pascalCount / total >= 0.8) return 'PascalCase';
  return 'mixed';
}


// ---------------------------------------------------------------------------
// Signal pattern detection
// ---------------------------------------------------------------------------

/**
 * Analyze signal names for common prefix/suffix patterns.
 * Returns patterns like "on_*", "*_changed", "*_requested", or empty if no clear pattern.
 */
function analyzeSignalPatterns(scripts: ParsedScript[]): string {
  const signalNames: string[] = [];
  for (const script of scripts) {
    for (const signal of script.signals) {
      signalNames.push(signal.name);
    }
  }

  if (signalNames.length === 0) return '';

  return detectCommonPattern(signalNames);
}


// ---------------------------------------------------------------------------
// Export pattern detection
// ---------------------------------------------------------------------------

/**
 * Analyze export variable names for common patterns.
 */
function analyzeExportPatterns(scripts: ParsedScript[]): string {
  const exportNames: string[] = [];
  for (const script of scripts) {
    for (const exp of script.exports) {
      exportNames.push(exp.name);
    }
  }

  if (exportNames.length === 0) return '';

  return detectCommonPattern(exportNames);
}


// ---------------------------------------------------------------------------
// Base class frequency analysis
// ---------------------------------------------------------------------------

/**
 * Find the most commonly used base classes (extends values), sorted by frequency.
 * Returns up to 5 most common.
 */
function analyzeBaseClasses(scripts: ParsedScript[]): string[] {
  const counts = new Map<string, number>();

  for (const script of scripts) {
    if (script.extends) {
      counts.set(script.extends, (counts.get(script.extends) || 0) + 1);
    }
  }

  // Sort by frequency descending, return top 5
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
}


// ---------------------------------------------------------------------------
// Pattern detection helpers
// ---------------------------------------------------------------------------

/**
 * Detect common prefix or suffix patterns in a list of names.
 *
 * Returns patterns like:
 * - "*_changed" if most names end with _changed
 * - "on_*" if most names start with on_
 * - "snake_case" if names just follow snake_case
 * - "" if no clear pattern
 */
function detectCommonPattern(names: string[]): string {
  if (names.length < 2) return '';

  // Check for common suffixes
  const suffixCounts = new Map<string, number>();
  for (const name of names) {
    const parts = name.split('_');
    if (parts.length >= 2) {
      const suffix = '_' + parts[parts.length - 1];
      suffixCounts.set(suffix, (suffixCounts.get(suffix) || 0) + 1);
    }
  }

  // Check for common prefixes
  const prefixCounts = new Map<string, number>();
  for (const name of names) {
    const parts = name.split('_');
    if (parts.length >= 2) {
      const prefix = parts[0] + '_';
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    }
  }

  // Find dominant suffix (used by 40%+ of names)
  const threshold = names.length * 0.4;
  let bestSuffix = '';
  let bestSuffixCount = 0;
  for (const [suffix, count] of suffixCounts) {
    if (count >= threshold && count > bestSuffixCount) {
      bestSuffix = suffix;
      bestSuffixCount = count;
    }
  }

  let bestPrefix = '';
  let bestPrefixCount = 0;
  for (const [prefix, count] of prefixCounts) {
    if (count >= threshold && count > bestPrefixCount) {
      bestPrefix = prefix;
      bestPrefixCount = count;
    }
  }

  // Return the stronger pattern
  if (bestSuffixCount > bestPrefixCount && bestSuffix) {
    return `*${bestSuffix}`;
  }
  if (bestPrefixCount > bestSuffixCount && bestPrefix) {
    return `${bestPrefix}*`;
  }
  if (bestSuffix) return `*${bestSuffix}`;
  if (bestPrefix) return `${bestPrefix}*`;

  return '';
}
